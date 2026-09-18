import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import express from "express";
import request from "supertest";
import { loadConfig, parseFeatureFlag } from "../server/config/env.js";
import { createFundraisingRouter } from "../server/routes/fundraising.js";
import {
  createFeatureAvailabilityRouter,
  createReservedBillingRouter,
} from "../server/routes/features.js";

const withEnvironment = (values, callback) => {
  const previous = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) Reflect.deleteProperty(process.env, key);
    else process.env[key] = value;
  }
  try {
    return callback();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) Reflect.deleteProperty(process.env, key);
      else process.env[key] = value;
    }
  }
};

test("financial feature flags fail closed and require an explicit true value", () => {
  assert.equal(parseFeatureFlag(undefined), false);
  assert.equal(parseFeatureFlag("false"), false);
  assert.equal(parseFeatureFlag("1"), false);
  assert.equal(parseFeatureFlag(" true "), true);
  withEnvironment(
    { BILLING_ENABLED: undefined, FUNDRAISING_ENABLED: undefined },
    () => {
      const config = loadConfig(process.cwd());
      assert.deepEqual(config.features, { billing: false, fundraising: false });
    },
  );
});

test("availability endpoint exposes only server-controlled booleans and Free Early Access", async () => {
  const app = express();
  app.use(
    "/features",
    createFeatureAvailabilityRouter({ billing: false, fundraising: false }),
  );
  const response = await request(app).get("/features").expect(200);
  assert.deepEqual(response.body, {
    features: { billing: false, fundraising: false },
    access: "FREE_EARLY_ACCESS",
  });
});

test("disabled Billing blocks every API method before any payment operation can run", async () => {
  const app = express();
  app.use(express.json());
  app.use("/billing", createReservedBillingRouter(false));
  for (const operation of [
    request(app).get("/billing"),
    request(app).post("/billing/checkout").send({ plan: "paid" }),
    request(app).patch("/billing/subscription").send({ action: "activate" }),
  ]) {
    const response = await operation.expect(404);
    assert.equal(response.body.code, "FEATURE_DISABLED");
    assert.equal(response.body.feature, "billing");
  }
});

test("disabled Fundraising blocks reads and mutations before authentication or repository access", async () => {
  let calls = 0;
  const repository = new Proxy(
    {},
    {
      get() {
        return async () => {
          calls += 1;
          return {};
        };
      },
    },
  );
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.auth = {
      user: {
        id: "user-a",
        memberships: [{ tenantId: "org-a", role: "SUPER_ADMINISTRATOR" }],
      },
    };
    next();
  });
  app.use("/fundraising", createFundraisingRouter(repository, { enabled: false }));
  const headers = { "X-Organization-Id": "org-a" };
  const operations = [
    request(app).get("/fundraising/campaign-a").set(headers),
    request(app).post("/fundraising/campaign-a/goals").set(headers).send({ title: "Blocked" }),
    request(app).post("/fundraising/campaign-a/contributions").set(headers).send({ amount: "10" }),
    request(app).patch("/fundraising/campaign-a/contributions/item-a/status").set(headers).send({ status: "CONFIRMED" }),
    request(app).post("/fundraising/campaign-a/goals/item-a/archive").set(headers),
  ];
  for (const operation of operations) {
    const response = await operation.expect(404);
    assert.equal(response.body.code, "FEATURE_DISABLED");
    assert.equal(response.body.feature, "fundraising");
  }
  assert.equal(calls, 0);
});

test("disabled financial features are hidden and direct client routes render a controlled block", () => {
  const app = readFileSync("src/App.tsx", "utf8");
  const shell = readFileSync("src/components/layout/AppShell.tsx", "utf8");
  const navigation = readFileSync("src/config/navigation.ts", "utf8");
  const features = readFileSync("src/lib/features.ts", "utf8");
  assert.match(navigation, /page: "billing"[\s\S]*feature: "billing"/);
  assert.match(navigation, /page: "fundraising"[\s\S]*feature: "fundraising"/);
  assert.match(shell, /!item\.feature \|\| features\[item\.feature\] === true/);
  assert.match(app, /window\.location\.pathname === "\/billing"/);
  assert.match(app, /window\.location\.pathname === "\/fundraising"/);
  assert.match(app, /Feature unavailable/);
  assert.match(app, /features\.fundraising/);
  assert.match(features, /billing: false/);
  assert.match(features, /fundraising: false/);
});

test("disabled Fundraising is also excluded from Workspace Search", () => {
  const route = readFileSync("server/routes/workspaceSearch.js", "utf8");
  assert.match(
    route,
    /fundraisingEnabled === true && permitted\(PERMISSIONS\.FUNDRAISING_READ\)/,
  );
});

test("public and user documentation accurately describe the free non-financial scope", () => {
  const homepage = readFileSync("src/pages/MarketingHomePage.tsx", "utf8");
  const production = readFileSync("docs/PRODUCTION.md", "utf8");
  const environment = readFileSync(".env.example", "utf8");
  assert.match(homepage, /Free Early Access/);
  assert.match(homepage, /Paid plans will be introduced in a future release/);
  assert.match(homepage, /Fundraising<\/h3>/);
  assert.match(homepage, /Campaign contribution processing is not currently available/);
  assert.match(production, /BILLING_ENABLED=false/);
  assert.match(production, /FUNDRAISING_ENABLED=false/);
  assert.match(production, /External[\s\S]*legal\/privacy\/human-rights review remains pending/);
  assert.match(environment, /^BILLING_ENABLED=false$/m);
  assert.match(environment, /^FUNDRAISING_ENABLED=false$/m);
});
