import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("src/pages/PrelaunchLeadReviewPage.tsx", "utf8");
const client = readFileSync("src/lib/prelaunchAdmin.ts", "utf8");
const search = readFileSync("server/repositories/workspaceSearchRepository.js", "utf8");
const ai = readFileSync("server/services/aiAssistant.js", "utf8");

test("protected lead detail contains an accessible bounded follow-up form", () => {
  assert.match(page, /selected && <section/);
  assert.match(page, /aria-labelledby="follow-up-heading"/);
  assert.match(page, /htmlFor="follow-up-note"/);
  assert.match(page, /<textarea[^>]*maxLength=\{MAX_FOLLOW_UP_NOTE\}/);
  assert.match(page, /characters remaining/);
  assert.match(page, /htmlFor="follow-up-time"/);
  assert.match(page, /type="datetime-local"/);
  assert.match(page, /role="alert"/);
  assert.match(page, /role="status"/);
});

test("form validation blocks invalid drafts and sends only note and ISO scheduledAt", () => {
  assert.match(page, /if \(!trimmed\) return "Enter a follow-up note/);
  assert.match(page, /trimmed\.length > MAX_FOLLOW_UP_NOTE/);
  assert.match(page, /Number\.isNaN\(scheduledAt\.getTime\(\)\)/);
  assert.match(page, /scheduledAt\.getTime\(\) <= Date\.now\(\)/);
  assert.match(page, /if \(!selected \|\| submittingFollowUp\) return/);
  assert.match(page, /note: followUpNote\.trim\(\), scheduledAt: new Date\(scheduledLocal\)\.toISOString\(\)/);
  const creation = client.slice(client.indexOf("createFollowUp:"), client.indexOf("completeFollowUp:"));
  assert.doesNotMatch(creation, /createdById|completedAt|completedById|status/);
});

test("successful creation clears and refreshes while failure preserves draft values", () => {
  const handler = page.slice(page.indexOf("const createFollowUp"), page.indexOf("const completeFollowUp"));
  assert.match(handler, /setFollowUpNote\(""\)/);
  assert.match(handler, /setScheduledLocal\(""\)/);
  assert.match(handler, /Promise\.all\(\[loadFollowUps\(selected\.id\), load\(\)\]\)/);
  const catchBlock = handler.slice(handler.indexOf("} catch"), handler.indexOf("} finally"));
  assert.doesNotMatch(catchBlock, /setFollowUpNote|setScheduledLocal/);
  assert.match(catchBlock, /entries have been preserved/);
});

test("history preserves API order, shows safe attribution, and offers completion only", () => {
  assert.match(page, /followUps\.map\(\(followUp\) =>/);
  assert.doesNotMatch(page, /followUps\.sort/);
  assert.match(page, /followUp\.createdBy\.displayName/);
  assert.match(page, /followUp\.completedBy\.displayName/);
  assert.match(page, /!followUp\.completedAt && <button/);
  assert.match(page, /window\.confirm/);
  assert.match(page, /status === 409/);
  assert.match(page, /This follow-up was already completed/);
  assert.match(page, /status === 404/);
  assert.doesNotMatch(page, />\s*(?:Edit|Delete)\s*</i);
});

test("completion client sends an empty PATCH without client identity or timestamp", () => {
  const completion = client.slice(client.indexOf("completeFollowUp:"));
  assert.match(completion, /method: "PATCH"/);
  assert.doesNotMatch(completion, /body:/);
  assert.doesNotMatch(completion, /completedById|completedAt|createdById/);
});

test("lead list has semantic summaries and deterministic client-side filtering without notes", () => {
  assert.match(page, /"ALL", "OVERDUE", "UPCOMING", "NONE"/);
  assert.match(page, /leads\.filter\(\(lead\) => lead\.followUpState === followUpFilter\)/);
  assert.match(page, /"NO FOLLOW-UP"/);
  assert.match(page, /lead\.nextFollowUp\.scheduledAt/);
  const cardStart = page.indexOf('<button key={lead.id} className="lead-card"');
  const card = page.slice(cardStart, page.indexOf("</button>", cardStart));
  assert.doesNotMatch(card, /followUp\.note|nextFollowUp\.note/);
});

test("follow-ups remain excluded from Workspace Search and AI grounding", () => {
  assert.doesNotMatch(search, /prelaunchLead|leadFollowUp/i);
  assert.doesNotMatch(ai, /prelaunchLead|leadFollowUp/i);
});
