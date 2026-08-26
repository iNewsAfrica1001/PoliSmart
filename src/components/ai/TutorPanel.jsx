import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileText,
  Lightbulb,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { api } from "../../lib/api.js";

const starterMessages = [
  { by: "operator", text: "Show all critical tickets and tell me what needs human approval." },
  {
    by: "assistant",
    text: "I can summarize active incidents, device risks, fleet readiness, and recommended owners with confidence and audit notes.",
  },
];

const reviewDecisions = [
  "Approve recommendation",
  "Send correction",
  "Escalate to duty officer",
  "Create security incident",
];

export default function TutorPanel({ user, classroom }) {
  const [prompt, setPrompt] = useState(
    "Summarize today's critical tickets and likely device failures for the executive briefing.",
  );
  const [context, setContext] = useState(classroom?.title || "Statewide Operations Command");
  const [sourceUrl, setSourceUrl] = useState(
    "SharePoint: NYSTA SOP Library; ITSM: Active Incidents; Endpoint: Device Health",
  );
  const [dataSensitivity, setDataSensitivity] = useState("Internal operational data");
  const [decision, setDecision] = useState("Escalate to duty officer");
  const [messages, setMessages] = useState(starterMessages);
  const [hint, setHint] = useState(null);
  const [copilotResult, setCopilotResult] = useState(null);
  const [reviewState, setReviewState] = useState("ready");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const generatedPacket = useMemo(() => {
    if (!hint && !copilotResult) return null;
    const risk = dataSensitivity !== "Public information" ? "Medium" : "Low";
    return {
      answer: copilotResult?.answer || hint?.answer,
      nextAction:
        copilotResult?.recommendation ||
        "Confirm source data and route any high-impact action for approval.",
      confidence: risk === "Medium" ? 84 : 91,
      risk,
      caseId: `NYSTA-${risk === "Medium" ? "REV" : "OPS"}-2094`,
      sources: [
        sourceUrl || "No source supplied",
        "Policy: least privilege and audited AI use",
        "Control: human approval for safety-impacting actions",
      ],
      viewers: [
        "Operator sees recommendation and confidence",
        "Manager sees approvals, owner, SLA, and rationale",
        "Admin sees anonymized audit, latency, model, prompt class, and policy outcome",
      ],
      ifWrong: [
        "Operator flags the result",
        "Recommendation is labeled disputed",
        "Duty officer reviews source bundle",
        "Corrected case enters model evaluation set",
      ],
    };
  }, [copilotResult, dataSensitivity, hint, sourceUrl]);

  async function requestHint(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setReviewState("ready");
    try {
      const [hintResponse, copilotResponse] = await Promise.all([
        api("/api/ai/tutor/hint", {
          method: "POST",
          body: JSON.stringify({
            prompt,
            context: `${context}. Sources: ${sourceUrl}. Data class: ${dataSensitivity}`,
            operatorName: user.name,
          }),
        }),
        api("/api/ai/operations/copilot", {
          method: "POST",
          body: JSON.stringify({ question: prompt }),
        }),
      ]);
      setHint(hintResponse);
      setCopilotResult(copilotResponse);
      setMessages((current) =>
        [
          ...current,
          { by: "operator", text: prompt },
          { by: "assistant", text: copilotResponse.answer || hintResponse.answer },
        ].slice(-6),
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.7fr)]">
      <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-start gap-3">
          <div className="grid size-11 place-items-center rounded-md bg-blue-50 text-blue-700">
            <Bot size={24} aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-black uppercase text-blue-700">Operations Copilot</p>
            <h2 className="text-2xl font-black">Ask, summarize, recommend, approve</h2>
          </div>
        </div>

        <div className="mb-5 grid gap-3 md:grid-cols-3">
          <CaseMeta icon={ClipboardCheck} label="Workflow" value="Briefing and triage" />
          <CaseMeta icon={ShieldCheck} label="Data class" value={dataSensitivity} />
          <CaseMeta
            icon={UserRound}
            label="Owner"
            value={classroom?.instructor || "Duty Officer"}
          />
        </div>

        <div
          className="mb-5 grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3"
          aria-label="Copilot transcript"
        >
          {messages.map((message, index) => (
            <div
              className={`flex gap-3 ${message.by === "operator" ? "" : "sm:ml-8"}`}
              key={`${message.by}-${index}`}
            >
              <div
                className={`grid size-9 shrink-0 place-items-center rounded-md ${message.by === "operator" ? "bg-teal-700 text-white" : "bg-blue-700 text-white"}`}
              >
                {message.by === "operator" ? (
                  <UserRound size={17} aria-hidden="true" />
                ) : (
                  <Bot size={17} aria-hidden="true" />
                )}
              </div>
              <p className="min-w-0 rounded-md bg-white p-3 text-sm leading-6 text-slate-700 shadow-sm">
                {message.text}
              </p>
            </div>
          ))}
        </div>

        <form className="grid gap-4" onSubmit={requestHint}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 font-bold text-slate-700">
              Operations context
              <input
                className="rounded-md border border-slate-300 px-3 py-3"
                value={context}
                onChange={(event) => setContext(event.target.value)}
              />
            </label>
            <label className="grid gap-2 font-bold text-slate-700">
              Data sensitivity
              <select
                className="rounded-md border border-slate-300 bg-white px-3 py-3"
                value={dataSensitivity}
                onChange={(event) => setDataSensitivity(event.target.value)}
              >
                <option>Public information</option>
                <option>Internal operational data</option>
                <option>Restricted employee or asset data</option>
                <option>Unknown sensitivity</option>
              </select>
            </label>
          </div>
          <label className="grid gap-2 font-bold text-slate-700">
            Source bundle
            <input
              className="rounded-md border border-slate-300 px-3 py-3"
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
            />
          </label>
          <label className="grid gap-2 font-bold text-slate-700">
            Natural language request
            <textarea
              className="min-h-36 rounded-md border border-slate-300 px-3 py-3"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />
          </label>
          <button
            className="inline-flex min-h-12 w-fit items-center gap-2 rounded-md bg-teal-700 px-4 font-black text-white disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            <Send size={18} aria-hidden="true" />
            {loading ? "Analyzing" : "Run copilot"}
          </button>
        </form>
      </article>

      <article
        className="rounded-md border border-slate-200 bg-white p-5 shadow-sm"
        aria-live="polite"
      >
        <p className="text-sm font-black uppercase text-teal-700">AI output packet</p>
        {error ? (
          <p className="mt-4 rounded-md bg-red-50 p-3 font-bold text-red-800">{error}</p>
        ) : null}
        {generatedPacket ? (
          <div className="mt-4 grid gap-4">
            <div className="rounded-md border border-teal-100 bg-teal-50 p-4">
              <Lightbulb className="mb-3 text-teal-700" aria-hidden="true" />
              <p className="text-lg font-bold leading-8">{generatedPacket.answer}</p>
              <p className="mt-3 text-sm font-semibold leading-6 text-teal-950">
                {generatedPacket.nextAction}
              </p>
            </div>
            <StatusGrid packet={generatedPacket} />
            {copilotResult?.items?.length ? (
              <pre className="max-h-72 overflow-auto rounded-md bg-slate-950 p-4 text-sm leading-6 text-white">
                {JSON.stringify(copilotResult.items, null, 2)}
              </pre>
            ) : null}
            <div className="rounded-md border border-slate-200 p-4">
              <div className="mb-3 flex items-center gap-2">
                <FileText className="text-blue-700" size={18} aria-hidden="true" />
                <h3 className="font-black">Evidence bundle</h3>
              </div>
              <div className="grid gap-2">
                <p className="text-sm font-semibold text-slate-600">
                  Case: <span className="font-black text-slate-950">{generatedPacket.caseId}</span>
                </p>
                {generatedPacket.sources.map((item) => (
                  <p
                    className="rounded-md bg-slate-50 p-3 text-sm font-semibold text-slate-700"
                    key={item}
                  >
                    {item}
                  </p>
                ))}
              </div>
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-black text-amber-950">When AI is wrong</h3>
                <button
                  className="inline-flex min-h-10 items-center gap-2 rounded-md bg-amber-500 px-3 text-sm font-black text-slate-950"
                  type="button"
                  onClick={() => setReviewState("flagged")}
                >
                  <AlertTriangle size={16} aria-hidden="true" />
                  Flag result
                </button>
              </div>
              <p className="text-sm font-semibold text-amber-950">
                {reviewState === "flagged"
                  ? "Flagged for duty officer review. The result is labeled disputed until review closes."
                  : generatedPacket.ifWrong.join(" -> ")}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 p-4">
              <h3 className="font-black">Reviewer action</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {reviewDecisions.map((item) => (
                  <label
                    className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm font-bold ${decision === item ? "border-blue-700 bg-blue-50 text-blue-950" : "border-slate-200 bg-white text-slate-700"}`}
                    key={item}
                  >
                    <input
                      type="radio"
                      name="review-decision"
                      checked={decision === item}
                      onChange={() => setDecision(item)}
                    />
                    {item}
                  </label>
                ))}
              </div>
              <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                Selected outcome: {decision}
              </p>
            </div>
            <span className="text-sm font-bold text-slate-500">
              Provider: {hint?.provider || "local"} - Model: {hint?.model || "rule-based"}
            </span>
          </div>
        ) : (
          <p className="mt-4 text-slate-600">
            AI output appears here with confidence, risk, evidence, viewers, and escalation
            behavior.
          </p>
        )}
      </article>
    </section>
  );
}

function CaseMeta({ icon: Icon, label, value }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase text-slate-500">
        <Icon size={15} aria-hidden="true" />
        {label}
      </div>
      <p className="text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}

function StatusGrid({ packet }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <MiniStatus
        icon={CheckCircle2}
        label="Confidence"
        value={`${packet.confidence}%`}
        tone="teal"
      />
      <MiniStatus icon={ShieldCheck} label="Risk" value={packet.risk} tone="amber" />
      <MiniStatus
        icon={Eye}
        label="Human review"
        value={packet.risk === "Medium" ? "Required" : "Sampled"}
        tone="blue"
      />
    </div>
  );
}

function MiniStatus({ icon: Icon, label, value, tone }) {
  const colors = {
    teal: "bg-teal-50 text-teal-800",
    amber: "bg-amber-50 text-amber-900",
    blue: "bg-blue-50 text-blue-800",
  };
  return (
    <div className={`rounded-md p-3 ${colors[tone]}`}>
      <Icon size={18} aria-hidden="true" />
      <p className="mt-2 text-xs font-black uppercase">{label}</p>
      <strong className="block text-xl font-black">{value}</strong>
    </div>
  );
}
