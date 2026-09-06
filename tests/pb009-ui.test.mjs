import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const shell = read("src", "components", "layout", "AppShell.tsx");
const dashboard = read("src", "pages", "DashboardPage.tsx");
const assistant = read("src", "pages", "AssistantPage.tsx");

test("workspace search is visibly deferred and cannot appear interactive", () => {
  assert.match(shell, /Workspace search coming soon/);
  assert.match(shell, /Search workspace/);
  assert.match(shell, /COMING SOON/);
  assert.doesNotMatch(shell, /id="global-search"/);
});

test("dashboard refresh announces progress and prevents duplicate requests", () => {
  assert.match(dashboard, /refreshInFlight\.current/);
  assert.match(dashboard, /announceRefresh && refreshInFlight\.current/);
  assert.match(dashboard, /onClick=\{\(\) => void load\(true\)\}/);
  assert.match(dashboard, /disabled=\{loading\}/);
  assert.match(dashboard, /Refreshing campaign intelligence/);
  assert.match(dashboard, /Updated just now/);
  assert.match(dashboard, /Unable to refresh\. Try again\./);
});

test("helpful and incorrect feedback expose pending selected success and safe error states", () => {
  for (const type of ["HELPFUL", "INCORRECT"]) {
    assert.match(assistant, new RegExp(`submitFeedback\\("${type}"\\)`));
    assert.match(assistant, new RegExp(`feedbackType === "${type}"`));
    assert.match(assistant, new RegExp(`pendingFeedback === "${type}"`));
  }
  assert.match(assistant, /Thanks for your feedback\./);
  assert.match(assistant, /Unable to save feedback\. Try again\./);
  assert.match(assistant, /aria-live="polite"/);
});

test("report requires affirmative confirmation and collects no free text", () => {
  assert.match(assistant, /Report this AI answer for review\?/);
  assert.match(assistant, /No additional information will be collected\./);
  assert.match(assistant, /onClick=\{\(\) => setReportOpen\(false\)\}/);
  assert.match(assistant, /onClick=\{\(\) => void submitFeedback\("REPORT"\)\}/);
  assert.match(assistant, /Answer reported for review\./);
  assert.doesNotMatch(assistant, /feedback-note|report-note/);
});

test("feedback duplicate submission is guarded without changing backend boundaries", () => {
  assert.match(assistant, /feedbackInFlight\.current/);
  assert.match(assistant, /if \(!answer \|\| feedbackInFlight\.current\) return/);
  assert.match(assistant, /await assistantApi\.feedback\(tenantId, answer\.messageId, type\)/);
});
