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

export const PRIVACY_CASE_TRANSITIONS = Object.freeze({
  RECEIVED: Object.freeze(["IDENTITY_VERIFICATION_PENDING", "CANCELLED"]),
  IDENTITY_VERIFICATION_PENDING: Object.freeze(["UNDER_REVIEW", "REJECTED", "CANCELLED"]),
  UNDER_REVIEW: Object.freeze(["ACTION_PENDING", "REJECTED", "CANCELLED"]),
  ACTION_PENDING: Object.freeze(["UNDER_REVIEW", "COMPLETED", "CANCELLED"]),
  COMPLETED: Object.freeze([]),
  REJECTED: Object.freeze([]),
  CANCELLED: Object.freeze([]),
});

export function validatePrivacyCaseTransition(current, requested, verificationStatus) {
  if (current === requested)
    throw Object.assign(new Error("Privacy case is already in the requested state."), {
      status: 409,
    });
  if (!PRIVACY_CASE_TRANSITIONS[current]?.includes(requested))
    throw Object.assign(new Error("The requested privacy-case transition is not permitted."), {
      status: 409,
    });
  if (requested === "UNDER_REVIEW" && verificationStatus !== "VERIFIED")
    throw Object.assign(new Error("Verified identity is required before case review."), {
      status: 409,
    });
  return true;
}

const PRIVACY_VERIFICATION_TRANSITIONS = Object.freeze({
  NOT_STARTED: Object.freeze(["PENDING"]),
  PENDING: Object.freeze(["VERIFIED", "FAILED"]),
  FAILED: Object.freeze(["PENDING"]),
  VERIFIED: Object.freeze([]),
});

export function validateVerificationTransition(current, requested) {
  if (current === requested)
    throw Object.assign(new Error("Identity verification is already in the requested state."), {
      status: 409,
    });
  if (!PRIVACY_VERIFICATION_TRANSITIONS[current]?.includes(requested))
    throw Object.assign(
      new Error("The requested identity-verification transition is not permitted."),
      { status: 409 },
    );
  return true;
}

export function unresolvedAuthority(control) {
  throw Object.assign(
    new Error(`${control} authority is not configured. Policy approval is required.`),
    { status: 409 },
  );
}

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
