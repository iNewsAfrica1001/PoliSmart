import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql = readFileSync(
  "prisma/migrations/0021_campaign_geography_assignment_controls/migration.sql",
  "utf8",
);

test("controlled functions enforce authority, campaign scope, locking, ancestry, and atomic audit", () => {
  for (const token of [
    "m.tenant_id = p_tenant_id",
    "m.user_id = p_actor_id",
    "m.status = 'ACTIVE'",
    "p.\"key\" = 'campaign-geography:manage'",
    "c.id = p_campaign_id AND c.tenant_id = p_tenant_id",
    "pg_advisory_xact_lock",
    "WITH RECURSIVE ancestry",
    "WITH RECURSIVE descendants",
    "security_audit_events",
  ]) assert.match(sql, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(sql, /ON CONFLICT \(tenant_id, campaign_id, master_geographic_area_id\) DO UPDATE/);
  assert.match(sql, /SET is_active = false, removed_at = CURRENT_TIMESTAMP/);
  assert.doesNotMatch(sql, /DELETE FROM public\.campaign_geographic_assignments/i);
});

test("SECURITY DEFINER surface is hardened against PUBLIC and search-path shadowing", () => {
  assert.equal((sql.match(/SECURITY DEFINER/g) || []).length, 2);
  assert.equal((sql.match(/SET search_path = pg_catalog, public/g) || []).length, 2);
  assert.equal((sql.match(/REVOKE ALL ON FUNCTION[\s\S]*?FROM PUBLIC/g) || []).length, 2);
  assert.equal((sql.match(/GRANT EXECUTE ON FUNCTION[\s\S]*?TO polismart_runtime/g) || []).length, 2);
  assert.doesNotMatch(sql, /\bEXECUTE\s+(?:FORMAT|IMMEDIATE)\b|format\s*\(/i);
  for (const table of ["campaigns", "memberships", "permissions", "role_permissions", "master_geographic_areas", "master_geographic_levels", "campaign_geographic_assignments", "security_audit_events"])
    assert.match(sql, new RegExp(`public\\.${table}`));
});

test("function contracts bound unique input, reject inactive masters, and block dependent removal", () => {
  assert.equal((sql.match(/v_requested_count > 500/g) || []).length, 2);
  assert.equal((sql.match(/a\.is_active AND l\.is_active/g) || []).length >= 2, true);
  assert.match(sql, /An assigned descendant prevents geographic removal/);
  assert.match(sql, /removed_at = NULL/);
});
