export function requireString(body, field, { min = 1, max = 1000 } = {}) {
  const value = String(body?.[field] ?? "").trim();
  if (value.length < min || value.length > max) {
    const error = new Error(`${field} must be ${min}-${max} characters.`);
    error.status = 400;
    throw error;
  }
  return value;
}

export function requireArray(body, field) {
  if (!Array.isArray(body?.[field])) {
    const error = new Error(`${field} must be an array.`);
    error.status = 400;
    throw error;
  }
  return body[field];
}

export function validateRole(role) {
  const value = String(role || "candidate");
  return [
    "candidate",
    "campaign-manager",
    "communications",
    "volunteer-coordinator",
    "finance",
    "administrator",
  ].includes(value)
    ? value
    : "candidate";
}
