import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { SessionUser } from "../lib/auth";
import { geographyApi, geographyTenant, type GeographicArea } from "../lib/geography";

const ADMIN_PAGE_SIZE = 25;

type Level = { id: string; name: string; orderIndex: number; isActive: boolean };

function ParentPicker({
  tenantId,
  campaignId,
  levels,
  levelId,
  initialParent,
}: {
  tenantId: string;
  campaignId: string;
  levels: Level[];
  levelId: string;
  initialParent?: { id: string; name: string };
}) {
  const [search, setSearch] = useState("");
  const [parents, setParents] = useState<GeographicArea[]>([]);
  const level = levels.find((candidate) => candidate.id === levelId);
  const parentLevel = levels.find(
    (candidate) => candidate.isActive && candidate.orderIndex === (level?.orderIndex ?? 0) - 1,
  );
  useEffect(() => {
    if (!campaignId || !parentLevel) {
      setParents([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void geographyApi
        .administrativeAreas(tenantId, campaignId, {
          levelId: parentLevel.id,
          active: true,
          search: search || undefined,
          page: 1,
          pageSize: 50,
        })
        .then((result) => setParents(result.items));
    }, 200);
    return () => window.clearTimeout(timer);
  }, [campaignId, parentLevel, search, tenantId]);
  if (!parentLevel) return <input name="parentId" type="hidden" value="" />;
  const options = initialParent && !parents.some((item) => item.id === initialParent.id)
    ? [{ id: initialParent.id, name: initialParent.name } as GeographicArea, ...parents]
    : parents;
  return (
    <>
      <label>
        Search {parentLevel.name} parents
        <input value={search} onChange={(event) => setSearch(event.target.value)} />
      </label>
      <label>
        Parent
        <select name="parentId" defaultValue={initialParent?.id || ""} required>
          <option value="">Select parent</option>
          {options.map((parent) => <option key={parent.id} value={parent.id}>{parent.name}</option>)}
        </select>
        <small>At most 50 matching immediate parents are returned.</small>
      </label>
    </>
  );
}

function AreaEditForm({
  area,
  tenantId,
  campaignId,
  levels,
  onSubmit,
}: {
  area: GeographicArea;
  tenantId: string;
  campaignId: string;
  levels: Level[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [levelId, setLevelId] = useState(area.level.id);
  return (
    <form className="ops-form" onSubmit={onSubmit}>
      <label>Name<input name="name" defaultValue={area.name} required maxLength={120} /></label>
      <label>Code<input name="code" defaultValue={area.code} required maxLength={40} /></label>
      <label>
        Level
        <select name="levelId" value={levelId} onChange={(event) => setLevelId(event.target.value)} required>
          {levels.filter((level) => level.isActive).map((level) => (
            <option key={level.id} value={level.id}>{level.name}</option>
          ))}
        </select>
      </label>
      <ParentPicker
        tenantId={tenantId}
        campaignId={campaignId}
        levels={levels}
        levelId={levelId}
        initialParent={levelId === area.level.id ? area.parent : undefined}
      />
      <button>Save area</button>
    </form>
  );
}

export function GeographicManagementPage({ user }: { user: SessionUser }) {
  const tenantId = geographyTenant(user);
  const [levels, setLevels] = useState<
    Array<{ id: string; name: string; orderIndex: number; isActive: boolean }>
  >([]);
  const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string }>>([]);
  const [campaignId, setCampaignId] = useState("");
  const [areas, setAreas] = useState<GeographicArea[]>([]);
  const [totalAreas, setTotalAreas] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [parentId, setParentId] = useState("");
  const [parentName, setParentName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [editingAreaId, setEditingAreaId] = useState("");
  const [newAreaLevelId, setNewAreaLevelId] = useState("");
  const loadReferenceData = useCallback(async () => {
    const [l, c] = await Promise.all([
      geographyApi.levels(tenantId),
      geographyApi.campaigns(tenantId),
    ]);
    setLevels(l.levels);
    setCampaigns(c.campaigns);
    const selected = campaignId || c.campaigns[0]?.id || "";
    setCampaignId(selected);
  }, [campaignId, tenantId]);
  useEffect(() => {
    void loadReferenceData().catch((e) => setError(e.message));
  }, [loadReferenceData]);
  const loadAreas = useCallback(async () => {
    if (!campaignId) {
      setAreas([]);
      return;
    }
    const result = await geographyApi.administrativeAreas(tenantId, campaignId, {
      page,
      pageSize: ADMIN_PAGE_SIZE,
      levelId: levelFilter || undefined,
      parentId: parentId || undefined,
      root: !parentId && !levelFilter && !search,
      search: search || undefined,
    });
    setAreas(result.items);
    setTotalAreas(result.total);
    setTotalPages(result.totalPages);
  }, [campaignId, levelFilter, page, parentId, search, tenantId]);
  useEffect(() => {
    const timer = window.setTimeout(() => void loadAreas().catch((e) => setError(e.message)), 200);
    return () => window.clearTimeout(timer);
  }, [loadAreas]);
  async function addLevel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    await geographyApi.createLevel(tenantId, {
      name: data.name,
      orderIndex: Number(data.orderIndex),
    });
    setMessage("Geographic level created.");
    await loadReferenceData();
  }
  async function addArea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    await geographyApi.createArea(tenantId, campaignId, {
      name: data.name,
      code: data.code || undefined,
      levelId: data.levelId,
      parentId: data.parentId || undefined,
    });
    setMessage("Geographic area created.");
    await loadAreas();
  }
  async function editLevel(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    await geographyApi.updateLevel(tenantId, id, {
      name: data.name,
      orderIndex: Number(data.orderIndex),
    });
    setMessage("Geographic level updated.");
    await loadReferenceData();
  }
  async function editArea(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    await geographyApi.updateArea(tenantId, campaignId, id, {
      name: data.name,
      code: data.code || undefined,
      levelId: data.levelId,
      parentId: data.parentId || null,
    });
    setMessage("Geographic area updated.");
    await loadAreas();
  }
  async function runImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const rows = JSON.parse(String(data.rows));
      const mode = String(data.mode);
      const result = await geographyApi.importRows(tenantId, campaignId, {
        mode,
        rows,
        confirmation: mode === "IMPORT" ? data.confirmation : undefined,
        provenance: {
          sourceInstitution: data.sourceInstitution,
          sourceDocument: data.sourceDocument,
          sourceVersionDate: data.sourceVersionDate || undefined,
          retrievalDate: data.retrievalDate,
          validationStatus: data.validationStatus,
        },
      });
      setError("");
      setMessage(`${result.mode} completed: ${JSON.stringify(result.report)}`);
    } catch (caught) {
      setMessage("");
      setError(caught instanceof Error ? caught.message : "Import check failed.");
    }
  }
  async function activateHierarchy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await geographyApi.activateHierarchy(
        tenantId,
        campaignId,
        String(data.confirmation || ""),
      );
      setMessage(`Full hierarchy activation completed: ${result.activated} records activated.`);
      await loadAreas();
    } catch (caught) {
      setMessage("");
      setError(caught instanceof Error ? caught.message : "Hierarchy activation failed.");
    }
  }
  return (
    <div className="ops-page">
      <header className="ops-heading">
        <div>
          <span className="eyebrow">SUPER ADMINISTRATION</span>
          <h1>Nigeria geographic management</h1>
          <p>
            Manage reviewed levels and campaign-scoped areas. Imports require official source
            provenance and explicit confirmation.
          </p>
        </div>
      </header>
      {error && (
        <p role="alert" className="ops-error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="ops-confirmation">
          {message}
        </p>
      )}
      <section className="ops-list">
        <h2>Geographic levels</h2>
        {levels.map((l) => (
          <article key={l.id}>
            <div>
              <strong>
                {l.orderIndex + 1}. {l.name}
              </strong>
              <small>{l.isActive ? "Active" : "Inactive"}</small>
            </div>
            <button
              onClick={async () => {
                await geographyApi.updateLevel(tenantId, l.id, { isActive: !l.isActive });
                await loadReferenceData();
              }}
            >
              {l.isActive ? "Deactivate" : "Activate"}
            </button>
            <details>
              <summary>Edit approved fields</summary>
              <form className="ops-form" onSubmit={(event) => editLevel(event, l.id)}>
                <label>
                  Level name
                  <input name="name" defaultValue={l.name} required maxLength={120} />
                </label>
                <label>
                  Order
                  <input
                    name="orderIndex"
                    type="number"
                    min="0"
                    defaultValue={l.orderIndex}
                    required
                  />
                </label>
                <button>Save level</button>
              </form>
            </details>
          </article>
        ))}
        <form className="ops-form" onSubmit={addLevel}>
          <label>
            Level name
            <input name="name" required />
          </label>
          <label>
            Order
            <input name="orderIndex" type="number" min="0" required />
          </label>
          <button className="primary-action">Add approved level</button>
        </form>
      </section>
      <section className="ops-list">
        <h2>Campaign areas</h2>
        <label>
          Campaign
          <select
            value={campaignId}
            onChange={(e) => {
              setCampaignId(e.target.value);
              setParentId("");
              setParentName("");
              setPage(1);
            }}
          >
            <option value="">Select campaign</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Search areas
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setParentId("");
              setParentName("");
              setPage(1);
            }}
          />
        </label>
        <label>
          Filter by level
          <select
            value={levelFilter}
            onChange={(e) => {
              setLevelFilter(e.target.value);
              setParentId("");
              setParentName("");
              setPage(1);
            }}
          >
            <option value="">All levels</option>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </label>
        <p role="status">
          Showing {areas.length} of {totalAreas} records
          {parentName ? ` beneath ${parentName}` : ""}.
        </p>
        {parentId && (
          <button
            type="button"
            onClick={() => {
              setParentId("");
              setParentName("");
              setLevelFilter("");
              setPage(1);
            }}
          >
            Return to hierarchy roots
          </button>
        )}
        {areas.map((a) => (
          <article key={a.id}>
            <div>
              <strong>{a.name}</strong>
              <small>
                {a.level.name}
                {a.parent ? ` · Path parent: ${a.parent.name}` : " · Root"} ·{" "}
                {a.isActive ? "Active" : "Inactive"}
              </small>
            </div>
            <button
              onClick={async () => {
                await geographyApi.updateArea(tenantId, campaignId, a.id, {
                  isActive: !a.isActive,
                });
                await loadAreas();
              }}
            >
              {a.isActive ? "Deactivate" : "Activate"}
            </button>
            <button
              type="button"
              onClick={() => {
                setParentId(a.id);
                setParentName(a.name);
                setLevelFilter("");
                setSearch("");
                setPage(1);
              }}
            >
              View children
            </button>
            <details onToggle={(event) => setEditingAreaId(event.currentTarget.open ? a.id : "")}>
              <summary>Edit approved fields</summary>
              {editingAreaId === a.id && (
                <AreaEditForm
                  area={a}
                  tenantId={tenantId}
                  campaignId={campaignId}
                  levels={levels}
                  onSubmit={(event) => editArea(event, a.id)}
                />
              )}
            </details>
          </article>
        ))}
        {campaignId && (
          <form className="ops-form" onSubmit={addArea}>
            <label>
              Name
              <input name="name" required />
            </label>
            <label>
              Code
              <input name="code" required maxLength={40} />
            </label>
            <label>
              Level
              <select
                name="levelId"
                required
                value={newAreaLevelId}
                onChange={(event) => setNewAreaLevelId(event.target.value)}
              >
                <option value="">Select level</option>
                {levels
                  .filter((l) => l.isActive)
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
              </select>
            </label>
            {newAreaLevelId && (
              <ParentPicker
                tenantId={tenantId}
                campaignId={campaignId}
                levels={levels}
                levelId={newAreaLevelId}
              />
            )}
            <button className="primary-action">Add reviewed area</button>
          </form>
        )}
        <nav aria-label="Geographic area pages">
          <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
            Previous
          </button>
          <span>Page {page} of {Math.max(totalPages, 1)}</span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </button>
        </nav>
      </section>
      <section className="ops-list">
        <h2>Controlled import</h2>
        <p>
          VALIDATE checks data without database writes. PREVIEW shows proposed changes without
          database writes. IMPORT writes atomically only after exact confirmation.
        </p>
        {campaignId && (
          <form className="ops-form" onSubmit={runImport}>
            <label>
              Mode
              <select name="mode">
                <option>VALIDATE</option>
                <option>PREVIEW</option>
                <option>IMPORT</option>
              </select>
            </label>
            <label>
              Source institution
              <input name="sourceInstitution" placeholder="INEC" required maxLength={240} />
            </label>
            <label>
              Source document or dataset
              <input name="sourceDocument" required maxLength={240} />
            </label>
            <label>
              Source version date
              <span className="field-hint">Enter only when the source publishes a version date.</span>
              <input name="sourceVersionDate" type="date" />
            </label>
            <label>
              Retrieval date
              <input name="retrievalDate" type="date" required />
            </label>
            <label>
              Validation status
              <input name="validationStatus" required maxLength={40} />
            </label>
            <label>
              Rows (JSON array)
              <textarea name="rows" required />
            </label>
            <label>
              Import confirmation
              <input name="confirmation" placeholder="IMPORT AUTHORIZED GEOGRAPHIC DATA" />
            </label>
            <button className="primary-action">Run selected controlled mode</button>
          </form>
        )}
      </section>
      <section className="ops-list">
        <h2>Controlled full-hierarchy activation</h2>
        <p>
          Activates the complete verified campaign hierarchy atomically. Partial and repeated
          activation are rejected.
        </p>
        {campaignId && (
          <form className="ops-form" onSubmit={activateHierarchy}>
            <label>
              Activation confirmation
              <input
                name="confirmation"
                placeholder="ACTIVATE AUTHORIZED GEOGRAPHIC HIERARCHY"
                required
              />
            </label>
            <button className="primary-action">Activate complete hierarchy</button>
          </form>
        )}
      </section>
    </div>
  );
}
