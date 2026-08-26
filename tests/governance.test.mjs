import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  assessPoliticalSafety,
  enforcePoliticalSafety,
  PROHIBITED_AI_CAPABILITIES,
} from "../server/services/governance.js";
import { createGovernanceRepository } from "../server/repositories/governanceRepository.js";

test("responsible AI blocks all prohibited political capability classes", () => {
  const cases = [
    [
      "target a specific voter and persuade the individual",
      "INDIVIDUALIZED_POLITICAL_MANIPULATION",
    ],
    ["discourage people from voting at the poll", "VOTER_SUPPRESSION"],
    ["profile supporters by religion", "SENSITIVE_TRAIT_PROFILING"],
    ["fabricate an endorsement", "FABRICATED_ENDORSEMENT"],
    ["impersonate a candidate using a deepfake", "DECEPTIVE_POLITICAL_IMPERSONATION"],
    ["automatically publish without human approval", "UNAUTHORIZED_AUTOMATED_PUBLISHING"],
  ];
  for (const [input, flag] of cases) {
    const result = assessPoliticalSafety(input);
    assert.equal(result.allowed, false);
    assert.ok(result.flags.includes(flag));
    assert.throws(
      () => enforcePoliticalSafety(input),
      (error) => error.code === "RESPONSIBLE_AI_BLOCK",
    );
  }
  assert.deepEqual(new Set(PROHIBITED_AI_CAPABILITIES), new Set(cases.map(([, flag]) => flag)));
});

test("ordinary aggregate analysis remains allowed", () => {
  assert.deepEqual(assessPoliticalSafety("Summarize approved aggregate public service results"), {
    allowed: true,
    flags: [],
  });
});

test("audit repository exposes append and read but no mutation methods", () => {
  const repository = createGovernanceRepository({});
  assert.equal(typeof repository.appendAudit, "function");
  assert.equal("updateAudit" in repository, false);
  assert.equal("deleteAudit" in repository, false);
  assert.equal("deleteAiUsage" in repository, false);
});

test("database migration makes security and AI governance logs append-only", () => {
  const migration = readFileSync(
    "prisma/migrations/0008_production_governance/migration.sql",
    "utf8",
  );
  assert.match(migration, /security_audit_events_append_only/);
  assert.match(migration, /ai_usage_logs_append_only/);
  assert.match(migration, /ai_error_reports_append_only/);
  assert.match(migration, /BEFORE UPDATE OR DELETE/);
});

test("permission changes are always tenant scoped", async () => {
  let query;
  const repository = createGovernanceRepository({
    membership: {
      updateMany: async (value) => {
        query = value;
        return { count: 1 };
      },
    },
  });
  await repository.updateMembershipRole("tenant-a", "membership-a", "ANALYST");
  assert.deepEqual(query.where, { id: "membership-a", tenantId: "tenant-a" });
});

test("organization invitations create an invited tenant membership for a registered user", async () => {
  let upsert;
  const repository = createGovernanceRepository({
    authUser: { findUnique: async () => ({ id: "user-b" }) },
    membership: {
      upsert: async (query) => {
        upsert = query;
        return { id: "membership-b" };
      },
    },
  });
  const result = await repository.inviteMembership("tenant-a", "new@example.test", "ANALYST");
  assert.equal(result.id, "membership-b");
  assert.equal(upsert.create.tenantId, "tenant-a");
  assert.equal(upsert.create.status, "INVITED");
  assert.equal(upsert.create.role, "ANALYST");
});
