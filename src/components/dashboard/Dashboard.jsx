import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileSearch,
  HandCoins,
  MapPinned,
  Megaphone,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";

const workflow = [
  {
    step: "1",
    title: "Plan",
    detail:
      "Set country rules, campaign goals, regional priorities, audiences, content approvals, and human review thresholds.",
    owner: "Campaign leadership",
    icon: ClipboardList,
  },
  {
    step: "2",
    title: "Mobilize",
    detail:
      "Coordinate volunteers, events, supporter follow-up, RSVP, QR check-in, outreach tasks, and regional performance.",
    owner: "Field team",
    icon: Users,
  },
  {
    step: "3",
    title: "Communicate",
    detail:
      "Draft speeches, manifesto sections, press releases, social posts, SMS, email, and WhatsApp content with factual guardrails.",
    owner: "Communications",
    icon: Megaphone,
  },
  {
    step: "4",
    title: "Govern",
    detail:
      "Audit approvals, enforce donation rules, protect supporter data, explain AI recommendations, and block manipulative tactics.",
    owner: "Compliance",
    icon: ShieldCheck,
  },
];

export default function Dashboard({ catalog, user }) {
  const tasks = catalog.operationalTickets || [];
  const regions = catalog.regionalPerformance || [];
  const latest = catalog.analytics?.at(-1) || {};

  return (
    <div className="grid gap-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Campaign summary">
        <Metric
          icon={TrendingUp}
          label="Engagement"
          value={`${latest.engagement || 79}%`}
          detail="+4 points this week"
        />
        <Metric
          icon={Users}
          label="Volunteers"
          value={(latest.volunteers || 5620).toLocaleString()}
          detail="active and assignable"
        />
        <Metric
          icon={CalendarDays}
          label="Events"
          value={latest.events || 35}
          detail="planned or completed"
        />
        <Metric
          icon={HandCoins}
          label="Fundraising"
          value={`${latest.donations || 69}%`}
          detail="monthly legal target"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.7fr)]">
        <article className="min-w-0 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-sm font-black uppercase text-emerald-700">Campaign analytics</p>
            <h2 className="text-2xl font-black">Engagement, volunteers, and public sentiment</h2>
          </div>
          <div className="h-80 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={catalog.analytics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="engagement"
                  stroke="#047857"
                  fill="#bbf7d0"
                  name="Engagement"
                />
                <Area
                  type="monotone"
                  dataKey="sentiment"
                  stroke="#1d4ed8"
                  fill="#bfdbfe"
                  name="Positive sentiment"
                />
                <Area
                  type="monotone"
                  dataKey="donations"
                  stroke="#b45309"
                  fill="#fde68a"
                  name="Fundraising target"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="min-w-0 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-sm font-black uppercase text-emerald-700">Volunteer growth</p>
            <h2 className="text-2xl font-black">Mobilization capacity</h2>
          </div>
          <div className="h-80 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catalog.analytics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="volunteers" fill="#0f766e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <article className="rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black uppercase text-blue-700">Campaign queue</p>
                <h2 className="text-2xl font-black">Approvals, events, finance, and outreach</h2>
              </div>
              <span className="w-fit rounded-md bg-amber-50 px-3 py-1 text-sm font-black text-amber-800">
                {tasks.length} active items
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">ID</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Urgency</th>
                  <th className="px-5 py-3">Owner</th>
                  <th className="px-5 py-3">ETA</th>
                  <th className="px-5 py-3">Confidence</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((item) => (
                  <tr className="border-t border-slate-100" key={item.id}>
                    <td className="px-5 py-4 font-black text-slate-950">{item.id}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                      {item.category}
                    </td>
                    <td className="px-5 py-4 text-sm font-black text-amber-700">{item.urgency}</td>
                    <td className="px-5 py-4 text-sm font-bold text-slate-700">{item.owner}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{item.eta}</td>
                    <td className="px-5 py-4 text-sm font-black text-emerald-700">
                      {item.confidence}%
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase text-emerald-700">Regional map data</p>
              <h2 className="text-2xl font-black">Priority regions</h2>
            </div>
            <MapPinned className="text-emerald-700" size={26} aria-hidden="true" />
          </div>
          <div className="grid gap-4">
            {regions.map((item) => (
              <div key={item.region}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-slate-700">
                    {item.region} - {item.priority}
                  </span>
                  <span className="text-sm font-black text-slate-950">{item.sentiment}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-md bg-slate-100">
                  <div
                    className="h-full rounded-md bg-emerald-700"
                    style={{ width: `${item.sentiment}%` }}
                  />
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {item.supporters.toLocaleString()} supporters and{" "}
                  {item.volunteers.toLocaleString()} volunteers recorded.
                </p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-md bg-blue-50 p-4">
            <p className="text-sm font-black uppercase text-blue-800">
              {user?.role || "candidate"} view
            </p>
            <p className="mt-1 text-sm leading-6 text-blue-950">
              Recommendations are aggregate and explainable. The platform does not infer protected
              personal attributes or encourage deceptive targeting.
            </p>
          </div>
        </article>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="Campaign workflow">
        {workflow.map(({ step, title, detail, owner, icon: Icon }) => (
          <article
            className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"
            key={title}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="grid size-9 place-items-center rounded-md bg-blue-700 text-sm font-black text-white">
                {step}
              </span>
              <Icon className="text-emerald-700" size={22} aria-hidden="true" />
            </div>
            <h3 className="text-lg font-black">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
            <p className="mt-3 rounded-md bg-slate-100 px-3 py-2 text-sm font-black text-slate-700">
              {owner}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label="AI modules">
        {catalog.modules.map((module) => (
          <article
            className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"
            key={module.id}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-blue-700">{module.subject}</p>
                <h3 className="text-lg font-black">{module.title}</h3>
              </div>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                {module.level}
              </span>
            </div>
            <div
              className="h-3 overflow-hidden rounded-md bg-slate-100"
              aria-label={`${module.progress}% complete`}
            >
              <div
                className="h-full rounded-md bg-emerald-700"
                style={{ width: `${module.progress}%` }}
              />
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              {module.progress}% implementation readiness - {module.minutes} min review
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, value, detail }) {
  return (
    <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-black uppercase text-slate-500">{label}</span>
        <Icon className="text-emerald-700" size={22} aria-hidden="true" />
      </div>
      <strong className="block text-3xl font-black">{value}</strong>
      <p className="mt-1 text-sm font-semibold text-slate-500">{detail}</p>
    </article>
  );
}
