# PoliSmart Africa AI V1.1A

## Internal Governance Operations Register and P1 Closure Matrix

| Document control              | Value                                                                                                                        |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Application Production commit | `4190166c99ed425a00191516fb443d8306341354`                                                                                   |
| Governance baseline           | `225198787775ee1988993041db49d07d55e3013d`                                                                                   |
| Jurisdiction                  | Nigeria only                                                                                                                 |
| Legal/privacy approval        | APPROVED, effective September 28, 2026; no conditions                                                                        |
| Legal evidence                | `PoliSmart_Africa_AI_Legal_Privacy_Approval.pdf`, SHA-256 `3CE6582D1604B09589DAB79BB125F7852B04292DD41C57C0F8CC53F2D67D1282` |
| Document owner                | Dr. Michael Omoruyi, Platform Owner                                                                                          |
| Status                        | Prepared for internal activation and evidence completion                                                                     |
| Launch authorization          | Not granted                                                                                                                  |
| Payments / Fundraising        | Disabled / not authorized                                                                                                    |

This register reconciles existing procedures without replacing their detailed safeguards. It does
not authorize launch, Production data changes, direct database work, automated deletion, payment,
or fundraising functionality.

## 1. Existing-evidence inventory

| Control                                                       | Existing evidence                                                                     | Classification                                                        | Authoritative source                                                                   |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Operator training and acknowledgement                         | Detailed course, scenarios, checklist, acknowledgement, and verifier form             | PARTIAL                                                               | `V1_1_LEAD_MANAGEMENT_ADMINISTRATOR_TRAINING_AND_ACKNOWLEDGEMENT.md`                   |
| Retention                                                     | Categories, proposed periods, triggers, exceptions, and review duties                 | DRAFT                                                                 | `LEAD_FOLLOW_UP_OPERATIONS_AND_RETENTION_POLICY.md`                                    |
| Rights, deletion, anonymization, suppression, and legal holds | Detailed case lifecycle, roles, safeguards, approval fields, and restoration handling | DRAFT                                                                 | `V1_1_LEAD_DATA_DELETION_AND_ANONYMIZATION_PROCEDURE.md`                               |
| Processor/subprocessor evidence                               | Provider inventory and data-flow descriptions                                         | PARTIAL                                                               | `V1_1_LEGAL_PRIVACY_HR_EXTERNAL_REVIEW_PACKAGE.md`; `PRODUCTION.md`                    |
| Cross-border transfer evidence                                | Provider and transfer questions plus approved Nigeria legal framework                 | PARTIAL                                                               | External review package and signed legal approval                                      |
| Breach/incident response                                      | Detection, severity, containment, escalation, recovery, and evidence procedures       | COMPLETE for technical operations; PARTIAL for notification execution | `OPERATIONS_MONITORING_RUNBOOK.md`                                                     |
| WhatsApp consent and follow-up                                | User-initiated implementation, disclosure, prohibitions, and review questions         | PARTIAL                                                               | External review package; training guide; `shared/whatsapp.js`; homepage implementation |
| Restored-data handling                                        | Isolated recovery, post-recovery checks, and preservation rules                       | COMPLETE                                                              | `BACKUP_RECOVERY_RUNBOOK.md`                                                           |

## 2. Retention-policy operational activation record

### Policy source and approved schedule

The controlling policy source is `LEAD_FOLLOW_UP_OPERATIONS_AND_RETENTION_POLICY.md`. The signed
Nigerian approval confirms counsel review of retention/deletion and records an APPROVED decision
with no conditions. The periods below are reproduced exactly from that reviewed policy; this
register does not invent or extend them.

| Category                         | Period/trigger                                                                                                                         | End-of-period action                                                           | Exceptions                                                                                    |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Duplicate or invalid submissions | 30 days after classification                                                                                                           | Delete or irreversibly anonymize through an approved procedure                 | Fraud, abuse, suppression, security evidence, or hold                                         |
| Unresponsive leads               | 90 days after last documented outreach; routine active review no more than 180 days from submission unless later contact was requested | Close and delete or anonymize through an approved procedure                    | Documented lawful reason, hold, dispute, suppression, or security need                        |
| Closed or unqualified leads      | 90 days after closure                                                                                                                  | Delete or anonymize through an approved procedure                              | Legal hold, dispute, suppression, or security need                                            |
| Qualified leads                  | 12 months after last meaningful interaction, then documented review                                                                    | Delete, anonymize, or document a current lawful reason for continued retention | Approved hold or other lawful requirement                                                     |
| Follow-up history                | With the associated lead during active administration and up to 12 months after closure; the shorter approved category period controls | Dispose with the lead or apply the approved lawful outcome                     | Specific approved audit-evidence requirement                                                  |
| Security and audit records       | 12 months from creation                                                                                                                | Delete or irreversibly anonymize under the approved evidence process           | Investigation, legal hold, dispute, or regulatory obligation                                  |
| Minimal suppression record       | No standalone period is stated in the reviewed policy                                                                                  | Retain only under an approved case decision and review trigger                 | Must be minimum, separate, restricted, and never used for marketing, profiling, AI, or Search |

- Legal approval reference: signed Nigeria legal/privacy approval, effective September 28, 2026.
- Responsible owner: Dr. Michael Omoruyi, Platform Owner.
- Execution responsibility: authorized Super Administrator for monthly review; Privacy/Legal
  Reviewer for lawful outcome; separately authorized minimum-privileged Technical Executor and
  independent verifier for any data action.
- Review frequency: monthly retention review; quarterly schedule/procedure review; event-triggered
  review after legal, workflow, provider, incident, or jurisdiction changes.
- Evidence: case ID, category, trigger date, decision, approver, hold/suppression assessment,
  authorized executor, verifier, outcome, timestamps, and restoration treatment. Do not copy lead
  content into the register.
- Legal-hold override: a valid documented hold suspends ordinary disposition until formal release.
- Effective date: **PENDING PLATFORM OWNER INTERNAL ACTIVATION**.

Platform Owner activation decision: `APPROVE / REJECT / MORE EVIDENCE REQUIRED`

Effective date: ____________________

Platform Owner signature: ____________________

Independent verification reference: ____________________

Until these fields are completed, the retention policy remains operationally open.

## 3. Rights and disposition operator procedure

### Policy requirement

Use `V1_1_LEAD_DATA_DELETION_AND_ANONYMIZATION_PROCEDURE.md` as the controlling detailed
procedure. A legal/privacy decision does not authorize an operator to execute SQL or improvise a
data change.

### Operator procedure

1. Receive access, correction, deletion, anonymization, objection, portability, suppression, or
   restriction requests only through the approved rights channel. Create a restricted case ID.
2. Record only the minimum request metadata. Keep identity evidence and request content outside
   lead notes, AI, Workspace Search, and ordinary telemetry.
3. Apply the approved proportionate identity and representative-authority check. Stop when identity
   or authority is uncertain.
4. Identify the exact environment, tenant, lead, linked follow-ups, audit evidence, notification
   metadata, logs, backups, recovery branches, suppression records, and applicable processors.
5. Check retention duties, disputes, investigations, legal holds, suppression needs, backup state,
   and cross-border/provider implications.
6. The Privacy/Legal Reviewer records the lawful outcome: access, correction, delete,
   irreversibly anonymize, restrict, retain under hold, or retain a minimum suppression record.
7. For access or portability, disclose only verified in-scope data through the approved secure
   channel and record the evidence reference. Do not expose other tenants, campaigns, users, or
   security/audit material outside the approved response.
8. For correction, use an existing authorized application operation when it can safely produce the
   approved result. If none exists, record a software/procedure gap and stop.
9. For deletion, anonymization, restriction, or suppression, require a version-controlled,
   synthetic-tested, separately authorized execution plan, a recovery checkpoint, exact scope,
   minimum privilege, and independent verification. No approved general execution tool currently
   exists, so the operator must stop before mutation.
10. Use counsel-approved response wording and timing. This register does not invent a statutory
    deadline.
11. Close the case only after approver, executor, and independent-verifier evidence reconcile.
12. If restored data contains a prior decision, reapply or preserve the restriction, deletion,
    anonymization, or suppression outcome before restored data can enter ordinary use.

### Software gaps — do not implement under this workstream

- No approved, tested minimum-privileged deletion/anonymization/restriction executor exists.
- No dedicated suppression-record data model or controlled workflow is evidenced.
- No application case-management workflow for rights requests and legal holds is evidenced; a
  separately approved restricted register may be used only after its location and access controls
  are approved.

## 4. Processor/subprocessor operational register

Unknown contractual, location, and subprocessor facts remain **NOT VERIFIED**. This table records
architecture evidence, not a new contractual or legal conclusion.

| Service                         | Purpose                                                                             | Data category                                                                                              | Processing role                                            | Verified location                                                                                | Transfer consideration                                     | Contract/DPA status | Review status | Evidence                                                      | Owner                                 |
| ------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- | ------------------- | ------------- | ------------------------------------------------------------- | ------------------------------------- |
| Vercel                          | Hosting, serverless runtime, web telemetry, private object storage where configured | Application requests, operational metadata, stored documents/objects                                       | Processor role not independently verified in this register | NOT VERIFIED                                                                                     | Potential cross-border processing; exact path NOT VERIFIED | NOT VERIFIED        | OPEN          | `PRODUCTION.md`; external review package                      | Platform Owner                        |
| Neon                            | Managed PostgreSQL                                                                  | Tenant, campaign, authentication, lead, geography, audit, and application records                          | Processor role not independently verified in this register | Production project is documented in AWS US East 2; contractual processing locations NOT VERIFIED | Nigeria-origin data may be processed outside Nigeria       | NOT VERIFIED        | OPEN          | `BACKUP_RECOVERY_RUNBOOK.md`; external review package         | Database Operator / Platform Owner    |
| Microsoft 365 / Microsoft Graph | Transactional verification, password reset, and configured internal notifications   | Recipient address and necessary transactional message content                                              | Processing role NOT VERIFIED                               | NOT VERIFIED                                                                                     | Potential cross-border processing                          | NOT VERIFIED        | OPEN          | `PRODUCTION.md`; monitoring runbook; external review package  | Application Operator / Platform Owner |
| OpenAI                          | Server-side model inference                                                         | Authorized bounded AI inputs; lead/follow-up data excluded by design                                       | Processing role NOT VERIFIED                               | NOT VERIFIED                                                                                     | Potential cross-border processing                          | NOT VERIFIED        | OPEN          | `RESPONSIBLE_AI.md`; `PRODUCTION.md`; external review package | AI/Application Verification Owner     |
| WhatsApp / Meta                 | External user-initiated messaging destination                                       | Business number, draft greeting, and provider-generated message/account/network metadata if the user sends | Provider/controller characterization NOT VERIFIED          | NOT VERIFIED                                                                                     | Processing locations and transfers NOT VERIFIED            | NOT VERIFIED        | OPEN          | External review package; `shared/whatsapp.js`                 | Platform Owner                        |

Provider contracts, DPAs, subprocessors, current processing locations, retention promises, and
transfer safeguards must be verified in the controlled external register before this P1 closes.

## 5. Cross-border transfer register

| Source jurisdiction | Destination/processing jurisdiction                                                         | Processor             | Data category and purpose                                     | Transfer mechanism | Legal review               | Evidence                                             | Review owner                                         | Status |
| ------------------- | ------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------- | ------------------ | -------------------------- | ---------------------------------------------------- | ---------------------------------------------------- | ------ |
| Nigeria             | NOT VERIFIED                                                                                | Vercel                | Runtime requests, telemetry, and stored objects for hosting   | NOT VERIFIED       | Nigeria framework APPROVED | Production architecture and signed approval          | Platform Owner / Privacy Reviewer                    | OPEN   |
| Nigeria             | United States region documented for the current Neon project; contractual path NOT VERIFIED | Neon                  | Application database records for persistence/recovery         | NOT VERIFIED       | Nigeria framework APPROVED | Recovery runbook and signed approval                 | Database Operator / Privacy Reviewer                 | OPEN   |
| Nigeria             | NOT VERIFIED                                                                                | Microsoft 365 / Graph | Transactional message delivery                                | NOT VERIFIED       | Nigeria framework APPROVED | Production/email documentation and signed approval   | Application Operator / Privacy Reviewer              | OPEN   |
| Nigeria             | NOT VERIFIED                                                                                | OpenAI                | Bounded authorized AI inference; excluded lead/follow-up data | NOT VERIFIED       | Nigeria framework APPROVED | Responsible AI and provider documentation            | AI/Application Verification Owner / Privacy Reviewer | OPEN   |
| Nigeria             | NOT VERIFIED                                                                                | WhatsApp / Meta       | User-initiated external messaging                             | NOT VERIFIED       | Nigeria framework APPROVED | Signed approval and WhatsApp data-flow documentation | Platform Owner / Privacy Reviewer                    | OPEN   |

## 6. Personal-data breach and incident operator procedure

This procedure supplements, and does not replace, `OPERATIONS_MONITORING_RUNBOOK.md`.

1. **Detection:** use verified availability, readiness, 5xx, authentication, AI-provider,
   database, email, and operator reports. Treat suspected unauthorized access, disclosure,
   alteration, loss, tenant crossover, credential exposure, or unlawful processing as a possible
   privacy/security incident.
2. **Initial containment:** stop unnecessary processing, preserve service safety, freeze affected
   deployments/writes/imports when authorized, revoke affected access through approved controls,
   and never destroy evidence or perform an unreviewed restore.
3. **Classification:** assign the technical severity and separately determine whether personal
   data, confidentiality, integrity, availability, rights, or legal duties may be affected.
4. **Incident Lead:** Dr. Michael Omoruyi unless formally delegated in the protected operations
   register.
5. **Evidence preservation:** retain timestamps, deployment and request IDs, affected systems,
   sanitized logs, decisions, owners, and recovery evidence. Exclude secrets and unnecessary
   personal content.
6. **Legal/privacy escalation:** notify the designated Privacy/Legal Reviewer promptly whenever
   personal data or notification duties may be implicated.
7. **Assessment:** determine scope, data categories, people/jurisdictions affected, provider
   involvement, containment, ongoing risk, and restored-data implications.
8. **Notification decision:** the authorized Legal/Privacy decision-maker determines regulator,
   individual, processor, contractual, and other notifications. **FOLLOW COUNSEL-APPROVED
   NOTIFICATION REQUIREMENTS.** Do not invent a deadline.
9. **Documentation:** record the decision, rationale, approver, notifications, timing, exceptions,
   residual risk, and evidence location in the restricted incident record.
10. **Recovery:** follow the recovery runbook, validate in isolation, preserve prior rights and
    suppression decisions, and require explicit cutover authority.
11. **Post-incident review:** complete a blameless review, corrective-action ownership, training or
    policy updates, and independent closure verification.

The procedure exists and is technically actionable. Final notification contacts and jurisdictional
decision evidence must be recorded in the protected operations register before P1 closure.

## 7. WhatsApp operator procedure

1. WhatsApp contact is initiated only when the visitor selects the public control and chooses to
   send or edit the prefilled draft in WhatsApp. PoliSmart does not send automatically.
2. Human follow-up is permitted only for the purpose and scope approved for the request, through
   an approved account and by a trained authorized operator.
3. No unsolicited, bulk, automated, political-persuasion, voter-targeting, fundraising, payment,
   profiling, scoring, contact-import, chatbot, API, webhook, or autonomous outreach is permitted.
4. Record only minimum evidence needed to show initiation, approved purpose, response state, and
   opt-out handling. Do not copy message threads into lead notes or AI systems.
5. An objection, withdrawal, or opt-out stops further outreach except a strictly necessary
   confirmation permitted by the approved process. Escalate for a minimum suppression decision.
6. A suppression record, if approved for the case, must be minimum, restricted, separated from
   active leads where practical, and prohibited from marketing, profiling, AI, Search, or targeting.
7. Administrators must report misdirected messages, unauthorized outreach, sensitive content, or
   account compromise through the incident procedure.
8. WhatsApp/Meta handling remains external after the visitor activates the link. Do not represent
   PoliSmart as controlling provider retention, deletion, processing locations, or subprocessors.

The user-initiation and prohibition controls are documented and implemented. Final operational
contact-account ownership, opt-out register location, and trained-operator evidence remain open.

## 8. Role training matrix

| Role                                          | Mandatory training scope                                                                                                                                                                                                  |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Platform Owner                                | Entire package; legal/privacy approval boundary; release authority; retention/rights decisions; provider/transfer evidence; incident and recovery authorization; financial exclusions                                     |
| Incident Lead                                 | Incident/breach procedure; evidence preservation; legal/privacy escalation; notification-decision boundary; recovery and post-incident review                                                                             |
| Application Operator                          | Authentication, tenant/campaign isolation, secret handling, monitoring, transactional email, data minimization, rights/incident escalation, WhatsApp restrictions                                                         |
| Database Operator                             | Least privilege, tenant/campaign boundaries, authorized migration/recovery, holds, rights/disposition stop rules, restored-data safeguards, evidence handling                                                             |
| Verification/Acceptance Owner                 | Independent evidence requirements, environment identity, security/privacy acceptance, monitoring, recovery, training and launch-gate verification                                                                         |
| Super Administrator                           | Lead access purpose, minimal notes, statuses/follow-ups, privacy and confidentiality, retention, rights requests, suppression/holds, WhatsApp opt-out, incident escalation, AI/geography safeguards, financial exclusions |
| Campaign Administrator / Tenant Administrator | Role boundary, tenant/campaign isolation, prohibited lead access, confidentiality, incident reporting, political AI prohibitions, geographic safeguards, financial exclusions                                             |

A person holding multiple roles may complete one acknowledgement only when the trainer verifies
that every assigned-role module was completed.

## 9. Independent verification requirements

Each control closes only when all applicable evidence exists:

- authoritative document/procedure exists and has a version;
- owner and execution roles are identified;
- effective date and approval are recorded;
- required training is completed;
- acknowledgement and verifier sign-off are complete;
- software-dependent operations have an approved, tested implementation;
- provider/contract/transfer evidence is recorded without guessing;
- evidence location and checksum/version are recorded; and
- an independent verifier records PASS with no unresolved condition.

Verifier: ____________________

Verification date: ____________________

Evidence reference: ____________________

Decision: `PASS / FAIL / MORE EVIDENCE REQUIRED`

Signature: ____________________

## 10. P1 closure matrix

| Control                  | Policy                                        | Procedure                                               | Training                               | Evidence                                                 | Owner                                      | P1   | Remaining action                                                                |
| ------------------------ | --------------------------------------------- | ------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------- | ------------------------------------------ | ---- | ------------------------------------------------------------------------------- |
| Retention                | Counsel-reviewed schedule; activation pending | Detailed monthly/quarterly process exists               | Prepared, incomplete                   | Owner activation blank                                   | Platform Owner                             | OPEN | Sign activation record; train and verify operators                              |
| Deletion/anonymization   | Approved legal framework                      | Draft; no approved executor                             | Prepared, incomplete                   | Execution/rehearsal absent                               | Platform Owner / Privacy-Legal / Technical | OPEN | Separately authorize, implement, test, and approve minimum-privileged procedure |
| Suppression              | Approved legal framework                      | Operating rule prepared; no controlled storage/workflow | Prepared, incomplete                   | Case/register evidence absent                            | Privacy-Legal / Platform Owner             | OPEN | Approve minimum fields, period, location, workflow, and training                |
| Legal hold               | Approved legal framework                      | Case decision path prepared                             | Prepared, incomplete                   | Hold register/authority evidence absent                  | Legal / Platform Owner                     | OPEN | Approve restricted hold register and release process; train roles               |
| Data-subject rights      | Approved legal framework                      | Intake-to-closure procedure prepared                    | Prepared, incomplete                   | Approved channel and case evidence absent                | Privacy-Legal / Operations                 | OPEN | Approve channel, identity standard, execution paths, and verifier               |
| Processor/subprocessor   | Approved legal framework                      | Register prepared                                       | Prepared, incomplete                   | Contracts, DPAs, subprocessors, locations NOT VERIFIED   | Platform Owner / Privacy                   | OPEN | Record verified provider evidence and reviewer acceptance                       |
| Cross-border transfers   | Approved legal framework                      | Register prepared                                       | Prepared, incomplete                   | Mechanisms and destinations incomplete                   | Platform Owner / Privacy                   | OPEN | Record verified mechanisms, destinations, and reviewer acceptance               |
| Breach procedure         | Approved legal framework                      | Operator procedure prepared; technical runbook active   | Prepared, incomplete                   | Notification contacts/decision record incomplete         | Incident Lead / Privacy-Legal              | OPEN | Record protected notification evidence; train and verify roles                  |
| WhatsApp procedure       | Approved legal framework                      | User-initiation and opt-out procedure prepared          | Prepared, incomplete                   | Account/suppression location and trained operator absent | Platform Owner / Privacy                   | OPEN | Approve operating account/register; train and verify operator                   |
| Operator training        | Requirements approved                         | Authoritative package prepared                          | Not completed                          | No completed attendance/signatures                       | Platform Owner / Trainer                   | OPEN | Deliver role modules and assess completion                                      |
| Operator acknowledgement | Form prepared                                 | Sign/verify/store procedure prepared                    | Not completed                          | Unsigned                                                 | Administrator / Trainer-Verifier           | OPEN | Sign and independently verify each required role                                |
| Independent verification | Criteria prepared                             | Verification form prepared                              | Not applicable until evidence complete | Unsigned                                                 | Verification/Acceptance Owner              | OPEN | Verify every control after evidence completion                                  |

## 11. Change-control status

- Application code modified: NO
- Application deployed: NO
- Production data/database/geography modified: NO
- Migration run: NO
- Environment, OpenAI, email, or monitoring configuration changed: NO
- Payments enabled: NO
- Fundraising enabled: NO
- Safe to run final launch-authorization gate: **NO**

This register may be re-reviewed only after the remaining actions in the P1 matrix have documentary
evidence. Blank approval or signature fields are not approval.
