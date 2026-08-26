const BASE = import.meta.env.VITE_API_BASE ?? "";
async function call<T>(tenantId: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}/api/workflows${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Organization-Id": tenantId,
      ...init?.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error((body as { message?: string }).message || "Workflow request failed.");
  return body as T;
}
export type Revision = {
  id: string;
  version: number;
  content: string;
  isAiGenerated: boolean;
  disclaimer?: string;
  createdAt: string;
};
export type PolicyCase = {
  id: string;
  title: string;
  problem: string;
  status: string;
  evidence: Array<{
    id: string;
    evidenceType: string;
    title: string;
    source: string;
    summary: string;
  }>;
  options: Array<{ id: string; title: string; description: string; tradeoffs: string }>;
  revisions: Revision[];
};
export type Communication = {
  id: string;
  title: string;
  type: string;
  status: string;
  complianceRequired: boolean;
  revisions: Revision[];
  approvals: Array<{ id: string; stage: string; decision: string; note?: string }>;
};
export type MediaItem = {
  id: string;
  headline: string;
  publisher: string;
  publishedAt: string;
  topic: string;
  geography: string;
  source: string;
  sourceUrl: string;
  summary: string;
  aggregateSentiment: string;
};
const post = <T>(tenant: string, path: string, body: unknown) =>
  call<T>(tenant, path, { method: "POST", body: JSON.stringify(body) });
export const workflowApi = {
  policies: (tenant: string, campaign: string) =>
    call<{ cases: PolicyCase[] }>(tenant, `/policy/${campaign}`),
  createPolicy: (tenant: string, campaign: string, body: unknown) =>
    post(tenant, `/policy/${campaign}`, body),
  policyTransition: (tenant: string, campaign: string, id: string, status: string) =>
    post(tenant, `/policy/${campaign}/${id}/transition`, { status }),
  policyAi: (tenant: string, campaign: string, id: string) =>
    post(tenant, `/policy/${campaign}/${id}/ai-draft`, {}),
  addEvidence: (tenant: string, campaign: string, id: string, body: unknown) =>
    post(tenant, `/policy/${campaign}/${id}/evidence`, body),
  addOption: (tenant: string, campaign: string, id: string, body: unknown) =>
    post(tenant, `/policy/${campaign}/${id}/options`, body),
  media: (tenant: string, campaign: string) =>
    call<{ items: MediaItem[] }>(tenant, `/media/${campaign}`),
  communications: (tenant: string, campaign: string) =>
    call<{ communications: Communication[] }>(tenant, `/communications/${campaign}`),
  createCommunication: (tenant: string, campaign: string, body: unknown) =>
    post(tenant, `/communications/${campaign}`, body),
  communicationTransition: (tenant: string, campaign: string, id: string, status: string) =>
    post(tenant, `/communications/${campaign}/${id}/transition`, { status }),
  communicationAi: (tenant: string, campaign: string, id: string) =>
    post(tenant, `/communications/${campaign}/${id}/ai-assist`, {}),
  addRevision: (tenant: string, campaign: string, id: string, content: string) =>
    post(tenant, `/communications/${campaign}/${id}/revisions`, { content }),
};
