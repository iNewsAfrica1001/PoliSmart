import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync(
  "prisma/migrations/0020_campaign_geography_master_assignment_schema/migration.sql",
  "utf8",
);

test("master geography models expose the reviewed identity and hierarchy constraints", () => {
  assert.match(schema, /model MasterGeographicLevel[\s\S]*@@unique\(\[countryCode, name\]\)[\s\S]*@@unique\(\[countryCode, orderIndex\]\)[\s\S]*@@index\(\[countryCode, isActive, orderIndex\]\)/);
  assert.match(schema, /model MasterGeographicArea[\s\S]*@@unique\(\[countryCode, levelId, code\]\)[\s\S]*@@unique\(\[levelId, parentId, name\]\)/);
  assert.match(schema, /level\s+MasterGeographicLevel[\s\S]*fields: \[levelId, countryCode\][\s\S]*references: \[id, countryCode\][\s\S]*onDelete: Restrict/);
  assert.match(schema, /parent\s+MasterGeographicArea\?[\s\S]*fields: \[parentId, countryCode\][\s\S]*references: \[id, countryCode\][\s\S]*onDelete: Restrict/);
  assert.match(schema, /assignments\s+CampaignGeographicAssignment\[\]/);
  assert.match(migration, /master_geographic_areas_root_level_id_name_key[\s\S]*WHERE "parent_id" IS NULL/);
});

test("campaign assignment uses composite campaign scope and restrictive references", () => {
  assert.match(schema, /model CampaignGeographicAssignment[\s\S]*@@unique\(\[tenantId, campaignId, masterGeographicAreaId\]\)/);
  assert.match(schema, /campaign\s+Campaign\s+@relation\(fields: \[tenantId, campaignId\], references: \[tenantId, id\], onDelete: Restrict\)/);
  assert.match(schema, /masterGeographicArea\s+MasterGeographicArea[\s\S]*onDelete: Restrict/);
  assert.match(schema, /createdBy\s+AuthUser[\s\S]*onDelete: Restrict/);
  assert.match(schema, /updatedBy\s+AuthUser[\s\S]*onDelete: Restrict/);
});

test("Increment 1 preserves legacy geography and creates no records", () => {
  assert.match(schema, /model GeographicLevel \{/);
  assert.match(schema, /model GeographicArea \{/);
  assert.doesNotMatch(migration, /\b(?:INSERT\s+INTO|UPDATE\s+"?\w+"?\s+SET|DELETE\s+FROM)\b/i);
  assert.doesNotMatch(migration, /ALTER\s+TABLE\s+"(?:geographic_levels|geographic_areas)"/i);
});
