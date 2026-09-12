# PoliSmart Africa AI

## V1.1 Lead Management

## Legal, Privacy, and HR External Review Package

**Draft for external review**

### Document control

| Field | Value |
|---|---|
| Version | V1.1 Draft 1 |
| Document date | 12 September 2026 |
| Owner | Platform Owner |
| Status | Draft for external review |
| Confidentiality | Confidential legal, privacy, HR, security, and operational review draft |
| Legal approval | OPEN |
| Privacy approval | OPEN |
| HR approval | OPEN |
| Production decision | NO-GO |
| Review cycle | To be set by authorized reviewers |
| Expiry or mandatory re-review date | OPEN |

This package is not legally approved, privacy-approved, or HR-approved. It does not authorize a Production deployment, database migration, jurisdiction launch, payment functionality, or fundraising availability.

## 1. Executive cover memorandum

PoliSmart Africa AI V1.1 includes public Early Access and Demo request forms and a protected internal workflow for human review. Authorized Super Administrators can review submissions, move leads through the controlled statuses `NEW`, `CONTACTED`, `QUALIFIED`, and `CLOSED`, schedule internal follow-ups, and record their completion. Follow-up history is append-only through the ordinary application workflow.

Preview functional and security acceptance is complete. That evidence establishes tested product behavior only; it does not establish a lawful basis, approve a privacy practice, complete HR training, approve a jurisdiction, or authorize Production.

Qualified Legal, Privacy, and HR decisions are required for collection and follow-up bases, notice and communications rules, rights handling, retention, suppression, deletion or anonymization, legal holds, cross-border processing, incident duties, administrator training, and jurisdiction-specific launch conditions. Receipt or review of this package is not Production authorization.

Payments are outside V1.1. Nigeria Fundraising remains disabled and requires a separate legal review and explicit authorization. No jurisdiction is currently approved.

## 2. Reviewer instructions

1. For each assigned decision, record exactly one outcome: `APPROVED`, `APPROVED WITH CONDITIONS`, `REJECTED`, or `FURTHER INFORMATION REQUIRED`.
2. Silence, an empty field, attendance at a meeting, or receipt of this package does not constitute approval.
3. State conditions, covered and excluded jurisdictions, effective date, expiry date, and mandatory re-review triggers explicitly.
4. Do not place personal data, application records, credentials, secrets, infrastructure identifiers, or privileged operational access information in this package.
5. Treat technical facts as evidence of behavior, not as legal conclusions.
6. Keep every blank decision and signature field blank until an authorized human reviewer completes it.
7. An approval with conditions remains operationally open until every condition is evidenced and accepted by its owner.
8. Record conflicting requirements rather than choosing between them without the responsible reviewer.

## 3. Evidence classification guide

| Classification | Meaning |
|---|---|
| Live Preview evidence | Behavior observed in the isolated non-Production application using controlled test information. |
| Automated-test evidence | Behavior established through deterministic automated tests; not represented as live observation. |
| Configuration or source-review evidence | A control inferred from reviewed configuration, source, schema, or documentation. |
| Proposed policy | A draft rule or period that has not been approved or made effective. |
| Unverified | A matter for which sufficient evidence has not been obtained. |
| Reviewer decision | A dated decision made by an authorized human reviewer within their scope. |
| Approved with conditions | A reviewer decision that remains subject to explicit conditions, jurisdiction limits, expiry, and verification. |

Preview acceptance does not equal Production approval, legal approval, privacy approval, HR approval, jurisdictional availability, or fundraising approval.

## 4. Sanitized system summary

- Public forms collect limited Early Access or Demo information and display a privacy disclosure.
- A public submission may trigger an internal notification to an authorized recipient through the configured transactional-email provider. The notification may include the submitted request type, identity and contact details, organization and professional-role details, country, interest or organization type, preferred Demo timing, and submitted message when present, solely for the notification's operational purpose.
- Lead records are available only through protected administrator review.
- Access requires authentication and the restricted Super Administrator authorization. Campaign Administrators are excluded.
- Human administrators may use only the controlled forward status workflow. `CLOSED` cannot be reopened in V1.1.
- Internal follow-up records contain a bounded note, scheduled time, creation attribution, optional completion attribution, and timestamps.
- Protected lead list responses and list views exclude follow-up-note text. Follow-up notes are available only within the protected lead-detail workflow to authorized users.
- Lead status changes do not send email. Follow-up creation and completion do not send email or change lead status. Follow-up-note text is not sent through email.
- Lead contact details and follow-up notes are excluded from AI grounding, model training, and Workspace Search.
- V1.1 does not process payments or collect payment credentials.
- The ordinary application has no lead or follow-up deletion endpoint and no delete control.
- Retention, suppression, rights handling, and deletion or anonymization remain proposed governance processes requiring approval.

## 5. Sanitized data-flow summary

1. An individual submits Early Access or Demo information through a public form.
2. The application validates the submission and stores it in protected application storage.
3. The submission may trigger an internal notification to an authorized recipient through the configured transactional-email provider. That notification may contain only the confirmed submitted lead fields needed for its operational purpose.
4. An authenticated and authorized Super Administrator reviews the submission. Protected lead lists exclude follow-up-note text; notes are available only in the protected lead-detail workflow.
5. The administrator may move the lead through controlled forward-only statuses.
6. The administrator may create and complete append-only internal follow-up records.
7. Lead and follow-up content remains excluded from AI grounding and Workspace Search.
8. Status changes and follow-up creation or completion generate no email. Follow-up-note text is not transmitted through email.
9. Retention, suppression, rights requests, legal holds, and deletion or anonymization follow approved governance once established.

| Flow element | Source | Recipient | Storage category | Exit or disposition point |
|---|---|---|---|---|
| Public submission | Individual requester | Application and authorized reviewers | Protected lead record | Approved retention, rights, restriction, suppression, deletion, or anonymization process |
| Internal submission notification | Validated public submission | Authorized internal recipient through the configured transactional-email provider | Transactional notification content; provider retention requires review | Provider and organizational retention or deletion rules, subject to reviewer decision |
| Administrative review | Authorized Super Administrator | Protected administration workflow | Status and audit metadata | Approved retention or lawful disposition |
| Follow-up record | Authorized Super Administrator | Authorized reviewers | Append-only operational history | Disposed with the lead or under an approved shorter rule |
| Security evidence | Application and operators | Authorized security and technical personnel | Restricted security/audit evidence | Approved security retention or legal hold |
| Training acknowledgement | Administrator and verifier | Authorized HR and governance personnel | Separate restricted training record | Approved personnel/training schedule |

## 6. Data-category and purpose inventory

| Data category | Generic examples | Source | Proposed purpose | Proposed lawful basis | Internal recipients | External processors | Sensitivity | Proposed retention category | Decision status |
|---|---|---|---|---|---|---|---|---|---|
| Identity and contact details | Name and business contact channel | Requester | Respond to request and administer interest | Counsel decision required | Authorized reviewers | Hosting, database, and transactional-message providers as applicable | Personal | Applicable lead category | OPEN |
| Organization and professional role | Organization type and work role | Requester | Assess organizational fit and route review | Counsel decision required | Authorized reviewers | Hosting, database, and transactional-message providers as applicable | Personal/professional | Applicable lead category | OPEN |
| Country or jurisdiction | Country context | Requester | Determine service context and required review | Counsel decision required | Authorized reviewers and legal/privacy personnel | Hosting, database, and transactional-message providers as applicable | Personal context | Applicable lead category | OPEN |
| Interest or organization type | Selected product interest | Requester | Understand requested service | Counsel decision required | Authorized reviewers | Hosting, database, and transactional-message providers as applicable | Ordinary unless free text adds sensitivity | Applicable lead category | OPEN |
| Demo timing | Requested timing | Requester | Arrange a human response | Counsel decision required | Authorized reviewers | Hosting, database, and transactional-message providers as applicable | Ordinary | Applicable lead category | OPEN |
| Submitted message | Optional free-text message | Requester | Provide request context | Counsel decision required | Authorized reviewers | Hosting, database, and transactional-message providers as applicable | Potentially sensitive; unnecessary sensitive content prohibited | Applicable lead category or earlier minimization | OPEN |
| Lead status | Controlled workflow state | Authorized administrator | Track human-led review | Counsel decision required | Authorized reviewers | Hosting and database providers | Operational | Applicable lead category | OPEN |
| Internal follow-up note | Bounded factual note | Authorized administrator | Record operational follow-up | Counsel decision required | Authorized reviewers | Hosting and database providers | Potentially sensitive; strict minimization required | Follow-up history | OPEN |
| Follow-up schedule | Date and time | Authorized administrator | Plan a human follow-up | Counsel decision required | Authorized reviewers | Hosting and database providers | Operational | Follow-up history | OPEN |
| Administrator attribution | Creator or completer reference | Authenticated session | Accountability and auditability | Counsel decision required | Authorized governance, security, and reviewers | Hosting and database providers | Personnel-linked | Audit or follow-up category | OPEN |
| Lifecycle timestamps | Creation, update, schedule, completion times | Application | Workflow integrity and evidence | Counsel decision required | Authorized reviewers | Hosting and database providers | Operational metadata | Related record category | OPEN |
| Authentication and security metadata | Account, session, and security-event metadata | Application | Authenticate authorized users, protect access, and investigate misuse | Counsel decision required | Authorized security and technical personnel | Vercel hosting/runtime and Neon database | Security-sensitive | Security and audit records | OPEN |
| Analytics and performance telemetry | Web usage and performance metadata; lead-submission and follow-up content is excluded based on accepted repository evidence | Application hosting and browser performance instrumentation | Measure application usage and performance without lead or follow-up content | Counsel decision required | Authorized technical and operations personnel | Vercel Web Analytics and Speed Insights | Operational metadata; exact fields require verification | Security and audit records or a separately approved telemetry category | OPEN |
| Audit, logging, and incident evidence | Event metadata and sanitized evidence | Application and operators | Accountability, reliability, and incident response | Counsel decision required | Authorized security, legal, privacy, and operations personnel | Vercel hosting/runtime and Neon database as applicable | Restricted | Security and audit records | OPEN |
| Minimal suppression record, if approved | Minimum matching information | Approved rights process | Honor an objection or prevent renewed contact | Counsel decision required | Strictly authorized privacy and operations personnel | Hosting and database providers if implemented | Restricted personal | Suppression category | OPEN |
| Training acknowledgement | Completion, acknowledgement, verifier, and date | Administrator and verifier | Evidence of required training | Counsel decision required | Authorized HR and governance personnel | Approved storage provider | Personnel record | Approved training-record schedule | OPEN |

No actual record values are included in this inventory.

## 7. Processor and subprocessor inventory

| Provider | Generic service purpose | Data potentially processed | Processing location or transfer status | Contract or DPA status | Retention or deletion status | Subprocessor status | Reviewer decision |
|---|---|---|---|---|---|---|---|
| Vercel | Application hosting, runtime, and private object storage | Application requests, operational metadata, authentication and session processing at runtime, and stored objects as configured | Verification required | Review required | Review required | Review required | OPEN |
| Vercel Web Analytics and Speed Insights | Web analytics and application-performance telemetry | Usage and performance telemetry; accepted repository evidence found no lead-submission or follow-up content, while exact telemetry fields and continued enforcement remain review items | Verification required | Review required | Review required | Review required | OPEN |
| Neon | Managed relational database | Lead, follow-up, attribution, timestamps, authentication account and session records, and related application records | Verification required | Review required | Review required | Review required | OPEN |
| Microsoft Graph / Microsoft 365 | Transactional account-message delivery and internal lead-submission notification | Recipient and necessary message content for configured account workflows; a lead notification may include the submitted request type, identity and contact details, organization and professional-role details, country, interest or organization type, preferred Demo timing, and submitted message when present | Verification required | Review required | Review required | Review required | OPEN |
| OpenAI | Server-side model inference for authorized AI features | Authorized AI inputs; lead and follow-up data are excluded by design | Verification required | Review required | Review required | Review required | OPEN |

No contract status, hosting region, transfer mechanism, retention commitment, or subprocessor commitment is asserted here.

## 8. Cross-border and jurisdiction summary

| Jurisdiction scope | Current status | Required decision |
|---|---|---|
| Nigeria | NOT APPROVED | Qualified Nigeria counsel must decide privacy, political/campaign, communications, transfer, retention, rights, and launch requirements. |
| Other African jurisdictions | NOT APPROVED | Review and approve each jurisdiction individually before enablement. |
| United States | NOT APPROVED | Review collection, communications, privacy, employment, retention, transfer, and launch requirements. |
| Other jurisdictions | NOT APPROVED | Review and approve each jurisdiction individually before enablement. |
| Proposed New York governing law and forum | PROPOSED — NOT APPROVED | Counsel must determine enforceability, mandatory-law exceptions, and appropriate wording. |

Technical availability does not constitute legal availability. No jurisdiction is approved. Nigeria Fundraising remains disabled. Any future fundraising capability requires a separate legal review and explicit authorization.

## 9. Proposed retention schedule

Every entry is **PROPOSED — NOT APPROVED** and remains subject to qualified Legal and Privacy review.

| Category | Proposed trigger | Proposed period | Proposed outcome | Legal-hold override | Suppression interaction | Backup interaction | Required approvers | Status |
|---|---|---|---|---|---|---|---|---|
| Duplicate or invalid submissions | Classification as duplicate or invalid | 30 days | Delete or irreversibly anonymize through an approved procedure | Preserve only under an approved hold, dispute, abuse, or security need | Retain only an approved minimum suppression record where required | Approved expiry and restoration safeguards apply | Legal, Privacy, Platform Owner | PROPOSED — NOT APPROVED |
| Unresponsive leads | Last documented outreach attempt | 90 days after the last documented outreach attempt, with a maximum routine active-review period of 180 days from submission unless the requester asked for later contact | Close and delete or irreversibly anonymize through an approved procedure unless a documented lawful reason requires retention | Approved hold, dispute, security, or other lawful reason may control | Approved suppression need may retain only minimum information | Approved expiry and restoration safeguards apply | Legal, Privacy, Operations, Platform Owner | PROPOSED — NOT APPROVED |
| Closed or unqualified leads | Closure | 90 days after closure | Delete or irreversibly anonymize through an approved procedure | Approved hold, dispute, or security requirement may control | Approved suppression need may retain only minimum information | Approved expiry and restoration safeguards apply | Legal, Privacy, Platform Owner | PROPOSED — NOT APPROVED |
| Qualified leads | Last meaningful interaction | 12 months, followed by documented review | Delete, irreversibly anonymize, or approve continued retention for a current lawful purpose | Approved hold or dispute may control | Approved suppression need may retain only minimum information | Approved expiry and restoration safeguards apply | Legal, Privacy, Platform Owner | PROPOSED — NOT APPROVED |
| Follow-up history | Associated lead lifecycle; shorter approved lead-category period ordinarily controls | Retain during active administration and up to 12 months after closure unless a shorter lead-category period applies | Dispose with the lead, or delete or irreversibly anonymize earlier when required | Approved hold, dispute, security, or audit need may control | Follow-up-note content must not enter a suppression record | Approved expiry and post-restoration treatment apply | Legal, Privacy, Platform Owner, Technical | PROPOSED — NOT APPROVED |
| Security and audit records | Record creation | 12 months | Delete or irreversibly anonymize when the approved period ends | Investigation, legal hold, dispute, or regulatory duty may justify longer retention | Retain only evidence necessary for the approved purpose | Approved expiry and restoration safeguards apply | Legal, Privacy, Security/Technical | PROPOSED — NOT APPROVED |
| Minimal suppression records | Valid objection, withdrawal, or do-not-contact request | To be determined | Retain only approved minimum information, then review or dispose under the approved trigger | A lawful hold may control | This is the suppression category; no marketing, profiling, AI, or Search use | Restoration must preserve the suppression decision | Legal, Privacy, Platform Owner | PROPOSED — NOT APPROVED |

Where source wording differs in emphasis, the shorter approved privacy-minimizing period ordinarily controls unless a documented lawful reason requires otherwise. Reviewers must resolve any perceived conflict rather than infer approval.

## 10. Proposed data-subject-rights workflow

1. Receive the request through an approved channel and create a minimal case reference.
2. Classify the requested access, correction, objection, restriction, portability, deletion, anonymization, or other action.
3. Perform proportionate identity and authority verification without excessive documentation.
4. Determine applicable jurisdiction, lawful response period, and counsel requirements.
5. Check legal holds, disputes, security investigations, suppression needs, and conflicting obligations.
6. Identify the relevant lead, follow-up, audit, logging, message metadata, backup, and training records without crossing environment or organizational boundaries.
7. Record the authorized Legal/Privacy decision and any partial fulfillment or exception.
8. Rehearse a technical procedure with synthetic non-Production information where appropriate.
9. Execute only under separate written authorization using the minimum necessary privilege.
10. Independently verify scope, outcome, unaffected records, and retained exceptions.
11. Send an approved response through the approved channel.
12. Retain only approved case and decision evidence.
13. Ensure backup expiration and restoration safeguards preserve the decision.
14. Escalate unexpected disclosure, scope, or execution outcomes through the incident process.

This workflow contains no executable deletion or anonymization instructions.

## 11. Suppression-record decision specification

| Decision area | Required reviewer decision | Status |
|---|---|---|
| Whether suppression is permitted or required | Determine applicable duties and conditions by jurisdiction and communication type. | OPEN |
| Minimum fields | Define the least information necessary to recognize and honor the instruction. | OPEN |
| Matching method | Approve a proportionate method that does not create a broader profile. | OPEN |
| Lawful basis | Record the applicable lawful basis and mandatory exceptions. | OPEN |
| Permitted purpose | Limit use to honoring the approved objection, withdrawal, or do-not-contact instruction. | OPEN |
| Access roles | Identify minimum authorized roles and independent oversight. | OPEN |
| Retention period | Set a justified period and trigger; indefinite retention is not presumed. | OPEN |
| Security controls | Define access, logging, minimization, integrity, and incident controls. | OPEN |
| Rights-request treatment | Define access, correction, restriction, objection, and deletion handling. | OPEN |
| Restoration behavior | Ensure restored systems do not silently remove or bypass the instruction. | OPEN |
| Review and expiry triggers | Define periodic review, expiry, change, and disposal rules. | OPEN |

## 12. Incident and breach review summary

| Area | Question for reviewers | Status |
|---|---|---|
| Detection | What events, reports, and processor notices initiate review? | OPEN |
| Classification | How are security incidents and personal-data breaches distinguished and graded? | OPEN |
| Containment | Which proportionate reversible controls are authorized, and by whom? | OPEN |
| Evidence preservation | What minimum sanitized evidence must be retained, for how long, and under what hold? | OPEN |
| Internal escalation | Which Legal, Privacy, Security, Operations, HR, and owner roles must be notified? | OPEN |
| Processor notification | What contractual notice paths and deadlines apply? | OPEN |
| Regulator notification | Which authorities, thresholds, content, and jurisdictional deadlines apply? | OPEN |
| Individual notification | When, how, and with what approved content must affected individuals be notified? | OPEN |
| Jurisdictional deadlines | What deadlines apply in each approved jurisdiction? No deadline is asserted pending counsel review. | OPEN |
| Documentation retention | What incident decision and communication evidence may be retained? | OPEN |
| Post-incident review | Who verifies remediation, lessons learned, policy changes, and closure? | OPEN |

## 13. Training and acknowledgement decision sheet

| Decision area | Required decision | Status |
|---|---|---|
| Training population | Identify every role requiring training before access. | OPEN |
| Training content | Approve role boundaries, status rules, note minimization, privacy, security, rights, and incident topics. | OPEN |
| Trainer qualifications | Define acceptable qualifications and conflicts. | OPEN |
| Independent verifier | Define who verifies identity, role, completion, and understanding. | OPEN |
| Completion standard | Define required modules, scenarios, assessment, and remediation. | OPEN |
| Electronic acknowledgement validity | Decide acceptable electronic form, evidence, and authentication. | OPEN |
| Record storage | Approve a separate restricted storage location. | OPEN |
| Access to records | Define HR, Privacy, Security, and owner access. | OPEN |
| Retention | Approve the training-record period and disposal trigger. | OPEN |
| Recertification | Define periodic and event-triggered retraining. | OPEN |
| Role change or departure | Define revocation timing, verification, and record treatment. | OPEN |
| Corrective action | Define retraining, suspension, escalation, and documented review. | OPEN |

Training is not complete, and no acknowledgement is represented as signed.

## 14. Consolidated LHR issue register

| Issue ID | Decision area | Primary reviewer | Supporting reviewers | Required decision | Required evidence | Counsel mandatory | Blocks Production | Training impact | Jurisdiction/Nigeria impact | Status | Decision/conditions | Owner | Due date |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| LHR-001 | Lawful basis for collection | Legal | Privacy | Approve basis and conditions | Data inventory and collection disclosure | Yes | Yes | Yes | All jurisdictions | OPEN | | | |
| LHR-002 | Lawful basis and consent for follow-up | Legal | Privacy, Operations | Approve basis, consent, withdrawal, and objection rules | Workflow and communications summary | Yes | Yes | Yes | Jurisdiction-specific | OPEN | | | |
| LHR-003 | Privacy Notice wording | Legal | Privacy | Approve general and collection-point wording | Privacy Notice and form disclosure | Yes | Yes | Yes | All jurisdictions | OPEN | | | |
| LHR-004 | Electronic communications restrictions | Legal | Privacy, Operations | Classify communications and approve restrictions | Follow-up workflow and disclosure | Yes | Yes | Yes | Jurisdiction-specific | OPEN | | | |
| LHR-005 | Rights, timing, and identity verification | Privacy | Legal, Operations | Approve rights process, deadlines, and verification | Rights workflow and deletion procedure | Yes | Yes | Yes | Jurisdiction-specific | OPEN | | | |
| LHR-006 | Final retention periods | Privacy | Legal, Operations | Approve periods, triggers, and outcomes | Proposed retention schedule | Yes | Yes | Yes | Jurisdiction-specific | OPEN | | | |
| LHR-007 | Suppression scope and duration | Privacy | Legal, Security, Operations | Approve fields, purpose, access, and period | Suppression specification | Yes | Yes | Yes | Jurisdiction-specific | OPEN | | | |
| LHR-008 | Deletion or anonymization procedure and tooling | Platform Owner | Legal, Privacy, Technical | Approve prerequisite, process, and authority | Procedure and synthetic rehearsal design | Yes for legal criteria | Yes | Yes | All jurisdictions | OPEN | | | |
| LHR-009 | Holds, disputes, backups, and restoration | Legal | Privacy, Technical, Operations | Approve holds, expiry, and restoration treatment | Rights procedure and recovery summary | Yes | Yes | Yes | Jurisdiction-specific | OPEN | | | |
| LHR-010 | Transfers and processors | Privacy | Legal, Security | Approve provider, contract, transfer, and disclosure controls | Processor and data-flow inventories | Yes | Yes | Yes | All jurisdictions | OPEN | | | |
| LHR-011 | Incident and breach duties | Security/Technical | Legal, Privacy, Operations | Approve escalation and notification requirements | Incident summary | Yes for legal duties | Yes | Yes | Jurisdiction-specific | OPEN | | | |
| LHR-012 | Training population and verifier qualifications | HR | Platform Owner, Privacy | Approve population, trainer, and verifier | Training decision sheet | As applicable | Yes | Direct | All enabled jurisdictions | OPEN | | | |
| LHR-013 | Electronic acknowledgement and retention | HR | Privacy, Legal | Approve validity and retention | Training decision sheet | Yes | Yes | Direct | Employment-law dependent | OPEN | | | |
| LHR-014 | Departure, role change, and recertification | HR | Security/Technical, Platform Owner | Approve revocation and recertification | Access and training controls | As applicable | Yes | Direct | All enabled jurisdictions | OPEN | | | |
| LHR-015 | Acknowledgement-record storage | HR | Privacy, Security | Approve storage, access, separation, and disposal | Training decision sheet | As applicable | Yes | Direct | Employment/privacy dependent | OPEN | | | |
| LHR-016 | Nigeria requirements and launch | Legal | Privacy, Platform Owner, Operations | Approve or reject Nigeria scope and conditions | Nigeria-specific legal analysis | Yes; qualified Nigeria counsel | Yes for Nigeria | Yes | Direct Nigeria impact | OPEN | | | |
| LHR-017 | Separation from future Fundraising | Legal | Platform Owner, Privacy | Confirm separate review and authorization requirements | Scope and product-boundary summary | Yes | Yes for fundraising | Yes | Nigeria Fundraising remains disabled | OPEN | | | |
| LHR-018 | Preview prerequisites and remaining governance | Security/Technical | Platform Owner, Operations | Record completed Preview prerequisites and verify remaining gates | Accepted Preview evidence and governance registers | No for technical evidence | Yes | Indirect | No jurisdiction approval | OPEN | Preview access and prerequisites complete; governance approval remains open. | | |

## 15. Consolidated DEL issue register

| Issue ID | Decision area | Primary reviewer | Supporting reviewers | Required decision | Required evidence | Counsel mandatory | Blocks Production | Training impact | Jurisdiction/Nigeria impact | Status | Decision/conditions | Owner | Due date |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| DEL-001 | Lawful basis | Privacy/Legal | Platform Owner | Approve basis for each disposition outcome | Data inventory and jurisdiction analysis | Yes | Yes | Yes | Jurisdiction-specific | OPEN | | | |
| DEL-002 | Identity verification | Privacy | Legal, Operations | Approve proportionate verification | Rights workflow | Yes | Yes | Yes | Jurisdiction-specific | OPEN | | | |
| DEL-003 | Response deadline | Legal | Privacy, Operations | Set applicable deadlines and triggers | Jurisdiction analysis | Yes | Yes | Yes | Jurisdiction-specific | OPEN | | | |
| DEL-004 | Deletion versus anonymization | Privacy/Legal | Technical, Platform Owner | Define when each outcome applies | Procedure and risk analysis | Yes | Yes | Yes | Jurisdiction-specific | OPEN | | | |
| DEL-005 | Follow-up-note treatment | Privacy | Legal, Technical | Approve deletion, anonymization, restriction, or retention | Data inventory and procedure | Yes | Yes | Yes | All jurisdictions | OPEN | | | |
| DEL-006 | Administrator attribution | Legal/HR | Privacy, Security | Define minimum retained attribution | Audit and personnel requirements | Yes | Yes | Yes | Employment/privacy dependent | OPEN | | | |
| DEL-007 | Minimum audit evidence | Privacy | Legal, Security | Approve retained evidence and period | Audit and incident summary | Yes | Yes | Yes | Jurisdiction-specific | OPEN | | | |
| DEL-008 | Legal holds | Legal | Privacy, Operations, Technical | Approve issuance, review, release, and scope | Hold and recovery process | Yes | Yes | Yes | Jurisdiction-specific | OPEN | | | |
| DEL-009 | Suppression fields and duration | Privacy | Legal, Operations, Security | Approve minimum record and controls | Suppression specification | Yes | Yes | Yes | Jurisdiction-specific | OPEN | | | |
| DEL-010 | Backup expiration | Privacy | Legal, Technical, Operations | Approve expiry and exception rules | Recovery summary | Yes | Yes | Yes | Jurisdiction-specific | OPEN | | | |
| DEL-011 | Restoration preservation | Security/Technical | Privacy, Operations | Approve technical safeguards and verification | Recovery and rehearsal evidence | No for feasibility; legal criteria still required | Yes | Yes | All jurisdictions | OPEN | | | |
| DEL-012 | Cross-border requirements | Legal | Privacy, Security | Approve transfer and restoration requirements | Processor and transfer inventory | Yes | Yes | Yes | Jurisdiction-specific | OPEN | | | |
| DEL-013 | Requester communication | Legal | Privacy, Operations | Approve wording, channel, timing, and exceptions | Rights workflow | Yes | Yes | Yes | Jurisdiction-specific | OPEN | | | |
| DEL-014 | Tooling before launch | Platform Owner | Legal, Privacy, Technical | Decide whether tested tooling is a launch prerequisite | Procedure and feasibility evidence | Yes for rights criteria | Yes | Yes | All jurisdictions | OPEN | | | |
| DEL-015 | Approved technical procedure version | Security/Technical | Platform Owner, Privacy | Approve controlled version and evidence requirements | Synthetic rehearsal plan | No for technical approval | Yes | Yes | All jurisdictions | OPEN | | | |
| DEL-016 | Required training | HR | Privacy, Legal, Platform Owner | Approve deletion-request and execution training | Training decision sheet | As applicable | Yes | Direct | All enabled jurisdictions | OPEN | | | |
| DEL-017 | Independent verification | Security/Technical | Platform Owner, Operations | Approve verifier independence and evidence | Procedure and role matrix | No for technical feasibility | Yes | Yes | All jurisdictions | OPEN | | | |
| DEL-018 | Incident notifications | Privacy/Legal | Security, Operations | Approve escalation and notification duties | Incident summary | Yes | Yes | Yes | Jurisdiction-specific | OPEN | | | |

Technical feasibility is not legal approval. All DEL issues remain open.

## 16. LHR and DEL dependency matrix

| Domain | LHR dependencies | DEL dependencies | Required coordinated outcome |
|---|---|---|---|
| Identity verification | LHR-005 | DEL-002 | Approved proportionate identity and authority standard |
| Rights handling | LHR-005 | DEL-001, DEL-003, DEL-013 | Approved rights, basis, deadlines, and response process |
| Retention | LHR-006 | DEL-004, DEL-005, DEL-007 | Approved categories, periods, triggers, and retained evidence |
| Suppression | LHR-007 | DEL-009 | Approved minimum record, purpose, access, and duration |
| Deletion or anonymization | LHR-008 | DEL-004, DEL-005, DEL-014, DEL-015, DEL-017 | Approved lawful outcome and independently verified procedure |
| Legal holds | LHR-009 | DEL-008 | Approved issue, review, release, and preservation rules |
| Backups and restoration | LHR-009 | DEL-010, DEL-011 | Approved expiry and restoration preservation controls |
| Cross-border transfers | LHR-010 | DEL-012 | Approved provider, transfer, and restoration requirements |
| Incident notification | LHR-011 | DEL-018 | Approved classification, escalation, notification, and evidence rules |
| Training | LHR-012, LHR-013, LHR-014, LHR-015 | DEL-006, DEL-016, DEL-017 | Approved population, acknowledgement, revocation, and verifier controls |
| Jurisdiction approval | LHR-001 through LHR-011, LHR-016 | DEL-001 through DEL-013, DEL-018 | Written jurisdiction-scoped approval with conditions and expiry |
| Nigeria launch conditions | LHR-016 | Applicable DEL issues | Qualified Nigeria counsel decision; technical availability is insufficient |
| Future fundraising | LHR-017 | Applicable future procedure decisions | Separate legal review and explicit authorization |

## 17. Role-specific reviewer questions

### Legal counsel

1. What lawful bases apply to collection, review, follow-up, suppression, retention, and audit evidence?
2. Is each follow-up operational, direct marketing, or context-dependent in each jurisdiction?
3. What notices, consent evidence, withdrawal, objection, rights, deadlines, exemptions, and holds apply?
4. Which retention and disposition outcomes are lawful?
5. What transfer, processor, incident, and notification duties apply?
6. What Nigeria-specific political, campaign, privacy, communications, and launch limits apply?
7. Must tested deletion or anonymization tooling exist before launch?
8. What conditions, jurisdiction limits, expiry, and re-review triggers apply?

### Privacy reviewer or DPO

1. Is every data category necessary and linked to a documented purpose?
2. Are public and collection-point notices complete?
3. What retention schedule and suppression record are acceptable?
4. How must rights, notes, attribution, logs, backups, and restored data be treated?
5. Are AI, Search, profiling, telemetry, and logging exclusions adequate?
6. What processor, transfer, breach, access, and minimization controls remain required?

### HR reviewer

1. Which roles require training, and who may train and verify them?
2. Is electronic acknowledgement valid and what evidence is required?
3. Where may training records be stored, who may access them, and for how long?
4. What departure, role-change, recertification, and corrective-action rules apply?
5. How must personnel and lead records remain separate?

### Security and Technical reviewer

1. Is authentication, authorization, attribution, least privilege, and Campaign Administrator exclusion adequately evidenced?
2. Are append-only history, logging, monitoring, redaction, and incident controls sufficient?
3. Can approved rights outcomes be executed and verified without weakening integrity controls?
4. How will backups and restoration preserve restriction, deletion, anonymization, and suppression decisions?
5. What sanitized technical evidence is necessary for informed review?

### Platform Owner

1. Which jurisdictions and uses should be proposed for launch?
2. Is tested disposition tooling a mandatory launch prerequisite?
3. Who owns each open issue and condition?
4. What gates precede selection of an exact Production release?
5. Who may authorize Production deployment and migration?
6. What business purpose justifies each retained category?
7. When must future Fundraising receive a separate review?

### Operations owner

1. What approved channel will receive privacy and rights requests?
2. Who owns lead review, retention review, holds, suppression, and responses?
3. What operational targets and escalation paths are supportable?
4. How will administrators maintain minimal notes and evidence?
5. How will training, access revocation, monitoring, incident, backup, and restoration controls be verified?
6. What staffing and independent verification are required for any authorized release window?

## 18. Unified decision and approval page

No field below is preselected or completed. Signing a section does not waive another required review or independently authorize Production.

### Legal counsel

Decision: ______________________________
Conditions: ____________________________
Approved jurisdictions: ________________
Excluded jurisdictions: ________________
Effective date: _________________________
Expiry/re-review date: _________________
Name: __________________________________
Role: __________________________________
Signature: ______________________________
Date: __________________________________

### Privacy reviewer or DPO

Decision: ______________________________
Conditions: ____________________________
Approved jurisdictions: ________________
Excluded jurisdictions: ________________
Effective date: _________________________
Expiry/re-review date: _________________
Name: __________________________________
Role: __________________________________
Signature: ______________________________
Date: __________________________________

### HR reviewer

Decision: ______________________________
Conditions: ____________________________
Approved jurisdictions: ________________
Excluded jurisdictions: ________________
Effective date: _________________________
Expiry/re-review date: _________________
Name: __________________________________
Role: __________________________________
Signature: ______________________________
Date: __________________________________

### Security and Technical reviewer

Decision: ______________________________
Conditions: ____________________________
Approved jurisdictions: ________________
Excluded jurisdictions: ________________
Effective date: _________________________
Expiry/re-review date: _________________
Name: __________________________________
Role: __________________________________
Signature: ______________________________
Date: __________________________________

### Operations owner

Decision: ______________________________
Conditions: ____________________________
Approved jurisdictions: ________________
Excluded jurisdictions: ________________
Effective date: _________________________
Expiry/re-review date: _________________
Name: __________________________________
Role: __________________________________
Signature: ______________________________
Date: __________________________________

### Platform Owner

Decision: ______________________________
Conditions: ____________________________
Approved jurisdictions: ________________
Excluded jurisdictions: ________________
Effective date: _________________________
Expiry/re-review date: _________________
Name: __________________________________
Role: __________________________________
Signature: ______________________________
Date: __________________________________

## 19. Final gate statement

| Gate | Current state |
|---|---|
| Preview acceptance | PASS |
| Legal approval | OPEN |
| Privacy approval | OPEN |
| HR approval | OPEN |
| Retention approval | OPEN |
| Suppression decision | OPEN |
| Deletion/anonymization approval | OPEN |
| Training completion | OPEN |
| Jurisdiction approval | NONE |
| Exact Production release commit approved | NO |
| Production deployment authorized | NO |
| Production migration authorized | NO |
| Production decision | NO-GO |
| Payments in V1.1 | NO |
| Nigeria Fundraising enabled | NO |

This draft does not provide legal advice or record any legal, privacy, HR, jurisdictional, operational, security, deployment, migration, payment, or fundraising approval.
