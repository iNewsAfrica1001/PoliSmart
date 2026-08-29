const API_BASE = import.meta.env.VITE_API_BASE ?? "";
export class ApiError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      message?: string;
      code?: string;
    };
    throw new ApiError(payload.message ?? "Request failed.", payload.code);
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
  register: (input: {
    email: string;
    password: string;
    displayName: string;
    organizationName: string;
    country: string;
  }) =>
    request<{ message: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  requestPasswordReset: (email: string) =>
    request<{ message: string }>("/api/auth/password-reset/request", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  requestEmailVerification: (email: string) =>
    request<{ message: string }>("/api/auth/email-verification/request", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  verifyEmail: (token: string) =>
    request<undefined>("/api/auth/email-verification/confirm", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
  resetPassword: (token: string, password: string) =>
    request<undefined>("/api/auth/password-reset/confirm", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),
};
