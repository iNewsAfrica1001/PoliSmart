import { MASTERY_THRESHOLDS, MASTERY_WEIGHTS } from "../config/learning.js";

function clampScore(value) {
  const score = Number(value);
  return Number.isFinite(score) ? Math.min(100, Math.max(0, score)) : 0;
}

export function calculateMastery(evidence, weights = MASTERY_WEIGHTS) {
  const components = Object.entries(weights).map(([key, weight]) => ({
    key,
    score: clampScore(evidence[key]),
    weight,
  }));
  const score = Math.round(components.reduce((total, item) => total + item.score * item.weight, 0));
  return { score, components, formulaVersion: "baseline-v1" };
}

export function classifyMastery(score) {
  const value = clampScore(score);
  if (value < 30) return "Beginning";
  if (value < 50) return "Developing";
  if (value < 70) return "Competent";
  if (value < 85) return "Proficient";
  return "Mastered";
}

export function recommendNextStep(
  { mastery, consecutiveFailures = 0 },
  thresholds = MASTERY_THRESHOLDS,
) {
  if (consecutiveFailures >= thresholds.repeatedFailureCount) {
    return { action: "alternate-explanation", notifyInstructor: true };
  }
  if (mastery < thresholds.remedialBelow)
    return { action: "remedial-content", notifyInstructor: false };
  if (mastery < thresholds.practiceBelow)
    return { action: "additional-practice", notifyInstructor: false };
  if (mastery < thresholds.challengeAt)
    return { action: "allow-progression", notifyInstructor: false };
  return { action: "optional-challenge", notifyInstructor: false };
}
