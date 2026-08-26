import { Bot, CheckCircle2, FileClock, Newspaper, Plus, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { SessionUser } from "../lib/auth";
import { operationsApi } from "../lib/operations";
import {
  workflowApi,
  type Communication,
  type MediaItem,
  type PolicyCase,
} from "../lib/intelligenceWorkflows";
const POLICY_STEPS = [
  "PROBLEM",
  "EVIDENCE",
  "RESEARCH",
  "OPTIONS",
  "AI_DRAFT",
  "HUMAN_REVIEW",
  "APPROVED",
];
const COMM_STEPS = ["DRAFT", "AI_ASSISTED", "HUMAN_REVIEW", "COMPLIANCE_REVIEW", "APPROVED"];
const title = (value: string) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (x) => x.toUpperCase());

export function IntelligenceWorkflowsPage({
  user,
  module,
}: {
  user: SessionUser;
  module: "policy" | "media" | "communications";
}) {
  const tenant = user.memberships[0]?.tenantId || "";
  const [campaign, setCampaign] = useState("");
  const [policies, setPolicies] = useState<PolicyCase[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (!campaign) return;
    setError("");
    try {
      if (module === "policy") setPolicies((await workflowApi.policies(tenant, campaign)).cases);
      if (module === "media") setMedia((await workflowApi.media(tenant, campaign)).items);
      if (module === "communications")
        setCommunications((await workflowApi.communications(tenant, campaign)).communications);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load workflow.");
    }
  }, [campaign, module, tenant]);
  useEffect(() => {
    operationsApi
      .campaigns(tenant)
      .then(({ campaigns }) => setCampaign(campaigns[0]?.id || ""))
      .catch(() => setError("Unable to load campaigns."));
  }, [tenant]);
  useEffect(() => {
    void load();
  }, [load]);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    try {
      if (module === "policy") await workflowApi.createPolicy(tenant, campaign, data);
      else if (module === "communications")
        await workflowApi.createCommunication(tenant, campaign, {
          ...data,
          complianceRequired: data.complianceRequired === "on",
        });
      form.reset();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Creation failed.");
    } finally {
      setBusy(false);
    }
  }
  const act = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await action();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Workflow action failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="workflow-page">
      <header className="workflow-heading">
        <div>
          <span className="eyebrow">AUDITABLE INTELLIGENCE WORKFLOW</span>
          <h1>
            {module === "policy"
              ? "Policy Center"
              : module === "media"
                ? "Media Monitoring"
                : "Communications Studio"}
          </h1>
          <p>
            {module === "policy"
              ? "Move policy work from a defined problem through evidence and accountable approval."
              : module === "media"
                ? "Review lawfully sourced news and aggregate monitoring signals."
                : "Create broad campaign communications with human and compliance control."}
          </p>
        </div>
        <span>
          <ShieldCheck /> Human approval enforced
        </span>
      </header>
      {error && (
        <p className="ops-error" role="alert">
          {error}
        </p>
      )}
      {module === "policy" && (
        <>
          <CreateCard onSubmit={create}>
            <label>
              Policy title
              <input name="title" required maxLength={160} />
            </label>
            <label>
              Problem statement
              <textarea name="problem" required rows={3} />
            </label>
            <button disabled={busy || !campaign}>
              <Plus /> Open policy case
            </button>
          </CreateCard>
          <div className="workflow-list">
            {policies.map((item) => (
              <article className="workflow-card" key={item.id}>
                <WorkflowTrack steps={POLICY_STEPS} current={item.status} />
                <h2>{item.title}</h2>
                <p>{item.problem}</p>
                <div className="workflow-counts">
                  <span>{item.evidence.length} evidence records</span>
                  <span>{item.options.length} options</span>
                  <span>{item.revisions.length} revisions</span>
                </div>
                {["EVIDENCE", "RESEARCH"].includes(item.status) && (
                  <form
                    className="inline-workflow-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const values = Object.fromEntries(new FormData(event.currentTarget));
                      values.evidenceType = item.status;
                      void act(() => workflowApi.addEvidence(tenant, campaign, item.id, values));
                    }}
                  >
                    <input
                      name="title"
                      placeholder={item.status === "RESEARCH" ? "Research title" : "Evidence title"}
                      required
                    />
                    <input name="source" placeholder="Source" required />
                    <textarea name="summary" placeholder="Evidence summary" required />
                    <button>Add {title(item.status)}</button>
                  </form>
                )}
                {item.status === "OPTIONS" && (
                  <form
                    className="inline-workflow-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const values = Object.fromEntries(new FormData(event.currentTarget));
                      void act(() => workflowApi.addOption(tenant, campaign, item.id, values));
                    }}
                  >
                    <input name="title" placeholder="Option title" required />
                    <textarea name="description" placeholder="Option description" required />
                    <textarea
                      name="tradeoffs"
                      placeholder="Benefits, costs, and trade-offs"
                      required
                    />
                    <button>Add option</button>
                  </form>
                )}
                {item.revisions[0]?.isAiGenerated && <AiNotice />}
                <div className="workflow-actions">
                  {nextPolicy(item.status, item).map((next) => (
                    <button
                      key={next}
                      disabled={busy}
                      onClick={() =>
                        void act(() =>
                          next === "AI_DRAFT"
                            ? workflowApi.policyAi(tenant, campaign, item.id)
                            : workflowApi.policyTransition(tenant, campaign, item.id, next),
                        )
                      }
                    >
                      {next === "AI_DRAFT" && <Bot />}
                      {title(next)}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
      {module === "media" && (
        <section className="media-monitor">
          <div className="integration-notice">
            <Newspaper />
            <div>
              <strong>Lawful integration architecture ready</strong>
              <p>
                Items are idempotently imported from configured providers with source URLs and
                provider terms. No scraping or integration is enabled by default.
              </p>
            </div>
          </div>
          <div className="media-grid">
            {media.map((item) => (
              <article key={item.id}>
                <span>{item.aggregateSentiment} aggregate sentiment</span>
                <h2>{item.headline}</h2>
                <p>{item.summary}</p>
                <footer>
                  <b>{item.publisher}</b> · {new Date(item.publishedAt).toLocaleDateString()}
                  <br />
                  {item.topic} · {item.geography}
                  <br />
                  Source:{" "}
                  <a href={item.sourceUrl} target="_blank" rel="noreferrer">
                    {item.source}
                  </a>
                </footer>
              </article>
            ))}
          </div>
          {!media.length && <Empty text="No lawfully imported media items are available." />}
        </section>
      )}
      {module === "communications" && (
        <>
          <CreateCard onSubmit={create}>
            <label>
              Title
              <input name="title" required />
            </label>
            <label>
              Content type
              <select name="type">
                {[
                  "SPEECH",
                  "PRESS_RELEASE",
                  "POLICY_EXPLANATION",
                  "ANNOUNCEMENT",
                  "NEWSLETTER",
                  "FAQ",
                ].map((x) => (
                  <option key={x} value={x}>
                    {title(x)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Initial draft
              <textarea name="content" required rows={4} />
            </label>
            <label className="check-label">
              <input type="checkbox" name="complianceRequired" /> Compliance review required
            </label>
            <button disabled={busy || !campaign}>
              <Plus /> Create draft
            </button>
          </CreateCard>
          <div className="workflow-list">
            {communications.map((item) => (
              <article className="workflow-card" key={item.id}>
                <WorkflowTrack steps={COMM_STEPS} current={item.status} />
                <h2>{item.title}</h2>
                <p>
                  {title(item.type)} ·{" "}
                  {item.complianceRequired ? "Compliance review required" : "Standard human review"}
                </p>
                <div className="workflow-counts">
                  <span>
                    <FileClock /> {item.revisions.length} immutable revisions
                  </span>
                  <span>{item.approvals.length} decisions</span>
                </div>
                {item.revisions[0]?.isAiGenerated && <AiNotice />}
                <div className="revision-preview">{item.revisions[0]?.content}</div>
                {["DRAFT", "AI_ASSISTED", "HUMAN_REVIEW", "COMPLIANCE_REVIEW"].includes(
                  item.status,
                ) && (
                  <form
                    className="inline-workflow-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const content = String(
                        new FormData(event.currentTarget).get("content") || "",
                      );
                      void act(() => workflowApi.addRevision(tenant, campaign, item.id, content));
                    }}
                  >
                    <textarea
                      name="content"
                      defaultValue={item.revisions[0]?.content}
                      aria-label={`New revision for ${item.title}`}
                      required
                    />
                    <button>Save human revision</button>
                  </form>
                )}
                <div className="workflow-actions">
                  {nextCommunication(item).map((next) => (
                    <button
                      key={next}
                      disabled={busy}
                      onClick={() =>
                        void act(() =>
                          next === "AI_ASSISTED"
                            ? workflowApi.communicationAi(tenant, campaign, item.id)
                            : workflowApi.communicationTransition(tenant, campaign, item.id, next),
                        )
                      }
                    >
                      {next === "AI_ASSISTED" && <Bot />}
                      {title(next)}
                    </button>
                  ))}
                </div>
                <small className="no-publish">
                  <ShieldCheck /> PoliSmart cannot autonomously publish this communication.
                </small>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
function CreateCard({
  onSubmit,
  children,
}: {
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
}) {
  return (
    <form className="workflow-create" onSubmit={onSubmit}>
      <h2>Create new work item</h2>
      {children}
    </form>
  );
}
function WorkflowTrack({ steps, current }: { steps: string[]; current: string }) {
  const active = steps.indexOf(current);
  return (
    <div className="workflow-track" aria-label={`Current status ${title(current)}`}>
      {steps.map((step, index) => (
        <span className={index <= active ? "complete" : ""} key={step}>
          {index < active ? <CheckCircle2 /> : index + 1}
          <small>{title(step)}</small>
        </span>
      ))}
    </div>
  );
}
function AiNotice() {
  return (
    <div className="ai-draft-notice">
      <Bot />
      <strong>AI-generated draft — human review required.</strong>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="workflow-empty">
      <Newspaper />
      <p>{text}</p>
    </div>
  );
}
function nextPolicy(status: string, item: PolicyCase) {
  if (status === "PROBLEM") return ["EVIDENCE"];
  if (status === "EVIDENCE") return item.evidence.length ? ["RESEARCH"] : [];
  if (status === "RESEARCH")
    return item.evidence.some((entry) => entry.evidenceType === "RESEARCH") ? ["OPTIONS"] : [];
  if (status === "OPTIONS") return item.options.length ? ["AI_DRAFT"] : [];
  if (status === "AI_DRAFT") return ["HUMAN_REVIEW"];
  if (status === "HUMAN_REVIEW") return ["APPROVED", "REJECTED"];
  return [];
}
function nextCommunication(item: Communication) {
  if (item.status === "DRAFT") return ["AI_ASSISTED", "HUMAN_REVIEW"];
  if (item.status === "AI_ASSISTED") return ["HUMAN_REVIEW"];
  if (item.status === "HUMAN_REVIEW")
    return item.complianceRequired ? ["COMPLIANCE_REVIEW", "REJECTED"] : ["APPROVED", "REJECTED"];
  if (item.status === "COMPLIANCE_REVIEW") return ["APPROVED", "REJECTED"];
  return [];
}
