import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { SessionUser } from "../lib/auth";
import { geographyApi, geographyTenant } from "../lib/geography";

export function GeographicManagementPage({ user }: { user: SessionUser }) {
  const tenantId = geographyTenant(user);
  const [levels, setLevels] = useState<
    Array<{ id: string; name: string; orderIndex: number; isActive: boolean }>
  >([]);
  const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string }>>([]);
  const [campaignId, setCampaignId] = useState("");
  const [areas, setAreas] = useState<
    Array<{
      id: string;
      name: string;
      code?: string;
      isActive: boolean;
      level: { id: string; name: string };
      parent?: { id: string; name: string };
    }>
  >([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const visibleAreas = areas.filter(
    (area) =>
      `${area.name} ${area.code || ""}`.toLowerCase().includes(search.toLowerCase()) &&
      (!levelFilter || area.level.name === levelFilter),
  );
  const load = useCallback(async () => {
    const [l, c] = await Promise.all([
      geographyApi.levels(tenantId),
      geographyApi.campaigns(tenantId),
    ]);
    setLevels(l.levels);
    setCampaigns(c.campaigns);
    const selected = campaignId || c.campaigns[0]?.id || "";
    setCampaignId(selected);
    if (selected) setAreas((await geographyApi.areas(tenantId, selected)).items);
  }, [campaignId, tenantId]);
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, [load]);
  async function addLevel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    await geographyApi.createLevel(tenantId, {
      name: data.name,
      orderIndex: Number(data.orderIndex),
    });
    setMessage("Geographic level created.");
    await load();
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
    await load();
  }
  async function editLevel(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    await geographyApi.updateLevel(tenantId, id, {
      name: data.name,
      orderIndex: Number(data.orderIndex),
    });
    setMessage("Geographic level updated.");
    await load();
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
    await load();
  }
  async function runImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      setMessage(`${result.mode} completed: ${JSON.stringify(result.report)}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Import check failed.");
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
                await load();
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
            onChange={async (e) => {
              setCampaignId(e.target.value);
              setAreas((await geographyApi.areas(tenantId, e.target.value)).items);
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
          <input value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <label>
          Filter by level
          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
            <option value="">All levels</option>
            {levels.map((l) => (
              <option key={l.id}>{l.name}</option>
            ))}
          </select>
        </label>
        {visibleAreas.map((a) => (
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
                await load();
              }}
            >
              {a.isActive ? "Deactivate" : "Activate"}
            </button>
            <details>
              <summary>Edit approved fields</summary>
              <form className="ops-form" onSubmit={(event) => editArea(event, a.id)}>
                <label>
                  Name
                  <input name="name" defaultValue={a.name} required maxLength={120} />
                </label>
                <label>
                  Code
                  <input name="code" defaultValue={a.code} required maxLength={40} />
                </label>
                <label>
                  Level
                  <select name="levelId" defaultValue={a.level.id} required>
                    {levels
                      .filter((level) => level.isActive)
                      .map((level) => (
                        <option key={level.id} value={level.id}>
                          {level.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Parent
                  <select name="parentId" defaultValue={a.parent?.id || ""}>
                    <option value="">No parent</option>
                    {areas
                      .filter((candidate) => candidate.isActive && candidate.id !== a.id)
                      .map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.name}
                        </option>
                      ))}
                  </select>
                </label>
                <button>Save area</button>
              </form>
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
              <select name="levelId" required>
                {levels
                  .filter((l) => l.isActive)
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Parent
              <select name="parentId">
                <option value="">No parent</option>
                {areas
                  .filter((a) => a.isActive)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </label>
            <button className="primary-action">Add reviewed area</button>
          </form>
        )}
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
    </div>
  );
}
