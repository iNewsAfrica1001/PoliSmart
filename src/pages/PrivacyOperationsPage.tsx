import { useEffect, useState, type FormEvent } from "react";
import type { SessionUser } from "../lib/auth";
import { activeTenant, operationsApi, type Campaign } from "../lib/operations";
import { privacyOperationsApi, type PrivacyCase } from "../lib/privacyOperations";

export function PrivacyOperationsPage({ user }: { user: SessionUser }) {
  const tenantId = activeTenant(user);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [cases, setCases] = useState<PrivacyCase[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    operationsApi
      .campaigns(tenantId)
      .then(({ campaigns: values }) => {
        setCampaigns(values);
        setCampaignId(values[0]?.id ?? "");
      })
      .catch((reason: Error) => setError(reason.message));
  }, [tenantId]);
  useEffect(() => {
    if (!campaignId) return;
    privacyOperationsApi
      .listCases(tenantId, campaignId)
      .then(({ cases: values }) => setCases(values))
      .catch((reason: Error) => setError(reason.message));
  }, [tenantId, campaignId]);
  async function createCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await privacyOperationsApi.createCase(tenantId, campaignId, {
        caseReference: form.get("caseReference"),
        requestType: form.get("requestType"),
        receivedAt: form.get("receivedAt"),
        internalNotes: form.get("internalNotes"),
      });
      setCases((current) => [result.case, ...current]);
      setMessage("Privacy case created with a durable audit entry.");
      event.currentTarget.reset();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Request failed.");
    }
  }
  return (
    <section className="page-stack" aria-labelledby="privacy-operations-title">
      <header>
        <p className="eyebrow">Restricted administration</p>
        <h1 id="privacy-operations-title">Privacy operations</h1>
        <p>
          Manage rights cases, suppression, legal holds, and guarded action previews. Destructive
          execution remains policy-blocked.
        </p>
      </header>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="form-success" role="status">
          {message}
        </p>
      )}
      <label>
        Campaign
        <select value={campaignId} onChange={(event) => setCampaignId(event.target.value)}>
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name}
            </option>
          ))}
        </select>
      </label>
      <form className="panel form-grid" onSubmit={createCase}>
        <h2>New rights request</h2>
        <label>
          Case reference
          <input name="caseReference" maxLength={64} required />
        </label>
        <label>
          Request type
          <select name="requestType" required>
            {["ACCESS", "CORRECTION", "DELETION", "OBJECTION", "RESTRICTION", "PORTABILITY"].map(
              (value) => (
                <option key={value}>{value}</option>
              ),
            )}
          </select>
        </label>
        <label>
          Received date and time
          <input name="receivedAt" type="datetime-local" required />
        </label>
        <label>
          Protected internal notes
          <textarea name="internalNotes" maxLength={4000} />
        </label>
        <button type="submit" disabled={!campaignId}>
          Create case
        </button>
      </form>
      <section className="panel" aria-labelledby="privacy-cases-title">
        <h2 id="privacy-cases-title">Privacy/Rights Cases</h2>
        {cases.length === 0 ? (
          <p>No cases in this campaign.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Type</th>
                <th>Status</th>
                <th>Identity verification</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((item) => (
                <tr key={item.id}>
                  <td>{item.caseReference}</td>
                  <td>{item.requestType}</td>
                  <td>{item.status}</td>
                  <td>{item.identityVerificationStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section className="panel">
        <h2>Controlled actions</h2>
        <p>PREVIEW → AUTHORIZATION → EXACT CONFIRMATION → EXECUTION → AUDIT → VERIFICATION</p>
        <p>
          Deletion and anonymization execution are unavailable until case-specific policy and
          authorization are approved. Active legal holds block incompatible actions.
        </p>
      </section>
      <section className="panel">
        <h2>Suppression and Legal Holds</h2>
        <p>
          Restricted registers are readable through the authenticated, tenant/campaign-scoped API.
          Issuance, release, and suppression changes remain unavailable until the applicable
          authority policies are approved. Suppression identifiers are one-way keyed hashes and are
          never returned as targeting data.
        </p>
      </section>
    </section>
  );
}
