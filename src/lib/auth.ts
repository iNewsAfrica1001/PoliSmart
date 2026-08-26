const API_BASE = import.meta.env.VITE_API_BASE ?? "";
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(payload.message ?? "Request failed.");
  }
  return response.status === 204 ? (undefined as T) : (response.json() as Promise<T>);
}
export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  memberships: Array<{
    tenantId: string;
    role: string;
    organization: { id: string; name: string; country: string; isDemo: boolean };
  }>;
};
export const authApi = {
  me: () => request<{ user: SessionUser }>("/api/auth/me"),
  login: (email: string, password: string) =>
    request<{ user: SessionUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<undefined>("/api/auth/logout", { method: "POST" }),
};
