# Responsible AI Policy

PoliSmart Africa AI supports aggregate campaign intelligence, approved knowledge retrieval, policy drafting, and broad campaign communications. AI output is advisory and remains subject to accountable human review.

## Prohibited capabilities

PoliSmart must not enable individualized political manipulation, voter suppression, sensitive-trait profiling, fabricated endorsements, deceptive political impersonation, or unauthorized automated publishing. Server-side safety rules block requests indicating these purposes. The application contains no voter scoring, individual persuasion, autonomous approval, or publishing endpoint.

## Human control

Policy and communications drafts are labeled `AI-generated draft — human review required.` Approval decisions are deterministic server-side workflow transitions. Compliance review cannot be bypassed when required. AI cannot approve, publish, or change permissions.

## Grounding and records

Assistant answers use approved campaign knowledge or safeguarded public aggregate data. Each generation records the provider/model, prompt-template version, output reference, input hash, safety flags, grounding metadata, approval state, and provider reference. Provider failures create safe error reports without storing secrets.

## Review

Responsible-AI controls, blocked-request patterns, prompt templates, provider configurations, and output reviews must be reviewed before material feature or provider changes.
