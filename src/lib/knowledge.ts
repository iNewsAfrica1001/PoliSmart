const API_BASE = import.meta.env.VITE_API_BASE ?? "";
async function parse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(payload.message ?? "Knowledge-base request failed.");
  }
  return response.status === 204 ? (undefined as T) : (response.json() as Promise<T>);
}
export type KnowledgeDocument = {
  id: string;
  title: string;
  author?: string;
  category: string;
  tags: string[];
  visibility: string;
  approvalStatus: string;
  processingStatus: string;
  originalFilename: string;
  fileSizeBytes: number;
  uploadedAt: string;
};
export const knowledgeApi = {
  list: (tenantId: string, campaignId: string, query = "") =>
    fetch(
      `${API_BASE}/api/knowledge?campaignId=${encodeURIComponent(campaignId)}&q=${encodeURIComponent(query)}`,
      { credentials: "include", headers: { "X-Organization-Id": tenantId } },
    ).then((response) => parse<{ documents: KnowledgeDocument[] }>(response)),
  upload: (tenantId: string, data: FormData) =>
    fetch(`${API_BASE}/api/knowledge`, {
      method: "POST",
      credentials: "include",
      headers: { "X-Organization-Id": tenantId },
      body: data,
    }).then((response) => parse(response)),
  remove: (tenantId: string, id: string) =>
    fetch(`${API_BASE}/api/knowledge/${id}`, {
      method: "DELETE",
      credentials: "include",
      headers: { "X-Organization-Id": tenantId },
    }).then((response) => parse<undefined>(response)),
};
