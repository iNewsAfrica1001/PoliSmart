const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export type WorkspaceSearchResult = {
  id: string;
  campaignId?: string;
  type: string;
  title: string;
  detail: string;
  page: string;
};

export async function searchWorkspace(tenantId: string, query: string) {
  const response = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`, {
    credentials: "include",
    headers: { "X-Organization-Id": tenantId },
  });
  if (!response.ok) throw new Error("Workspace search is temporarily unavailable.");
  return (await response.json()) as { results: WorkspaceSearchResult[] };
}
