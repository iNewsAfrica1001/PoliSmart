import { createHash } from "node:crypto";

export const PRIVACY_ACTION_CONFIRMATIONS = Object.freeze({
  DELETE: "EXECUTE AUTHORIZED PRIVACY DELETION",
  ANONYMIZE: "EXECUTE AUTHORIZED PRIVACY ANONYMIZATION",
  RESTRICT: "EXECUTE AUTHORIZED PRIVACY RESTRICTION",
});

export const PRIVACY_REQUEST_TYPES = Object.freeze([
  "ACCESS",
  "CORRECTION",
  "DELETION",
  "OBJECTION",
  "RESTRICTION",
  "PORTABILITY",
]);

export function privacySubjectKey(value, secret) {
  return createHash("sha256")
    .update(`${secret}:${String(value).trim().toLowerCase()}`)
    .digest("hex");
}

export function policyBlockedAction(action, confirmation, preview) {
  if (!Object.hasOwn(PRIVACY_ACTION_CONFIRMATIONS, action))
    throw Object.assign(new Error("Privacy action is invalid."), { status: 400 });
  if (confirmation !== PRIVACY_ACTION_CONFIRMATIONS[action])
    throw Object.assign(new Error("Exact privacy-action confirmation is required."), {
      status: 400,
    });
  if (preview?.legalHoldBlocked)
    throw Object.assign(new Error("An active legal hold prevents this privacy action."), {
      status: 409,
    });
  throw Object.assign(
    new Error(
      "Privacy action is blocked until the applicable policy decision and execution authorization are recorded.",
    ),
    { status: 409 },
  );
}
