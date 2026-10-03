import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync(
  "prisma/migrations/0019_privacy_operations_controls/migration.sql",
  "utf8",
);

test("privacy case campaign scope is structurally tenant bound", () => {
  assert.match(
    sql,
    /UNIQUE INDEX "campaigns_tenant_id_id_key" ON "campaigns"\("tenant_id", "id"\)/,
  );
  assert.match(
    sql,
    /FOREIGN KEY \("tenant_id", "campaign_id"\) REFERENCES "campaigns"\("tenant_id", "id"\)/,
  );
});
test("case identity is structurally unique across tenant and campaign", () => {
  assert.match(sql, /UNIQUE INDEX "privacy_rights_cases_tenant_id_campaign_id_id_key"/);
});
test("case events are structurally case, tenant, and campaign bound", () => {
  assert.match(
    sql,
    /privacy_case_events_tenant_id_campaign_id_case_id_fkey[\s\S]*FOREIGN KEY \("tenant_id", "campaign_id", "case_id"\)[\s\S]*REFERENCES "privacy_rights_cases"\("tenant_id", "campaign_id", "id"\)/,
  );
});
test("suppressions are structurally case, tenant, and campaign bound", () => {
  assert.match(
    sql,
    /privacy_suppressions_tenant_id_campaign_id_case_id_fkey[\s\S]*FOREIGN KEY \("tenant_id", "campaign_id", "case_id"\)[\s\S]*REFERENCES "privacy_rights_cases"\("tenant_id", "campaign_id", "id"\)/,
  );
});
test("legal holds are structurally case, tenant, and campaign bound", () => {
  assert.match(
    sql,
    /privacy_legal_holds_tenant_id_campaign_id_case_id_fkey[\s\S]*FOREIGN KEY \("tenant_id", "campaign_id", "case_id"\)[\s\S]*REFERENCES "privacy_rights_cases"\("tenant_id", "campaign_id", "id"\)/,
  );
});
test("corrected unapplied migration remains additive and contains no data mutation", () => {
  assert.doesNotMatch(sql, /\b(?:DROP|TRUNCATE|DELETE\s+FROM)\b/i);
  assert.doesNotMatch(sql, /^UPDATE\s+/im);
  assert.match(sql, /CREATE TABLE "privacy_rights_cases"/);
});

test("unresolved suppression and legal-hold authority remains database read-only", () => {
  assert.match(sql, /GRANT SELECT ON TABLE "privacy_suppressions", "privacy_legal_holds"/);
  assert.doesNotMatch(sql, /GRANT (?:INSERT|UPDATE)[^;]*"privacy_(?:suppressions|legal_holds)"/i);
});
