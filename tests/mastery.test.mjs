import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateMastery,
  classifyMastery,
  recommendNextStep,
} from "../server/services/mastery.js";
import { DIGITALBRIDGE_TUTOR_INSTRUCTION } from "../server/config/learning.js";

test("mastery calculation is deterministic and auditable", () => {
  const result = calculateMastery({
    diagnostic: 40,
    quizzes: 80,
    practicalExercises: 90,
    recentPerformance: 70,
    retention: 60,
    instructorFeedback: 100,
  });
  assert.equal(result.score, 75);
  assert.equal(result.formulaVersion, "baseline-v1");
  assert.equal(result.components.length, 6);
});

test("mastery classification honors boundary values", () => {
  assert.equal(classifyMastery(29), "Beginning");
  assert.equal(classifyMastery(50), "Competent");
  assert.equal(classifyMastery(85), "Mastered");
});

test("three repeated failures trigger intervention", () => {
  assert.deepEqual(recommendNextStep({ mastery: 88, consecutiveFailures: 3 }), {
    action: "alternate-explanation",
    notifyInstructor: true,
  });
});

test("tutor policy contains critical learner protections", () => {
  assert.match(DIGITALBRIDGE_TUTOR_INSTRUCTION, /Never invent facts, grades, policies/);
  assert.match(DIGITALBRIDGE_TUTOR_INSTRUCTION, /Protect personal information/);
  assert.match(DIGITALBRIDGE_TUTOR_INSTRUCTION, /qualified human/);
});
