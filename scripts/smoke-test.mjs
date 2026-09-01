const baseUrl = process.env.SMOKE_BASE_URL || "http://127.0.0.1:4000";

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const health = await request("/api/health");
assert(health.response.status === 200, "Health endpoint was unavailable.");
assert(health.payload.status === "ok", "Health endpoint did not return ok.");

const ready = await request("/api/ready");
assert(
  [200, 503].includes(ready.response.status) &&
    ["ready", "not-ready"].includes(ready.payload.status),
  "Readiness endpoint returned an unexpected response.",
);

const protectedRoutes = [
  "/api/auth/me",
  "/api/campaigns",
  "/api/ai/chat",
  "/api/knowledge",
  "/api/workflows/policy/00000000-0000-0000-0000-000000000000",
  "/api/operations/00000000-0000-0000-0000-000000000000/events",
  "/api/governance",
];

for (const path of protectedRoutes) {
  const result = await request(path);
  assert(result.response.status === 401, `${path} did not reject an unauthenticated request.`);
}

const removedLegacyRoutes = [
  "/api/classrooms",
  "/api/assessments",
  "/api/assessments/legacy-assessment/grade",
  "/api/training",
  "/api/training/scams",
  "/api/training/scams/legacy-simulation/attempt",
  "/api/training/certificates/request",
  "/api/users",
];

for (const path of removedLegacyRoutes) {
  const result = await request(path);
  assert(result.response.status === 404, `${path} remains exposed.`);
}

const homepageResponse = await fetch(baseUrl);
const homepage = await homepageResponse.text();
assert(homepageResponse.status === 200, "Homepage was unavailable.");
assert(homepage.includes("PoliSmart Africa AI"), "Homepage did not contain the product name.");

console.log(
  JSON.stringify(
    {
      status: "ok",
      baseUrl,
      ready: ready.payload.status,
      protectedRoutes: protectedRoutes.length,
      removedLegacyRoutes: removedLegacyRoutes.length,
      homepage: "ok",
    },
    null,
    2,
  ),
);
