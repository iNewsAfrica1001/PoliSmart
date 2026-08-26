const API_BASE = import.meta.env.VITE_API_BASE ?? "";
async function parse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error((payload as { message?: string }).message ?? "AI Assistant request failed.");
  return payload as T;
}
export type Citation = {
  id: string;
  type: string;
  title: string;
  country?: string;
  weightedPercentage?: number;
  unweightedSampleSize?: number;
  source?: string;
  url?: string | null;
};
export type AssistantAnswer = {
  conversationId: string;
  messageId: string;
  intent: string;
  grounded: boolean;
  observedData: string;
  interpretation: string;
  citations: Citation[];
};
export const assistantApi = {
  chat: (tenantId: string, campaignId: string, question: string, conversationId?: string) =>
    fetch(`${API_BASE}/api/ai/chat`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-Organization-Id": tenantId },
      body: JSON.stringify({ campaignId, question, conversationId }),
    }).then((response) => parse<AssistantAnswer>(response)),
  feedback: (tenantId: string, messageId: string, type: "HELPFUL" | "INCORRECT" | "REPORT") =>
    fetch(`${API_BASE}/api/ai/feedback`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-Organization-Id": tenantId },
      body: JSON.stringify({ messageId, type }),
    }).then((response) => parse(response)),
};
