import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Cloud,
  Database,
  FileSearch,
  GitBranch,
  KeyRound,
  Network,
  ShieldCheck,
  Users,
} from "lucide-react";

const dataFlow = [
  {
    event: "Ingest campaign data",
    input:
      "Supporter CRM, volunteer rosters, event RSVPs, donation records, media assets, public feedback, and approved policy documents",
    ai: "Classify, redact, normalize, translate, retrieve source context, and score confidence",
    human: "Data owners approve connectors, consent rules, and retention",
    output: "Governed campaign data products",
  },
  {
    event: "Run AI workflows",
    input: "Authorized user request plus country compliance profile and source bundle",
    ai: "RAG, content generation, topic clustering, sentiment summaries, and strategy recommendations",
    human: "Campaign lead reviews rationale, factual claims, tone, and legal constraints",
    output: "Speech draft, manifesto section, event plan, CRM task, or finance report",
  },
  {
    event: "Approve and act",
    input: "Recommendation, owner, confidence, disclaimer, and audit context",
    ai: "Prepares publishing package, volunteer task, receipt batch, or strategy brief",
    human: "Approver accepts, edits, rejects, or escalates",
    output: "Audited campaign action and model feedback record",
  },
];

const securityControls = [
  "OAuth/JWT authentication with MFA and least-privilege RBAC",
  "Role scoping for candidate, campaign manager, communications, field, finance, analyst, media, regional, and admin users",
  "Encryption in transit and at rest, secure backups, secrets management, API rate limiting, and audit logs",
  "Country-level election law, donation, privacy, disclaimer, and retention configuration",
  "Human approval for content publishing, fundraising reports, high-impact outreach, and AI image concepts",
  "Misuse protections against misinformation, voter suppression, protected-attribute targeting, and unauthorized data exports",
];

const deploymentOptions = [
  {
    title: "Pilot",
    icon: Cloud,
    detail:
      "Managed web app, PostgreSQL, Redis, object storage, OpenAI API, vector index, and country compliance profile.",
  },
  {
    title: "Enterprise",
    icon: Network,
    detail:
      "Kubernetes, private networking, WAF, CI/CD approvals, SAST, container scanning, centralized monitoring, and disaster recovery.",
  },
  {
    title: "Integrations",
    icon: GitBranch,
    detail:
      "Payment gateways, SMS, WhatsApp, email, social publishing, GIS data, media storage, and analytics pipelines.",
  },
];

const roadmap = [
  "Add production FastAPI microservices for AI workflows, RAG, translation, and image generation approvals",
  "Persist campaign CRM, events, donations, content, and audit entities in PostgreSQL with Prisma or SQL migrations",
  "Add vector indexes for manifestos, country law, policy research, speeches, media kits, and approved fact sheets",
  "Add Kubernetes manifests, GitHub Actions, dependency scanning, release approvals, and environment promotion",
  "Add model evaluation for factuality, toxicity, bias, hallucination, legal risk, protected targeting, and cost",
  "Add country packs for Ghana, Nigeria, Kenya, South Africa, Senegal, Ethiopia, Tanzania, and additional deployments",
];

const launchGates = [
  {
    key: "staticBuild",
    label: "Static production build",
    detail: "Vite assets exist in dist for the Node production server.",
  },
  {
    key: "productionSecrets",
    label: "Production secrets",
    detail: "JWT secret length and secret posture satisfy production requirements.",
  },
  {
    key: "originConfigured",
    label: "Allowed origins",
    detail: "Client origins are explicitly configured for CORS.",
  },
  {
    key: "realtime",
    label: "Realtime channel",
    detail: "Socket.IO is initialized for campaign-room collaboration.",
  },
  {
    key: "databaseConfigured",
    label: "Database configured",
    detail: "PostgreSQL connection string is present.",
  },
  {
    key: "llmConfigured",
    label: "LLM configured",
    detail: "OpenAI or compatible LLM key is present.",
  },
];

export default function OperationsMap({ user, catalog = {}, platformStatus = {} }) {
  const layers = catalog.architectureLayers || [];
  const checks = platformStatus.ready?.checks || {};
  const warnings = platformStatus.ready?.warnings || [];
  const mode = platformStatus.ready?.mode || platformStatus.health?.env || "development";
  const isReady = platformStatus.ready?.status === "ready";
  return (
    <section className="grid gap-5">
      <section className="grid gap-4 md:grid-cols-3">
        <OpsMetric
          icon={CheckCircle2}
          label="Runtime mode"
          value={mode === "production" ? "Production" : "Design"}
          detail={isReady ? "Launch gates passing" : "Launch gates pending"}
        />
        <OpsMetric
          icon={KeyRound}
          label="Security model"
          value="RBAC + MFA"
          detail="OAuth, JWT, audit logs, encryption"
        />
        <OpsMetric
          icon={Users}
          label="Active role"
          value={user?.role || "candidate"}
          detail="Role-aware data and action scoping"
        />
      </section>

      <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-3">
            <div
              className={`grid size-11 place-items-center rounded-md ${isReady ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
            >
              <CheckCircle2 size={24} aria-hidden="true" />
            </div>
            <div>
              <p
                className={`text-sm font-black uppercase ${isReady ? "text-emerald-700" : "text-amber-700"}`}
              >
                Production readiness
              </p>
              <h2 className="text-2xl font-black">Launch gates</h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                Readiness checks cover static assets, secrets, origins, realtime collaboration,
                database, and AI provider configuration.
              </p>
            </div>
          </div>
          <span
            className={`w-fit rounded-md px-3 py-2 text-sm font-black uppercase ${isReady ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}
          >
            {platformStatus.ready?.status || "not-ready"}
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {launchGates.map((gate) => {
            const pass = Boolean(checks[gate.key]);
            return (
              <div
                className={`rounded-md border p-4 ${pass ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}
                key={gate.key}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className={`font-black ${pass ? "text-emerald-950" : "text-amber-950"}`}>
                    {gate.label}
                  </h3>
                  <span
                    className={`rounded-md bg-white px-2 py-1 text-xs font-black uppercase ${pass ? "text-emerald-800" : "text-amber-900"}`}
                  >
                    {pass ? "Pass" : "Pending"}
                  </span>
                </div>
                <p
                  className={`text-sm font-semibold leading-6 ${pass ? "text-emerald-900" : "text-amber-950"}`}
                >
                  {gate.detail}
                </p>
              </div>
            );
          })}
        </div>
        {warnings.length ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4">
            <div className="mb-2 flex items-center gap-2 font-black text-amber-950">
              <AlertTriangle size={18} aria-hidden="true" />
              Production warnings
            </div>
            <div className="grid gap-2">
              {warnings.map((warning) => (
                <p className="text-sm font-bold leading-6 text-amber-950" key={warning}>
                  {warning}
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </article>

      <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-start gap-3">
          <div className="grid size-11 place-items-center rounded-md bg-emerald-50 text-emerald-700">
            <Bot size={24} aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-black uppercase text-emerald-700">Complete architecture</p>
            <h2 className="text-2xl font-black">Modular campaign platform</h2>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {layers.map((layer) => (
            <p
              className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm font-bold leading-6 text-slate-700"
              key={layer}
            >
              {layer}
            </p>
          ))}
        </div>
      </article>

      <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <Database className="text-blue-700" size={28} aria-hidden="true" />
          <div>
            <p className="text-sm font-black uppercase text-blue-700">Data flow</p>
            <h2 className="text-2xl font-black">From signal to governed campaign action</h2>
          </div>
        </div>
        <div className="grid gap-3">
          {dataFlow.map((item, index) => (
            <div
              className="grid gap-3 rounded-md border border-slate-200 p-4 lg:grid-cols-[64px_220px_minmax(0,1fr)]"
              key={item.event}
            >
              <div className="grid size-12 place-items-center rounded-md bg-blue-700 text-xl font-black text-white">
                {index + 1}
              </div>
              <div>
                <h3 className="font-black">{item.event}</h3>
                <p className="text-sm font-semibold text-slate-500">{item.output}</p>
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                <FlowCell icon={Database} label="Input" text={item.input} />
                <FlowCell icon={Bot} label="AI processing" text={item.ai} />
                <FlowCell icon={Users} label="Human control" text={item.human} />
              </div>
            </div>
          ))}
        </div>
      </article>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(360px,0.6fr)]">
        <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <ShieldCheck className="text-emerald-700" size={28} aria-hidden="true" />
            <div>
              <p className="text-sm font-black uppercase text-emerald-700">Security assessment</p>
              <h2 className="text-2xl font-black">Campaign-grade controls</h2>
            </div>
          </div>
          <div className="grid gap-2">
            {securityControls.map((item) => (
              <div className="flex items-start gap-3 rounded-md bg-emerald-50 p-3" key={item}>
                <CheckCircle2
                  className="mt-0.5 shrink-0 text-emerald-700"
                  size={18}
                  aria-hidden="true"
                />
                <p className="text-sm font-bold leading-6 text-emerald-950">{item}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <AlertTriangle className="text-amber-600" size={28} aria-hidden="true" />
            <div>
              <p className="text-sm font-black uppercase text-amber-700">Human approval</p>
              <h2 className="text-2xl font-black">High-impact gates</h2>
            </div>
          </div>
          <ol className="grid gap-2">
            {[
              "Publishing campaign claims",
              "AI image concepts",
              "Donation compliance exports",
              "Bulk supporter outreach",
              "Low-confidence strategy recommendations",
            ].map((item) => (
              <li
                className="rounded-md bg-amber-50 p-3 text-sm font-bold text-amber-950"
                key={item}
              >
                {item}
              </li>
            ))}
          </ol>
        </article>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        {deploymentOptions.map(({ title, icon: Icon, detail }) => (
          <article
            className="rounded-md border border-slate-200 bg-white p-5 shadow-sm"
            key={title}
          >
            <Icon className="text-blue-700" size={28} aria-hidden="true" />
            <h3 className="mt-3 text-xl font-black">{title}</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{detail}</p>
          </article>
        ))}
      </section>

      <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <FileSearch className="text-emerald-700" size={28} aria-hidden="true" />
          <div>
            <p className="text-sm font-black uppercase text-emerald-700">Scalability roadmap</p>
            <h2 className="text-2xl font-black">Next production increments</h2>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {roadmap.map((item) => (
            <p
              className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm font-bold leading-6 text-slate-700"
              key={item}
            >
              {item}
            </p>
          ))}
        </div>
      </article>
    </section>
  );
}

function OpsMetric({ icon: Icon, label, value, detail }) {
  return (
    <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-sm font-black uppercase text-slate-500">{label}</span>
        <Icon className="text-emerald-700" size={22} aria-hidden="true" />
      </div>
      <strong className="block text-3xl font-black">{value}</strong>
      <p className="mt-1 text-sm font-semibold text-slate-500">{detail}</p>
    </article>
  );
}

function FlowCell({ icon: Icon, label, text }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase text-slate-500">
        <Icon size={15} aria-hidden="true" />
        {label}
      </div>
      <p className="text-sm leading-6 text-slate-700">{text}</p>
    </div>
  );
}
