export const RATE_LIMIT_POLICIES = Object.freeze({
  generalApi: { limit: 180, windowMs: 60_000 },
  login: { limit: 10, windowMs: 15 * 60_000 },
  registration: { limit: 5, windowMs: 15 * 60_000 },
  verificationResend: { limit: 5, windowMs: 15 * 60_000 },
  passwordResetRequest: { limit: 5, windowMs: 15 * 60_000 },
  passwordResetConfirmation: { limit: 10, windowMs: 15 * 60_000 },
  aiAssistantUser: { limit: 12, windowMs: 60_000 },
  aiAssistantOrganization: { limit: 60, windowMs: 60_000 },
  aiWorkflowUser: { limit: 6, windowMs: 60_000 },
  aiWorkflowOrganization: { limit: 30, windowMs: 60_000 },
});
