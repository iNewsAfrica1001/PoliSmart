import { useCallback, useEffect, useMemo, useState } from "react";
import { prelaunchAdminApi, type PrelaunchLead, type PrelaunchLeadFollowUp } from "../lib/prelaunchAdmin";

const statuses: PrelaunchLead["status"][] = ["NEW", "CONTACTED", "QUALIFIED", "CLOSED"];
const followUpStates = ["ALL", "OVERDUE", "UPCOMING", "NONE"] as const;
const MAX_FOLLOW_UP_NOTE = 2000;
const label = (value: string | null) => value?.replaceAll("_", " ") ?? "—";
const dateTime = (value: string) => new Date(value).toLocaleString();

function validateFollowUp(note: string, scheduledLocal: string) {
  const trimmed = note.trim();
  if (!trimmed) return "Enter a follow-up note.";
  if (trimmed.length > MAX_FOLLOW_UP_NOTE) return `Follow-up notes must be ${MAX_FOLLOW_UP_NOTE} characters or fewer.`;
  if (!scheduledLocal) return "Choose a follow-up date and time.";
  const scheduledAt = new Date(scheduledLocal);
  if (Number.isNaN(scheduledAt.getTime())) return "Choose a valid follow-up date and time.";
  if (scheduledAt.getTime() <= Date.now()) return "Choose a follow-up time in the future.";
  return null;
}

export function PrelaunchLeadReviewPage() {
  const [leads, setLeads] = useState<PrelaunchLead[]>([]);
  const [selected, setSelected] = useState<PrelaunchLead | null>(null);
  const [followUps, setFollowUps] = useState<PrelaunchLeadFollowUp[]>([]);
  const [filters, setFilters] = useState({ requestType: "", country: "", status: "" });
  const [followUpFilter, setFollowUpFilter] = useState<(typeof followUpStates)[number]>("ALL");
  const [followUpNote, setFollowUpNote] = useState("");
  const [scheduledLocal, setScheduledLocal] = useState("");
  const [submittingFollowUp, setSubmittingFollowUp] = useState(false);
  const [completingFollowUpId, setCompletingFollowUpId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [followUpMessage, setFollowUpMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setLeads((await prelaunchAdminApi.list(filters)).leads); }
    catch { setError("Pre-launch requests could not be loaded."); }
    finally { setLoading(false); }
  }, [filters]);
  const loadFollowUps = useCallback(async (leadId: string) => {
    setFollowUps((await prelaunchAdminApi.listFollowUps(leadId)).followUps);
  }, []);
  useEffect(() => void load(), [load]);

  const visibleLeads = useMemo(() => followUpFilter === "ALL" ? leads : leads.filter((lead) => lead.followUpState === followUpFilter), [leads, followUpFilter]);
  const openLead = async (id: string) => {
    setError(""); setFollowUpMessage("");
    try {
      const [{ lead }, history] = await Promise.all([prelaunchAdminApi.detail(id), prelaunchAdminApi.listFollowUps(id)]);
      setSelected(lead); setFollowUps(history.followUps);
    } catch { setError("The selected request could not be loaded."); }
  };
  const updateStatus = async (status: PrelaunchLead["status"]) => {
    if (!selected) return;
    try {
      const updated = (await prelaunchAdminApi.updateStatus(selected.id, status)).lead;
      setSelected(updated);
      setLeads((current) => current.map((lead) => lead.id === updated.id ? { ...lead, ...updated } : lead));
    } catch { setError("The request status could not be updated."); }
  };
  const createFollowUp = async () => {
    if (!selected || submittingFollowUp) return;
    setError(""); setFollowUpMessage("");
    const validationError = validateFollowUp(followUpNote, scheduledLocal);
    if (validationError) { setError(validationError); return; }
    setSubmittingFollowUp(true);
    try {
      await prelaunchAdminApi.createFollowUp(selected.id, { note: followUpNote.trim(), scheduledAt: new Date(scheduledLocal).toISOString() });
      setFollowUpNote(""); setScheduledLocal("");
      await Promise.all([loadFollowUps(selected.id), load()]);
      setFollowUpMessage("Follow-up scheduled.");
    } catch { setError("The follow-up could not be scheduled. Your entries have been preserved."); }
    finally { setSubmittingFollowUp(false); }
  };
  const completeFollowUp = async (followUpId: string) => {
    if (!selected || completingFollowUpId) return;
    if (!window.confirm("Mark this follow-up completed? This action cannot be edited or deleted.")) return;
    setError(""); setFollowUpMessage(""); setCompletingFollowUpId(followUpId);
    try {
      await prelaunchAdminApi.completeFollowUp(selected.id, followUpId);
      await Promise.all([loadFollowUps(selected.id), load()]);
      setFollowUpMessage("Follow-up marked completed.");
    } catch (caught) {
      const status = (caught as { status?: number }).status;
      if (status === 409) { setError("This follow-up was already completed."); await loadFollowUps(selected.id); }
      else if (status === 404) setError("This follow-up could not be found.");
      else setError("The follow-up could not be completed.");
    } finally { setCompletingFollowUpId(null); }
  };

  return <div className="lead-review-page">
    <header className="page-heading"><div><span>INTERNAL ADMINISTRATION</span><h1>Pre-launch requests</h1></div><p>Review Early Access and Demo requests. Decisions and follow-up remain human-led.</p></header>
    <section className="lead-filters" aria-label="Filter pre-launch requests">
      <label>Request type<select value={filters.requestType} onChange={(event) => setFilters({ ...filters, requestType: event.target.value })}><option value="">All request types</option><option value="EARLY_ACCESS">Early Access</option><option value="DEMO">Demo</option></select></label>
      <label>Country<input value={filters.country} onChange={(event) => setFilters({ ...filters, country: event.target.value })} placeholder="All countries" /></label>
      <label>Status<select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">All statuses</option>{statuses.map((status) => <option key={status}>{label(status)}</option>)}</select></label>
      <label>Follow-up<select value={followUpFilter} onChange={(event) => setFollowUpFilter(event.target.value as (typeof followUpStates)[number])}>{followUpStates.map((state) => <option key={state} value={state}>{state === "ALL" ? "All follow-ups" : state === "NONE" ? "No follow-up" : label(state)}</option>)}</select></label>
    </section>
    {error && <p className="form-error" role="alert">{error}</p>}{followUpMessage && <p className="form-success" role="status">{followUpMessage}</p>}
    <section className="lead-list" aria-live="polite">{loading ? <p role="status">Loading pre-launch requests…</p> : visibleLeads.length === 0 ? <p>No matching requests.</p> : visibleLeads.map((lead) => <button key={lead.id} className="lead-card" onClick={() => void openLead(lead.id)}>
      <span><strong>{lead.name}</strong><small>{lead.email}</small></span><span><strong>{lead.organization}</strong><small>{lead.country} · {lead.role}</small></span><span><strong>{label(lead.requestType)}</strong><small>{label(lead.interest ?? lead.organizationType)} · {label(lead.timing)}</small></span><span><strong>{label(lead.status)}</strong><small>{dateTime(lead.createdAt)}</small></span>
      <span className={`follow-up-indicator ${lead.followUpState.toLowerCase()}`}><strong>{lead.followUpState === "NONE" ? "NO FOLLOW-UP" : lead.followUpState}</strong><small>{lead.nextFollowUp ? dateTime(lead.nextFollowUp.scheduledAt) : "No follow-up scheduled"}</small></span>
    </button>)}</section>
    {selected && <section className="lead-detail" aria-labelledby="lead-detail-heading">
      <div className="lead-detail-head"><div><span>REQUEST DETAIL</span><h2 id="lead-detail-heading">{selected.name}</h2></div><button onClick={() => setSelected(null)}>Close</button></div>
      <dl><div><dt>Work email</dt><dd>{selected.email}</dd></div><div><dt>Organization</dt><dd>{selected.organization}</dd></div><div><dt>Country</dt><dd>{selected.country}</dd></div><div><dt>Role / job title</dt><dd>{selected.role}</dd></div><div><dt>Request type</dt><dd>{label(selected.requestType)}</dd></div><div><dt>Primary interest / organization type</dt><dd>{label(selected.interest ?? selected.organizationType)}</dd></div><div><dt>Preferred demo timing</dt><dd>{label(selected.timing)}</dd></div><div><dt>Created</dt><dd>{dateTime(selected.createdAt)}</dd></div><div className="lead-detail-note"><dt>Submitted note</dt><dd>{selected.note || "No note provided."}</dd></div></dl>
      <label className="lead-status-control">Status<select value={selected.status} onChange={(event) => void updateStatus(event.target.value as PrelaunchLead["status"])}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
      <section className="lead-follow-up" aria-labelledby="follow-up-heading"><div><span>HUMAN-LED OUTREACH</span><h3 id="follow-up-heading">Follow-up</h3></div>
        <div className="lead-follow-up-form"><label htmlFor="follow-up-note">Follow-up note</label><textarea id="follow-up-note" rows={4} maxLength={MAX_FOLLOW_UP_NOTE} value={followUpNote} onChange={(event) => setFollowUpNote(event.target.value)} disabled={submittingFollowUp} /><small>{MAX_FOLLOW_UP_NOTE - followUpNote.length} characters remaining</small><label htmlFor="follow-up-time">Next follow-up date and time</label><input id="follow-up-time" type="datetime-local" value={scheduledLocal} onChange={(event) => setScheduledLocal(event.target.value)} disabled={submittingFollowUp} /><button type="button" onClick={() => void createFollowUp()} disabled={submittingFollowUp}>{submittingFollowUp ? "Scheduling follow-up…" : "Schedule follow-up"}</button></div>
        <div className="lead-follow-up-history"><h4>Follow-up history</h4>{followUps.length === 0 ? <p>No follow-ups recorded.</p> : followUps.map((followUp) => <article key={followUp.id} className="follow-up-entry"><div><strong>{followUp.completedAt ? "COMPLETED" : "PENDING"}</strong><span>Scheduled {dateTime(followUp.scheduledAt)}</span></div><p>{followUp.note}</p><small>Created {dateTime(followUp.createdAt)} by {followUp.createdBy.displayName}</small>{followUp.completedAt && followUp.completedBy && <small>Completed {dateTime(followUp.completedAt)} by {followUp.completedBy.displayName}</small>}{!followUp.completedAt && <button type="button" onClick={() => void completeFollowUp(followUp.id)} disabled={completingFollowUpId === followUp.id}>{completingFollowUpId === followUp.id ? "Marking completed…" : "Mark completed"}</button>}</article>)}</div>
      </section>
    </section>}
  </div>;
}
