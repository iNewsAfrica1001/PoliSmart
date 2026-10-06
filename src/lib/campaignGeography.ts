const API_BASE = import.meta.env.VITE_API_BASE ?? "";

type Page<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type CampaignGeographicArea = {
  id: string;
  parentId: string | null;
  countryCode: string;
  name: string;
  code: string;
  level: { id: string; name: string; orderIndex: number };
  assignments: Array<{ isActive: boolean; removedAt: string | null }>;
  _count: { children: number };
};

async function request<T>(tenantId: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Organization-Id": tenantId,
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(payload.message ?? "Campaign geography request failed.");
  }
  return response.json() as Promise<T>;
}

const queryString = (values: Record<string, string | number | boolean | undefined>) => {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  return query.toString();
};

export const campaignGeographyApi = {
  hierarchy: (
    tenantId: string,
    campaignId: string,
    filters: {
      parentId?: string;
      search?: string;
      assigned?: boolean;
      page?: number;
      pageSize?: number;
    },
  ) =>
    request<Page<CampaignGeographicArea>>(
      tenantId,
      `/api/campaign-geography/${campaignId}/hierarchy?${queryString(filters)}`,
    ),
  assign: (tenantId: string, campaignId: string, masterAreaIds: string[]) =>
    request<unknown>(tenantId, `/api/campaign-geography/${campaignId}/assignments`, {
      method: "POST",
      body: JSON.stringify({ masterAreaIds }),
    }),
  deactivate: (tenantId: string, campaignId: string, masterAreaIds: string[]) =>
    request<unknown>(tenantId, `/api/campaign-geography/${campaignId}/assignments/deactivate`, {
      method: "POST",
      body: JSON.stringify({ masterAreaIds }),
    }),
};
