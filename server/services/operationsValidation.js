const WORK_STATUSES = new Set([
  "PLANNED",
  "ACTIVE",
  "AT_RISK",
  "BLOCKED",
  "COMPLETED",
  "CANCELLED",
]);
const PRIORITIES = new Set(["LOW", "NORMAL", "HIGH", "URGENT"]);
const EVENT_TYPES = new Set([
  "RALLY",
  "TOWN_HALL",
  "PRESS_CONFERENCE",
  "COMMUNITY_MEETING",
  "VOLUNTEER_TRAINING",
  "POLICY_FORUM",
  "CANDIDATE_VISIT",
  "INTERNAL_MEETING",
]);
const TRAINING_STATUSES = new Set([
  "NOT_STARTED",
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "EXEMPT",
]);
export function optionalEnum(value, allowed, field) {
  if (value == null) return undefined;
  const normalized = String(value).toUpperCase().replaceAll(" ", "_");
  if (!allowed.has(normalized))
    throw Object.assign(new Error(`${field} is invalid.`), { status: 400 });
  return normalized;
}
export const workStatus = (value) => optionalEnum(value, WORK_STATUSES, "status");
export const priority = (value) => optionalEnum(value, PRIORITIES, "priority");
export const eventType = (value) => optionalEnum(value, EVENT_TYPES, "event type");
export const trainingStatus = (value) => optionalEnum(value, TRAINING_STATUSES, "training status");
export function optionalDate(value, field) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime()))
    throw Object.assign(new Error(`${field} must be a valid date.`), { status: 400 });
  return date;
}
export function stringList(value, field) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string"))
    throw Object.assign(new Error(`${field} must be a list of strings.`), { status: 400 });
  return [...new Set(value.map((item) => item.trim()).filter(Boolean))].slice(0, 30);
}
export function validateContact(data) {
  if (!data.contactAuthorized && (data.email || data.phone))
    throw Object.assign(
      new Error("Contact authorization is required before storing email or phone."),
      { status: 400 },
    );
}
