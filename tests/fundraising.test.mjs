import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import express from "express";
import request from "supertest";
import { createFundraisingRouter } from "../server/routes/fundraising.js";
import { createCampaignRouter } from "../server/routes/campaigns.js";
import { createFundraisingRepository } from "../server/repositories/fundraisingRepository.js";
import { createCampaignRepository } from "../server/repositories/campaignRepository.js";
import { hasPermission } from "../server/services/authorization.js";
import { PERMISSIONS } from "../server/config/authorization.js";
import {
  currencyForCountry,
  formatCurrencyAmount,
  isSupportedFundraisingCurrency,
} from "../shared/currencies.js";

function appFor(role, repository, tenantId = "org-a") {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (role) req.auth = { user: { id: "user-a", memberships: [{ tenantId, role }] } };
    next();
  });
  app.use("/fundraising", createFundraisingRouter(repository));
  app.use((error, _req, response, _next) => response.status(error.status || 500).json({ message: error.message }));
  return app;
}

test("fundraising API requires authentication, organization membership, and read permission", async () => {
  const calls = [];
  const repository = { overview: async (...args) => { calls.push(args); return { goals: [] }; } };
  await request(appFor(null, repository)).get("/fundraising/campaign-a").set("X-Organization-Id", "org-a").expect(401);
  await request(appFor("VOLUNTEER", repository)).get("/fundraising/campaign-a").set("X-Organization-Id", "org-a").expect(403);
  await request(appFor("CAMPAIGN_ADMINISTRATOR", repository)).get("/fundraising/campaign-a").set("X-Organization-Id", "org-b").expect(403);
  await request(appFor("CAMPAIGN_MANAGER", repository)).get("/fundraising/campaign-a").set("X-Organization-Id", "org-a").expect(200);
  assert.deepEqual(calls, [["org-a", "campaign-a"]]);
});

test("fundraising manage and archive permissions are narrow and do not change platform administration", async () => {
  const calls = [];
  const repository = {
    create: async (...args) => { calls.push(["create", ...args]); return { id: "goal-a" }; },
    archive: async (...args) => { calls.push(["archive", ...args]); return { count: 1 }; },
  };
  const payload = { title: "Community support", targetAmount: "1000.00", currency: "USD" };
  await request(appFor("CAMPAIGN_MANAGER", repository)).post("/fundraising/campaign-a/goals").set("X-Organization-Id", "org-a").send(payload).expect(201);
  await request(appFor("CAMPAIGN_MANAGER", repository)).post("/fundraising/campaign-a/goals/goal-a/archive").set("X-Organization-Id", "org-a").expect(403);
  await request(appFor("CAMPAIGN_ADMINISTRATOR", repository)).post("/fundraising/campaign-a/goals/goal-a/archive").set("X-Organization-Id", "org-a").expect(200);
  assert.equal(hasPermission({ role: "CAMPAIGN_ADMINISTRATOR" }, PERMISSIONS.PLATFORM_USERS_MANAGE), false);
  assert.deepEqual(calls[0].slice(1, 4), ["org-a", "campaign-a", "user-a"]);
  assert.equal(calls.filter(([action]) => action === "archive").length, 1);
});

test("fundraising history has an independent server-side permission", async () => {
  const repository = { listHistory: async () => [] };
  await request(appFor("CAMPAIGN_MANAGER", repository)).get("/fundraising/campaign-a/history").set("X-Organization-Id", "org-a").expect(200);
  await request(appFor("CANDIDATE", repository)).get("/fundraising/campaign-a/history").set("X-Organization-Id", "org-a").expect(403);
});

test("repository verifies campaign and contact scope and records non-sensitive history", async () => {
  const history = [];
  const created = [];
  const transaction = {
    campaign: { count: async ({ where }) => where.tenantId === "org-a" && where.id === "campaign-a" ? 1 : 0 },
    fundraisingContact: { count: async ({ where }) => where.tenantId === "org-a" && where.campaignId === "campaign-a" && where.id === "contact-a" ? 1 : 0 },
    fundraisingGoal: { count: async ({ where }) => where.tenantId === "org-a" && where.campaignId === "campaign-a" && where.id === "goal-a" ? 1 : 0 },
    fundraisingContribution: { create: async ({ data }) => { created.push(data); return { id: "contribution-a", ...data }; } },
    fundraisingHistory: { create: async ({ data }) => { history.push(data); return data; } },
  };
  const database = { ...transaction, $transaction: async (work) => work(transaction) };
  const repository = createFundraisingRepository(database);
  await repository.create("org-a", "campaign-a", "user-a", "contributions", { contactId: "contact-a", goalId: "goal-a", amount: "25.00", currency: "USD", contributedAt: new Date(), status: "CONFIRMED", sourceMethod: "External transfer" });
  assert.equal(created[0].tenantId, "org-a");
  assert.equal(created[0].campaignId, "campaign-a");
  assert.deepEqual(history[0].changes.fields.sort(), ["amount", "contactId", "goalId", "currency", "contributedAt", "sourceMethod", "status"].sort());
  await assert.rejects(() => repository.create("org-a", "foreign-campaign", "user-a", "contributions", { contactId: "contact-a" }), /Campaign not found/);
});

test("fundraising schema migration is additive and contains no payment credentials or destructive SQL", () => {
  const migration = readFileSync("prisma/migrations/0010_fundraising_management/migration.sql", "utf8");
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  assert.doesNotMatch(migration, /\b(DROP|TRUNCATE|DELETE FROM|ALTER TABLE .* DROP)\b/i);
  assert.match(migration, /fundraising_goals/);
  assert.match(migration, /fundraising_history/);
  assert.doesNotMatch(migration + schema, /card_number|cvv|bank_account|payment_token|stripe|paypal|paystack|flutterwave/i);
});

test("fundraising is excluded from AI and donor profiling and is permission filtered in search", () => {
  const searchRoute = readFileSync("server/routes/workspaceSearch.js", "utf8");
  const searchRepository = readFileSync("server/repositories/workspaceSearchRepository.js", "utf8");
  const ai = readFileSync("server/services/aiAssistant.js", "utf8");
  assert.match(searchRoute, /FUNDRAISING_READ/);
  assert.match(searchRepository, /permissions\.fundraising/);
  assert.match(searchRepository, /fundraisingGoal/);
  assert.doesNotMatch(searchRepository, /fundraisingContact/);
  assert.doesNotMatch(ai, /fundraising|donor/i);
  assert.doesNotMatch(searchRepository, /OpenAI|embedding/i);
});

test("fundraising UI is permission-aware, accessible, campaign-scoped, and preserves deferred modules", () => {
  const page = readFileSync("src/pages/FundraisingPage.tsx", "utf8");
  const shell = readFileSync("src/components/layout/AppShell.tsx", "utf8");
  const navigation = readFileSync("src/config/navigation.ts", "utf8");
  const app = readFileSync("src/App.tsx", "utf8");
  assert.match(page, /canManageFundraising/);
  assert.match(page, /canArchiveFundraising/);
  assert.match(page, /Campaign context/);
  assert.match(page, /Campaign:<\/dt>/);
  assert.match(page, /Country:<\/dt>/);
  assert.match(page, /Default currency:<\/dt>/);
  assert.match(page, /selectCampaign\(event\.target\.value\)/);
  assert.match(page, /setSelectedCurrency\(currencyForCountry\(nextCampaign\?\.country/);
  assert.match(page, /does not process contributions/);
  assert.match(page, /do not enter sensitive personal information/i);
  assert.match(page, /CurrencySelector/);
  assert.match(page, /activities: "activity"/);
  assert.match(page, /New \{singularLabels\[section\]\}/);
  assert.doesNotMatch(page, /labels\[section\]\.slice\(0, -1\)/);
  assert.match(page, /SUPPORTED_FUNDRAISING_CURRENCIES/);
  assert.match(page, /PoliSmart does not convert currencies/);
  assert.doesNotMatch(page, /placeholder="USD"/);
  assert.match(shell, /canReadFundraising/);
  assert.match(app, /FundraisingPage/);
  assert.match(navigation, /label: "Reports"[\s\S]*enabled: false/);
  assert.match(navigation, /label: "Billing"[\s\S]*enabled: false/);
});

test("African campaign countries resolve to their local ISO currencies", () => {
  assert.equal(currencyForCountry("Nigeria"), "NGN");
  assert.equal(currencyForCountry("Ghana"), "GHS");
  assert.equal(currencyForCountry("Kenya"), "KES");
  assert.equal(currencyForCountry("South Africa"), "ZAR");
  assert.equal(currencyForCountry("United States"), "USD");
  assert.equal(currencyForCountry("Côte d’Ivoire"), "XOF");
  assert.equal(currencyForCountry("Unknown"), "");
  assert.equal(isSupportedFundraisingCurrency("USD"), true);
  assert.equal(formatCurrencyAmount("NGN", 250000), "NGN 250,000");
});

test("the real campaign-list DTO includes country and drives the fundraising default", async () => {
  let query;
  const source = {
    id: "campaign-manifestos",
    name: "Manifestos",
    status: "ACTIVE",
    country: "Nigeria",
    electionType: "General election",
    startsAt: null,
    endsAt: null,
  };
  const repository = createCampaignRepository({
    campaign: {
      findMany: async (options) => {
        query = options;
        return [Object.fromEntries(Object.keys(options.select).map((field) => [field, source[field]]))];
      },
    },
  });
  const campaigns = await repository.listForTenant("org-a");
  assert.equal(query.select.country, true);
  assert.deepEqual(campaigns, [source]);
  assert.equal(currencyForCountry(campaigns[0].country), "NGN");

  const app = express();
  app.use((request, _response, next) => {
    request.auth = { user: { id: "user-a", memberships: [{ tenantId: "org-a", role: "CAMPAIGN_MANAGER" }] } };
    next();
  });
  app.use("/campaigns", createCampaignRouter(repository));
  const response = await request(app).get("/campaigns").set("X-Organization-Id", "org-a").expect(200);
  assert.equal(response.body.campaigns[0].country, "Nigeria");
  assert.equal(currencyForCountry(response.body.campaigns[0].country), "NGN");
});

test("goal progress and totals never aggregate different currencies", async () => {
  const database = {
    campaign: { count: async () => 1 },
    fundraisingGoal: { findMany: async () => [{ id: "goal-a", currency: "NGN", targetAmount: 1000 }] },
    fundraisingContact: { findMany: async () => [] },
    fundraisingContribution: { findMany: async () => [
      { id: "ngn", goalId: "goal-a", status: "CONFIRMED", currency: "NGN", amount: 250 },
      { id: "usd", goalId: "goal-a", status: "CONFIRMED", currency: "USD", amount: 100 },
    ] },
    fundraisingActivity: { findMany: async () => [] },
    fundraisingFollowUp: { findMany: async () => [] },
  };
  const overview = await createFundraisingRepository(database).overview("org-a", "campaign-a");
  assert.equal(overview.goals[0].confirmedAmount, 250);
  assert.deepEqual(overview.confirmedTotals, [
    { currency: "NGN", amount: 250 },
    { currency: "USD", amount: 100 },
  ]);
});

test("fundraising API accepts legacy USD but rejects unsupported currency codes", async () => {
  const calls = [];
  const repository = { create: async (...args) => { calls.push(args); return { id: "goal-a" }; } };
  const payload = { title: "Community support", targetAmount: "1000.00" };
  await request(appFor("CAMPAIGN_MANAGER", repository)).post("/fundraising/campaign-a/goals").set("X-Organization-Id", "org-a").send({ ...payload, currency: "USD" }).expect(201);
  await request(appFor("CAMPAIGN_MANAGER", repository)).post("/fundraising/campaign-a/goals").set("X-Organization-Id", "org-a").send({ ...payload, currency: "ZZZ" }).expect(400);
  assert.equal(calls.length, 1);
});
