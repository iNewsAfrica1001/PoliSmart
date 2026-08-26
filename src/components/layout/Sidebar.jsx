import {
  Banknote,
  CheckCircle2,
  FileText,
  Globe2,
  LogIn,
  Megaphone,
  ShieldCheck,
  Sparkles,
  UserCog,
  Users,
} from "lucide-react";
import heroImage from "../../../assets/africa-campaign-command.png";

const roleOptions = [
  {
    id: "candidate",
    label: "Candidate",
    name: "Amina Mensah",
    description: "Review strategy, approve speeches, and track national performance",
    icon: Megaphone,
    accent: "border-emerald-700 bg-emerald-50 text-emerald-950",
  },
  {
    id: "campaign-manager",
    label: "Campaign Manager",
    name: "Kwame Boateng",
    description: "Coordinate field teams, calendar, regions, and event execution",
    icon: UserCog,
    accent: "border-blue-700 bg-blue-50 text-blue-950",
  },
  {
    id: "communications",
    label: "Communications",
    name: "Nadia Okafor",
    description: "Draft speeches, press, social, WhatsApp, email, SMS, and media kits",
    icon: FileText,
    accent: "border-amber-600 bg-amber-50 text-amber-950",
  },
  {
    id: "volunteer-coordinator",
    label: "Volunteers",
    name: "Thandi Ndlovu",
    description: "Manage registration, skills, teams, tasks, check-in, and outreach",
    icon: Users,
    accent: "border-cyan-700 bg-cyan-50 text-cyan-950",
  },
  {
    id: "finance",
    label: "Finance",
    name: "Samuel Adeyemi",
    description: "Track donations, receipts, expenses, and compliance reports",
    icon: Banknote,
    accent: "border-lime-700 bg-lime-50 text-lime-950",
  },
  {
    id: "administrator",
    label: "Admin",
    name: "Platform Admin",
    description: "Configure RBAC, MFA, localization, audit logs, and country rules",
    icon: ShieldCheck,
    accent: "border-red-700 bg-red-50 text-red-950",
  },
];

export default function Sidebar({
  activeView,
  navItems,
  setActiveView,
  user,
  setUser,
  loginState,
  onLogin,
}) {
  const selectedRole = roleOptions.find((role) => role.id === user.role) || roleOptions[0];

  function chooseRole(role) {
    setUser((current) => ({
      ...current,
      role: role.id,
      name: current.role === role.id && current.name ? current.name : role.name,
    }));
  }

  return (
    <aside className="border-r border-slate-200 bg-white p-4 lg:sticky lg:top-0 lg:h-screen lg:overflow-auto">
      <div className="mb-4 overflow-hidden rounded-md border border-slate-200 bg-slate-950 shadow-sm">
        <div className="relative min-h-56">
          <img
            className="absolute inset-0 size-full object-cover"
            src={heroImage}
            alt="African campaign command team reviewing maps and campaign analytics"
          />
          <div className="absolute inset-0 bg-slate-950/55" />
          <div className="relative flex min-h-56 flex-col justify-between p-4 text-white">
            <div className="flex items-center justify-between gap-3">
              <div className="grid size-11 place-items-center rounded-md bg-white/15 backdrop-blur">
                <Globe2 size={24} aria-hidden="true" />
              </div>
              <span className="rounded-md bg-emerald-400/90 px-3 py-1 text-xs font-black uppercase text-emerald-950">
                Ethical AI
              </span>
            </div>
            <div>
              <p className="mb-2 inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-1 text-sm font-bold backdrop-blur">
                <Sparkles size={15} aria-hidden="true" />
                Campaign intelligence
              </p>
              <strong className="block text-2xl font-black">AfricaCampaignAI</strong>
              <p className="mt-1 text-sm font-semibold leading-6 text-white/85">
                Role-aware command workspace for strategy, field operations, content, finance,
                media, compliance, and voter engagement.
              </p>
            </div>
          </div>
        </div>
      </div>

      <form
        className="mb-5 grid gap-4 rounded-md border border-slate-200 bg-slate-50 p-4 shadow-sm"
        aria-label="Role login"
        onSubmit={onLogin}
      >
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase text-emerald-700">Secure campaign sign-in</p>
            <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-black text-emerald-700">
              <CheckCircle2 size={13} aria-hidden="true" />
              MFA ready
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-950">Select workspace role</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
            RBAC controls access to supporter records, finance, approvals, media, and admin
            settings.
          </p>
        </div>

        <label className="grid gap-2 text-sm font-bold text-slate-600">
          Display name
          <input
            className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950"
            value={user.name}
            onChange={(event) => setUser((current) => ({ ...current, name: event.target.value }))}
            required
          />
        </label>

        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-bold text-slate-600">Workspace access</legend>
          {roleOptions.map((role) => {
            const Icon = role.icon;
            const isSelected = user.role === role.id;
            return (
              <button
                className={`flex min-h-20 w-full cursor-pointer items-start gap-3 rounded-md border p-3 text-left transition ${isSelected ? role.accent : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"}`}
                key={role.id}
                onClick={() => chooseRole(role)}
                type="button"
              >
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-md ${isSelected ? "bg-white/70" : "bg-slate-100"}`}
                >
                  <Icon
                    className={isSelected ? "text-slate-950" : "text-slate-500"}
                    size={22}
                    aria-hidden="true"
                  />
                </span>
                <span className="min-w-0">
                  <strong className="block text-base font-black">{role.label}</strong>
                  <span className="block text-sm font-semibold leading-5 text-slate-600">
                    {role.description}
                  </span>
                </span>
              </button>
            );
          })}
        </fieldset>

        <button
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 font-black text-white disabled:opacity-60"
          disabled={loginState?.status === "loading"}
          type="submit"
        >
          <LogIn size={18} aria-hidden="true" />
          {loginState?.status === "loading" ? "Opening" : `Open ${selectedRole.label}`}
        </button>
        <p
          className={`rounded-md px-3 py-2 text-sm font-bold ${loginState?.status === "error" ? "bg-red-50 text-red-800" : "bg-white text-slate-600"}`}
          aria-live="polite"
        >
          {loginState?.message}
        </p>
      </form>

      <div className="mb-5 grid gap-2 rounded-md border border-slate-200 bg-white p-3">
        <p className="text-xs font-black uppercase text-slate-500">Trust controls</p>
        {[
          "Election-law configuration",
          "Consent-aware outreach",
          "Audit logs and human approval",
        ].map((item) => (
          <div className="flex items-center gap-2 text-sm font-bold text-slate-700" key={item}>
            <CheckCircle2 className="text-emerald-700" size={16} aria-hidden="true" />
            {item}
          </div>
        ))}
      </div>

      <nav className="grid gap-2" aria-label="Primary campaign platform navigation">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            className={`flex min-h-12 items-center gap-3 rounded-md border px-3 text-left font-extrabold ${activeView === id ? "border-emerald-700 bg-emerald-50 text-emerald-950" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
            key={id}
            type="button"
            aria-current={activeView === id ? "page" : undefined}
            onClick={() => setActiveView(id)}
          >
            <Icon size={20} aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
