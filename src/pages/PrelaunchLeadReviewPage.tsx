import { useCallback, useEffect, useState } from "react";
import { prelaunchAdminApi, type PrelaunchLead } from "../lib/prelaunchAdmin";

const statuses: PrelaunchLead["status"][] = ["NEW", "CONTACTED", "QUALIFIED", "CLOSED"];
const label = (value: string | null) => value?.replaceAll("_", " ") ?? "—";

export function PrelaunchLeadReviewPage() {
  const [leads, setLeads] = useState<PrelaunchLead[]>([]);
  const [selected, setSelected] = useState<PrelaunchLead | null>(null);
  const [filters, setFilters] = useState({ requestType: "", country: "", status: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setLeads((await prelaunchAdminApi.list(filters)).leads);
    } catch {
      setError("Pre-launch requests could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => void load(), [load]);

  const openLead = async (id: string) => {
    setError("");
    try {
      setSelected((await prelaunchAdminApi.detail(id)).lead);
    } catch {
      setError("The selected request could not be loaded.");
    }
  };

  const updateStatus = async (status: PrelaunchLead["status"]) => {
    if (!selected) return;
    try {
      const updated = (await prelaunchAdminApi.updateStatus(selected.id, status)).lead;
      setSelected(updated);
      setLeads((current) => current.map((lead) => (lead.id === updated.id ? updated : lead)));
    } catch {
      setError("The request status could not be updated.");
    }
  };

  return (
    <div className="lead-review-page">
      <header className="page-heading">
        <div><span>INTERNAL ADMINISTRATION</span><h1>Pre-launch requests</h1></div>
        <p>Review Early Access and Demo requests. Decisions and follow-up remain human-led.</p>
      </header>
      <section className="lead-filters" aria-label="Filter pre-launch requests">
        <label>Request type<select value={filters.requestType} onChange={(event) => setFilters({ ...filters, requestType: event.target.value })}><option value="">All request types</option><option value="EARLY_ACCESS">Early Access</option><option value="DEMO">Demo</option></select></label>
        <label>Country<input value={filters.country} onChange={(event) => setFilters({ ...filters, country: event.target.value })} placeholder="All countries" /></label>
        <label>Status<select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">All statuses</option>{statuses.map((status) => <option key={status}>{label(status)}</option>)}</select></label>
      </section>
      {error && <p className="form-error" role="alert">{error}</p>}
      <section className="lead-list" aria-live="polite">
        {loading ? <p role="status">Loading pre-launch requests…</p> : leads.length === 0 ? <p>No matching requests.</p> : leads.map((lead) => (
          <button key={lead.id} className="lead-card" onClick={() => void openLead(lead.id)}>
            <span><strong>{lead.name}</strong><small>{lead.email}</small></span>
            <span><strong>{lead.organization}</strong><small>{lead.country} · {lead.role}</small></span>
            <span><strong>{label(lead.requestType)}</strong><small>{label(lead.interest ?? lead.organizationType)} · {label(lead.timing)}</small></span>
            <span><strong>{label(lead.status)}</strong><small>{new Date(lead.createdAt).toLocaleString()}</small></span>
          </button>
        ))}
      </section>
      {selected && (
        <section className="lead-detail" aria-labelledby="lead-detail-heading">
          <div className="lead-detail-head"><div><span>REQUEST DETAIL</span><h2 id="lead-detail-heading">{selected.name}</h2></div><button onClick={() => setSelected(null)}>Close</button></div>
          <dl>
            <div><dt>Work email</dt><dd>{selected.email}</dd></div><div><dt>Organization</dt><dd>{selected.organization}</dd></div>
            <div><dt>Country</dt><dd>{selected.country}</dd></div><div><dt>Role / job title</dt><dd>{selected.role}</dd></div>
            <div><dt>Request type</dt><dd>{label(selected.requestType)}</dd></div><div><dt>Primary interest / organization type</dt><dd>{label(selected.interest ?? selected.organizationType)}</dd></div>
            <div><dt>Preferred demo timing</dt><dd>{label(selected.timing)}</dd></div><div><dt>Created</dt><dd>{new Date(selected.createdAt).toLocaleString()}</dd></div>
            <div className="lead-detail-note"><dt>Submitted note</dt><dd>{selected.note || "No note provided."}</dd></div>
          </dl>
          <label className="lead-status-control">Status<select value={selected.status} onChange={(event) => void updateStatus(event.target.value as PrelaunchLead["status"])}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
        </section>
      )}
    </div>
  );
}
