import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, Send, ThumbsUp, TriangleAlert } from "lucide-react";
import { assistantApi, type AssistantAnswer } from "../lib/assistant";
import type { SessionUser } from "../lib/auth";
import { operationsApi, type Campaign } from "../lib/operations";

export function AssistantPage({
  user,
  onCreateCampaign,
}: {
  user: SessionUser;
  onCreateCampaign: () => void;
}) {
  const tenantId = user.memberships[0]?.tenantId ?? "";
  const [campaignId, setCampaignId] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AssistantAnswer | null>(null);
  const [conversationId, setConversationId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [campaignsLoaded, setCampaignsLoaded] = useState(false);
  const [error, setError] = useState("");
  const [feedbackType, setFeedbackType] = useState<"HELPFUL" | "INCORRECT" | "REPORT" | null>(null);
  const [pendingFeedback, setPendingFeedback] = useState<"HELPFUL" | "INCORRECT" | "REPORT" | null>(
    null,
  );
  const [feedbackStatus, setFeedbackStatus] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const feedbackInFlight = useRef(false);
  useEffect(() => {
    operationsApi
      .campaigns(tenantId)
      .then(({ campaigns: items }) => {
        setCampaigns(items);
        setCampaignId(items[0]?.id || "");
      })
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
      setFeedbackType(null);
      setFeedbackStatus("");
      setReportOpen(false);
      setConversationId(result.conversationId);
      setQuestion("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }
  async function submitFeedback(type: "HELPFUL" | "INCORRECT" | "REPORT") {
    if (!answer || feedbackInFlight.current) return;
    feedbackInFlight.current = true;
    setPendingFeedback(type);
    setFeedbackStatus("");
    try {
      await assistantApi.feedback(tenantId, answer.messageId, type);
      setFeedbackType(type);
      setFeedbackStatus(
        type === "REPORT" ? "Answer reported for review." : "Thanks for your feedback.",
      );
      setReportOpen(false);
    } catch {
      setFeedbackStatus("Unable to save feedback. Try again.");
    } finally {
      feedbackInFlight.current = false;
      setPendingFeedback(null);
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
      {campaigns.length > 0 && (
        <label className="campaign-context campaign-context--select">
          <span>
            <strong>Campaign context</strong>
            Questions and approved knowledge remain scoped to this campaign.
          </span>
          <select value={campaignId} onChange={(event) => setCampaignId(event.target.value)}>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
            ))}
          </select>
        </label>
      )}
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
              className={feedbackType === "HELPFUL" ? "feedback-selected" : undefined}
              aria-pressed={feedbackType === "HELPFUL"}
              disabled={pendingFeedback !== null}
              onClick={() => void submitFeedback("HELPFUL")}
            >
              <ThumbsUp size={16} /> {pendingFeedback === "HELPFUL" ? "Saving…" : "Helpful"}
            </button>
            <button
              type="button"
              className={feedbackType === "INCORRECT" ? "feedback-selected" : undefined}
              aria-pressed={feedbackType === "INCORRECT"}
              disabled={pendingFeedback !== null}
              onClick={() => void submitFeedback("INCORRECT")}
            >
              <TriangleAlert size={16} />
              {pendingFeedback === "INCORRECT" ? "Saving…" : "Incorrect"}
            </button>
            <button
              type="button"
              className={feedbackType === "REPORT" ? "feedback-selected" : undefined}
              aria-pressed={feedbackType === "REPORT"}
              disabled={pendingFeedback !== null}
              onClick={() => setReportOpen(true)}
            >
              {pendingFeedback === "REPORT" ? "Reporting…" : "Report answer"}
            </button>
          </div>
          {feedbackStatus && (
            <p className="feedback-status" role="status" aria-live="polite">
              {feedbackStatus}
            </p>
          )}
          {reportOpen && (
            <div className="confirmation-backdrop" role="presentation">
              <section
                className="confirmation-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="report-answer-title"
                aria-describedby="report-answer-description"
              >
                <h3 id="report-answer-title">Report this AI answer for review?</h3>
                <p id="report-answer-description">
                  This will flag the answer for review. No additional information will be collected.
                </p>
                <div className="confirmation-actions">
                  <button
                    type="button"
                    onClick={() => setReportOpen(false)}
                    disabled={pendingFeedback !== null}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="danger-button"
                    disabled={pendingFeedback !== null}
                    onClick={() => void submitFeedback("REPORT")}
                  >
                    {pendingFeedback === "REPORT" ? "Reporting…" : "Report answer"}
                  </button>
                </div>
              </section>
            </div>
          )}
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
