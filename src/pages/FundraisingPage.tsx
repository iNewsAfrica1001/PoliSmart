import { Archive, Banknote, CalendarClock, HandCoins, Plus, UsersRound } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { SessionUser } from "../lib/auth";
import { fundraisingApi, type FundraisingHistoryRecord, type FundraisingOverview, type FundraisingRecord } from "../lib/fundraising";
import { activeTenant, operationsApi, type Campaign } from "../lib/operations";
import { currencyForCountry, formatCurrencyAmount, SUPPORTED_FUNDRAISING_CURRENCIES } from "../../shared/currencies.js";

const empty: FundraisingOverview = { goals: [], contacts: [], contributions: [], activities: [], followUps: [], confirmedTotals: [] };
const sections = ["goals", "contacts", "contributions", "activities", "followUps"] as const;
type Section = (typeof sections)[number];
const labels: Record<Section, string> = { goals: "Goals", contacts: "Contacts", contributions: "Contributions", activities: "Activities", followUps: "Follow-ups" };
const singularLabels: Record<Section, string> = { goals: "goal", contacts: "contact", contributions: "contribution", activities: "activity", followUps: "follow-up" };

export function FundraisingPage({ user }: { user: SessionUser }) {
  const tenantId = activeTenant(user);
  const membership = user.memberships.find((item) => item.tenantId === tenantId);
  const canManage = membership?.canManageFundraising === true;
  const canArchive = membership?.canArchiveFundraising === true;
  const canReadHistory = membership?.canReadFundraisingHistory === true;
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [section, setSection] = useState<Section>("goals");
  const [data, setData] = useState(empty);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<FundraisingHistoryRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const selectedCampaign = campaigns.find((campaign) => campaign.id === campaignId);
  const campaignCurrency = currencyForCountry(selectedCampaign?.country || "");
  const [selectedCurrency, setSelectedCurrency] = useState("");
  function selectCampaign(nextCampaignId: string) {
    const nextCampaign = campaigns.find((campaign) => campaign.id === nextCampaignId);
    setCampaignId(nextCampaignId);
    setSelectedCurrency(currencyForCountry(nextCampaign?.country || ""));
  }
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const campaignResult = await operationsApi.campaigns(tenantId);
      setCampaigns(campaignResult.campaigns);
      const selected = campaignId || campaignResult.campaigns[0]?.id || "";
      if (selected !== campaignId) setCampaignId(selected);
      setData(selected ? await fundraisingApi.overview(tenantId, selected) : empty);
      if (selected && canReadHistory) setHistory((await fundraisingApi.history(tenantId, selected)).items);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load fundraising records."); }
    finally { setLoading(false); }
  }, [tenantId, campaignId, canReadHistory]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setSelectedCurrency(campaignCurrency); }, [campaignCurrency]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || !campaignId) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const payload: Record<string, unknown> = { ...values };
    if (section === "contributions" || section === "followUps") payload.contactId = values.contactId || undefined;
    try { await fundraisingApi.create(tenantId, campaignId, section, payload); setShowForm(false); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save fundraising record."); }
  }
  const records = data[section] as FundraisingRecord[];
  return (
    <div className="fundraising-page">
      <header className="ops-heading"><div><span className="eyebrow">CAMPAIGN ADMINISTRATION</span><h1>Fundraising management</h1><p>Organize fundraising activity handled outside PoliSmart. PoliSmart does not process contributions.</p></div>
        <button className="primary-action" disabled={!canManage || !campaignId} title={!canManage ? "Your role has read-only fundraising access" : !campaignId ? "Create a campaign first" : undefined} onClick={() => { setSelectedCurrency(campaignCurrency); setShowForm((value) => !value); }}><Plus /> Add record</button>
      </header>
      <aside className="fundraising-notice">Campaign organizations remain responsible for applicable campaign-finance, reporting, retention, and legal requirements. Do not enter payment credentials or sensitive personal traits.</aside>
      {error && <p className="ops-error" role="alert">{error}</p>}
      <section className="campaign-picker campaign-context" aria-label="Selected campaign fundraising context"><span><strong>Campaign context</strong>All fundraising records are restricted to this organization and campaign.</span><label>Campaign<select value={campaignId} onChange={(event) => selectCampaign(event.target.value)} disabled={!campaigns.length}><option value="">Create a campaign first</option>{campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select></label><dl><div><dt>Campaign:</dt><dd>{selectedCampaign?.name || "None selected"}</dd></div><div><dt>Country:</dt><dd>{selectedCampaign?.country || "Not specified"}</dd></div><div><dt>Default currency:</dt><dd>{campaignCurrency || "Select manually"}</dd></div></dl></section>
      <section className="fundraising-metrics" aria-label="Fundraising overview"><article><HandCoins /><strong>{data.goals.length}</strong><span>Active goals</span></article><article><Banknote /><strong>{data.confirmedTotals.map((item) => formatCurrencyAmount(item.currency, item.amount)).join(" · ") || "—"}</strong><span>Confirmed external records by currency</span></article><article><UsersRound /><strong>{data.contacts.length}</strong><span>Contacts</span></article><article><CalendarClock /><strong>{data.followUps.filter((item) => item.status === "OPEN").length}</strong><span>Open follow-ups</span></article></section>
      <nav className="fundraising-tabs" aria-label="Fundraising records">{sections.map((item) => <button key={item} className={!showHistory && section === item ? "active" : ""} onClick={() => { setSection(item); setShowHistory(false); setShowForm(false); }}>{labels[item]}</button>)}{canReadHistory && <button className={showHistory ? "active" : ""} onClick={() => { setShowHistory(true); setShowForm(false); }}>History</button>}</nav>
      {showForm && canManage && <form className="ops-form fundraising-form" onSubmit={submit}><h2>New {singularLabels[section]}</h2>{section === "contacts" ? <><label>Name<input name="displayName" required /></label><label>Email <small>(optional)</small><input type="email" name="email" /></label><label>Phone <small>(optional)</small><input name="phone" /></label><label>Organization/affiliation <small>(optional)</small><input name="affiliation" /></label><label>Administrative notes <small>(optional — do not enter sensitive personal information)</small><textarea name="notes" /></label></> : section === "goals" ? <><label>Goal name<input name="title" required /></label><label>Target amount<input type="number" min="0.01" step="0.01" name="targetAmount" required /></label><CurrencySelector value={selectedCurrency} onChange={setSelectedCurrency} campaignCurrency={campaignCurrency} /><label>Start date<input type="date" name="startsAt" /></label><label>End date<input type="date" name="endsAt" /></label></> : section === "contributions" ? <><label>Goal <small>(optional)</small><select name="goalId"><option value="">No linked goal</option>{data.goals.map((goal) => <option value={goal.id} key={goal.id}>{goal.title}</option>)}</select></label><label>Contact <small>(optional)</small><select name="contactId"><option value="">No linked contact</option>{data.contacts.map((contact) => <option value={contact.id} key={contact.id}>{contact.displayName}</option>)}</select></label><label>Amount<input type="number" min="0.01" step="0.01" name="amount" required /></label><CurrencySelector value={selectedCurrency} onChange={setSelectedCurrency} campaignCurrency={campaignCurrency} /><label>Contribution date<input type="date" name="contributedAt" required /></label><label>External reference <small>(optional)</small><input name="externalReference" /></label><label>Source/method description <small>(no payment credentials)</small><input name="sourceMethod" /></label></> : section === "activities" ? <><label>Activity name<input name="title" required /></label><label>Activity type<input name="activityType" required /></label><label>Date and time<input type="datetime-local" name="occursAt" required /></label></> : <><label>Follow-up<input name="title" required /></label><label>Contact <small>(optional)</small><select name="contactId"><option value="">No linked contact</option>{data.contacts.map((contact) => <option value={contact.id} key={contact.id}>{contact.displayName}</option>)}</select></label><label>Due date<input type="datetime-local" name="dueAt" required /></label></>}<div><button type="button" onClick={() => setShowForm(false)}>Cancel</button><button className="primary-action" type="submit">Save administrative record</button></div></form>}
      <section className="fundraising-list" aria-live="polite"><div className="ops-list-head"><h2>{showHistory ? "Administrative history" : labels[section]}</h2><span>{showHistory ? history.length : records.length} records</span></div>{loading ? <p role="status">Loading fundraising records…</p> : !campaignId ? <p>Create a campaign before adding fundraising records.</p> : showHistory ? history.length === 0 ? <p>No fundraising history recorded for this campaign.</p> : history.map((item) => <article key={item.id}><div><strong>{item.action.replaceAll("_", " ")}</strong><small>{item.entityType.replaceAll("_", " ")} · {new Date(item.createdAt).toLocaleString()}</small></div></article>) : records.length === 0 ? <p>No {labels[section].toLowerCase()} recorded for this campaign.</p> : records.map((record) => <article key={record.id}><div><strong>{record.title || record.displayName || "Contribution"}</strong><small>{record.targetAmount ? `${formatCurrencyAmount(record.currency || "", record.confirmedAmount || 0)} of ${formatCurrencyAmount(record.currency || "", record.targetAmount)} confirmed` : record.amount ? `${formatCurrencyAmount(record.currency || "", record.amount)} · ${record.sourceMethod || "Externally handled contribution"}` : record.affiliation || "Campaign fundraising administration"}</small></div><span className="status-badge">{record.status}</span>{section === "contributions" && canManage && <select aria-label="Contribution status" value={record.status} onChange={async (event) => { await fundraisingApi.updateContributionStatus(tenantId, campaignId, record.id, event.target.value); await load(); }}><option>PENDING</option><option>CONFIRMED</option><option>REVERSED</option></select>}{canArchive && <button aria-label="Archive fundraising record" onClick={async () => { await fundraisingApi.archive(tenantId, campaignId, section, record.id); await load(); }}><Archive /></button>}</article>)}</section>
    </div>
  );
}

function CurrencySelector({ value, onChange, campaignCurrency }: { value: string; onChange: (value: string) => void; campaignCurrency: string }) {
  return <label>Currency code<select name="currency" value={value} onChange={(event) => onChange(event.target.value)} required><option value="">Select currency</option>{SUPPORTED_FUNDRAISING_CURRENCIES.map((currency) => <option key={currency} value={currency}>{currency}</option>)}</select><small>{campaignCurrency ? `Defaults to ${campaignCurrency} for the selected campaign. Select another currency only when the external record uses it; PoliSmart does not convert currencies.` : "Select the currency used by this external record. PoliSmart does not convert currencies."}</small></label>;
}
