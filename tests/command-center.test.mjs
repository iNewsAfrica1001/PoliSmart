import test from "node:test";
import assert from "node:assert/strict";
import {
  createCommandCenterRepository,
  COMMAND_CENTER_QUERY_COUNT,
} from "../server/repositories/commandCenterRepository.js";
import { buildCommandCenter } from "../server/services/commandCenter.js";
import { RUNTIME_DATABASE_PRIVILEGES } from "../server/config/databasePrivileges.js";

const snapshot = {
  campaign: { id: "campaign", status: "ACTIVE" },
  taskStatus: [
    { status: "BLOCKED", _count: { _all: 1 } },
    { status: "ACTIVE", _count: { _all: 3 } },
  ],
  tasksAtRisk: [
    { title: "Approve field plan", status: "BLOCKED", owner: { displayName: "Amina" } },
  ],
  activities: [],
  events: [],
  volunteerStatus: [
    { trainingStatus: "COMPLETED", _count: { _all: 3 } },
    { trainingStatus: "IN_PROGRESS", _count: { _all: 2 } },
  ],
  policyWork: [],
  mediaDevelopments: [],
  intelligence: [],
  changedLast24Hours: 2,
};

test("daily brief is deterministic, evidence-aware, and assigns the next action", () => {
  const result = buildCommandCenter(snapshot);
  assert.match(result.dailyBrief.whatMatters, /Approve field plan/);
  assert.match(result.dailyBrief.nextAction, /Amina/);
  assert.match(result.dailyBrief.evidence, /no matching public aggregate/i);
  assert.equal(result.health.blocked, 1);
});

test("command center uses a bounded query plan and aggregate survey table only", async () => {
  const calls = [];
  const model = (name) => ({
    findFirst: async (query) => {
      calls.push([name, "findFirst", query]);
      return { id: "campaign", status: "ACTIVE" };
    },
    findMany: async (query) => {
      calls.push([name, "findMany", query]);
      return [];
    },
    groupBy: async (query) => {
      calls.push([name, "groupBy", query]);
      return [];
    },
    count: async (query) => {
      calls.push([name, "count", query]);
      return 0;
    },
  });
  const database = {
    campaign: model("campaign"),
    campaignTask: model("campaignTask"),
    activity: model("activity"),
    campaignEvent: model("campaignEvent"),
    volunteer: model("volunteer"),
    knowledgeDocument: model("knowledgeDocument"),
    surveyAggregateResult: model("surveyAggregateResult"),
    campaignGeographicAssignment: model("campaignGeographicAssignment"),
    $transaction: async (queries) => Promise.all(queries),
  };
  const repository = createCommandCenterRepository(database);
  const result = await repository.snapshot({
    tenantId: "tenant-a",
    campaignId: "campaign-a",
    country: "Kisiwa",
    geographicAreaId: "area-a",
  });
  assert.equal(calls.length, COMMAND_CENTER_QUERY_COUNT);
  assert.equal(result.intelligence.length, 0);
  assert.equal(
    calls.some(([name]) => name === "surveyIndicatorValue"),
    false,
  );
  assert.equal(
    calls.some(([name]) => name === "surveyAggregateResult"),
    true,
  );
  const surveyQuery = calls.find(([name]) => name === "surveyAggregateResult")[2];
  assert.equal(surveyQuery.where.isSuppressed, false);
  assert.equal(surveyQuery.where.surveyCountry.countryName, "Kisiwa");
  assert.ok(surveyQuery.where.unweightedSampleSize.gte >= 100);
  const eventQuery = calls.find(([name]) => name === "campaignEvent")[2];
  assert.equal(eventQuery.where.tenantId, "tenant-a");
  assert.equal(eventQuery.where.campaignId, "campaign-a");
  assert.equal(eventQuery.where.geographicAreaId, "area-a");
  assert.equal(eventQuery.take, 6);
  const volunteerQuery = calls.find(([name]) => name === "volunteer")[2];
  assert.deepEqual(volunteerQuery.where, {
    tenantId: "tenant-a",
    preferredArea: {
      is: { id: "area-a", tenantId: "tenant-a", campaignId: "campaign-a", isActive: true },
    },
  });
});

test("command center aggregate relations are covered by the runtime read model", () => {
  for (const table of [
    "survey_aggregate_results",
    "survey_imports",
    "data_sources",
    "survey_countries",
    "survey_indicator_definitions",
  ])
    assert.deepEqual(RUNTIME_DATABASE_PRIVILEGES[table].tablePrivileges, ["SELECT"]);
});

test("command center geography includes only active campaign assignments and active master rows", async () => {
  let query;
  const repository = createCommandCenterRepository({
    campaignGeographicAssignment: {
      findMany: async (input) => {
        query = input;
        return [
          {
            masterGeographicArea: {
              id: "area-a",
              name: "Assigned area",
              level: { name: "Ward", orderIndex: 6 },
            },
          },
        ];
      },
    },
  });
  assert.deepEqual(await repository.geography("tenant-a", "campaign-a", "Nigeria"), [
    { id: "area-a", name: "Assigned area", level: { name: "Ward", orderIndex: 6 } },
  ]);
  assert.deepEqual(query.where, {
    tenantId: "tenant-a",
    campaignId: "campaign-a",
    isActive: true,
    masterGeographicArea: {
      is: {
        countryCode: "NG",
        isActive: true,
        level: { is: { isActive: true } },
      },
    },
  });
  assert.equal(query.orderBy[0].masterGeographicArea.level.orderIndex, "asc");
  assert.equal(query.where.masterGeographicArea.is.children, undefined);
});

test("command center validates selected geography against tenant, campaign, country, and active assignment", async () => {
  const calls = [];
  const repository = createCommandCenterRepository({
    campaign: {
      findFirst: async (query) => {
        calls.push(["campaign", query]);
        return { id: "campaign-a", country: "Nigeria" };
      },
    },
    campaignGeographicAssignment: {
      findFirst: async (query) => {
        calls.push(["assignment", query]);
        return { masterGeographicAreaId: "40000000-0000-4000-8000-000000000004" };
      },
    },
  });
  const result = await repository.campaignContext(
    "tenant-a",
    "campaign-a",
    "40000000-0000-4000-8000-000000000004",
  );
  assert.equal(
    result.selectedGeography.masterGeographicAreaId,
    "40000000-0000-4000-8000-000000000004",
  );
  assert.deepEqual(calls[0][1].where, { id: "campaign-a", tenantId: "tenant-a" });
  assert.deepEqual(calls[1][1].where, {
    tenantId: "tenant-a",
    campaignId: "campaign-a",
    masterGeographicAreaId: "40000000-0000-4000-8000-000000000004",
    isActive: true,
    masterGeographicArea: {
      is: {
        countryCode: "NG",
        isActive: true,
        level: { is: { isActive: true } },
      },
    },
  });
});

test("unsupported campaign countries have no assignment-governed geography fallback", async () => {
  let assignmentReads = 0;
  const repository = createCommandCenterRepository({
    campaign: {
      findFirst: async () => ({ id: "campaign-a", country: "Kisiwa" }),
    },
    campaignGeographicAssignment: {
      findFirst: async () => {
        assignmentReads += 1;
      },
      findMany: async () => {
        assignmentReads += 1;
        return [];
      },
    },
  });
  const context = await repository.campaignContext(
    "tenant-a",
    "campaign-a",
    "40000000-0000-4000-8000-000000000004",
  );
  assert.equal(context.selectedGeography, null);
  assert.deepEqual(await repository.geography("tenant-a", "campaign-a", "Kisiwa"), []);
  assert.equal(assignmentReads, 0);
});

test("public visualization contract contains source, sample, round, and weighting", () => {
  const result = buildCommandCenter({
    ...snapshot,
    intelligence: [
      {
        source: "Afrobarometer",
        unweightedSampleSize: 1200,
        surveyRound: "9",
        weightField: "COMBINWT",
      },
    ],
  });
  const evidence = result.intelligence[0];
  assert.equal(evidence.source, "Afrobarometer");
  assert.equal(evidence.unweightedSampleSize, 1200);
  assert.equal(evidence.surveyRound, "9");
  assert.equal(evidence.weightField, "COMBINWT");
});
