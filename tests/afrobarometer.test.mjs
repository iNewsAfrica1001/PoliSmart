import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import express from "express";
import request from "supertest";
import {
  analyzeAfrobarometer,
  persistAfrobarometer,
} from "../server/services/afrobarometerIngestion.js";
import {
  AFROBAROMETER_INDICATOR_MAPPINGS,
  AFROBAROMETER_INTELLIGENCE_CATEGORIES,
  AFROBAROMETER_MAPPING_VERSION,
} from "../server/config/afrobarometer.js";
import { createPublicIntelligenceRouter } from "../server/routes/publicIntelligence.js";

test("explicit mappings produce weighted aggregates and enforce minimum sample size", async () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "polismart-afro-"));
  try {
    const sourcePath = path.join(directory, "source.csv");
    const dictionaryPath = path.join(directory, "dictionary.csv");
    writeFileSync(
      sourcePath,
      "RESPNO,COUNTRY,REGION,LOCATION.LEVEL.1,Q1,withinwt_ea,withinwt_hh,Combinwt_old_ea,Combinwt_new_hh\nA1,2,10,North,1,1,1,1,1\nA2,2,10,North,2,2,2,2,2\nA3,2,10,North,1,,,,\n",
    );
    writeFileSync(
      dictionaryPath,
      "field_name,polismart_category,non_null_rows,unique_values,note\nQ1,Survey question — map with Round 9 codebook,3,2,Authoritative wording supplied separately\n",
    );
    const mappings = [
      {
        questionCode: "Q1",
        indicatorCode: "TEST_Q1",
        indicatorName: "Explicit test indicator",
        category: "GOVERNANCE",
        responseMapping: { 1: "YES", 2: "NO" },
      },
    ];
    const analysis = await analyzeAfrobarometer({
      sourcePath,
      dictionaryPath,
      mappings,
      minimumSampleSize: 2,
    });
    assert.equal(analysis.rowsInspected, 3);
    assert.equal(analysis.rowsImported, 3);
    assert.equal(analysis.aggregateResults.length, 2);
    assert.equal(
      analysis.aggregateResults
        .find((item) => item.responseCode === "YES")
        .weightedPercentage.toFixed(2),
      "33.33",
    );
    assert.equal(analysis.aggregateResults[0].unweightedSampleSize, 2);
    assert.equal(analysis.weightingValidation.Combinwt_new_hh.missing, 1);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("supplied dataset is inspected without inventing question mappings", async () => {
  const root = process.cwd();
  const analysis = await analyzeAfrobarometer({
    sourcePath: path.join(root, "data/raw/polismart_afrobarometer_mvp_cleaned.csv"),
    dictionaryPath: path.join(root, "data/raw/polismart_afrobarometer_data_dictionary.csv"),
    mappings: [],
  });
  assert.equal(analysis.rowsInspected, 54803);
  assert.equal(analysis.rowsImported, 53444);
  assert.equal(analysis.rejectedRows, 1359);
  assert.equal(analysis.unmappedQuestionCodes.length, 324);
  assert.equal(analysis.aggregateResults.length, 0);
  assert.equal(analysis.weightingValidation.Combinwt_new_hh.invalid, 0);
  assert.equal(analysis.weightingValidation.Combinwt_new_hh.zeroOrNegative, 0);
});

test("official Round 9 mapping produces safeguarded public-priority aggregates", async () => {
  const root = process.cwd();
  const analysis = await analyzeAfrobarometer({
    sourcePath: path.join(root, "data/raw/polismart_afrobarometer_mvp_cleaned.csv"),
    dictionaryPath: path.join(root, "data/raw/polismart_afrobarometer_data_dictionary.csv"),
    mappings: AFROBAROMETER_INDICATOR_MAPPINGS,
  });
  assert.equal(analysis.rowsInspected, 54803);
  assert.equal(analysis.rowsImported, 53444);
  assert.equal(analysis.rejectedRows, 1359);
  assert.equal(analysis.countries.length, 39);
  assert.equal(analysis.unmappedQuestionCodes.length, 312);
  assert.ok(analysis.aggregateResults.length > 0);
  assert.ok(
    analysis.aggregateResults
      .filter((result) => !result.isSuppressed)
      .every((result) => result.unweightedSampleSize >= 100),
  );
  assert.ok(
    analysis.aggregateResults.some((result) => result.responseCode === "Management of the economy"),
  );
  const requiredCategories = [
    "PUBLIC_PRIORITIES",
    "ECONOMIC_CONDITIONS",
    "GOVERNMENT_PERFORMANCE",
    "INSTITUTIONAL_TRUST",
    "DEMOCRACY",
    "GOVERNANCE",
    "CORRUPTION",
    "PUBLIC_SERVICES",
    "ELECTIONS",
    "YOUTH",
    "SECURITY",
    "CIVIC_PARTICIPATION",
  ];
  assert.deepEqual(
    [...new Set(AFROBAROMETER_INDICATOR_MAPPINGS.map((mapping) => mapping.category))].sort(),
    requiredCategories.sort(),
  );
  for (const mapping of AFROBAROMETER_INDICATOR_MAPPINGS) {
    assert.ok(mapping.questionText);
    assert.ok(Object.keys(mapping.responseMapping).length > 0);
    assert.equal(analysis.unmappedQuestionCodes.includes(mapping.questionCode), false);
  }
  assert.equal(AFROBAROMETER_MAPPING_VERSION, "r9-merged-codebook-2024-06-25-v3");
  assert.deepEqual(
    [...new Set(AFROBAROMETER_INDICATOR_MAPPINGS.map((mapping) => mapping.category))].sort(),
    [...AFROBAROMETER_INTELLIGENCE_CATEGORIES].sort(),
  );
  for (const category of AFROBAROMETER_INTELLIGENCE_CATEGORIES) {
    const indicators = new Set(
      AFROBAROMETER_INDICATOR_MAPPINGS
        .filter((mapping) => mapping.category === category)
        .map((mapping) => mapping.indicatorCode),
    );
    const results = analysis.aggregateResults.filter((result) =>
      indicators.has(result.indicatorCode),
    );
    assert.ok(results.length > 0, `${category} must have aggregate coverage`);
    assert.ok(results.every((result) => result.weightField === "Combinwt_new_hh"));
    assert.ok(
      results.filter((result) => !result.isSuppressed).every((result) => result.unweightedSampleSize >= 100),
    );
  }
});

test("repeat imports are idempotent by source hash", async () => {
  let transactions = 0;
  const prisma = {
    surveyImport: { findUnique: async () => ({ id: "import-existing", rowsImported: 54398 }) },
    surveyAggregateResult: { count: async () => 0 },
    $transaction: async () => {
      transactions += 1;
    },
  };
  const result = await persistAfrobarometer(
    prisma,
    { sourceSha256: "same-hash" },
    { sourceFile: "source.csv", dictionaryFile: "dictionary.csv" },
  );
  assert.deepEqual(result, {
    idempotent: true,
    importId: "import-existing",
    rowsImported: 54398,
    aggregateCount: 0,
  });
  assert.equal(transactions, 0);
});

test("public intelligence API exposes aggregate results only with safeguards", async () => {
  let input;
  const repository = {
    listAggregates: async (value) => {
      input = value;
      return [{ country: "Demo", weightedPercentage: 52.5, unweightedSampleSize: 150 }];
    },
    latestImport: async () => null,
  };
  const app = express();
  app.use((req, _res, next) => {
    req.auth = { user: { memberships: [{ tenantId: "org-a", role: "ANALYST" }] } };
    next();
  });
  app.use("/intelligence", createPublicIntelligenceRouter(repository));
  app.use((error, _req, res, _next) =>
    res.status(error.status || 500).json({ message: error.message }),
  );
  const response = await request(app)
    .get("/intelligence/afrobarometer?category=governance")
    .set("X-Organization-Id", "org-a")
    .expect(200);
  assert.equal(response.body.aggregateOnly, true);
  assert.equal(response.body.minimumSampleSize, 100);
  assert.equal("responses" in response.body, false);
  assert.equal(input.minimumSampleSize, 100);
});

test("public intelligence API passes an explicit country filter to aggregate storage", async () => {
  let input;
  const repository = {
    listAggregates: async (value) => {
      input = value;
      return [];
    },
    latestImport: async () => null,
  };
  const app = express();
  app.use((req, _res, next) => {
    req.auth = { user: { memberships: [{ tenantId: "org-a", role: "ANALYST" }] } };
    next();
  });
  app.use("/intelligence", createPublicIntelligenceRouter(repository));
  await request(app)
    .get("/intelligence/afrobarometer?category=ELECTIONS&country=Kenya&round=9")
    .set("X-Organization-Id", "org-a")
    .expect(200);
  assert.equal(input.category, "ELECTIONS");
  assert.equal(input.country, "Kenya");
  assert.equal(input.surveyRound, "9");
});

test("public intelligence API safely reports aggregate storage failures", async () => {
  const repository = {
    listAggregates: async () => {
      throw Object.assign(new Error("database connection details"), { code: "P1001" });
    },
    latestImport: async () => null,
  };
  const app = express();
  app.use((req, _res, next) => {
    req.auth = { user: { memberships: [{ tenantId: "org-a", role: "ANALYST" }] } };
    next();
  });
  app.use("/intelligence", createPublicIntelligenceRouter(repository));
  app.use((error, _req, res, _next) =>
    res.status(error.status || 500).json({ message: error.message }),
  );
  const response = await request(app)
    .get("/intelligence/afrobarometer")
    .set("X-Organization-Id", "org-a")
    .expect(503);
  assert.equal(response.body.message, "Public intelligence data is temporarily unavailable.");
  assert.doesNotMatch(response.body.message, /database|P1001/i);
});
