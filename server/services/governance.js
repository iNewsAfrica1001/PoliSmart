import { createHash } from "node:crypto";
export const PROHIBITED_AI_CAPABILITIES = Object.freeze([
  "INDIVIDUALIZED_POLITICAL_MANIPULATION",
  "VOTER_SUPPRESSION",
  "SENSITIVE_TRAIT_PROFILING",
  "FABRICATED_ENDORSEMENT",
  "DECEPTIVE_POLITICAL_IMPERSONATION",
  "UNAUTHORIZED_AUTOMATED_PUBLISHING",
]);
const RULES = [
  [
    "INDIVIDUALIZED_POLITICAL_MANIPULATION",
    /(?:target|persuade|manipulate).{0,40}(?:individual|specific voter|person)/i,
  ],
  ["VOTER_SUPPRESSION", /(?:discourage|prevent|stop).{0,35}(?:vot|turnout|poll)/i],
  [
    "SENSITIVE_TRAIT_PROFILING",
    /(?:profile|score|segment).{0,40}(?:religion|ethnicity|race|health|sexual orientation|disability)/i,
  ],
  ["FABRICATED_ENDORSEMENT", /(?:fake|fabricat|invent).{0,30}endorsement/i],
  [
    "DECEPTIVE_POLITICAL_IMPERSONATION",
    /(?:impersonat|deepfake|pretend to be).{0,40}(?:candidate|official|politician)/i,
  ],
  [
    "UNAUTHORIZED_AUTOMATED_PUBLISHING",
    /(?:auto|automatically).{0,30}(?:publish|post|send).{0,30}(?:without|no).{0,20}(?:review|approval)/i,
  ],
];
export function assessPoliticalSafety(input) {
  const text = String(input || "");
  const flags = RULES.filter(([, rule]) => rule.test(text)).map(([flag]) => flag);
  return { allowed: flags.length === 0, flags };
}
export function enforcePoliticalSafety(input) {
  const result = assessPoliticalSafety(input);
  if (!result.allowed)
    throw Object.assign(
      new Error("This request is blocked by PoliSmart responsible-AI safeguards."),
      { status: 400, code: "RESPONSIBLE_AI_BLOCK", safetyFlags: result.flags },
    );
  return result;
}
export const sha256 = (value) => createHash("sha256").update(String(value)).digest("hex");
export function createGovernanceService(repository) {
  return {
    audit(data) {
      return repository.appendAudit(data);
    },
    async logAi({ input, provider, model, templateKey, template, ...data }) {
      return repository.appendAiUsage({
        ...data,
        provider,
        model,
        templateKey,
        template,
        inputSha256: sha256(input),
        safetyFlags: data.safetyFlags || [],
        sourceGroundingMetadata: data.sourceGroundingMetadata || {},
      });
    },
    error(data) {
      return repository.appendError(data);
    },
  };
}
