import { useEffect, useState, type FormEvent } from "react";
import { Bot, Send, ThumbsUp, TriangleAlert } from "lucide-react";
import { assistantApi, type AssistantAnswer } from "../lib/assistant";
import type { SessionUser } from "../lib/auth";
import { operationsApi } from "../lib/operations";

export function AssistantPage({
  user,
  onCreateCampaign,
}: {
  user: SessionUser;
  onCreateCampaign: () => void;
}) {
  const tenantId = user.memberships[0]?.tenantId ?? "";
  const [campaignId, setCampaignId] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AssistantAnswer | null>(null);
  const [conversationId, setConversationId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [campaignsLoaded, setCampaignsLoaded] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    operationsApi
      .campaigns(tenantId)
      .then(({ campaigns }) => setCampaignId(campaigns[0]?.id || ""))
      .catch(() => setError("Unable to load campaigns."))
      .finally(() => setCampaignsLoaded(true));
  }, [tenantId]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!question.trim() || !campaignId) return;
    setBusy(true);
    setError("");
    try {
      const result = await assistantApi.chat(tenantId, campaignId, question.trim(), conversationId);
      setAnswer(result);
      setConversationId(result.conversationId);
      setQuestion("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="assistant-page" aria-labelledby="assistant-title">
      <header className="page-heading">
        <div>
          <span className="eyebrow">Grounded campaign intelligence</span>
          <h1 id="assistant-title">
            <Bot size={28} /> AI Assistant
          </h1>
          <p>Answers use approved knowledge and aggregate public intelligence only.</p>
        </div>
      </header>
      <div className="assistant-safety">
        <strong>Human decision support:</strong> AI interpretation is not a guaranteed prediction.
        Review cited evidence and country coverage before making campaign or policy decisions.
        Respondent-level survey records are never sent to the model.
      </div>
      <div className="assistant-attribution">
        Afrobarometer is used as an independent public research source, not as an endorsement or
        partnership. Available evidence represents only the cited countries, survey rounds, and
        safeguarded aggregate samples.
      </div>
      <section className="assistant-guide" aria-label="How grounded answers work">
        <div>
          <strong>Observed Data</strong>
          <span>Reported evidence retrieved from approved sources.</span>
        </div>
        <div>
          <strong>AI Interpretation</strong>
          <span>Contextual explanation for human review, not a prediction.</span>
        </div>
        <div>
          <strong>Citations</strong>
          <span>Source, country, survey, weighting, and sample details where available.</span>
        </div>
      </section>
      {campaignsLoaded && !campaignId && !error && (
        <div className="ops-empty" role="status">
          <strong>No campaign selected</strong>
          <p>
            AI Assistant is campaign-scoped. Create or request access to a campaign before asking a
            grounded intelligence question.
          </p>
          <button type="button" className="primary-button" onClick={onCreateCampaign}>
            Create campaign
          </button>
        </div>
      )}
      {answer && (
        <article className="assistant-answer" aria-live="polite">
          <div className="answer-badge">
            {answer.grounded ? "Grounded answer" : "No supporting data"}
          </div>
          <h2>Observed Data</h2>
          <p>{answer.observedData}</p>
          <h2>AI Interpretation</h2>
          <p>{answer.interpretation}</p>
          <h3>Sources</h3>
          {answer.citations.length ? (
            <ol>
              {answer.citations.map((source) => (
                <li key={source.id}>
                  <strong>
                    [{source.id}] {source.title}
                  </strong>
                  {source.country ? ` — ${source.country}` : ""}
                  {source.weightedPercentage != null
                    ? `, ${source.weightedPercentage}% (n=${source.unweightedSampleSize})`
                    : ""}
                </li>
              ))}
            </ol>
          ) : (
            <p>No supporting sources were available.</p>
          )}
          <div className="feedback-row">
            <span>Was this answer useful?</span>
            <button
              type="button"
              onClick={() => void assistantApi.feedback(tenantId, answer.messageId, "HELPFUL")}
            >
              <ThumbsUp size={16} /> Helpful
            </button>
            <button
              type="button"
              onClick={() => void assistantApi.feedback(tenantId, answer.messageId, "INCORRECT")}
            >
              <TriangleAlert size={16} /> Incorrect
            </button>
            <button
              type="button"
              onClick={() => void assistantApi.feedback(tenantId, answer.messageId, "REPORT")}
            >
              Report answer
            </button>
          </div>
        </article>
      )}
      <form className="assistant-composer" onSubmit={submit}>
        <label htmlFor="assistant-question">
          Ask about approved campaign documents or public intelligence
        </label>
        <textarea
          id="assistant-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={2000}
          rows={4}
          placeholder="What does approved research say about institutional trust?"
        />
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="primary-button" disabled={busy || !campaignId || !question.trim()}>
          {busy ? (
            "Analyzing…"
          ) : (
            <>
              <Send size={17} /> Ask PoliSmart
            </>
          )}
        </button>
      </form>
    </section>
  );
}
