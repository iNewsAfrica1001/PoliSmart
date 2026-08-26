export const API_BASE = import.meta.env.VITE_API_BASE || "";

export async function api(path, options = {}) {
  const requestOptions = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  };
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, requestOptions);
  } catch (error) {
    const canUseLocalFallback =
      !API_BASE &&
      typeof window !== "undefined" &&
      ["localhost", "127.0.0.1"].includes(window.location.hostname);
    if (!canUseLocalFallback) throw error;
    response = await fetch(`http://127.0.0.1:4000${path}`, requestOptions);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "Request failed");
  return payload;
}
