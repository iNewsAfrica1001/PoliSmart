import { useMemo, useState } from "react";
import {
  Award,
  CalendarCheck,
  CheckCircle2,
  Download,
  FileText,
  HandCoins,
  MessageSquareText,
  Send,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { api } from "../../lib/api.js";

export default function FeatureWorkspace({ view, catalog, user }) {
  if (view === "studio") return <ContentStudio catalog={catalog} user={user} />;
  if (view === "manifesto") return <ManifestoBuilder user={user} />;
  if (view === "field") return <FieldWorkspace catalog={catalog} />;
  if (view === "fundraising") return <FundraisingWorkspace />;
  if (view === "sentiment") return <SentimentWorkspace catalog={catalog} />;
  return <ComplianceCenter catalog={catalog} user={user} />;
}

function ContentStudio({ catalog, user }) {
  const scenarios = catalog.scamSimulations || [];
  const [activeId, setActiveId] = useState(scenarios[0]?.id || "");
  const [selectedFlags, setSelectedFlags] = useState([]);
  const [artifact, setArtifact] = useState("town-hall-speech");
  const [tone, setTone] = useState("Inspirational");
  const [language, setLanguage] = useState("English");
  const [brief, setBrief] = useState(
    "Youth employment, cost of living, healthcare access, and peaceful national unity",
  );
  const [result, setResult] = useState(null);
  const active = scenarios.find((item) => item.id === activeId) || scenarios[0];
  const flagChoices = useMemo(
    () =>
      Array.from(
        new Set([
          ...(active?.redFlags || []),
          "Clear citation",
          "Approved disclaimer",
          "Neutral policy contrast",
        ]),
      ),
    [active],
  );

  async function generate(event) {
    event.preventDefault();
    const payload = await api("/api/ai/career/generate", {
      method: "POST",
      body: JSON.stringify({
        type: artifact,
        name: user.name,
        targetRole: `${tone} ${language} campaign content`,
        experience: brief,
      }),
    });
    setResult(payload);
  }

  async function scoreScenario() {
    const payload = await api(`/api/training/scams/${active.id}/attempt`, {
      method: "POST",
      body: JSON.stringify({ learnerId: user.name, selectedFlags }),
    });
    setResult(payload.attempt);
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(340px,0.65fr)]">
      <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <Header
          icon={Sparkles}
          kicker="AI content studio"
          title="Generate and review campaign messages"
        />
        <form className="grid gap-4" onSubmit={generate}>
          <div className="grid gap-3 md:grid-cols-3">
            <Select
              label="Artifact"
              value={artifact}
              onChange={setArtifact}
              options={[
                "town-hall-speech",
                "press-release",
                "whatsapp-message",
                "sms-text",
                "email-newsletter",
                "campaign-slogan",
              ]}
            />
            <Select
              label="Tone"
              value={tone}
              onChange={setTone}
              options={[
                "Inspirational",
                "Presidential",
                "Grassroots",
                "Formal",
                "Visionary",
                "Policy-focused",
              ]}
            />
            <Select
              label="Language"
              value={language}
              onChange={setLanguage}
              options={[
                "English",
                "French",
                "Portuguese",
                "Arabic",
                "Swahili",
                "Hausa",
                "Yoruba",
                "Igbo",
                "Zulu",
                "Amharic",
              ]}
            />
          </div>
          <label className="grid gap-2 font-bold text-slate-700">
            Campaign brief
            <textarea
              className="min-h-32 rounded-md border border-slate-300 px-3 py-3"
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
            />
          </label>
          <button
            className="inline-flex min-h-12 w-fit items-center gap-2 rounded-md bg-emerald-700 px-4 font-black text-white"
            type="submit"
          >
            <Send size={18} aria-hidden="true" />
            Generate draft
          </button>
        </form>

        {active ? (
          <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-black uppercase text-amber-800">Safety review scenario</p>
            <p className="mt-2 text-lg font-bold leading-8 text-amber-950">
              {active.title}: {active.content}
            </p>
            <fieldset className="mt-4 grid gap-2">
              <legend className="mb-1 text-sm font-black">
                Select the risks to block or review
              </legend>
              {flagChoices.map((flag) => (
                <label
                  className="flex min-h-11 items-center gap-3 rounded-md border border-amber-200 bg-white px-3 font-semibold"
                  key={flag}
                >
                  <input
                    type="checkbox"
                    checked={selectedFlags.includes(flag)}
                    onChange={() =>
                      setSelectedFlags((current) =>
                        current.includes(flag)
                          ? current.filter((item) => item !== flag)
                          : [...current, flag],
                      )
                    }
                  />
                  {flag}
                </label>
              ))}
            </fieldset>
            <button
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md bg-slate-950 px-4 font-black text-white"
              type="button"
              onClick={scoreScenario}
            >
              <CheckCircle2 size={18} aria-hidden="true" />
              Score safety review
            </button>
          </div>
        ) : null}
      </article>
      <ResultPanel
        title="Generated output and review"
        result={result}
        fallback="Draft speeches, press releases, social posts, SMS, email, WhatsApp text, slogans, and safety-review feedback will appear here."
      />
    </section>
  );
}

function ManifestoBuilder({ user }) {
  const [sector, setSector] = useState("Youth employment and skills");
  const [country, setCountry] = useState("Ghana");
  const [priorities, setPriorities] = useState(
    "apprenticeships, digital jobs, small business finance, transparent delivery metrics",
  );
  const [result, setResult] = useState(null);

  async function submit(event) {
    event.preventDefault();
    const payload = await api("/api/ai/career/generate", {
      method: "POST",
      body: JSON.stringify({
        type: "manifesto",
        name: user.name,
        targetRole: `${country} ${sector} manifesto`,
        experience: priorities,
      }),
    });
    setResult(payload);
  }

  return (
    <GeneratorPanel
      icon={FileText}
      kicker="Manifesto builder"
      title="Draft policy sections with budget assumptions"
      onSubmit={submit}
      result={result}
      fields={
        <>
          <Input label="Country profile" value={country} onChange={setCountry} />
          <Input label="Policy sector" value={sector} onChange={setSector} />
          <TextArea label="Strategic priorities" value={priorities} onChange={setPriorities} />
        </>
      }
      button="Build manifesto section"
      fallback="The builder returns an executive summary, goals, delivery plan, budget assumptions, legislative agenda, and review checklist."
    />
  );
}

function FieldWorkspace({ catalog }) {
  const events = catalog.events || [];
  const regions = catalog.regionalPerformance || [];
  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <Header
          icon={CalendarCheck}
          kicker="Volunteer and event management"
          title="Plan rallies, town halls, outreach, and check-in"
        />
        <div className="grid gap-3">
          {events.map((event) => (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4" key={event.id}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black uppercase text-blue-700">
                    {event.type} - {event.date}
                  </p>
                  <h3 className="text-xl font-black">{event.title}</h3>
                  <p className="text-sm font-semibold text-slate-500">{event.location}</p>
                </div>
                <span className="w-fit rounded-md bg-white px-3 py-2 text-sm font-black text-emerald-800">
                  {event.checkedIn}/{event.rsvp} checked in
                </span>
              </div>
            </div>
          ))}
        </div>
      </article>
      <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <Header icon={Users} kicker="Volunteer deployment" title="Skills and geography" />
        <div className="grid gap-4">
          {regions.map((region) => (
            <div key={region.region}>
              <div className="mb-2 flex items-center justify-between">
                <span className="font-bold text-slate-700">{region.region}</span>
                <span className="font-black text-emerald-700">
                  {region.volunteers.toLocaleString()}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-md bg-slate-100">
                <div
                  className="h-full rounded-md bg-emerald-700"
                  style={{ width: `${Math.min(region.volunteers / 16, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

function FundraisingWorkspace() {
  const [result, setResult] = useState(null);
  async function submit() {
    const payload = await api("/api/ai/career/generate", {
      method: "POST",
      body: JSON.stringify({
        type: "fundraising",
        name: "Finance Officer",
        targetRole: "donation compliance workflow",
        experience:
          "mobile money, bank transfer, donor eligibility, receipt generation, expense reporting, country legal limits",
      }),
    });
    setResult(payload);
  }
  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(340px,0.7fr)]">
      <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <Header
          icon={HandCoins}
          kicker="Fundraising module"
          title="Donation tracking and compliance reporting"
        />
        <div className="grid gap-3 md:grid-cols-3">
          <Stat label="Donation target" value="69%" />
          <Stat label="Receipts issued" value="14,820" />
          <Stat label="Expense variance" value="3.2%" />
        </div>
        <button
          className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-md bg-emerald-700 px-4 font-black text-white"
          type="button"
          onClick={submit}
        >
          <Send size={18} aria-hidden="true" />
          Generate compliance workflow
        </button>
      </article>
      <ResultPanel
        title="Finance workflow"
        result={result}
        fallback="Generate donation tracking, receipt, reporting, and payment integration controls."
      />
    </section>
  );
}

function SentimentWorkspace({ catalog }) {
  const topics = catalog.sentimentTopics || [];
  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <Header
          icon={TrendingUp}
          kicker="AI sentiment analysis"
          title="Aggregate issue trends from permitted data"
        />
        <div className="grid gap-4">
          {topics.map((topic) => (
            <div className="rounded-md border border-slate-200 p-4" key={topic.topic}>
              <h3 className="font-black">{topic.topic}</h3>
              <div className="mt-3 grid grid-cols-3 gap-2 text-sm font-black">
                <span className="rounded-md bg-emerald-50 p-2 text-emerald-800">
                  Positive {topic.positive}%
                </span>
                <span className="rounded-md bg-slate-100 p-2 text-slate-700">
                  Neutral {topic.neutral}%
                </span>
                <span className="rounded-md bg-amber-50 p-2 text-amber-900">
                  Negative {topic.negative}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </article>
      <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <Header
          icon={MessageSquareText}
          kicker="Strategy assistant"
          title="Explainable recommendations"
        />
        <ul className="grid gap-3 text-sm font-semibold leading-6 text-slate-600">
          <li className="rounded-md bg-slate-50 p-3">
            Prioritize youth employment content in Accra and national social channels.
          </li>
          <li className="rounded-md bg-slate-50 p-3">
            Schedule healthcare listening sessions in Ashanti with local policy validators.
          </li>
          <li className="rounded-md bg-slate-50 p-3">
            Deploy trained volunteers to regions with high RSVP but lower check-in rates.
          </li>
          <li className="rounded-md bg-slate-50 p-3">
            Keep all recommendations aggregate and reviewed before outreach execution.
          </li>
        </ul>
      </article>
    </section>
  );
}

function ComplianceCenter({ catalog, user }) {
  const [requested, setRequested] = useState(null);
  const certs = catalog.certificates || [];

  async function requestCertificate(cert) {
    const payload = await api("/api/training/certificates/request", {
      method: "POST",
      body: JSON.stringify({ learnerId: user.name, title: cert.title, progress: cert.progress }),
    });
    setRequested(payload.certificate);
  }

  return (
    <section className="grid gap-5 lg:grid-cols-2">
      {certs.map((cert) => (
        <article
          className="rounded-md border border-slate-200 bg-white p-5 shadow-sm"
          key={cert.id}
        >
          <Header icon={Award} kicker="Security and compliance control" title={cert.title} />
          <div className="mt-4 h-3 overflow-hidden rounded-md bg-slate-100">
            <div
              className="h-full rounded-md bg-emerald-700"
              style={{ width: `${cert.progress}%` }}
            />
          </div>
          <p className="mt-2 text-sm font-bold text-slate-600">
            {cert.progress}% complete - {cert.status}
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-500">Approval: {cert.approver}</p>
          <button
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md bg-slate-950 px-4 font-black text-white disabled:opacity-50"
            disabled={cert.progress < 90}
            type="button"
            onClick={() => requestCertificate(cert)}
          >
            <Download size={18} aria-hidden="true" />
            Request review
          </button>
        </article>
      ))}
      <article className="rounded-md border border-red-200 bg-red-50 p-5">
        <Header icon={ShieldAlert} kicker="Blocked design space" title="Misuse protections" />
        <p className="text-sm font-semibold leading-6 text-red-950">
          The platform blocks misinformation workflows, voter suppression, protected-attribute
          targeting, unverified personal attacks, undisclosed synthetic media, and unauthorized
          supporter data exports.
        </p>
      </article>
      {requested ? <ResultPanel title="Review request" result={requested} /> : null}
    </section>
  );
}

function GeneratorPanel({ icon, kicker, title, onSubmit, fields, button, result, fallback }) {
  const Icon = icon;
  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(340px,0.65fr)]">
      <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <Header icon={Icon} kicker={kicker} title={title} />
        <form className="grid gap-4" onSubmit={onSubmit}>
          {fields}
          <button
            className="inline-flex min-h-12 w-fit items-center gap-2 rounded-md bg-emerald-700 px-4 font-black text-white"
            type="submit"
          >
            <Send size={18} aria-hidden="true" />
            {button}
          </button>
        </form>
      </article>
      <ResultPanel title="Generated artifact" result={result} fallback={fallback} />
    </section>
  );
}

function ResultPanel({ title, result, fallback }) {
  return (
    <article
      className="rounded-md border border-slate-200 bg-white p-5 shadow-sm"
      aria-live="polite"
    >
      <p className="text-sm font-black uppercase text-emerald-700">{title}</p>
      {result ? (
        <pre className="mt-4 max-h-[520px] overflow-auto whitespace-pre-wrap rounded-md bg-slate-950 p-4 text-sm leading-6 text-white">
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : (
        <p className="mt-4 text-slate-600">{fallback}</p>
      )}
    </article>
  );
}

function Header({ icon: Icon, kicker, title }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="grid size-11 place-items-center rounded-md bg-blue-50 text-blue-700">
        <Icon size={24} aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-black uppercase text-blue-700">{kicker}</p>
        <h2 className="text-2xl font-black">{title}</h2>
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="grid gap-2 font-bold text-slate-700">
      {label}
      <select
        className="rounded-md border border-slate-300 bg-white px-3 py-3"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );
}

function Input({ label, value, onChange }) {
  return (
    <label className="grid gap-2 font-bold text-slate-700">
      {label}
      <input
        className="rounded-md border border-slate-300 px-3 py-3"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function TextArea({ label, value, onChange }) {
  return (
    <label className="grid gap-2 font-bold text-slate-700">
      {label}
      <textarea
        className="min-h-40 rounded-md border border-slate-300 px-3 py-3"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <strong className="mt-2 block text-2xl font-black">{value}</strong>
    </div>
  );
}
