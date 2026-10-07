# Campaign Geography 3A–3E Program Closure

## 1. Closure decision

| Item                                                                                                            | Final status                               |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Campaign Geography Program                                                                                      | **CLOSED**                                 |
| Increments 3A–3E Production acceptance                                                                          | **PASS**                                   |
| Authoritative Production application commit                                                                     | `54b73c1353fe0cececf12f8c03f068d6830c97ce` |
| Outstanding P0/P1 security, isolation, authorization, data-integrity, or Production-operability issues in scope | **NONE IDENTIFIED**                        |
| Schema, migration, privilege, or Production-data work required by this closure review                           | **NONE**                                   |

This record closes the reviewed Campaign Geography program. It is an architecture and control
record, not authorization for another geography increment, a Production mutation, or a relaxation
of any boundary below.

## 2. Final architecture and terminology

### 2.1 Authoritative campaign geography

Authoritative campaign geography is the combination of:

- platform reference data in `MasterGeographicLevel` and `MasterGeographicArea`;
- the campaign/tenant-scoped active rows in `CampaignGeographicAssignment`;
- the server-authoritative campaign country; and
- the accepted Campaign Geography repository/service and controlled database mutation functions.

An area is usable as campaign scope only when the campaign is accessible in the authenticated
tenant, its country resolves to the area's country, the assignment is active, the master area and
level are active, and a bounded, cycle-free, valid ancestry reaches the Country root. Consumers
must fail closed when any of those conditions is absent.

### 2.2 Legacy operational geography

`GeographicLevel` and `GeographicArea` remain the tenant/campaign-scoped operational models used
by existing records and Geographic Administration. `CampaignEvent.geographicAreaId` and
`Volunteer.preferredAreaId` remain legacy foreign keys. These models are not the authority for a
campaign's permitted operating scope.

Legacy geography is intentionally retained for record compatibility and administration. It must
not be interpreted as an unrestricted substitute for an active Campaign Geographic Assignment.

### 2.3 Descriptive/reference geography

Free-text or external-source geography—such as media geography labels, public-intelligence country
or survey-region fields, and policy/communications narrative—is descriptive or evidentiary. It is
not a Campaign Geographic Assignment and must not grant operational authority. Public intelligence
remains aggregate/reference evidence governed by its own country, source, citation, weighting, and
sample controls.

### 2.4 Historical/migration tooling

Migration `0020`, migration `0021`, the Campaign Geography backfill, rehearsal harness, sentinel,
and associated tests are historical/control tooling. They remain for reproducibility, audit, and
recovery evidence. They are not runtime geography APIs and must never be imported or executed in a
way that produces implicit tests, fixtures, migrations, sentinels, or database writes.

## 3. Master Geography authority

`MasterGeographicLevel` is country-scoped, ordered, active/inactive reference metadata.
`MasterGeographicArea` is country-scoped, level-bound, parent-bound reference geography with
source provenance and active state. Composite country foreign keys prevent a level or parent from
crossing country scope; restrictive deletes preserve referenced geography.

The accepted Nigeria campaign hierarchy contains five master levels with order positions
`0, 1, 2, 5, 6`:

1. Country
2. Geopolitical Zone
3. State/FCT
4. Local Government Area/FCT Area Council
5. Ward/Registration Area

The gaps are intentional compatibility with the reviewed operational hierarchy. They must not be
renumbered casually. The final accepted Production baseline is:

| Dataset                         |                          Accepted count |
| ------------------------------- | --------------------------------------: |
| Legacy geographic areas         | 9,627 total / 9,627 active / 0 inactive |
| Master geographic levels        |                                       5 |
| Master geographic areas         |                                   9,627 |
| Campaign geographic assignments |                                   9,627 |

Unexpected drift from this accepted baseline is a STOP condition until explained and authorized.

## 4. Campaign Geographic Assignment authority and mutations

`CampaignGeographicAssignment` binds one master area to one `(tenantId, campaignId)` scope. The
database enforces a unique tenant/campaign/area tuple and restrictive relations to the composite
campaign identity, master area, and human actors.

Only `campaign-geography:view` and `campaign-geography:manage` govern the assignment workspace.
They are assigned initially to Campaign Administrator and Super Administrator. Ordinary AI,
Command Center, Event, Field, and Volunteer permissions neither imply nor receive geography
management capability.

Runtime has SELECT access to the three Campaign Geography tables but no direct write access.
Assignment writes use the migration `0021` `SECURITY DEFINER` functions:

- `public.campaign_geography_assign(uuid, uuid, uuid, uuid[])`
- `public.campaign_geography_deactivate(uuid, uuid, uuid, uuid[])`

Both are owned by `polismart_migrator`, use controlled `search_path`, are revoked from `PUBLIC`, and
grant EXECUTE only to `polismart_runtime`. They independently enforce active membership and
`campaign-geography:manage`, tenant/campaign scope, campaign-country consistency, active master
rows, ancestry validity, bounded recursion/cycle protection, campaign-scoped advisory locking,
and append-only security audit creation.

Assignment is deterministic and idempotent: assigning a child assigns missing ancestors; assigning
a parent does not assign descendants. Deactivation is soft, records actor/time, and is blocked when
an active assigned descendant would be orphaned. The authenticated server session supplies the
actor; client actor identifiers are not authoritative.

## 5. Delivered consumer architecture

### 5.1 Increment 3B — Campaign Geography workspace

The dedicated workspace consumes the accepted hierarchy, assignment, assignment-mutation, and
deactivation APIs. It displays ancestry and assignment state, explains automatic ancestry and
descendant-removal restrictions, capability-gates mutations, and does not expose master-geography
editing to Campaign Administrators. Strict query validation remains fail closed. Vercel's internal
`path` rewrite metadata is removed at the routing boundary, while genuine unknown client fields
remain rejected.

### 5.2 Increment 3C — Command Center

The Command Center obtains selectable areas only from active Campaign Geographic Assignments joined
to active master areas/levels in the server-authoritative campaign country. A selected area is
validated server-side against the same scope before snapshot queries run. The selected area is an
exact filter; descendants are not rolled up. Unassigned campaigns do not fall back to unrestricted
master or legacy geography. Responses are `private, no-store`.

### 5.3 Increment 3D — AI Geographic Grounding

The Assistant uses the accepted Campaign Geography read authority. Geography options contain only
active assignments. Chat submission revalidates the selected assignment and bounded active
ancestry; campaign country is server authoritative. Missing, stale, inactive, foreign,
cross-campaign, or cross-tenant grounding fails closed without a legacy/master fallback.

Provider context is identifier-minimized and includes only necessary verified labels/ancestry and
approved evidence. Existing citation/source-ID validation remains authoritative. Country-level
evidence must never be presented as ward, LGA, state, or zone evidence. Ordinary authorized users
retain `ai-assistant:use` plus `campaign:read`; they do not require or receive Campaign Geography
view/manage permissions.

Deterministic controls continue to prohibit geographic persuasion optimization, discriminatory
exclusion, sensitive-trait inference, turnout suppression, candidate-choice recommendations,
covert microtargeting, and unsupported election prediction. Geography supplies factual context
within authorized scope; it does not decide whom a campaign should persuade.

### 5.4 Increment 3E — Operations ingress

For a new Event with `geographicAreaId`, the server requires both:

- the existing active legacy `GeographicArea` in the authenticated tenant/campaign; and
- an active assignment for the same ID through the accepted Campaign Geography read authority,
  including active master area/level, matching country, and valid bounded ancestry.

The selected area remains exact; no descendant roll-up is introduced. Event creation without
geography is unchanged, and existing Events remain readable.

New Volunteer creation rejects the presence of `preferredAreaId`, including `null` and empty input,
until campaign-scoped volunteer geography is separately designed. Volunteer creation omitting the
field and all existing Volunteer reads remain unchanged. No `campaignId` was added to the Volunteer
API. The unused Operations `context-options` route and client were removed; Geographic
Administration and legitimate legacy operations were preserved.

## 6. Master/legacy identity compatibility dependency

The controlled backfill deliberately preserved each legacy area UUID as the corresponding master
area UUID and recorded an identity-mapping hash. Assignment IDs are separate deterministic UUIDv5
values. This identity bridge allows an Event's legacy `geographicAreaId` to be checked directly as
`masterGeographicAreaId` without rewriting existing Event records.

This is a critical compatibility invariant. Future imports, country expansion, remapping, or master
geography replacement must not assume IDs align unless that alignment is explicitly constructed and
verified. Breaking it requires a separately reviewed mapping/migration strategy; silent ID
translation or fallback is prohibited.

## 7. Isolation, authorization, and administration boundaries

- Tenant identity comes from an active authenticated membership and the trusted organization
  header/session flow, never a body-supplied tenant ID.
- Campaign lookups and assignments require the matching tenant/campaign composite scope.
- Campaign Geography mutations require both HTTP authorization and database-function
  authorization.
- `campaign-geography:view/manage` remain limited to Campaign Administrator and Super
  Administrator under the accepted policy.
- `geography:manage` is the separate legacy Geographic Administration capability. Geographic
  Administration may manage reviewed legacy levels/areas but is not Campaign Geography assignment
  management and must not be exposed to Campaign Administrators merely because they manage
  assignments.
- Operational roles retain only their accepted Event/Volunteer permissions; those permissions do
  not confer Campaign Geography management.
- UI filtering is never an authorization boundary. Cross-tenant, cross-campaign, inactive, stale,
  or unsupported-country references fail closed server-side.

## 8. Intentional legacy and excluded consumers

The following are intentional and are not defects by reference alone:

- legacy `GeographicLevel`/`GeographicArea` and Geographic Administration;
- existing Event and Volunteer legacy foreign keys and reads;
- descriptive Media geography text;
- public-intelligence country/region evidence under aggregate safeguards;
- Policy and Communications narrative geography;
- migration, backfill, rehearsal, sentinel, and historical compatibility code.

These components must not be migrated merely to remove the word “legacy.” A future change requires
a concrete business need, bounded design, and explicit authorization.

## 9. Migrations, recovery, and operations

Campaign Geography relies on:

- `0020_campaign_geography_master_assignment_schema` — additive master/assignment schema,
  indexes, restrictive relationships, and runtime read-only table privileges;
- `0021_campaign_geography_assignment_controls` — permissions, role mappings, controlled mutation
  functions, function ownership/grants, locking, validation, and audit behavior.

Migration `0019_privacy_operations_controls` is applied in the accepted Production baseline but is
not a Campaign Geography data-model migration. All three migrations are recorded as applied.

The protected Production checkpoint `campaign-geography-production-pre-0021`, branch ID
`br-still-river-axmcbvi4`, has auto-delete set to Never. It must not be deleted to free capacity.
Other historical checkpoints are also protected unless a separate retention review classifies
them. Any future Production migration requires independently verified Neon control-plane identity,
a reviewed recovery strategy, explicit authorization, and post-migration verification.

Production depends operationally on Vercel routing/build/runtime, the least-privilege Neon runtime
role and connectivity, session/authentication services, and configured provider dependencies.
`/api/health` and `/api/ready` must remain monitored. Readiness covers the static build, required
Production configuration, allowed origins, database connectivity, and AI configuration. Monitor
authentication/authorization denials, database errors, Vercel failures, and unexpected geography
data drift without logging secrets.

## 10. Privacy, political safety, and excluded financial scope

Campaign Geography describes authorized campaign operating scope. It must not be joined to privacy,
suppression, sensitive-trait, voter-level, or contact data to profile, exclude, rank, or persuade
individuals. Legal holds, suppression controls, append-only governance evidence, citation controls,
and deterministic political-safety checks remain independent fail-closed boundaries.

Payments and fundraising remain disabled and outside this program. No geography assignment may be
used to infer authorization for payment processing, fundraising, donor scoring, or contribution
targeting. Destructive privacy execution also remains separately controlled and unauthorized unless
explicitly approved.

## 11. Technical debt and future-change warnings

No unresolved P0/P1 issue was identified. The following bounded technical debt remains:

1. Legacy and master geography coexist and depend on preserved area-ID identity for current Event
   ingress validation.
2. New volunteer preferred geography is intentionally unavailable; a future design must establish
   campaign scope before accepting `preferredAreaId` again.
3. The master hierarchy's non-contiguous order positions are compatibility-sensitive.
4. Geographic Administration remains a separate legacy mutation surface and must not become a
   backdoor into Campaign Geographic Assignments.
5. Country normalization currently supports the accepted Nigeria scope. Country expansion requires
   reviewed hierarchy rules, sources, mappings, tests, and operational authorization.

These items do not justify a new increment by themselves.

Future developers must preserve these invariants:

- Campaign Geographic Assignment is the sole authority for campaign operating scope.
- Campaign country is server authoritative.
- Active assignment, active master area/level, complete bounded ancestry, and isolation are checked
  server-side at use time.
- Exact-area selection does not imply descendants.
- No unrestricted master/legacy fallback is permitted for assignment-governed consumers.
- Runtime table writes remain denied; controlled functions remain least privilege and fail closed.
- Actor identity remains session authoritative and audit evidence remains append only.
- Master administration, campaign assignment management, and operational creation permissions stay
  separate.
- Legacy records remain readable unless a separately authorized migration says otherwise.
- Vercel internal rewrite metadata is normalized only at the routing boundary; genuine unknown
  client query fields remain rejected.
- Privacy, political-safety, payment, fundraising, and Production-control boundaries remain intact.

## 12. Evidence basis

This closure review reconciled the Prisma schema; migrations `0020` and `0021`; authorization
policy; Campaign Geography repository/service/routes; Vercel routing normalization; Command Center,
AI, Operations, and Geographic Administration implementations; controlled backfill and rehearsal
tooling; security/isolation/regression tests; root operating controls; and the accepted Production
release evidence for commits `b7542ffc44e558153ba66d4d316207c1b4162fcc` (3B),
`199c95f37a7a8c3bd07921987b5d093768bdc1df` (3B routing remediation),
`7b54498f4223c832e3166209b95d08be0d60fe55` (3C),
`815a1edf51e55bf81d15f4dda5fd4c4f48cdcb50` (3D), and
`54b73c1353fe0cececf12f8c03f068d6830c97ce` (3E).

The final review found no unresolved P0/P1 issue within the completed Campaign Geography scope.
