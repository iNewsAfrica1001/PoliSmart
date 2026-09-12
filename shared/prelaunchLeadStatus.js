export const PRELAUNCH_LEAD_STATUSES = Object.freeze([
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "CLOSED",
]);

const transitions = Object.freeze({
  NEW: Object.freeze(["CONTACTED", "QUALIFIED", "CLOSED"]),
  CONTACTED: Object.freeze(["QUALIFIED", "CLOSED"]),
  QUALIFIED: Object.freeze(["CLOSED"]),
  CLOSED: Object.freeze([]),
});

export function permittedPrelaunchLeadStatuses(currentStatus) {
  return transitions[currentStatus] ?? [];
}

export function isPermittedPrelaunchLeadTransition(currentStatus, requestedStatus) {
  const currentIsKnown =
    typeof currentStatus === "string" && PRELAUNCH_LEAD_STATUSES.includes(currentStatus);
  const requestedIsKnown =
    typeof requestedStatus === "string" && PRELAUNCH_LEAD_STATUSES.includes(requestedStatus);
  if (!currentIsKnown || !requestedIsKnown) return false;
  return (
    currentStatus === requestedStatus ||
    permittedPrelaunchLeadStatuses(currentStatus).includes(requestedStatus)
  );
}
