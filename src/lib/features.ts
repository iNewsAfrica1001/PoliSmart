export type FeatureAvailability = {
  billing: boolean;
  fundraising: boolean;
};

export const disabledFeatures: FeatureAvailability = Object.freeze({
  billing: false,
  fundraising: false,
});

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export async function loadFeatureAvailability(): Promise<FeatureAvailability> {
  const response = await fetch(`${API_BASE}/api/features`, { credentials: "include" });
  if (!response.ok) throw new Error("Feature availability is unavailable.");
  const payload = (await response.json()) as {
    features?: Partial<FeatureAvailability>;
  };
  return {
    billing: payload.features?.billing === true,
    fundraising: payload.features?.fundraising === true,
  };
}
