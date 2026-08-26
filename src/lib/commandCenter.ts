const API_BASE = import.meta.env.VITE_API_BASE ?? "";
export type Intelligence = {
  country: string;
  indicator: string;
  category: string;
  responseCode: string;
  weightedPercentage: number;
  unweightedSampleSize: number;
  weightField: string;
  surveyRound: string;
  source: string;
  attribution: string;
  sourceUrl?: string;
};
export type CommandCenter = {
  campaign: { id: string; name: string; country: string; status: string };
  health: { score: number; label: string; tasks: number; blocked: number };
  changedLast24Hours: number;
  taskStatus: Array<{ status: string; _count: { _all: number } }>;
  tasksAtRisk: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    dueAt?: string;
    owner?: { displayName: string };
  }>;
  activities: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    updatedAt: string;
    owner?: { displayName: string };
  }>;
  events: Array<{
    id: string;
    title: string;
    type: string;
    startsAt: string;
    venue?: string;
    status: string;
    geographicArea?: { name: string };
  }>;
  volunteers: { total: number; trained: number };
  policyWork: Array<{ id: string; title: string; category: string; source?: string }>;
  mediaDevelopments: Array<{ id: string; title: string; category: string; source?: string }>;
  intelligence: Intelligence[];
  alerts: Array<{ severity: string; title: string; detail: string; owner?: string }>;
  recommendations: Array<{ title: string; rationale: string; owner: string }>;
  dailyBrief: {
    generatedAt: string;
    headline: string;
    whatChanged: string;
    whatMatters: string;
    nextAction: string;
    evidence: string;
  };
};
export const commandCenterApi = {
  load: async (tenantId: string, campaignId: string, country = "", geographicAreaId = "") => {
    const query = new URLSearchParams();
    if (country) query.set("country", country);
    if (geographicAreaId) query.set("geographicAreaId", geographicAreaId);
    const response = await fetch(`${API_BASE}/api/command-center/${campaignId}?${query}`, {
      credentials: "include",
      headers: { "X-Organization-Id": tenantId },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(
        (payload as { message?: string }).message || "Unable to load command center.",
      );
    return payload as {
      dashboard: CommandCenter;
      geography: Array<{ id: string; name: string; level: { name: string } }>;
    };
  },
};
