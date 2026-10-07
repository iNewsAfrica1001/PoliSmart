import { CalendarDays, CheckCircle2, Flag, Map, Plus, UsersRound } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { SessionUser } from "../lib/auth";
import {
  activeTenant,
  operationsApi,
  type Campaign,
  type EventGeographyOption,
  type ManagementOptions,
  type OperationsItem,
  type VolunteerRecord,
} from "../lib/operations";

type Section = "campaigns" | "field" | "volunteers" | "events";
const EMPTY_OPTIONS: ManagementOptions = { members: [], tasks: [], events: [] };
const readable = (value: string) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase());
const dateTime = (value?: string) => (value ? new Date(value).toLocaleString() : "Not scheduled");
const csv = (value: FormDataEntryValue | null) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export function OperationsPage({
  user,
  section,
  onOpenDashboard,
}: {
  user: SessionUser;
  section: Section;
  onOpenDashboard: () => void;
}) {
  const tenantId = activeTenant(user);
  const membership = user.memberships.find((item) => item.tenantId === tenantId);
  const canCreateEvent = membership?.canCreateEvents === true;
  const canCreateVolunteer = membership?.canCreateVolunteers === true;
  const canManageField = membership?.canManageField === true;
  const canManageVolunteers = membership?.canManageVolunteers === true;
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selected, setSelected] = useState("");
  const [items, setItems] = useState<OperationsItem[]>([]);
  const [volunteers, setVolunteers] = useState<VolunteerRecord[]>([]);
  const [management, setManagement] = useState<ManagementOptions>(EMPTY_OPTIONS);
  const [geography, setGeography] = useState<EventGeographyOption[]>([]);
  const [geographySearch, setGeographySearch] = useState("");
  const [editingTask, setEditingTask] = useState<OperationsItem | null>(null);
  const [editingVolunteer, setEditingVolunteer] = useState<VolunteerRecord | null>(null);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await operationsApi.campaigns(tenantId);
      setCampaigns(result.campaigns);
      const campaignId =
        selected && result.campaigns.some((campaign) => campaign.id === selected)
          ? selected
          : result.campaigns[0]?.id || "";
      setSelected(campaignId);
      if (section === "volunteers") {
        setVolunteers((await operationsApi.volunteers(tenantId)).volunteers);
        setItems([]);
      } else if (campaignId && section !== "campaigns") {
        setItems(
          (
            await operationsApi.list(
              tenantId,
              campaignId,
              section === "events" ? "events" : "tasks",
            )
          ).items,
        );
      } else setItems([]);
      if (
        campaignId &&
        ((section === "field" && canManageField) ||
          (section === "volunteers" && canManageVolunteers))
      )
        setManagement(await operationsApi.managementOptions(tenantId, campaignId));
      else setManagement(EMPTY_OPTIONS);
      if (campaignId && section === "events" && canCreateEvent)
        setGeography((await operationsApi.eventGeography(tenantId, campaignId)).items);
      else setGeography([]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load operations.");
    } finally {
      setLoading(false);
    }
  }, [canCreateEvent, canManageField, canManageVolunteers, section, selected, tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function findGeography() {
    if (!selected || (geographySearch.trim() && geographySearch.trim().length < 2)) return;
    try {
      setError("");
      setGeography(
        (await operationsApi.eventGeography(tenantId, selected, geographySearch.trim())).items,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to search campaign geography.");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      (section === "events" && !canCreateEvent) ||
      (section === "volunteers" && !canCreateVolunteer) ||
      (section === "field" && !canManageField)
    )
      return;
    setError("");
    setConfirmation("");
    setSaving(true);
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      let message = "Saved.";
      if (section === "campaigns") {
        const result = await operationsApi.createCampaign(tenantId, {
          ...data,
          slug: String(data.name)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-"),
        });
        setSelected(result.campaign.id);
        message = `${result.campaign.name} was created.`;
      } else if (section === "volunteers") {
        await operationsApi.createVolunteer(tenantId, {
          displayName: data.displayName,
          contactAuthorized: data.contactAuthorized === "on",
          email: data.email || undefined,
          phone: data.phone || undefined,
          availability: {},
          languages: csv(data.languages),
          skills: csv(data.skills),
          trainingStatus: "NOT_STARTED",
        });
        message = "Volunteer added.";
      } else {
        await operationsApi.create(
          tenantId,
          selected,
          section === "events" ? "events" : "tasks",
          section === "events"
            ? {
                title: data.title,
                type: data.type,
                startsAt: data.startsAt,
                venue: data.venue || undefined,
                geographicAreaId: data.geographicAreaId || undefined,
                status: "PLANNED",
              }
            : {
                title: data.title,
                ownerId: data.ownerId || undefined,
                dueAt: data.dueAt || undefined,
                priority: data.priority,
                status: "PLANNED",
              },
        );
        message = section === "events" ? "Event created." : "Task created.";
      }
      setConfirmation(message);
      setShowForm(false);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save.");
    } finally {
      setSaving(false);
    }
  }

  async function updateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingTask || !canManageField) return;
    setSaving(true);
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await operationsApi.update(tenantId, selected, "tasks", editingTask.id, {
        title: data.title,
        ownerId: data.ownerId || null,
        dueAt: data.dueAt || null,
        priority: data.priority,
        status: data.status,
      });
      if (data.dependsOnTaskId)
        await operationsApi.addDependency(
          tenantId,
          selected,
          editingTask.id,
          String(data.dependsOnTaskId),
        );
      setConfirmation("Task updated.");
      setEditingTask(null);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update task.");
    } finally {
      setSaving(false);
    }
  }

  async function updateVolunteer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingVolunteer || !canManageVolunteers) return;
    setSaving(true);
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await operationsApi.updateVolunteer(tenantId, editingVolunteer.id, {
        contactAuthorized: data.contactAuthorized === "on",
        email: data.email || null,
        phone: data.phone || null,
        availability: {
          ...editingVolunteer.availability,
          notes: String(data.availabilityNotes || "").trim(),
        },
        languages: csv(data.languages),
        skills: csv(data.skills),
        trainingStatus: data.trainingStatus,
      });
      setConfirmation("Volunteer updated.");
      setEditingVolunteer(null);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update volunteer.");
    } finally {
      setSaving(false);
    }
  }

  async function assignVolunteer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingVolunteer || !canManageVolunteers || !selected) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setSaving(true);
    setError("");
    try {
      await operationsApi.assignVolunteer(tenantId, selected, {
        volunteerId: editingVolunteer.id,
        taskId: data.taskId ? String(data.taskId) : undefined,
        title: String(data.title),
        status: "PLANNED",
      });
      setConfirmation("Volunteer assigned to campaign work.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to assign volunteer.");
    } finally {
      setSaving(false);
    }
  }

  async function addParticipant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingVolunteer || !canManageVolunteers || !selected) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setSaving(true);
    setError("");
    try {
      await operationsApi.addEventParticipant(tenantId, selected, String(data.eventId), {
        volunteerId: editingVolunteer.id,
        status: String(data.status),
      });
      setConfirmation("Volunteer added to the event.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to add event participant.");
    } finally {
      setSaving(false);
    }
  }

  const titles = {
    campaigns: ["Campaign management", "Create and govern active campaign workspaces."],
    field: ["Field operations", "Create and update campaign tasks, owners and dependencies."],
    volunteers: ["Volunteer operations", "Manage authorized volunteer records and campaign work."],
    events: ["Events", "Create and review public and internal campaign events."],
  } as const;
  const creationAllowed =
    section === "events"
      ? canCreateEvent
      : section === "volunteers"
        ? canCreateVolunteer
        : section === "field"
          ? canManageField
          : true;

  return (
    <div className="ops-page">
      <header className="ops-heading">
        <div>
          <span className="eyebrow">OPERATIONS</span>
          <h1>{titles[section][0]}</h1>
          <p>{titles[section][1]}</p>
        </div>
        <button
          className="primary-action"
          onClick={() => setShowForm(!showForm)}
          disabled={
            !creationAllowed || (section !== "campaigns" && section !== "volunteers" && !selected)
          }
          title={!creationAllowed ? "Your role cannot create this record" : undefined}
        >
          <Plus /> Add {section === "field" ? "task" : section.slice(0, -1)}
        </button>
      </header>
      {error && (
        <p className="ops-error" role="alert">
          {error}
        </p>
      )}
      {confirmation && (
        <div className="ops-confirmation" role="status">
          <span>{confirmation}</span>
          {section === "campaigns" && (
            <button type="button" onClick={onOpenDashboard}>
              Open dashboard
            </button>
          )}
        </div>
      )}
      {section !== "campaigns" && (
        <label className="campaign-picker campaign-context">
          <span>
            <strong>Campaign context</strong>Operational records remain scoped to this campaign.
            Events and field activity remain scoped to the selected campaign.
          </span>
          <select
            aria-label="Selected campaign"
            value={selected}
            onChange={(event) => {
              setSelected(event.target.value);
              setEditingTask(null);
              setEditingVolunteer(null);
            }}
            disabled={!campaigns.length || loading}
          >
            {!campaigns.length && <option value="">Create a campaign first</option>}
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {section === "volunteers" && (
        <div className="campaign-context">
          <UsersRound aria-hidden="true" />
          <span>
            <strong>Organization volunteer roster</strong>Select a campaign above before assigning
            volunteers to tasks or events.
          </span>
        </div>
      )}

      {showForm && creationAllowed && (
        <form className="ops-form" onSubmit={submit}>
          <h2>New {section === "field" ? "task" : section.slice(0, -1)}</h2>
          {section === "campaigns" && (
            <p className="form-guidance">
              Campaigns scope intelligence, policy, events, and field work. Enter the official
              campaign details below; dates may be added now or later.
            </p>
          )}
          {section === "volunteers" ? (
            <VolunteerFields />
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
                    Start date <small>(optional)</small>
                    <input name="startsAt" type="date" />
                  </label>
                  <label>
                    End date <small>(optional)</small>
                    <input name="endsAt" type="date" />
                  </label>
                </>
              )}
              {section === "field" && <TaskFields management={management} />}
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
                        <option key={type} value={type}>
                          {readable(type)}
                        </option>
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
                  <div className="ops-geography-search">
                    <label>
                      Find assigned geography
                      <input
                        value={geographySearch}
                        onChange={(event) => setGeographySearch(event.target.value)}
                        placeholder="Search by area name"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void findGeography()}
                      disabled={
                        Boolean(geographySearch.trim()) && geographySearch.trim().length < 2
                      }
                    >
                      Search
                    </button>
                  </div>
                  <label>
                    Geography <small>(optional; active campaign assignments only)</small>
                    <select name="geographicAreaId">
                      <option value="">No geographic area</option>
                      {geography.map((area) => (
                        <option key={area.id} value={area.id}>
                          {area.level}: {area.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
            </>
          )}
          <div>
            <button type="button" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button className="primary-action" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      )}

      {editingTask && canManageField && (
        <form className="ops-form" onSubmit={updateTask}>
          <h2>Edit task</h2>
          <label>
            Name
            <input name="title" defaultValue={editingTask.title} required />
          </label>
          <TaskFields item={editingTask} management={management} />
          <label>
            Dependency <small>(optional)</small>
            <select name="dependsOnTaskId">
              <option value="">No new dependency</option>
              {management.tasks
                .filter((task) => task.id !== editingTask.id)
                .map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
            </select>
          </label>
          <div>
            <button type="button" onClick={() => setEditingTask(null)}>
              Cancel
            </button>
            <button className="primary-action" disabled={saving}>
              {saving ? "Saving…" : "Update task"}
            </button>
          </div>
        </form>
      )}

      {editingVolunteer && canManageVolunteers && (
        <section className="volunteer-management" aria-labelledby="volunteer-management-heading">
          <form className="ops-form" onSubmit={updateVolunteer}>
            <h2 id="volunteer-management-heading">Manage {editingVolunteer.displayName}</h2>
            <VolunteerFields volunteer={editingVolunteer} />
            <label>
              Training status
              <select name="trainingStatus" defaultValue={editingVolunteer.trainingStatus}>
                {["NOT_STARTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "EXEMPT"].map(
                  (status) => (
                    <option key={status} value={status}>
                      {readable(status)}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label>
              Availability notes
              <textarea
                name="availabilityNotes"
                defaultValue={String(editingVolunteer.availability?.notes || "")}
              />
            </label>
            <div>
              <button type="button" onClick={() => setEditingVolunteer(null)}>
                Close
              </button>
              <button className="primary-action" disabled={saving}>
                Update volunteer
              </button>
            </div>
          </form>
          <form className="ops-form" onSubmit={assignVolunteer}>
            <h2>Campaign work assignment</h2>
            <label>
              Assignment title
              <input name="title" required />
            </label>
            <label>
              Task <small>(optional)</small>
              <select name="taskId">
                <option value="">Campaign-level assignment</option>
                {management.tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <button className="primary-action" disabled={saving || !selected}>
                Assign
              </button>
            </div>
          </form>
          <form className="ops-form" onSubmit={addParticipant}>
            <h2>Event participation</h2>
            <label>
              Event
              <select name="eventId" required>
                <option value="">Select an event</option>
                {management.events.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Participation status
              <select name="status">
                {["INVITED", "REGISTERED", "ATTENDED", "CANCELLED", "NO_SHOW"].map((status) => (
                  <option key={status} value={status}>
                    {readable(status)}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <button className="primary-action" disabled={saving || !management.events.length}>
                Add to event
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="ops-metrics" aria-label="Operations summary">
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
      <section className="ops-list" aria-busy={loading}>
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
        {loading ? (
          <p className="empty-state" role="status">
            Loading operations…
          </p>
        ) : section === "campaigns" ? (
          campaigns.map((campaign) => (
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
                    setConfirmation("Campaign status updated.");
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
        ) : section === "volunteers" ? (
          volunteers.map((volunteer) => (
            <article key={volunteer.id}>
              <span className="record-icon">
                <UsersRound />
              </span>
              <div>
                <strong>{volunteer.displayName}</strong>
                <small>{volunteer.languages.join(", ") || "No languages recorded"}</small>
              </div>
              <span className="status-pill">{readable(volunteer.trainingStatus)}</span>
              {canManageVolunteers && (
                <button type="button" onClick={() => setEditingVolunteer(volunteer)}>
                  Manage
                </button>
              )}
            </article>
          ))
        ) : (
          items.map((item) => (
            <article key={item.id}>
              <span className="record-icon">
                {section === "events" ? <CalendarDays /> : <CheckCircle2 />}
              </span>
              <div>
                <strong>{item.title}</strong>
                <small>
                  {item.type ? readable(item.type) : readable(item.priority || "NORMAL")}
                  {item.owner?.displayName ? ` · ${item.owner.displayName}` : ""}
                  {section === "events"
                    ? ` · ${item.geographicArea?.name || item.venue || "Location pending"} · ${dateTime(item.startsAt)}`
                    : ` · ${dateTime(item.dueAt)}`}
                </small>
              </div>
              <span className="status-pill">{readable(item.status)}</span>
              {section === "field" && canManageField && (
                <button type="button" onClick={() => setEditingTask(item)}>
                  Edit
                </button>
              )}
            </article>
          ))
        )}
        {!loading &&
          ((section === "campaigns" && !campaigns.length) ||
            (section === "volunteers" && !volunteers.length) ||
            (!items.length && section !== "campaigns" && section !== "volunteers")) && (
            <div className="empty-state">
              <Map />
              <h3>{emptyState[section].title}</h3>
              <p>{emptyState[section].body}</p>
            </div>
          )}
      </section>
    </div>
  );
}

function TaskFields({
  item,
  management,
}: {
  item?: OperationsItem;
  management: ManagementOptions;
}) {
  return (
    <>
      <label>
        Priority
        <select name="priority" defaultValue={item?.priority || "NORMAL"}>
          {["LOW", "NORMAL", "HIGH", "URGENT"].map((value) => (
            <option key={value} value={value}>
              {readable(value)}
            </option>
          ))}
        </select>
      </label>
      {item && (
        <label>
          Status
          <select name="status" defaultValue={item.status}>
            {["PLANNED", "ACTIVE", "AT_RISK", "BLOCKED", "COMPLETED", "CANCELLED"].map((value) => (
              <option key={value} value={value}>
                {readable(value)}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        Owner <small>(optional)</small>
        <select name="ownerId" defaultValue={item?.ownerId || ""}>
          <option value="">Unassigned</option>
          {management.members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.displayName}
            </option>
          ))}
        </select>
      </label>
      <label>
        Deadline <small>(optional)</small>
        <input
          name="dueAt"
          type="datetime-local"
          defaultValue={item?.dueAt ? item.dueAt.slice(0, 16) : ""}
        />
      </label>
    </>
  );
}

function VolunteerFields({ volunteer }: { volunteer?: VolunteerRecord }) {
  return (
    <>
      {!volunteer && (
        <label>
          Name
          <input name="displayName" required />
        </label>
      )}
      <label>
        Languages
        <input
          name="languages"
          defaultValue={volunteer?.languages.join(", ")}
          placeholder="English, French"
        />
      </label>
      <label>
        Skills
        <input
          name="skills"
          defaultValue={volunteer?.skills.join(", ")}
          placeholder="Logistics, registration"
        />
      </label>
      <label>
        Email
        <input name="email" type="email" defaultValue={volunteer?.email || ""} />
      </label>
      <label>
        Phone
        <input name="phone" type="tel" defaultValue={volunteer?.phone || ""} />
      </label>
      <label className="consent-check">
        <input
          name="contactAuthorized"
          type="checkbox"
          defaultChecked={volunteer?.contactAuthorized}
        />{" "}
        Authorized to store and use these contact details
      </label>
    </>
  );
}

const emptyState = {
  campaigns: {
    title: "Create your first campaign",
    body: "Campaigns keep intelligence and operations scoped to the correct team and election.",
  },
  field: { title: "No field tasks yet", body: "Select a campaign, then add the first field task." },
  volunteers: {
    title: "No volunteers yet",
    body: "Add a volunteer only when contact authorization has been obtained.",
  },
  events: { title: "No events yet", body: "Select a campaign, then schedule the first event." },
} as const;
