import { CalendarDays, CheckCircle2, Flag, Map, Plus, UsersRound } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { SessionUser } from "../lib/auth";
import { activeTenant, operationsApi, type Campaign, type OperationsItem } from "../lib/operations";

type Section = "campaigns" | "field" | "volunteers" | "events";
export function OperationsPage({ user, section }: { user: SessionUser; section: Section }) {
  const tenantId = activeTenant(user);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selected, setSelected] = useState("");
  const [items, setItems] = useState<OperationsItem[]>([]);
  const [volunteers, setVolunteers] = useState<
    Array<{
      id: string;
      displayName: string;
      trainingStatus: string;
      languages: string[];
      skills: string[];
    }>
  >([]);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const load = useCallback(async () => {
    try {
      const result = await operationsApi.campaigns(tenantId);
      setCampaigns(result.campaigns);
      const campaignId = selected || result.campaigns[0]?.id || "";
      setSelected(campaignId);
      if (section === "volunteers")
        setVolunteers((await operationsApi.volunteers(tenantId)).volunteers);
      else if (campaignId && section !== "campaigns")
        setItems(
          (
            await operationsApi.list(
              tenantId,
              campaignId,
              section === "events" ? "events" : "tasks",
            )
          ).items,
        );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load operations.");
    }
  }, [tenantId, selected, section]);
  useEffect(() => {
    void load();
  }, [load]);
  const titles = {
    campaigns: ["Campaign management", "Create and govern active campaign workspaces."],
    field: [
      "Field operations",
      "Track initiatives, activities, tasks, deadlines, and dependencies.",
    ],
    volunteers: [
      "Volunteer operations",
      "Manage authorized contact details, availability, skills, training, and assignments.",
    ],
    events: ["Events", "Coordinate public and internal campaign events."],
  } as const;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (section === "campaigns")
        await operationsApi.createCampaign(tenantId, {
          ...data,
          slug: String(data.name)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-"),
        });
      else if (section === "volunteers")
        await operationsApi.createVolunteer(tenantId, {
          displayName: data.displayName,
          contactAuthorized: data.contactAuthorized === "on",
          email: data.email || undefined,
          phone: data.phone || undefined,
          availability: {},
          languages: String(data.languages || "").split(","),
          skills: String(data.skills || "").split(","),
          trainingStatus: "NOT_STARTED",
        });
      else
        await operationsApi.create(
          tenantId,
          selected,
          section === "events" ? "events" : "tasks",
          section === "events"
            ? { ...data, type: data.type, startsAt: data.startsAt, status: "PLANNED" }
            : { ...data, priority: data.priority, status: "PLANNED" },
        );
      setShowForm(false);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save.");
    }
  }
  return (
    <div className="ops-page">
      <header className="ops-heading">
        <div>
          <span className="eyebrow">OPERATIONS MVP</span>
          <h1>{titles[section][0]}</h1>
          <p>{titles[section][1]}</p>
        </div>
        <button className="primary-action" onClick={() => setShowForm(!showForm)}>
          <Plus /> Add {section === "field" ? "task" : section.slice(0, -1)}
        </button>
      </header>
      {error && (
        <p className="ops-error" role="alert">
          {error}
        </p>
      )}
      {section !== "campaigns" && section !== "volunteers" && (
        <label className="campaign-picker">
          Campaign
          <select value={selected} onChange={(event) => setSelected(event.target.value)}>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {showForm && (
        <form className="ops-form" onSubmit={submit}>
          <h2>New {section === "field" ? "task" : section.slice(0, -1)}</h2>
          {section === "volunteers" ? (
            <>
              <label>
                Name
                <input name="displayName" required />
              </label>
              <label>
                Languages
                <input name="languages" placeholder="English, French" />
              </label>
              <label>
                Skills
                <input name="skills" placeholder="Logistics, registration" />
              </label>
              <label>
                Email
                <input name="email" type="email" />
              </label>
              <label>
                Phone
                <input name="phone" type="tel" />
              </label>
              <label className="consent-check">
                <input name="contactAuthorized" type="checkbox" /> Authorized to store and use these
                contact details
              </label>
            </>
          ) : (
            <>
              <label>
                Name
                <input name={section === "campaigns" ? "name" : "title"} required />
              </label>
              {section === "campaigns" && (
                <>
                  <label>
                    Country
                    <input name="country" required />
                  </label>
                  <label>
                    Election type
                    <input name="electionType" required />
                  </label>
                  <label>
                    Start date
                    <input name="startsAt" type="date" />
                  </label>
                  <label>
                    End date
                    <input name="endsAt" type="date" />
                  </label>
                </>
              )}
              {section === "field" && (
                <>
                  <label>
                    Priority
                    <select name="priority">
                      <option>NORMAL</option>
                      <option>HIGH</option>
                      <option>URGENT</option>
                      <option>LOW</option>
                    </select>
                  </label>
                  <label>
                    Deadline
                    <input name="dueAt" type="datetime-local" />
                  </label>
                </>
              )}
              {section === "events" && (
                <>
                  <label>
                    Type
                    <select name="type">
                      {[
                        "RALLY",
                        "TOWN_HALL",
                        "PRESS_CONFERENCE",
                        "COMMUNITY_MEETING",
                        "VOLUNTEER_TRAINING",
                        "POLICY_FORUM",
                        "CANDIDATE_VISIT",
                        "INTERNAL_MEETING",
                      ].map((type) => (
                        <option key={type}>{type}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Starts
                    <input name="startsAt" type="datetime-local" required />
                  </label>
                  <label>
                    Venue
                    <input name="venue" />
                  </label>
                </>
              )}
            </>
          )}
          <div>
            <button type="button" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button className="primary-action" type="submit">
              Save
            </button>
          </div>
        </form>
      )}
      <section className="ops-metrics">
        <article>
          <Flag />
          <strong>{campaigns.length}</strong>
          <span>Campaigns</span>
        </article>
        <article>
          <CheckCircle2 />
          <strong>{items.filter((item) => item.status === "COMPLETED").length}</strong>
          <span>Completed</span>
        </article>
        <article>
          <CalendarDays />
          <strong>{section === "events" ? items.length : "—"}</strong>
          <span>Events</span>
        </article>
        <article>
          <UsersRound />
          <strong>{volunteers.length || "—"}</strong>
          <span>Volunteers</span>
        </article>
      </section>
      <section className="ops-list">
        <div className="ops-list-head">
          <h2>{titles[section][0]}</h2>
          <span>
            {section === "campaigns"
              ? campaigns.length
              : section === "volunteers"
                ? volunteers.length
                : items.length}{" "}
            records
          </span>
        </div>
        {section === "campaigns"
          ? campaigns.map((campaign) => (
              <article key={campaign.id}>
                <span className={`record-icon status-${campaign.status.toLowerCase()}`}>
                  <Flag />
                </span>
                <div>
                  <strong>{campaign.name}</strong>
                  <small>
                    {campaign.country} · {campaign.electionType}
                  </small>
                </div>
                <label className="sr-only" htmlFor={`status-${campaign.id}`}>
                  Campaign status
                </label>
                <select
                  id={`status-${campaign.id}`}
                  className="status-select"
                  value={campaign.status}
                  onChange={async (event) => {
                    try {
                      await operationsApi.updateCampaign(tenantId, campaign.id, {
                        status: event.target.value,
                      });
                      await load();
                    } catch (caught) {
                      setError(
                        caught instanceof Error ? caught.message : "Unable to update campaign.",
                      );
                    }
                  }}
                >
                  <option>DRAFT</option>
                  <option>ACTIVE</option>
                  <option>ARCHIVED</option>
                </select>
              </article>
            ))
          : section === "volunteers"
            ? volunteers.map((volunteer) => (
                <article key={volunteer.id}>
                  <span className="record-icon">
                    <UsersRound />
                  </span>
                  <div>
                    <strong>{volunteer.displayName}</strong>
                    <small>{volunteer.languages.join(", ") || "No languages recorded"}</small>
                  </div>
                  <span className="status-pill">{volunteer.trainingStatus}</span>
                </article>
              ))
            : items.map((item) => (
                <article key={item.id}>
                  <span className="record-icon">
                    {section === "events" ? <CalendarDays /> : <CheckCircle2 />}
                  </span>
                  <div>
                    <strong>{item.title}</strong>
                    <small>
                      {item.type?.replaceAll("_", " ") || item.priority || "NORMAL"}
                      {item.venue ? ` · ${item.venue}` : ""}
                    </small>
                  </div>
                  <span className="status-pill">{item.status.replaceAll("_", " ")}</span>
                </article>
              ))}
        {((section === "campaigns" && !campaigns.length) ||
          (section === "volunteers" && !volunteers.length) ||
          (!items.length && section !== "campaigns" && section !== "volunteers")) && (
          <div className="empty-state">
            <Map />
            <h3>No records yet</h3>
            <p>Use the add button to create the first tenant-owned record.</p>
          </div>
        )}
      </section>
    </div>
  );
}
