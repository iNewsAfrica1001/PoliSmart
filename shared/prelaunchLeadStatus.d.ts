export type PrelaunchLeadStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "CLOSED";

export const PRELAUNCH_LEAD_STATUSES: readonly PrelaunchLeadStatus[];
export function permittedPrelaunchLeadStatuses(
  currentStatus: PrelaunchLeadStatus,
): readonly PrelaunchLeadStatus[];
export function isPermittedPrelaunchLeadTransition(
  currentStatus: PrelaunchLeadStatus,
  requestedStatus: PrelaunchLeadStatus,
): boolean;
