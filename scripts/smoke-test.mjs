const baseUrl = process.env.SMOKE_BASE_URL || "http://127.0.0.1:4000";

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      `${options.method || "GET"} ${path} failed: ${response.status} ${JSON.stringify(payload)}`,
    );
  }
  return payload;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const health = await request("/api/health");
assert(health.status === "ok", "Health endpoint did not return ok.");
assert(health.service === "AfricaCampaignAI", "Health endpoint returned the wrong service.");

const ready = await request("/api/ready");
assert(
  ["ready", "not-ready"].includes(ready.status),
  "Readiness endpoint returned an unknown status.",
);

const metrics = await request("/api/metrics");
assert(Number.isInteger(metrics.uptimeSeconds), "Metrics endpoint did not return uptime.");

const catalog = await request("/api/classrooms");
assert(catalog.modules?.length >= 8, "Expected campaign platform modules.");
assert(catalog.analytics?.length >= 4, "Expected campaign analytics data.");
assert(catalog.assessments?.length >= 1, "Expected governance assessments.");
assert(catalog.regionalPerformance?.length >= 3, "Expected regional performance data.");

const tutor = await request("/api/ai/tutor/hint", {
  method: "POST",
  body: JSON.stringify({
    prompt: "Help me draft a fact-checked town hall speech about youth employment.",
    context: "Ghana national campaign",
  }),
});
assert(
  tutor.answer?.includes("campaign") || tutor.subject?.includes("campaign"),
  "Campaign copilot did not return campaign guidance.",
);

const grade = await request("/api/assessments/quiz-campaign-governance/grade", {
  method: "POST",
  body: JSON.stringify({
    learnerId: "smoke-test",
    answers: [
      { questionId: "q1", answer: 1 },
      { questionId: "q2", answer: 1 },
      { questionId: "q3", answer: 0 },
    ],
  }),
});
assert(grade.submission?.score === 100, "Automated grading did not score correct answers.");

const hand = await request("/api/classrooms/national-war-room/hand", {
  method: "POST",
  body: JSON.stringify({ learnerName: "Smoke Test", reason: "Needs compliance review" }),
});
assert(hand.hand?.status === "waiting", "Campaign room queue did not accept a raised hand.");

console.log(
  JSON.stringify(
    {
      status: "ok",
      baseUrl,
      ready: ready.status,
      modules: catalog.modules.length,
      tutorProvider: tutor.provider,
      gradeScore: grade.submission.score,
      connectedSockets: metrics.connectedSockets,
      handStatus: hand.hand.status,
    },
    null,
    2,
  ),
);
