# PoliSmart Africa AI

## Lead Follow-Up Operations and Data-Retention Policy

### V1.1 Draft for Legal and Operational Review

| Document control | Value |
|---|---|
| Document owner | Platform Owner |
| Technical custodian | Technical Administrator |
| Version | V1.1 Draft |
| Approval status | Pending legal and operational approval |
| Effective date | Not yet effective |
| Next review date | To be established upon approval |

> [LEGAL REVIEW REQUIRED] This policy contains proposed operational standards and retention periods. Nothing in this draft represents legal advice, a legally mandated retention schedule, regulatory approval, or authorization to launch in a particular jurisdiction.

## 1. Purpose and scope

This policy governs Early Access and Demo request records in PoliSmart Africa AI. It covers administrative review, human-led status management, scheduling and recording follow-up activity, append-only follow-up history, retention, anonymization, lawful deletion, privacy, security, authorization, and accountability.

This limited internal workflow is not a customer relationship management platform, political campaigning system, fundraising system, payment service, automated marketing platform, or automated decision system. V1.1 does not process payments or collect card, bank, mobile-money, or payment-provider credentials. It must not be used for automated political campaigning, voter profiling, personalized political targeting, donor scoring, or autonomous outreach.

Country-by-country controlled enablement remains required. Nothing in this policy enables Fundraising in Nigeria. Nigeria Fundraising remains unavailable pending qualified legal review and separate explicit authorization.

## 2. Authorized access

Access requires an authenticated session and the existing `platform-audit:read` permission. Under the current authorization policy, that permission is restricted to Super Administrators. Campaign Administrators remain prohibited from listing, retrieving, updating, or managing pre-launch leads or follow-ups and must not acquire Super Administrator capabilities through this workflow.

Each authorized action must be attributable to the individual authenticated administrator who performed it. Creator and completer identities must be derived from the authenticated server-side session and never accepted from a client request.

Administrators must use only their individually assigned accounts, protect authentication credentials, sign out of unattended or shared devices, report suspected unauthorized access promptly, and access lead information only for an approved operational purpose. Shared accounts and credential sharing are prohibited.

## 3. Lead-status workflow

Lead status and follow-up completion are separate. Completing a follow-up must not automatically change lead status, and changing lead status must not mark a follow-up completed.

### NEW

Use `NEW` when a valid Early Access or Demo request has been received but has not received substantive human review or response. It may move to `CONTACTED` after documented outreach, `QUALIFIED` after human review, or `CLOSED` when the request is invalid, withdrawn, duplicated, resolved, unsuitable, or otherwise concluded.

### CONTACTED

Use `CONTACTED` after an authorized administrator has made a genuine outreach attempt through an independently approved communication method. It must not imply that the requester responded. It may move to `QUALIFIED`, `CLOSED`, or back to `NEW` only to correct a documented operational mistake.

### QUALIFIED

Use `QUALIFIED` only after human review determines that the request is appropriate for further Early Access or Demo consideration under approved criteria. Qualification must not use sensitive traits, political opinions, discriminatory criteria, inferred behavior, automated scoring, donor value, or AI-generated profiling. It does not promise access, approval, contractual acceptance, or service availability.

### CLOSED

Use `CLOSED` when active review and follow-up have ended, including withdrawal, duplication, invalidity, prolonged non-response, failure to meet approved criteria, completion, or another documented reason. Closing a lead does not permanently delete it; retention, anonymization, and deletion follow Section 8.

## 4. Follow-up standards

### Initial response target

The proposed operational target is to review new requests within two business days.

> [LEGAL REVIEW REQUIRED] This is an operational objective, not a contractual guarantee. Counsel and the Platform Owner must confirm whether jurisdiction-specific notices or response obligations apply.

### Timing conventions

Database timestamps are stored in UTC. The administrator interface may display localized time. Business-day calculations depend on the approved operating calendar and applicable jurisdiction. All follow-up deadlines are operational targets, not contractual guarantees.

### Follow-up intervals

Follow-ups should be scheduled only when reasonably necessary. A typical interval is five to ten business days, adjusted to the requester's expressed timing and prior communication. Administrators should ordinarily stop after three unanswered attempts or 30 days unless the requester asked for later contact or a documented operational reason supports continuation.

> [LEGAL REVIEW REQUIRED] Contact frequency, direct-marketing rules, consent, suppression obligations, and electronic-communications laws require assessment for each supported jurisdiction.

### Ownership and completion

Every follow-up must identify its responsible administrator through the authenticated session. Responsibility changes must be documented through a new entry or approved procedure, never by rewriting history.

An administrator may mark a follow-up completed only after the documented action occurred. Completion records a server-generated timestamp and authenticated completer while preserving the original note, schedule, creator, and creation time. Completion must not change lead status automatically.

### Append-only history

Follow-up history is append-only. The application provides no editing or permanent-delete control. Corrections must be new, factual entries. Permanent deletion or anonymization may occur only through Section 8's separately approved procedure.

## 5. Note-writing rules

Notes must be brief, factual, professional, relevant, and necessary. They may record an outreach attempt, approved channel, response state, requested next step, scheduled purpose, or factual correction.

Notes must not contain passwords, authentication codes, tokens, credentials, payment or financial-account information, identity documents, government identifiers, medical information, political opinions, sensitive traits, unrelated personal details, discriminatory labels, speculative profiling, donor scores, propensity scores, personalized political-targeting instructions, or AI-generated legal or compliance conclusions.

Administrators must not paste email threads, documents, or unnecessary contact information into notes. An incorrect note must be addressed through a new corrective entry and escalated when it creates privacy or security risk; history must not be overwritten.

## 6. Privacy and AI boundaries

Lead contact information and follow-up notes must remain excluded from:

- AI Assistant prompts, grounding, and approved-document retrieval.
- Model training or automatic model retraining.
- Workspace Search and public search.
- Behavioral profiling and automated scoring.
- Analytics and telemetry content.
- URLs and query strings.
- Browser `localStorage` and `sessionStorage`.
- Client diagnostic reports and unredacted logs.

Lead and follow-up content must not be transmitted by email unless a separately reviewed and approved communication workflow is introduced. The current transactional email system must not send follow-up-note content or automated lead outreach.

Safe aggregate operational metrics may include counts, event types, timestamps, response status, and opaque request identifiers, but not contact details or note text.

## 7. Proposed retention framework

Every period below is a privacy-minimizing proposal and not a statement of law.

### Duplicate or invalid submissions

Proposed retention: 30 days after classification, then deletion or anonymization through the approved procedure unless fraud, abuse, suppression, or security evidence requires retention.

**Pending confirmation by qualified legal counsel.**  
**[LEGAL REVIEW REQUIRED]**

### Unresponsive leads

Proposed retention: 90 days after the last documented outreach attempt, with a maximum routine active-review period of 180 days from submission unless the requester asked for later contact. Then close and delete or anonymize unless a documented lawful reason requires retention.

**Pending confirmation by qualified legal counsel.**  
**[LEGAL REVIEW REQUIRED]**

### Closed and unqualified leads

Proposed retention: 90 days after closure, then deletion or anonymization unless a legal hold, dispute, suppression, or security requirement justifies continued retention.

**Pending confirmation by qualified legal counsel.**  
**[LEGAL REVIEW REQUIRED]**

### Qualified leads

Proposed retention: 12 months after the last meaningful interaction, followed by documented review. Continued retention requires a current operational purpose and lawful basis; qualification alone never justifies indefinite retention.

**Pending confirmation by qualified legal counsel.**  
**[LEGAL REVIEW REQUIRED]**

### Follow-up history

Proposed retention: retain with the associated lead during active administration and for up to 12 months after closure, unless a shorter lead-category period applies or lawful deletion requires earlier action. Where a lead is lawfully anonymized, follow-up history should also be deleted or irreversibly anonymized unless specific audit evidence must remain.

**Pending confirmation by qualified legal counsel.**  
**[LEGAL REVIEW REQUIRED]**

### Security and audit records

Proposed retention: 12 months from creation, with longer retention only for a documented security investigation, legal hold, dispute, or regulatory obligation. Prefer opaque identifiers and event metadata over lead content. Never copy note text or contact details into security logs.

**Pending confirmation by qualified legal counsel.**  
**[LEGAL REVIEW REQUIRED]**

### Retention precedence

When an approved lead-category period and follow-up-history period differ, the shorter approved privacy-minimizing period ordinarily governs deletion or anonymization. A longer period requires a documented lawful purpose, legal hold, dispute, security need, or approved suppression requirement. No record may be retained indefinitely merely because follow-up history exists.

**Pending confirmation by qualified legal counsel.**  
**[LEGAL REVIEW REQUIRED]**

### Minimal suppression records

If a minimal suppression record must be retained to honor an opt-out or prevent renewed contact, it must contain only the minimum necessary information and remain separate from active lead-management records where practical. It must not contain follow-up-note content or be used for marketing, profiling, AI grounding, model training, or Workspace Search.

Its lawful basis and retention period require counsel approval.

**Pending confirmation by qualified legal counsel.**  
**[LEGAL REVIEW REQUIRED]**

Retention must not be indefinite by default. At least monthly, the responsible reviewer must identify records reaching an approved threshold. Automatic deletion must not begin until counsel approves the schedule, backup effects are understood, and procedures are tested in isolation.

## 8. Lawful deletion and anonymization

The intentional absence of a permanent-delete application control prevents casual removal of append-only history but does not override valid data-subject rights or lawful deletion requirements. A verified request requires a separately approved administrative procedure that:

1. Records the request without unnecessary personal information.
2. Verifies identity proportionately and confirms authority and scope.
3. Identifies the correct environment, lead, follow-up history, logs, and backups.
4. Evaluates lawful basis, retention duties, disputes, security evidence, legal holds, and suppression needs.
5. Obtains documented Platform Owner and Privacy/Legal Reviewer approval.
6. Determines whether deletion, irreversible anonymization, restriction, or justified retention applies.
7. Tests the operation in an isolated non-Production environment when necessary.
8. Uses the minimum privileged technical procedure.
9. Creates an audit record of authorization, scope, operator, time, result, and retained exceptions without reproducing deleted content.
10. Verifies that unrelated records and tenant boundaries were unaffected.
11. Handles backups through the approved expiry or restoration-control process.
12. Notifies the requester where required and appropriate.

Ad hoc SQL deletion, table truncation, selective concealment of history, and improvised database changes are prohibited.

> [LEGAL REVIEW REQUIRED] Counsel must confirm data-subject rights, verification standards, response periods, legal bases, exemptions, suppression needs, backup treatment, cross-border obligations, and audit-evidence requirements for each supported jurisdiction.

## 9. Security controls

Required safeguards include authenticated sessions, server-side `platform-audit:read` enforcement, Campaign Administrator denial, least-privilege database access, separate runtime and migration roles, Preview/Production separation, session-derived identities, server-generated timestamps, exact-field validation, bounded notes, valid future schedules, paired completion fields, column-limited runtime updates, no runtime `DELETE`, no unrestricted table update, `ON DELETE RESTRICT` attribution, no public follow-up endpoints, and safe errors without SQL, Prisma internals, stack traces, credentials, or personal data.

Suspected unauthorized access, disclosure, credential exposure, improper note content, cross-environment access, altered history, or unexpected deletion must enter the security-incident process. Administrators must stop unnecessary processing, preserve only necessary evidence, notify the Technical Administrator and Platform Owner, and avoid copying sensitive content into incident records.

## 10. Quality assurance

Required assurance includes monthly Super Administrator access review, immediate review after personnel changes, monthly retention review, quarterly schedule and deletion-procedure review, proportionate human sampling of notes, initial and annual administrator training, refresher training after material changes, documented corrective action, escalation of privacy/security/legal concerns, safe aggregate metrics, and periodic verification of AI and Workspace Search exclusions.

AI must not review, score, classify, or draw conclusions from follow-up notes.

## 11. Production-release requirements

Production authorization requires completed Preview functional and security acceptance; qualified legal review; approved retention periods; a documented deletion/anonymization procedure; administrator training; verified authentication, permission enforcement, Campaign Administrator denial, session attribution, database privileges, AI/Search exclusions, logging privacy, backup and rollback readiness, incident readiness, country-by-country enablement review, and explicit Production deployment and migration authorization.

Approval of lead follow-up must not be interpreted as approval of Fundraising or payment processing. Nigeria Fundraising remains unavailable pending separate qualified legal review.

## 12. Responsibility matrix

| Role | Permitted responsibilities | Prohibited responsibilities |
|---|---|---|
| Platform Owner | Approve policy and Production release; appoint reviewers; authorize exceptional retention or deletion procedures; ensure training and oversight | Bypass legal review, tenant controls, authentication, or change management |
| Super Administrator | Use authorized lead review; apply human-led statuses; schedule and complete follow-ups; write compliant notes; escalate concerns | Share credentials; edit or delete history; enter sensitive data; use automated scoring; grant unauthorized access; perform ad hoc database operations |
| Privacy/Legal Reviewer | Review lawful basis, notices, retention, deletion, rights, jurisdictional duties, legal holds, and policy language | Claim unverified technical controls or unsupported jurisdictional approval |
| Technical Administrator | Maintain authorization, isolation, least privilege, logging, backups, migration safety, and incidents; execute separately approved procedures | Access lead content without need; perform ad hoc deletion; improperly promote users; expose credentials; bypass approval |
| Campaign Administrator | Use separately authorized campaign functions; report suspected access or privacy issues | Access lead records, notes, lead APIs, Super Administrator controls, or Production administration |
| All roles | Protect credentials, minimize data, report incidents, and follow approved procedures | Use lead data for political profiling, sensitive-trait inference, donor scoring, personalized targeting, AI grounding, model training, or unauthorized outreach |

## 13. Operational checklist

### Daily lead review

- Review new valid leads and upcoming or overdue follow-ups.
- Confirm accurate human-assigned status.
- Avoid opening details without operational need.
- Escalate duplicate, malicious, or privacy-sensitive submissions.

### New-lead triage

- Confirm Early Access or Demo purpose and check obvious duplicates.
- Apply only approved operational criteria.
- Do not score, profile, or infer sensitive traits.
- Assign `NEW`, `CONTACTED`, `QUALIFIED`, or `CLOSED` accurately.

### Follow-up scheduling

- Confirm contact is necessary and authorized.
- Choose a reasonable interval and brief factual note.
- Verify date, time, and session-derived administrator identity.
- Do not repeat contact information in the note.

### Follow-up completion

- Complete only after the action occurs.
- Verify completion attribution and time.
- Do not change status merely because follow-up completed.
- Do not edit or delete history; add factual corrections separately.

### Status review

- Review statuses for accuracy and close inactive leads.
- Do not retain inactive records indefinitely.
- Document reasons without unnecessary personal detail.

### Privacy escalation

- Stop unnecessary processing and avoid repeating sensitive content.
- Notify the Privacy/Legal Reviewer and Platform Owner.
- Preserve only necessary evidence and follow the approved process.

### Security-incident escalation

- Report unauthorized access, credential exposure, altered history, cross-environment access, or disclosure immediately.
- Freeze unrelated changes when appropriate.
- Preserve safe identifiers, timestamps, deployment metadata, and audit evidence—never credentials, tokens, contact details, or note content.

### Monthly retention review

- Identify records reaching approved thresholds.
- Check holds, disputes, suppression needs, and investigations.
- Obtain approval before deletion or anonymization.
- Record the review and outcome without ad hoc SQL.
- Confirm backup and audit-evidence handling.

## 14. Legal-review register

Qualified legal confirmation is required for lawful bases; direct-marketing rules; consent and withdrawal; country notices; data-subject rights; identity verification; cross-border transfers; processor arrangements; retention periods; legal holds; security/audit retention; backup treatment; launch jurisdictions; administrator monitoring; suppression evidence; escalation procedures; and Nigeria Fundraising restrictions or future country enablement.

**[LEGAL REVIEW REQUIRED]**
