# PoliSmart AI Assistant

## Campaign scope

The Version 1 AI Assistant is intentionally campaign-scoped. An authenticated user must have an
active organization membership and access to at least one campaign before submitting grounded
questions. The assistant may use approved aggregate Afrobarometer intelligence, but each request
retains a campaign context for authorization, auditability, rate limiting, and citations. The UI
must explain this prerequisite when no campaign is available; it must not create an independent or
unaudited intelligence path.

The assistant is a server-side retrieval-augmented service. The server detects intent, retrieves authorized records, caps context, calls a provider abstraction, validates structured output, and constructs citations from retrieved records.

## Data boundaries

- Campaign retrieval requires organization, campaign, user, `AI_ASSISTANT_USE`, approved/ready status, and compatible visibility.
- Afrobarometer retrieval uses `survey_aggregate_results` only with the minimum sample-size safeguard. Respondent-level CSV data is never read by the assistant.
- When retrieval returns no support, the provider is not called and the answer reports missing data.
- Source content is treated as untrusted data to reduce prompt-injection risk.

## Configuration

Set `OPENAI_API_KEY` only in the server environment. `OPENAI_MODEL`, `AI_PROVIDER`, `AI_RATE_LIMIT_WINDOW_MS`, and `AI_RATE_LIMIT_MAX_REQUESTS` are optional. Production readiness fails when the API key or database is absent.

The provider contract is in `server/services/aiProvider.js`. The OpenAI implementation uses the Responses API, disables response storage, and requests strict JSON-schema output.

## API

- `POST /api/ai/chat`: `campaignId`, `question`, optional `conversationId`.
- `POST /api/ai/feedback`: `messageId`, `type` (`HELPFUL`, `INCORRECT`, `REPORT`), optional `note`.

Both require a secure session, `X-Organization-Id`, server-side RBAC, and the dedicated AI rate limit.
