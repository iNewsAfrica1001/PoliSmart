import { ChevronRight, Globe2, MapPinned } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SessionUser } from "../lib/auth";
import {
  campaignGeographyApi,
  type CampaignGeographicArea,
} from "../lib/campaignGeography";
import { operationsApi, type Campaign } from "../lib/operations";

type Breadcrumb = { id: string; name: string };
type AssignmentFilter = "all" | "assigned" | "unassigned";

export function CampaignGeographyPage({ user }: { user: SessionUser }) {
  const membership = user.memberships[0];
  const tenantId = membership?.tenantId ?? "";
  const canManage = membership?.canManageCampaignGeography === true;
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [areas, setAreas] = useState<CampaignGeographicArea[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mutatingId, setMutatingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const hierarchyRequest = useRef(0);

  useEffect(() => {
    setLoading(true);
    operationsApi
      .campaigns(tenantId)
      .then(({ campaigns: items }) => {
        setCampaigns(items);
        setCampaignId(items[0]?.id ?? "");
        if (items.length === 0) setLoading(false);
      })
      .catch(() => {
        setError("Unable to load authorized campaigns. Try again.");
        setLoading(false);
      });
  }, [tenantId]);

  const loadHierarchy = useCallback(async () => {
    if (!campaignId) return;
    const requestId = ++hierarchyRequest.current;
    setLoading(true);
    setError("");
    try {
      const result = await campaignGeographyApi.hierarchy(tenantId, campaignId, {
        parentId: submittedSearch ? undefined : breadcrumbs.at(-1)?.id,
        search: submittedSearch || undefined,
        assigned:
          assignmentFilter === "all" ? undefined : assignmentFilter === "assigned",
        page,
        pageSize: 50,
      });
      if (requestId === hierarchyRequest.current) {
        setAreas(result.items);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      }
    } catch (caught) {
      if (requestId === hierarchyRequest.current) {
        setAreas([]);
        setError(caught instanceof Error ? caught.message : "Unable to load campaign geography.");
      }
    } finally {
      if (requestId === hierarchyRequest.current) setLoading(false);
    }
  }, [assignmentFilter, breadcrumbs, campaignId, page, submittedSearch, tenantId]);

  useEffect(() => {
    void loadHierarchy();
  }, [loadHierarchy]);

  const resetView = () => {
    setBreadcrumbs([]);
    setSearch("");
    setSubmittedSearch("");
    setPage(1);
  };

  const changeAssignment = async (area: CampaignGeographicArea, assigned: boolean) => {
    if (!canManage || mutatingId) return;
    const confirmed = window.confirm(
      assigned
        ? `Assign ${area.name}? Any missing ancestors up to Country will also be assigned.`
        : `Remove ${area.name} from this campaign? Removal will be blocked if it has assigned descendants.`,
    );
    if (!confirmed) return;
    setMutatingId(area.id);
    setError("");
    setNotice("");
    try {
      if (assigned) await campaignGeographyApi.assign(tenantId, campaignId, [area.id]);
      else await campaignGeographyApi.deactivate(tenantId, campaignId, [area.id]);
      setNotice(
        assigned
          ? `${area.name} was assigned. Required ancestors were assigned automatically.`
          : `${area.name} was removed from the campaign geography.`,
      );
      await loadHierarchy();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The campaign geography change could not be completed.",
      );
    } finally {
      setMutatingId("");
    }
  };

  return (
    <div className="ops-page campaign-geography-page">
      <header className="ops-heading">
        <div>
          <span className="eyebrow">CAMPAIGN ADMINISTRATION</span>
          <h1>Campaign Geography</h1>
          <p>Choose the authorized geographic areas in which this campaign operates.</p>
        </div>
      </header>

      <section className="campaign-geography-guidance" aria-labelledby="assignment-guidance">
        <MapPinned aria-hidden="true" />
        <div>
          <h2 id="assignment-guidance">How assignments work</h2>
          <p>
            Assigning an area automatically assigns any missing ancestors up to Country. Assigning
            a parent does not assign its descendants. An area with assigned descendants cannot be
            removed until those descendants are removed first.
          </p>
        </div>
      </section>

      <section className="campaign-geography-controls" aria-label="Campaign geography controls">
        <label>
          Campaign
          <select
            value={campaignId}
            disabled={!campaigns.length || loading || Boolean(mutatingId)}
            onChange={(event) => {
              setCampaignId(event.target.value);
              resetView();
              setNotice("");
            }}
          >
            {!campaigns.length && <option value="">No campaigns available</option>}
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name} · {campaign.country}
              </option>
            ))}
          </select>
        </label>
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmittedSearch(search.trim());
            setPage(1);
          }}
        >
          <label>
            Search authorized master geography
            <span>Enter at least two characters.</span>
            <input
              type="search"
              value={search}
              minLength={2}
              maxLength={120}
              placeholder="Search by area name"
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <button type="submit" disabled={search.trim().length < 2 || loading || Boolean(mutatingId)}>
            Search
          </button>
          {submittedSearch && (
            <button type="button" disabled={Boolean(mutatingId)} onClick={resetView}>
              Clear search
            </button>
          )}
        </form>
        <label>
          Assignment state
          <select
            value={assignmentFilter}
            disabled={Boolean(mutatingId)}
            onChange={(event) => {
              setAssignmentFilter(event.target.value as AssignmentFilter);
              setPage(1);
            }}
          >
            <option value="all">All areas</option>
            <option value="assigned">Assigned only</option>
            <option value="unassigned">Unassigned only</option>
          </select>
        </label>
      </section>

      {breadcrumbs.length > 0 && !submittedSearch && (
        <nav className="geography-breadcrumbs" aria-label="Geographic hierarchy">
          <button type="button" disabled={Boolean(mutatingId)} onClick={resetView}>Country roots</button>
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.id}>
              <ChevronRight aria-hidden="true" />
              <button
                type="button"
                disabled={Boolean(mutatingId)}
                aria-current={index === breadcrumbs.length - 1 ? "page" : undefined}
                onClick={() => {
                  setBreadcrumbs((current) => current.slice(0, index + 1));
                  setPage(1);
                }}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </nav>
      )}

      <div className="campaign-geography-messages" aria-live="polite">
        {notice && <p className="ops-confirmation" role="status">{notice}</p>}
        {error && <p className="ops-error" role="alert">{error}</p>}
      </div>

      <section className="ops-list" aria-labelledby="geography-results-heading" aria-busy={loading}>
        <div className="ops-list-head">
          <h2 id="geography-results-heading">
            {submittedSearch ? `Results for “${submittedSearch}”` : "Geographic hierarchy"}
          </h2>
          <span>{total} areas</span>
        </div>
        {loading ? (
          <p className="empty-state" role="status">Loading campaign geography…</p>
        ) : !campaignId ? (
          <div className="empty-state"><Globe2 aria-hidden="true" /><h3>No campaign selected</h3><p>Create or select an authorized campaign first.</p></div>
        ) : areas.length === 0 ? (
          <div className="empty-state"><Globe2 aria-hidden="true" /><h3>No areas found</h3><p>Adjust the hierarchy, search, or assignment filter.</p></div>
        ) : (
          areas.map((area) => {
            const assigned = area.assignments[0]?.isActive === true;
            return (
              <article key={area.id}>
                <span className="record-icon"><Globe2 aria-hidden="true" /></span>
                <div>
                  <strong>{area.name}</strong>
                  <small>{area.level.name} · {area.code} · {area._count.children} child areas</small>
                </div>
                <div className="geography-area-actions">
                  <span className={assigned ? "status-pill status-pill--assigned" : "status-pill"}>
                    {assigned ? "ASSIGNED" : "UNASSIGNED"}
                  </span>
                  {area._count.children > 0 && !submittedSearch && (
                    <button
                      type="button"
                      disabled={Boolean(mutatingId)}
                      onClick={() => {
                        setBreadcrumbs((current) => [...current, { id: area.id, name: area.name }]);
                        setPage(1);
                      }}
                    >
                      View children
                    </button>
                  )}
                  {canManage && (
                    <button
                      type="button"
                      className={assigned ? "geography-remove" : "primary-action"}
                      disabled={Boolean(mutatingId)}
                      aria-busy={mutatingId === area.id}
                      onClick={() => void changeAssignment(area, !assigned)}
                    >
                      {mutatingId === area.id ? "Saving…" : assigned ? "Remove" : "Assign"}
                    </button>
                  )}
                </div>
              </article>
            );
          })
        )}
        {totalPages > 1 && (
          <nav className="geography-pagination" aria-label="Campaign geography pages">
            <button type="button" disabled={page <= 1 || loading || Boolean(mutatingId)} onClick={() => setPage((value) => value - 1)}>Previous</button>
            <span>Page {page} of {totalPages}</span>
            <button type="button" disabled={page >= totalPages || loading || Boolean(mutatingId)} onClick={() => setPage((value) => value + 1)}>Next</button>
          </nav>
        )}
      </section>
      {!canManage && campaignId && (
        <p className="campaign-geography-readonly">You have view-only access to Campaign Geography.</p>
      )}
    </div>
  );
}
