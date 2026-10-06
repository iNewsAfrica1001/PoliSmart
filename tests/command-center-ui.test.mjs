import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("src/pages/DashboardPage.tsx", "utf8");
const api = readFileSync("src/lib/commandCenter.ts", "utf8");

test("Command Center sends only tenant-scoped campaign and assigned-area filters", () => {
  assert.match(api, /X-Organization-Id/);
  assert.match(api, /geographicAreaId/);
  assert.doesNotMatch(api, /query\.set\("country"/);
  assert.doesNotMatch(api, /campaign-geography.*(?:assign|deactivate)/i);
});

test("Command Center displays authoritative campaign country and fail-closed unassigned state", () => {
  assert.match(page, /aria-readonly="true"/);
  assert.match(page, /Campaign geography not configured/);
  assert.match(page, /No geographic areas are assigned to this campaign/);
  assert.match(page, /authorized administrators can configure choices in Campaign Geography/);
  assert.match(page, /disabled=\{!campaignId \|\| loading \|\| areas\.length === 0\}/);
  assert.doesNotMatch(page, /onChange=\{\(event\) => setCountry/);
});

test("Command Center clears stale assigned-area selections and preserves accessible states", () => {
  assert.match(page, /!result\.geography\.some\(\(area\) => area\.id === areaId\)/);
  assert.match(page, /if \(areaId\) setAreaId\(""\)/);
  assert.match(page, /const requestId = \+\+loadRequest\.current/);
  assert.match(page, /requestId !== loadRequest\.current/);
  assert.match(page, /setAreas\(\[\]\)/);
  assert.match(page, /role="status"/);
  assert.match(page, /role="alert"/);
  assert.match(page, /All assigned geographic areas/);
});
