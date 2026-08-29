import {
  Activity,
  AlertTriangle,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  FileText,
  Globe2,
  Megaphone,
  RefreshCw,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { SessionUser } from "../lib/auth";
import { commandCenterApi, type CommandCenter } from "../lib/commandCenter";
import { operationsApi, type Campaign } from "../lib/operations";

const label = (value: string) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
const date = (value?: string) =>
  value
    ? new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(value))
    : "No date";

export function DashboardPage({
  user,
  onCreateCampaign,
}: {
  user: SessionUser;
  onCreateCampaign: () => void;
}) {
  const tenantId = user.memberships[0]?.tenantId || "";
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [country, setCountry] = useState("");
  const [areaId, setAreaId] = useState("");
  const [areas, setAreas] = useState<Array<{ id: string; name: string; level: { name: string } }>>(
    [],
  );
  const [data, setData] = useState<CommandCenter | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    operationsApi
      .campaigns(tenantId)
      .then(({ campaigns: list }) => {
        setCampaigns(list);
        setCampaignId(list[0]?.id || "");
        setCountry(list[0]?.country || "");
        if (list.length === 0) setLoading(false);
      })
      .catch(() => {
        setError("Unable to load campaigns.");
        setLoading(false);
      });
  }, [tenantId]);
  const load = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    setError("");
    try {
      const result = await commandCenterApi.load(tenantId, campaignId, country, areaId);
      setData(result.dashboard);
      setAreas(result.geography);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load command center.");
    } finally {
      setLoading(false);
    }
  }, [tenantId, campaignId, country, areaId]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <div className="command-center">
      <header className="command-header">
        <div>
          <span className="eyebrow">CAMPAIGN COMMAND CENTER</span>
          <h1>{data?.campaign.name || "Executive dashboard"}</h1>
          <p>A decision-ready view of execution, evidence, ownership, and risk.</p>
        </div>
        <button type="button" className="refresh-button" onClick={() => void load()}>
          <RefreshCw size={16} /> Refresh
        </button>
      </header>
      <section className="command-filters" aria-label="Dashboard filters">
        <label>
          Campaign
          <select
            value={campaignId}
            onChange={(event) => {
              const selected = campaigns.find((item) => item.id === event.target.value);
              setCampaignId(event.target.value);
              setCountry(selected?.country || "");
              setAreaId("");
            }}
          >
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Country
          <input
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            placeholder="All countries"
          />
        </label>
        <label>
          Geography
          <select value={areaId} onChange={(event) => setAreaId(event.target.value)}>
            <option value="">All geographic areas</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.level.name}: {area.name}
              </option>
            ))}
          </select>
        </label>
      </section>
      {error && (
        <p className="ops-error" role="alert">
          {error}
        </p>
      )}
      {loading && !data && <p role="status">Loading approved campaign intelligence…</p>}
      {!loading && !error && campaigns.length === 0 && !data && (
        <section className="ops-empty" aria-labelledby="dashboard-empty-title">
          <h2 id="dashboard-empty-title">No campaigns are assigned to this account yet</h2>
          <p>Create a campaign to activate the command center and grounded intelligence tools.</p>
          <button type="button" className="primary-button" onClick={onCreateCampaign}>
            Create campaign
          </button>
        </section>
      )}
      {data && (
        <>
          <section className="brief-card">
            <div className="brief-kicker">
              <Globe2 /> Daily Campaign Intelligence Brief{" "}
              <time>{date(data.dailyBrief.generatedAt)}</time>
            </div>
            <h2>{data.dailyBrief.headline}</h2>
            <div className="brief-grid">
              <div>
                <span>What changed</span>
                <p>{data.dailyBrief.whatChanged}</p>
              </div>
              <div>
                <span>What matters</span>
                <p>{data.dailyBrief.whatMatters}</p>
              </div>
              <div>
                <span>Next action</span>
                <p>{data.dailyBrief.nextAction}</p>
              </div>
              <div>
                <span>Evidence</span>
                <p>{data.dailyBrief.evidence}</p>
              </div>
            </div>
          </section>
          <section className="command-metrics">
            <article>
              <span>
                <Activity /> Campaign health
              </span>
              <strong>{data.health.score}</strong>
              <small>
                {data.health.label} · {data.health.blocked} of {data.health.tasks} tasks require
                attention
              </small>
              <div className="health-track">
                <i style={{ width: `${data.health.score}%` }} />
              </div>
            </article>
            <article>
              <span>
                <RefreshCw /> What changed
              </span>
              <strong>{data.changedLast24Hours}</strong>
              <small>Approved operational changes in 24 hours</small>
            </article>
            <article>
              <span>
                <UsersRound /> Volunteer activity
              </span>
              <strong>{data.volunteers.total}</strong>
              <small>{data.volunteers.trained} training completions</small>
            </article>
            <article>
              <span>
                <AlertTriangle /> Open attention
              </span>
              <strong>{data.alerts.length}</strong>
              <small>Alerts from approved campaign records</small>
            </article>
          </section>
          <div className="command-layout">
            <main>
              <DashboardSection
                icon={Globe2}
                title="Public issues & Afrobarometer intelligence"
                count={data.intelligence.length}
              >
                {data.intelligence.length ? (
                  <div className="intelligence-grid">
                    {data.intelligence.map((item, index) => (
                      <article key={`${item.indicator}-${item.responseCode}-${index}`}>
                        <span>{label(item.category)}</span>
                        <h3>{item.indicator}</h3>
                        <strong>{item.weightedPercentage.toFixed(1)}%</strong>
                        <p>
                          {item.country} · response {item.responseCode}
                        </p>
                        <footer>
                          <b>Source:</b> {item.source}
                          <br />
                          <b>Sample:</b> n={item.unweightedSampleSize} · <b>Round:</b>{" "}
                          {item.surveyRound}
                          <br />
                          <b>Weighting:</b> weighted with {item.weightField}
                        </footer>
                      </article>
                    ))}
                  </div>
                ) : (
                  <Empty text="No approved aggregate public intelligence matches these filters." />
                )}
              </DashboardSection>
              <DashboardSection
                icon={Activity}
                title="Campaign activities"
                count={data.activities.length}
              >
                <ItemList
                  items={data.activities.map((item) => ({
                    title: item.title,
                    meta: `${label(item.status)} · ${item.owner?.displayName || "Owner required"}`,
                    badge: label(item.priority),
                  }))}
                />
              </DashboardSection>
              <DashboardSection
                icon={CalendarDays}
                title="Upcoming events"
                count={data.events.length}
              >
                <ItemList
                  items={data.events.map((item) => ({
                    title: item.title,
                    meta: `${date(item.startsAt)} · ${item.geographicArea?.name || item.venue || "Location pending"}`,
                    badge: label(item.type),
                  }))}
                />
              </DashboardSection>
              <div className="two-panels">
                <DashboardSection
                  icon={FileText}
                  title="Policy work"
                  count={data.policyWork.length}
                >
                  <ItemList
                    items={data.policyWork.map((item) => ({
                      title: item.title,
                      meta: item.source || "Approved campaign knowledge",
                      badge: label(item.category),
                    }))}
                  />
                </DashboardSection>
                <DashboardSection
                  icon={Megaphone}
                  title="Media developments"
                  count={data.mediaDevelopments.length}
                >
                  <ItemList
                    items={data.mediaDevelopments.map((item) => ({
                      title: item.title,
                      meta: item.source || "Approved communication",
                      badge: label(item.category),
                    }))}
                  />
                </DashboardSection>
              </div>
            </main>
            <aside>
              <DashboardSection
                icon={AlertTriangle}
                title="Tasks at risk"
                count={data.tasksAtRisk.length}
              >
                <ItemList
                  items={data.tasksAtRisk.map((task) => ({
                    title: task.title,
                    meta: `${task.owner?.displayName || "Owner required"} · ${date(task.dueAt)}`,
                    badge: label(task.status),
                    danger: true,
                  }))}
                />
              </DashboardSection>
              <DashboardSection
                icon={Bot}
                title="AI recommendations"
                count={data.recommendations.length}
              >
                {data.recommendations.map((item) => (
                  <article className="recommendation" key={item.title}>
                    <span>RULE-GROUNDED</span>
                    <h3>{item.title}</h3>
                    <p>{item.rationale}</p>
                    <footer>
                      <CheckCircle2 size={15} /> Owner: {item.owner}
                    </footer>
                  </article>
                ))}
              </DashboardSection>
              <DashboardSection icon={ShieldCheck} title="Alerts" count={data.alerts.length}>
                {data.alerts.length ? (
                  data.alerts.map((item) => (
                    <article className={`alert-row alert-${item.severity}`} key={item.title}>
                      <AlertTriangle size={18} />
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.detail}</p>
                        {item.owner && <small>Owner: {item.owner}</small>}
                      </div>
                    </article>
                  ))
                ) : (
                  <Empty text="No active alerts from approved data." />
                )}
              </DashboardSection>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

function DashboardSection({
  icon: Icon,
  title,
  count,
  children,
}: {
  icon: typeof Activity;
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="command-panel">
      <header>
        <div>
          <Icon size={19} />
          <h2>{title}</h2>
        </div>
        <span>{count}</span>
      </header>
      {children}
    </section>
  );
}
function ItemList({
  items,
}: {
  items: Array<{ title: string; meta: string; badge: string; danger?: boolean }>;
}) {
  return items.length ? (
    <div className="executive-list">
      {items.map((item, index) => (
        <article key={`${item.title}-${index}`}>
          <div>
            <strong>{item.title}</strong>
            <small>{item.meta}</small>
          </div>
          <span className={item.danger ? "danger-badge" : ""}>{item.badge}</span>
          <ChevronRight size={16} />
        </article>
      ))}
    </div>
  ) : (
    <Empty text="No approved records are available." />
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="command-empty">
      <ShieldCheck size={20} />
      <p>{text}</p>
    </div>
  );
}
