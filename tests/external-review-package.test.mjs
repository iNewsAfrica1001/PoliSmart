import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageText = fs.readFileSync(
  path.join(root, "docs", "V1_1_LEGAL_PRIVACY_HR_EXTERNAL_REVIEW_PACKAGE.md"),
  "utf8",
);

test("external review package Draft 2 documents the bounded WhatsApp data flow", () => {
  assert.match(packageText, /\| Version \| V1\.1 Draft 2 \|/);
  assert.match(packageText, /\| Document date \| 13 September 2026 \|/);
  assert.match(packageText, /WhatsApp \/ Meta/);
  assert.match(packageText, /No message is sent automatically/);
  assert.match(packageText, /no WhatsApp API, webhook, chatbot, contact import, bulk messaging, payment, fundraising, or political-targeting integration/i);
  assert.match(packageText, /does not return WhatsApp conversation content to PoliSmart/);
  assert.match(packageText, /potential cross-border processing/);
  assert.match(packageText, /provider and user-account retention periods are unverified/);
  assert.match(packageText, /applicable provider rights route/);
  assert.match(packageText, /public Privacy Notice and collection-point disclosure must be reviewed/);
  assert.match(packageText, /electronic communication/);
  assert.match(packageText, /Nigeria and every other proposed jurisdiction require written jurisdiction-specific review/);
});

test("WhatsApp disclosure preserves every open governance issue and release boundary", () => {
  const lhrRows = [...packageText.matchAll(/^\| LHR-(\d{3}) \|.*\| OPEN \|/gm)];
  const delRows = [...packageText.matchAll(/^\| DEL-(\d{3}) \|.*\| OPEN \|/gm)];

  assert.deepEqual(lhrRows.map((match) => match[1]), Array.from({ length: 18 }, (_, index) => String(index + 1).padStart(3, "0")));
  assert.deepEqual(delRows.map((match) => match[1]), Array.from({ length: 18 }, (_, index) => String(index + 1).padStart(3, "0")));
  assert.match(packageText, /\| Production decision \| NO-GO \|/);
  assert.match(packageText, /\| Payments in V1\.1 \| NO \|/);
  assert.match(packageText, /\| Nigeria Fundraising enabled \| NO \|/);
  assert.doesNotMatch(packageText, /\| (?:Legal|Privacy|HR) approval \| (?:APPROVED|CLOSED) \|/);
});
