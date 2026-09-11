const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export type PrelaunchRequestType = "EARLY_ACCESS" | "DEMO";

export type PrelaunchRequest = {
  name: string;
  email: string;
  organization: string;
  country: string;
  role: string;
  interest?: string;
  organizationType?: string;
  timing?: string;
  note?: string;
};

export async function submitPrelaunchRequest(
  requestType: PrelaunchRequestType,
  input: PrelaunchRequest,
) {
  const response = await fetch(`${API_BASE}/api/prelaunch/${requestType.toLowerCase()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  const payload = (await response.json().catch(() => ({}))) as { message?: string };
  if (!response.ok) throw new Error(payload.message || "We could not submit your request.");
  return payload as { message: string };
}
