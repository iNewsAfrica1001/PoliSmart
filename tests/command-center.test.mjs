import test from "node:test";
import assert from "node:assert/strict";
import {
  createCommandCenterRepository,
  COMMAND_CENTER_QUERY_COUNT,
} from "../server/repositories/commandCenterRepository.js";
import { buildCommandCenter } from "../server/services/commandCenter.js";

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
