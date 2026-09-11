import { FormEvent, useState } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import {
  submitPrelaunchRequest,
  type PrelaunchRequest,
  type PrelaunchRequestType,
} from "../lib/prelaunch";

const interests = [
  ["POLITICAL_INTELLIGENCE", "Political intelligence"],
  ["CAMPAIGN_MANAGEMENT", "Campaign management"],
  ["AI_ASSISTANT", "AI Assistant"],
  ["KNOWLEDGE_BASE", "Knowledge Base"],
  ["POLICY_COMMUNICATIONS", "Policy / Communications"],
  ["EVENTS_OPERATIONS", "Events / Operations"],
  ["OTHER", "Other"],
];

const organizationTypes = [
  ["POLITICAL_CAMPAIGN", "Political campaign"],
  ["POLITICAL_PARTY", "Political party"],
  ["GOVERNANCE_ORGANIZATION", "Governance organization"],
  ["PUBLIC_POLICY_ORGANIZATION", "Public-policy organization"],
  ["RESEARCH_ORGANIZATION", "Research organization"],
  ["CONSULTING_ADVISORY", "Consulting / advisory"],
  ["NGO_CIVIL_SOCIETY", "NGO / civil society"],
  ["OTHER", "Other"],
];

const demoTimings = [
  ["AS_SOON_AS_POSSIBLE", "As soon as possible"],
  ["WITHIN_1_WEEK", "Within 1 week"],
  ["WITHIN_2_WEEKS", "Within 2 weeks"],
  ["EXPLORING_FOR_LATER", "Exploring for later"],
];

const emptyForm: PrelaunchRequest = {
  name: "",
  email: "",
  organization: "",
  country: "",
  role: "",
  interest: "",
  organizationType: "",
  timing: "",
  note: "",
};

export function PrelaunchRequestPage({ requestType }: { requestType: PrelaunchRequestType }) {
  const demo = requestType === "DEMO";
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const update = (field: keyof PrelaunchRequest, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    setMessage("");
    try {
      const result = await submitPrelaunchRequest(requestType, form);
      setMessage(result.message);
      setStatus("success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We could not submit your request.");
      setStatus("error");
    }
  }

  return (
    <div className="prelaunch-page">
      <header className="prelaunch-header">
        <a className="marketing-brand" href="/" aria-label="PoliSmart Africa AI home">
          <span className="brand-symbol">P</span>
          <span><strong>PoliSmart Africa AI</strong><small>CAMPAIGN INTELLIGENCE</small></span>
        </a>
        <a className="prelaunch-back" href="/"><ArrowLeft aria-hidden="true" /> Back to homepage</a>
      </header>
      <main className="prelaunch-main">
        <section className="prelaunch-introduction">
          <span className="marketing-kicker">PRE-LAUNCH PROGRAM</span>
          <h1>{demo ? "Request a PoliSmart demo" : "Request early access"}</h1>
          <p>
            {demo
              ? "Tell us about your organization and what you would like to explore in a focused product demonstration."
              : "Join the first campaign professionals and organizations exploring grounded political intelligence built for African realities."}
          </p>
        </section>
        <section className="prelaunch-form-card" aria-label={demo ? "Demo request" : "Early access request"}>
          {status === "success" ? (
            <div className="prelaunch-success" role="status">
              <CheckCircle2 aria-hidden="true" />
              <h2>Request received</h2>
              <p>{message}</p>
              <a className="marketing-button marketing-button--gold" href="/">Return to homepage</a>
            </div>
          ) : (
            <form onSubmit={submit}>
              <label htmlFor="name">Full name</label>
              <input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} required minLength={2} maxLength={120} autoComplete="name" />
              <label htmlFor="email">Work email</label>
              <input id="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required maxLength={254} autoComplete="email" />
              <label htmlFor="organization">Organization name</label>
              <input id="organization" value={form.organization} onChange={(e) => update("organization", e.target.value)} required minLength={2} maxLength={160} autoComplete="organization" />
              <div className="prelaunch-form-grid">
                <div><label htmlFor="country">Country</label><input id="country" value={form.country} onChange={(e) => update("country", e.target.value)} required minLength={2} maxLength={100} autoComplete="country-name" /></div>
                <div><label htmlFor="role">Role / job title</label><input id="role" value={form.role} onChange={(e) => update("role", e.target.value)} required minLength={2} maxLength={120} autoComplete="organization-title" /></div>
              </div>
              {demo ? (
                <>
                  <label htmlFor="organizationType">Organization type</label>
                  <select id="organizationType" value={form.organizationType} onChange={(e) => update("organizationType", e.target.value)} required><option value="">Select an organization type</option>{organizationTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                  <label htmlFor="timing">Preferred demo timing</label>
                  <select id="timing" value={form.timing} onChange={(e) => update("timing", e.target.value)} required><option value="">Select preferred timing</option>{demoTimings.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                </>
              ) : (
                <><label htmlFor="interest">Primary area of interest</label><select id="interest" value={form.interest} onChange={(e) => update("interest", e.target.value)} required><option value="">Select an area of interest</option>{interests.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></>
              )}
              <label htmlFor="note">{demo ? "What would you like to see in the demo?" : "What would you like to use PoliSmart for?"} <span>(optional)</span></label>
              <textarea id="note" value={form.note} onChange={(e) => update("note", e.target.value)} maxLength={500} rows={4} />
              <p className="prelaunch-consent">
                By submitting this form, you agree that SentinelAI LLC may use the information you provide to contact you about PoliSmart Africa AI, early access, demos, and launch updates. Do not submit sensitive personal information. Read our <a href="/privacy">Privacy Notice</a>.
              </p>
              {status === "error" && <p className="form-error" role="alert">{message}</p>}
              <button className="marketing-button marketing-button--gold" type="submit" disabled={status === "submitting"}>
                {status === "submitting" ? "Submitting…" : demo ? "Request a Demo" : "Request Early Access"}
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
