import { AlertTriangle, Bot, LockKeyhole, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import type { SessionUser } from "../lib/auth";
const BASE = import.meta.env.VITE_API_BASE ?? "";
const RESTRICTED = "Compliance information is restricted to authorized administrators.";
type Governance = {
  immutable: boolean;
  prohibitedCapabilities: string[];
  auditEvents: Array<{ id: string; action: string; entity: string; createdAt: string }>;
  aiUsage: Array<{
    id: string;
    feature: string;
    status: string;
    approvalStatus: string;
    safetyFlags: string[];
    createdAt: string;
    providerRecord?: { displayName: string };
  }>;
  errorReports: Array<{ id: string; errorCode: string; safeMessage: string; createdAt: string }>;
};
export function GovernancePage({ user }: { user: SessionUser }) {
  const tenant = user.memberships[0]?.tenantId || "";
  const allowed = Boolean(tenant) && user.memberships[0]?.canReadCompliance === true;
  const [data, setData] = useState<Governance>();
  const [error, setError] = useState("");
  useEffect(() => {
    setData(undefined);
    setError("");
    if (!allowed) return;
    let cancelled = false;
    fetch(`${BASE}/api/governance`, {
      credentials: "include",
      headers: { "X-Organization-Id": tenant },
    })
      .then(async (response) => {
        if (response.status === 403) throw new Error(RESTRICTED);
        if (!response.ok) throw new Error("Unable to load compliance information.");
        return response.json();
      })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((cause) => {
        if (!cancelled)
          setError(
            cause.message === RESTRICTED ? RESTRICTED : "Unable to load compliance information.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [tenant, allowed]);
  if (!allowed)
    return (
      <section aria-labelledby="compliance-restricted-title">
        <h1 id="compliance-restricted-title">Compliance access restricted</h1>
        <p role="status">{RESTRICTED}</p>
      </section>
    );
  return (
    <div className="governance-page">
      <header className="workflow-heading">
        <div>
          <span className="eyebrow">RESPONSIBLE AI & COMPLIANCE</span>
          <h1>Governance Center</h1>
          <p>Append-only evidence for AI use, security events, reviews, and errors.</p>
        </div>
        <span>
          <LockKeyhole /> Immutable records
        </span>
      </header>
      {error && (
        <p className="ops-error" role="alert">
          {error}
        </p>
      )}
      {data && (
        <>
          <section className="governance-summary">
            <article>
              <ShieldCheck />
              <strong>{data.auditEvents.length}</strong>
              <span>Audit events</span>
            </article>
            <article>
              <Bot />
              <strong>{data.aiUsage.length}</strong>
              <span>AI generations</span>
            </article>
            <article>
              <AlertTriangle />
              <strong>{data.errorReports.length}</strong>
              <span>Error reports</span>
            </article>
          </section>
          <section className="command-panel">
            <header>
              <div>
                <ShieldCheck />
                <h2>Prohibited AI capabilities</h2>
              </div>
              <span>{data.prohibitedCapabilities.length}</span>
            </header>
            <div className="governance-flags">
              {data.prohibitedCapabilities.map((flag) => (
                <span key={flag}>{flag.replaceAll("_", " ")}</span>
              ))}
            </div>
          </section>
          <div className="two-panels">
            <section className="command-panel">
              <header>
                <div>
                  <Bot />
                  <h2>AI usage log</h2>
                </div>
                <span>{data.aiUsage.length}</span>
              </header>
              <div className="executive-list">
                {data.aiUsage.map((item) => (
                  <article key={item.id}>
                    <div>
                      <strong>{item.feature}</strong>
                      <small>
                        {item.providerRecord?.displayName || "Provider pending"} ·{" "}
                        {new Date(item.createdAt).toLocaleString()}
                      </small>
                    </div>
                    <span>{item.approvalStatus}</span>
                  </article>
                ))}
              </div>
            </section>
            <section className="command-panel">
              <header>
                <div>
                  <LockKeyhole />
                  <h2>Security audit</h2>
                </div>
                <span>{data.auditEvents.length}</span>
              </header>
              <div className="executive-list">
                {data.auditEvents.map((item) => (
                  <article key={item.id}>
                    <div>
                      <strong>{item.action.replaceAll("_", " ")}</strong>
                      <small>
                        {item.entity} · {new Date(item.createdAt).toLocaleString()}
                      </small>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
