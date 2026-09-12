import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createPrelaunchLeadRepository } from "../server/repositories/prelaunchLeadRepository.js";

const leadId = "11111111-1111-4111-8111-111111111111";
const followUpId = "22222222-2222-4222-8222-222222222222";
const administratorId = "33333333-3333-4333-8333-333333333333";
const now = new Date("2026-09-11T12:00:00.000Z");

function database(overrides = {}) {
  return {
    prelaunchLead: {
      count: async () => 1,
      findMany: async () => [],
      ...overrides.prelaunchLead,
    },
    prelaunchLeadFollowUp: {
      findMany: async () => [],
      findFirst: async () => null,
      findUnique: async () => null,
      create: async ({ data }) => ({ id: followUpId, ...data }),
      updateMany: async () => ({ count: 0 }),
      ...overrides.prelaunchLeadFollowUp,
    },
  };
}

test("lead status update is atomic and bound to ID and expected current status", async () => {
  const observed = {};
  const updatedAt = new Date("2026-09-11T12:01:00.000Z");
  const db = database({
    prelaunchLead: {
      updateMany: async (query) => { observed.update = query; return { count: 1 }; },
      findUnique: async () => ({ id: leadId, status: "CONTACTED", updatedAt }),
    },
  });
  const result = await createPrelaunchLeadRepository(db).updateStatus(leadId, "NEW", "CONTACTED");
  assert.deepEqual(observed.update, {
    where: { id: leadId, status: "NEW" },
    data: { status: "CONTACTED" },
  });
  assert.equal(result.outcome, "UPDATED");
  assert.equal(result.lead.updatedAt, updatedAt);
});

test("racing and missing lead status updates return controlled outcomes", async () => {
  const racing = database({
    prelaunchLead: {
      updateMany: async () => ({ count: 0 }),
      findUnique: async () => ({ id: leadId, status: "QUALIFIED" }),
    },
  });
  assert.deepEqual(
    await createPrelaunchLeadRepository(racing).updateStatus(leadId, "NEW", "CONTACTED"),
    { outcome: "CONFLICT", lead: null },
  );
  const missing = database({
    prelaunchLead: { updateMany: async () => ({ count: 0 }), findUnique: async () => null },
  });
  assert.deepEqual(
    await createPrelaunchLeadRepository(missing).updateStatus(leadId, "NEW", "CONTACTED"),
    { outcome: "NOT_FOUND", lead: null },
  );
});

test("follow-up history confirms the lead, orders chronologically, and selects safe administrator fields", async () => {
  const observed = {};
  const db = database({
    prelaunchLead: { count: async (query) => { observed.lead = query; return 1; } },
    prelaunchLeadFollowUp: { findMany: async (query) => { observed.followUps = query; return []; } },
  });
  await createPrelaunchLeadRepository(db).listFollowUpsForLead(leadId);
  assert.deepEqual(observed.lead, { where: { id: leadId } });
  assert.deepEqual(observed.followUps.orderBy, [{ createdAt: "asc" }, { id: "asc" }]);
  assert.deepEqual(observed.followUps.select.createdBy, {
    select: { id: true, displayName: true },
  });
  assert.deepEqual(observed.followUps.select.completedBy, {
    select: { id: true, displayName: true },
  });
  assert.equal("passwordHash" in observed.followUps.select, false);
  assert.equal("email" in observed.followUps.select.createdBy.select, false);
});

test("follow-up creation writes only permitted fields and never mutates the lead", async () => {
  const observed = {};
  const db = database({
    prelaunchLeadFollowUp: { create: async (query) => { observed.create = query; return query.data; } },
  });
  const repository = createPrelaunchLeadRepository(db);
  await repository.createFollowUp({
    leadId,
    note: "Arrange a product walkthrough.",
    scheduledAt: new Date("2026-09-12T10:00:00.000Z"),
    createdById: administratorId,
    completedAt: now,
    completedById: administratorId,
    status: "COMPLETED",
  });
  assert.deepEqual(Object.keys(observed.create.data).sort(), [
    "createdById",
    "leadId",
    "note",
    "scheduledAt",
  ]);
  assert.equal(typeof db.prelaunchLead.update, "undefined");
  assert.equal(typeof db.prelaunchLead.updateMany, "undefined");
});

test("completion is atomic, lead-bound, and changes only completion fields", async () => {
  const observed = {};
  const completed = { id: followUpId, leadId, completedAt: now };
  const db = database({
    prelaunchLeadFollowUp: {
      updateMany: async (query) => { observed.update = query; return { count: 1 }; },
      findUnique: async () => completed,
    },
  });
  const result = await createPrelaunchLeadRepository(db, { now: () => now })
    .completeFollowUp(leadId, followUpId, administratorId);
  assert.equal(result.outcome, "COMPLETED");
  assert.deepEqual(observed.update.where, {
    id: followUpId,
    leadId,
    completedAt: null,
    completedById: null,
  });
  assert.deepEqual(observed.update.data, { completedAt: now, completedById: administratorId });
});

test("completed and unknown follow-ups return controlled outcomes without rewriting history", async () => {
  let updates = 0;
  const completedDb = database({
    prelaunchLeadFollowUp: {
      updateMany: async () => { updates += 1; return { count: 0 }; },
      findFirst: async () => ({ id: followUpId, completedAt: now }),
    },
  });
  const completed = await createPrelaunchLeadRepository(completedDb)
    .completeFollowUp(leadId, followUpId, administratorId);
  assert.deepEqual(completed, { outcome: "ALREADY_COMPLETED", followUp: null });
  assert.equal(updates, 1);

  const unknown = await createPrelaunchLeadRepository(database())
    .completeFollowUp(leadId, followUpId, administratorId);
  assert.deepEqual(unknown, { outcome: "NOT_FOUND", followUp: null });
});

test("summary returns the next incomplete follow-up and derives overdue, upcoming, and none", async () => {
  const scheduledAt = new Date("2026-09-11T11:00:00.000Z");
  let observed;
  const overdueDb = database({
    prelaunchLeadFollowUp: {
      findFirst: async (query) => { observed = query; return { id: followUpId, scheduledAt }; },
    },
  });
  const overdue = await createPrelaunchLeadRepository(overdueDb, { now: () => now })
    .getFollowUpSummaryForLead(leadId);
  assert.equal(overdue.state, "OVERDUE");
  assert.deepEqual(observed.where, { leadId, completedAt: null });
  assert.deepEqual(observed.orderBy, [{ scheduledAt: "asc" }, { id: "asc" }]);
  assert.equal("note" in observed.select, false);

  const upcomingDb = database({
    prelaunchLeadFollowUp: {
      findFirst: async () => ({ id: followUpId, scheduledAt: new Date("2026-09-11T13:00:00.000Z") }),
    },
  });
  assert.equal(
    (await createPrelaunchLeadRepository(upcomingDb, { now: () => now }).getFollowUpSummaryForLead(leadId)).state,
    "UPCOMING",
  );
  assert.deepEqual(
    await createPrelaunchLeadRepository(database(), { now: () => now }).getFollowUpSummaryForLead(leadId),
    { nextFollowUp: null, state: "NONE" },
  );
});

test("lead list includes a note-free next-follow-up summary", async () => {
  const observed = {};
  const db = database({
    prelaunchLead: {
      findMany: async (query) => {
        observed.query = query;
        return [{ id: leadId, status: "NEW", followUps: [{ id: followUpId, scheduledAt: new Date("2026-09-11T11:00:00.000Z") }] }];
      },
    },
  });
  const [lead] = await createPrelaunchLeadRepository(db, { now: () => now }).list();
  assert.equal(lead.followUpState, "OVERDUE");
  assert.equal(lead.nextFollowUp.id, followUpId);
  assert.equal("followUps" in lead, false);
  assert.equal("note" in observed.query.select.followUps.select, false);
});

test("repository exposes no delete or unrestricted follow-up update operation", () => {
  const repository = createPrelaunchLeadRepository(database());
  assert.equal(typeof repository.deleteFollowUp, "undefined");
  assert.equal(typeof repository.updateFollowUp, "undefined");
  const source = readFileSync("server/repositories/prelaunchLeadRepository.js", "utf8");
  assert.doesNotMatch(source, /prelaunchLeadFollowUp\.delete/);
  assert.doesNotMatch(source, /prelaunchLeadFollowUp\.update\s*\(/);
});
