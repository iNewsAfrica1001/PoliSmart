import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import {
  createAiAssistantService,
  detectIntent,
  resolveExplicitCountry,
} from "../server/services/aiAssistant.js";
import { AiProviderError } from "../server/services/aiProvider.js";
import { createAiRepository } from "../server/repositories/aiRepository.js";
import { createAiRouter } from "../server/routes/ai.js";

function harness({
  chunks = [],
  aggregates = [],
  aggregateResolver,
  providerFailure = false,
  sourceIds = ["S1", "FAKE"],
} = {}) {
  const messages = [];
  const aggregateQueries = [];
  let providerCalls = 0;
  const repository = {
    findCampaign: async () => ({ id: "campaign" }),
    createConversation: async (data) => ({ id: "conversation", messages: [], ...data }),
    findConversation: async () => ({ id: "conversation", messages: [] }),
    createMessage: async (data) => {
      const value = { id: `message-${messages.length}`, ...data };
      messages.push(value);
      return value;
    },
    retrieveKnowledge: async () => chunks,
    findAssistantMessage: async () => ({ id: "answer" }),
    saveFeedback: async (data) => data,
  };
  const provider = {
    name: "openai",
    generate: async () => {
      providerCalls += 1;
      if (providerFailure) throw new AiProviderError();
      return {
        observedData: "Approved evidence reports 42%.",
        interpretation: "This may warrant further review.",
        sourceIds,
        providerRef: "response",
        model: "test-model",
      };
    },
  };
  return {
    service: createAiAssistantService({
      repository,
      intelligenceRepository: {
        listAggregates: async (input) => {
          aggregateQueries.push(input);
          return aggregateResolver ? aggregateResolver(input) : aggregates;
        },
      },
      provider,
    }),
    messages,
    aggregateQueries,
    providerCalls: () => providerCalls,
  };
}

test("grounded campaign answers include server-controlled citations", async () => {
  const chunk = {
    content: "Approved evidence reports 42%.",
    chunkIndex: 0,
    document: { id: "doc", title: "Approved manifesto", source: "Campaign", author: "Team" },
  };
  const { service } = harness({ chunks: [chunk] });
  const answer = await service.answer({
    tenantId: "tenant-a",
    campaignId: "campaign",
    userId: "user",
    question: "What does the manifesto report?",
  });
  assert.equal(answer.grounded, true);
  assert.equal(answer.citations.length, 1);
  assert.equal(answer.citations[0].documentId, "doc");
  assert.match(answer.content, /Observed Data[\s\S]+AI Interpretation/);
});

test("missing data returns a transparent response without a provider claim", async () => {
  const { service } = harness();
  const answer = await service.answer({
    tenantId: "tenant",
    campaignId: "campaign",
    userId: "user",
    question: "What does approved material say?",
  });
  assert.equal(answer.grounded, false);
  assert.deepEqual(answer.citations, []);
  assert.match(answer.observedData, /No approved supporting data/);
});

test("elections and youth questions route to aggregate public intelligence", () => {
  assert.equal(detectIntent("What do the elections results show?"), "PUBLIC_INTELLIGENCE");
  assert.equal(
    detectIntent("What does Afrobarometer show about youth respondents?"),
    "PUBLIC_INTELLIGENCE",
  );
});

test("provider failures are safely surfaced", async () => {
  const { service } = harness({
    chunks: [{ content: "evidence", chunkIndex: 0, document: { id: "doc", title: "Doc" } }],
    providerFailure: true,
  });
  await assert.rejects(
    () =>
      service.answer({
        tenantId: "tenant",
        campaignId: "campaign",
        userId: "user",
        question: "Explain campaign evidence",
      }),
    (error) => error.status === 503,
  );
});

test("knowledge retrieval always enforces tenant, campaign, approval, readiness and visibility", async () => {
  let where;
  const repo = createAiRepository({
    knowledgeChunk: {
      findMany: async (query) => {
        where = query.where;
        return [];
      },
    },
  });
  await repo.retrieveKnowledge({
    tenantId: "tenant-a",
    campaignId: "campaign-a",
    userId: "user-a",
    terms: ["policy"],
  });
  assert.equal(where.tenantId, "tenant-a");
  assert.equal(where.document.tenantId, "tenant-a");
  assert.equal(where.document.campaignId, "campaign-a");
  assert.equal(where.document.approvalStatus, "APPROVED");
  assert.equal(where.document.processingStatus, "READY");
});

test("public intelligence sends aggregates rather than respondent rows", async () => {
  const row = {
    country: "Kisiwa",
    indicator: "Institutional trust",
    responseCode: "1",
    weightedPercentage: 51.2,
    unweightedSampleSize: 500,
    weightField: "COMBINWT",
    surveySource: "Afrobarometer",
    question: "Q1",
    surveyRound: "9",
    sourceUrl: "https://example.test",
    importVersion: "r9-test",
    mappingVersion: "r9-merged-codebook-2024-06-25-v3",
    attribution: "Afrobarometer public research data",
  };
  const { service } = harness({ aggregates: [row] });
  const answer = await service.answer({
    tenantId: "tenant",
    campaignId: "campaign",
    userId: "user",
    question: "What does Afrobarometer say about trust?",
  });
  assert.equal(answer.intent, "PUBLIC_INTELLIGENCE");
  assert.equal(answer.citations[0].weightedPercentage, 51.2);
  assert.equal(answer.citations[0].unweightedSampleSize, 500);
  assert.equal(answer.citations[0].question, "Q1");
  assert.equal(answer.citations[0].surveyRound, "9");
  assert.equal(answer.citations[0].weightField, "COMBINWT");
  assert.equal(answer.citations[0].mappingVersion, "r9-merged-codebook-2024-06-25-v3");
  assert.equal(answer.citations[0].url, "https://example.test");
});

test("invalid provider source references produce an insufficient-evidence response", async () => {
  const chunk = {
    content: "Approved evidence.",
    chunkIndex: 0,
    document: { id: "doc", title: "Approved document", source: "Campaign" },
  };
  const { service } = harness({ chunks: [chunk], sourceIds: ["FAKE"] });
  const answer = await service.answer({
    tenantId: "tenant",
    campaignId: "campaign",
    userId: "user",
    question: "Explain approved evidence",
  });
  assert.equal(answer.grounded, false);
  assert.deepEqual(answer.citations, []);
  assert.match(answer.observedData, /did not identify valid supporting evidence/);
});

test("country-specific public intelligence never cites a different country", async () => {
  const base = {
    indicator: "Public priority",
    responseCode: "Unemployment",
    weightedPercentage: 40,
    unweightedSampleSize: 1000,
    weightField: "Combinwt_new_hh",
    surveySource: "Afrobarometer",
    question: "Q45PT1",
    surveyRound: "9",
    importVersion: "r9-test",
    sourceUrl: "https://example.test",
  };
  const { service, aggregateQueries } = harness({
    aggregates: [
      { ...base, country: "Angola" },
      { ...base, country: "Niger", weightedPercentage: 48 },
      { ...base, country: "Nigeria", weightedPercentage: 52 },
    ],
  });
  const answer = await service.answer({
    tenantId: "tenant",
    campaignId: "campaign",
    userId: "user",
    question: "What are the leading public priorities in Nigeria according to Afrobarometer?",
  });
  assert.equal(answer.grounded, true);
  assert.equal(aggregateQueries[0].country, "Nigeria");
  assert.ok(answer.citations.length > 0);
  assert.ok(answer.citations.every((citation) => citation.country === "Nigeria"));
});

test("explicit country without safeguarded rows fails closed before provider invocation", async () => {
  const otherCountry = {
    country: "Ghana",
    indicator: "Public priority",
    responseCode: "Unemployment",
    weightedPercentage: 44,
    unweightedSampleSize: 900,
    weightField: "COMBINWT",
    surveySource: "Afrobarometer",
    question: "Q45PT1",
    surveyRound: "9",
  };
  const { service, aggregateQueries, providerCalls } = harness({
    aggregateResolver: ({ country }) => (country ? [] : [otherCountry]),
  });
  const answer = await service.answer({
    tenantId: "tenant",
    campaignId: "campaign",
    userId: "user",
    question: "What are the public priorities in Kenya according to Afrobarometer?",
  });
  assert.equal(answer.grounded, false);
  assert.equal(answer.reason, "INSUFFICIENT_COUNTRY_EVIDENCE");
  assert.deepEqual(answer.citations, []);
  assert.match(answer.observedData, /Kenya/);
  assert.equal(providerCalls(), 0);
  assert.deepEqual(aggregateQueries.map(({ country }) => country), ["Kenya"]);
});

test("insufficient country evidence preserves the HTTP 200 chat contract", async () => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.auth = { user: { id: "user", memberships: [{ tenantId: "org-a", role: "ANALYST" }] } };
    next();
  });
  app.use(
    "/ai",
    createAiRouter({
      service: {
        answer: async () => ({
          conversationId: "conversation",
          messageId: "message",
          intent: "PUBLIC_INTELLIGENCE",
          grounded: false,
          reason: "INSUFFICIENT_COUNTRY_EVIDENCE",
          observedData: "No approved safeguarded evidence is available for Kenya.",
          interpretation: "No grounded country-specific interpretation is available.",
          citations: [],
        }),
      },
    }),
  );
  app.use((error, _req, res, _next) =>
    res.status(error.status || 500).json({ message: error.message }),
  );
  const response = await request(app)
    .post("/ai/chat")
    .set("X-Organization-Id", "org-a")
    .send({
      campaignId: "00000000-0000-0000-0000-000000000000",
      question: "What does Afrobarometer report about Kenya?",
    })
    .expect(200);
  assert.equal(response.body.grounded, false);
  assert.deepEqual(response.body.citations, []);
  assert.equal(response.body.reason, "INSUFFICIENT_COUNTRY_EVIDENCE");
});

test("safeguard-rejected country evidence never broadens to another country", async () => {
  const { service, aggregateQueries, providerCalls } = harness({
    aggregateResolver: ({ country, minimumSampleSize }) => {
      assert.equal(country, "Ghana");
      assert.equal(minimumSampleSize, 100);
      return [];
    },
  });
  const answer = await service.answer({
    tenantId: "tenant",
    campaignId: "campaign",
    userId: "user",
    question: "What does the survey report about democracy in Ghana?",
  });
  assert.equal(answer.grounded, false);
  assert.deepEqual(answer.citations, []);
  assert.equal(providerCalls(), 0);
  assert.equal(aggregateQueries.length, 1);
});

test("no-country public intelligence preserves broader safeguarded retrieval", async () => {
  const row = {
    country: "Ghana",
    indicator: "Institutional trust",
    responseCode: "A lot",
    weightedPercentage: 48,
    unweightedSampleSize: 600,
    weightField: "COMBINWT",
    surveySource: "Afrobarometer",
    question: "Q37A",
    surveyRound: "9",
  };
  const { service, aggregateQueries, providerCalls } = harness({ aggregates: [row] });
  const answer = await service.answer({
    tenantId: "tenant",
    campaignId: "campaign",
    userId: "user",
    question: "What does Afrobarometer report about institutional trust?",
  });
  assert.equal(aggregateQueries[0].country, undefined);
  assert.equal(answer.grounded, true);
  assert.equal(answer.citations[0].country, "Ghana");
  assert.equal(providerCalls(), 1);
});

test("country resolution normalizes case, accents, punctuation, and safe aliases", () => {
  assert.deepEqual(resolveExplicitCountry("TRUST IN côte d’ivoire?"), {
    status: "RESOLVED",
    country: "Côte d'Ivoire",
  });
  assert.deepEqual(resolveExplicitCountry("Trust in Cote d'Ivoire"), {
    status: "RESOLVED",
    country: "Côte d'Ivoire",
  });
  assert.deepEqual(resolveExplicitCountry("Trust in Ivory Coast"), {
    status: "RESOLVED",
    country: "Côte d'Ivoire",
  });
  assert.deepEqual(resolveExplicitCountry("Trust in DRC"), {
    status: "RESOLVED",
    country: "Democratic Republic of the Congo",
  });
});

test("qualified Congo names remain distinct while bare Congo fails closed", () => {
  assert.deepEqual(resolveExplicitCountry("Democracy in Democratic Republic of the Congo"), {
    status: "RESOLVED",
    country: "Democratic Republic of the Congo",
  });
  assert.deepEqual(resolveExplicitCountry("Democracy in Republic of the Congo"), {
    status: "RESOLVED",
    country: "Congo-Brazzaville",
  });
  assert.deepEqual(resolveExplicitCountry("Democracy in Congo"), {
    status: "AMBIGUOUS",
    country: null,
  });
});

test("ambiguous or unavailable Congo evidence returns no citations and skips OpenAI", async () => {
  for (const question of [
    "What does Afrobarometer report about democracy in Congo?",
    "What does Afrobarometer report about democracy in DRC?",
  ]) {
    const { service, aggregateQueries, providerCalls } = harness({
      aggregateResolver: () => [],
    });
    const answer = await service.answer({
      tenantId: "tenant",
      campaignId: "campaign",
      userId: "user",
      question,
    });
    assert.equal(answer.grounded, false);
    assert.equal(answer.reason, "INSUFFICIENT_COUNTRY_EVIDENCE");
    assert.deepEqual(answer.citations, []);
    assert.equal(providerCalls(), 0);
    if (question.endsWith("Congo?")) assert.equal(aggregateQueries.length, 0);
    else assert.equal(aggregateQueries[0].country, "Democratic Republic of the Congo");
  }
});
