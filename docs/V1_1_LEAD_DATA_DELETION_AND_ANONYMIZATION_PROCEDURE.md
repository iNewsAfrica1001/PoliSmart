# PoliSmart Africa AI

## V1.1 Lead Data Deletion and Anonymization Procedure

**Draft — Not Authorized for Execution**

| Document control | Value |
|---|---|
| Document owner | Platform Owner |
| Technical custodian | Technical Administrator |
| Version | V1.1 Draft |
| Status | Draft — Not Approved for Execution |
| Effective date | Not effective |
| Preview rehearsal | Not performed |
| Production decision | NO-GO |

## Current status

- Procedure status: **Draft**
- Execution status: **NOT APPROVED**
- No deletion utility has been approved.
- No deletion has been performed.
- No anonymization has been performed.
- No Preview rehearsal has been performed.
- No Production action is authorized.
- Payments remain inactive.
- Nigeria Fundraising remains unavailable.
- Production remains **NO-GO**.

This governance procedure contains no executable deletion or anonymization instructions.

## 1. Purpose and limitations

This procedure governs verified and lawfully approved decisions to delete, irreversibly anonymize, restrict, or retain V1.1 lead-management information. It does not establish a legal right, legal deadline, or mandatory retention period; authorize ad hoc action; add an application delete control; authorize database manipulation; replace qualified review; or authorize Production.

No action may occur until the applicable legal and privacy decisions, case scope, technical procedure, environment, executor, verifier, recovery controls, and separate written execution authorization are complete.

## 2. Definitions

- **Deletion:** Approved removal of specified information from the affected active system, subject to lawful exceptions and approved backup treatment.
- **Irreversible anonymization:** Transformation preventing identification using means reasonably available to the organization and relevant recipients. Hashing alone is not anonymization.
- **Restriction:** Prevention of ordinary processing while information is lawfully retained.
- **Legal hold:** A documented suspension of ordinary deletion or anonymization for a dispute, investigation, legal duty, or preservation requirement.
- **Suppression record:** Minimum approved information needed to honor an objection, withdrawal, or do-not-contact requirement.
- **Lead record:** A `PrelaunchLead` Early Access or Demo request.
- **Follow-up history:** Append-only `PrelaunchLeadFollowUp` records linked to a lead.
- **Administrator attribution:** References to authenticated administrators who created or completed follow-ups.
- **Requester:** The verified individual or authorized representative making the request.
- **Technical Executor:** The minimum-privileged person separately authorized to execute the approved case procedure.
- **Independent Technical Verifier:** A person separate from execution who verifies scope and outcome.
- **Environment:** Preview or Production; these boundaries must never be inferred or crossed.

## 3. Request intake

Requests must arrive through a counsel-approved channel. Record only a unique case ID, received date/time and time zone, claimed jurisdiction, requested action, approved contact method, minimum locating information, case state, and assigned intake administrator. Do not reproduce full lead content, follow-up notes, credentials, identity documents, or unrelated personal data.

Request intake does not constitute identity verification.

**[LEGAL REVIEW REQUIRED]** Counsel must approve the intake channel, notice, lawful basis, record content, and response obligations.

## 4. Identity and authority verification

The Identity Verifier must apply an approved, proportionate standard; verify representatives' authority; avoid excessive identity documents; keep verification evidence separate from lead notes; restrict access; and stop or escalate when identity is uncertain.

Identity verification does not constitute legal approval.

**[LEGAL REVIEW REQUIRED]** Counsel must approve the standard, representative handling, exceptions, and applicable response periods.

## 5. Scope identification

Identify the potentially affected lead, all follow-up history, submitted note, contact information, administrator attribution, audit records, email-notification metadata, application and security logs, analytics and telemetry, backups and recovery branches, suppression records, and the exact environment. Related records must be identified without crossing tenant or environment boundaries. Evidence must use safe identifiers rather than personal content.

## 6. Decision framework

**[LEGAL REVIEW REQUIRED]**

| Decision | When it may apply | Required approval | Effect |
|---|---|---|---|
| Delete | Information must be removed and no lawful exception requires retention. | Privacy/Legal Reviewer and Platform Owner | Approved records are removed under a separately tested procedure and approved backup treatment. |
| Irreversibly anonymize | Operational value may lawfully remain without identifiable information. | Privacy/Legal Reviewer and Platform Owner | Direct, indirect, and linkable identifiers receive the approved irreversible treatment. |
| Restrict processing | Retention is permitted or required but ordinary use must stop. | Privacy/Legal Reviewer | Access and processing are limited to the approved purposes. |
| Retain under legal hold | A lawful preservation duty overrides ordinary action. | Qualified Legal Counsel | Defined records are preserved under restricted access until formal release. |
| Retain minimal suppression record | Minimum information is required to honor an objection or withdrawal. | Privacy/Legal Reviewer | Only approved fields remain for the approved purpose and period. |
| Reject or partially fulfill with documented lawful reason | The request is invalid, unverifiable, limited by an exception, or only partly applicable. | Qualified Legal Counsel or authorized Privacy Reviewer | The lawful portion is fulfilled and any permitted refusal is documented. |

Legal approval does not constitute technical authorization. Blank fields, silence, expired review, or verbal approval do not authorize action.

## 7. Irreversible anonymization standard

The approved design must identify direct and indirect identifiers; address free-text lead and follow-up notes; address combinations enabling re-identification; define ID, timestamp, contact, organization, attribution, audit, backup, and restoration treatment; undergo independent synthetic Preview testing; document residual risk; and demonstrate that retained information cannot reasonably be linked to the requester.

Pseudonymization or hashing alone must not be described as irreversible anonymization.

**[LEGAL REVIEW REQUIRED]** Counsel and the Privacy Reviewer must approve the standard and residual risk.

## 8. Suppression requirements

A minimal suppression record may exist only under an approved decision. Define the minimum fields, lawful purpose and basis, period, authorized users, matching method, prohibited secondary uses, restoration handling, and review or deletion trigger. It must not contain follow-up-note content or become a marketing profile.

**[LEGAL REVIEW REQUIRED]**

## 9. Separation of duties

No person may control intake, approval, execution, and verification alone.

| Role | Reviews | May approve | May execute | Must not do |
|---|---|---|---|---|
| Request Intake Administrator | Intake completeness and routing | No | No | Verify identity solely from intake, decide rights, or copy unnecessary data |
| Identity Verifier | Identity and representative authority | Verification outcome only | No | Approve the legal outcome or execute the technical action |
| Privacy/Legal Reviewer | Lawful basis, rights, holds, retention, suppression, and communication | Legal/privacy outcome within documented authority | No | Execute the technical action or approve outside covered jurisdictions |
| Platform Owner | Business scope, readiness, and mandatory gates | Case business authorization after specialist approvals | No, unless separately authorized under an approved emergency procedure | Waive mandatory legal, privacy, security, or technical gates |
| Technical Executor | Technical scope, dependencies, and recovery controls | No legal outcome | Yes, using minimum privilege and case-specific authorization | Independently verify their own execution or broaden scope |
| Independent Technical Verifier | Technical plan, evidence, scope, and outcome | Verification result only | No | Execute the action being verified or provide legal approval |
| Super Administrator | Operational context available through authorized application access | No | No | Approve or execute deletion/anonymization, use direct database access, or alter attribution |
| Campaign Administrator | No lead-management review | No | No | Access lead management or participate in privileged execution |

Technical execution does not constitute independent verification. Signatures on this governance draft do not replace separate case-specific execution authorization.

**[LEGAL/HR REVIEW REQUIRED]** Administrator attribution, personnel records, training records, and staff responsibilities require Legal/HR review.

## 10. Technical preparation

Before rehearsal or execution, confirm the approved procedure version; exact environment and database identity; safe affected-record identifiers; written decision and scope; approvals and holds; linked records and restrictive foreign keys; backup implications and approved recovery checkpoint; safe pre-operation counts or fingerprints; minimum temporary privilege; independent verifier availability; sanitized evidence rules; and immediate stop conditions.

There is no ordinary application delete control. Super Administrators cannot directly execute this procedure.

## 11. Preview rehearsal

A version-controlled technical procedure must first be reviewed and rehearsed in isolated Preview with clearly synthetic records. The rehearsal must prove Production exclusion, target identity, linked-record integrity, restrictive foreign-key preservation, bounded scope, count/fingerprint reconciliation, authorization and application health, AI and Workspace Search boundaries, controlled recovery behavior, and absence of real data.

A Preview rehearsal does not authorize Production. No Preview rehearsal has yet been performed.

## 12. Production execution controls

A future controlled Production procedure must require the exact approved version; exact Production project, branch, endpoint, database, and role identity; conclusive Preview exclusion; approved recovery checkpoint and maintenance window; required approvers; minimum-privileged temporary executor credential; pre-operation counts or safe fingerprints; strict approved-record scope; immediate stop on mismatch; and credential clearing afterward.

Production must not be used for testing. This section describes controls only and contains no executable instructions.

## 13. Linked-record handling

The case-specific design must address `PrelaunchLead`, `PrelaunchLeadFollowUp`, administrator attribution, audit records, application and security logs, analytics and telemetry, backups and recovery branches, and suppression records.

Restrictive foreign keys must not be disabled, bypassed, deferred unsafely, or weakened. The correct operation order requires a separately designed, version-controlled, tested, and approved technical procedure. `AuthUser` records must not be deleted or anonymized merely to remove lead attribution.

**[LEGAL/HR REVIEW REQUIRED]**

## 14. Post-action verification

The Independent Technical Verifier must confirm that only approved records were affected; no unrelated lead, tenant, or campaign data changed; follow-up history and administrator attribution received the approved treatment; counts or fingerprints reconcile; application health, authentication, and authorization remain operational; AI and Workspace Search boundaries remain intact; evidence is sanitized; and the result matches written authorization.

## 15. Requester communication

**[LEGAL REVIEW REQUIRED]**

Counsel-approved communication must address receipt, identity-verification outcome, decision, completed/restricted/partial/refused result, disclosable retained exceptions, contact or appeal method, date, and case reference. Do not promise a deadline until counsel confirms the applicable requirement.

## 16. Evidence and audit record

Retain only the request reference, verified scope, decision, legal/privacy approver, Platform Owner approval, Technical Executor, Independent Technical Verifier, procedure version, environment, safe counts or fingerprints, checkpoint reference, start/completion times, verification outcome, exceptions, and requester-notification reference.

Do not store passwords, connection strings, tokens, session cookies, identity-document copies, full lead content, follow-up-note text, or unredacted logs.

## 17. Backup restoration safeguards

**[LEGAL REVIEW REQUIRED]**

Require approved backup-expiration treatment; documentation and restricted access for affected backups; prevention of silent reintroduction; a restoration checklist preserving or reapplying the deletion, anonymization, restriction, or suppression decision; post-restoration verification; and counsel approval of backup retention and exceptions. Recovery checkpoints must not become indefinite ungoverned copies.

## 18. Incident and failure handling

On failure or an unexpected result: stop immediately; freeze further affected processing where authorized; do not retry blindly or improvise recovery; preserve sanitized evidence; notify the Platform Owner, Independent Technical Verifier, and Privacy/Legal Reviewer; assess personal or unrelated data impact; activate incident response where required; use a checkpoint only under separate authorization; independently verify recovery; and record corrective action and re-review.

## 19. Prohibited actions

- Ad hoc SQL or destructive database commands.
- Disabling, bypassing, or weakening restrictive foreign keys.
- Editing Prisma migration history.
- Using `prisma db push` or `prisma migrate reset`.
- Deleting an administrator account merely to remove attribution.
- Using Production as a test environment.
- Reusing Preview credentials in Production.
- Using the runtime role for privileged deletion.
- Broad table deletion or unreviewed bulk anonymization.
- Manual editing that breaks linked-record integrity.
- Copying personal data into tickets or evidence.
- Treating hashing alone as anonymization.
- Deleting records under legal hold.
- Acting without written approval.
- Allowing one person to control intake, approval, execution, and verification.

## 20. Approval checklist

Default decision: **NOT APPROVED FOR EXECUTION**

- [ ] Request received through an approved channel
- [ ] Identity verified
- [ ] Authority verified
- [ ] Record scope confirmed
- [ ] Jurisdiction identified
- [ ] Legal basis reviewed
- [ ] Legal holds checked
- [ ] Suppression requirement decided
- [ ] Deletion versus anonymization decision approved
- [ ] Linked records identified
- [ ] Backup treatment approved
- [ ] Preview rehearsal passed
- [ ] Exact technical procedure reviewed
- [ ] Production recovery checkpoint confirmed
- [ ] Production identity verified
- [ ] Executor and independent verifier assigned
- [ ] Requester communication approved
- [ ] Final written execution authorization received

## 21. Execution control

| Stage | Responsible role | Required input | Required evidence | Stop condition |
|---|---|---|---|---|
| Intake | Request Intake Administrator | Approved-channel request | Case reference and receipt time | Unapproved channel or excessive data |
| Identity verification | Identity Verifier | Minimum verification information | Verification outcome | Identity or authority uncertain |
| Scope determination | Privacy/Legal Reviewer and Technical Administrator | Verified request and safe identifiers | Linked-record scope | Environment, tenant, or record ambiguity |
| Legal/privacy decision | Privacy/Legal Reviewer | Scope and jurisdiction | Written decision and conditions | Missing authority, open hold, or unresolved basis |
| Technical design | Technical Administrator | Approved decision | Version-controlled reviewed design | Unbounded scope or integrity risk |
| Preview rehearsal | Technical Executor and Independent Technical Verifier | Approved synthetic fixture | Rehearsal and recovery evidence | Real data, Production contact, or mismatch |
| Production preflight | Platform Owner, Technical Executor, and verifier | Approved version and window | Identity, checkpoint, counts, and approvals | Any identity or gate mismatch |
| Execution | Technical Executor | Separate case-specific authorization | Sanitized timing and scope evidence | Unexpected result or broader effect |
| Independent verification | Independent Technical Verifier | Pre/post evidence | Reconciliation and health results | Any unexplained difference |
| Requester communication | Authorized coordinator | Counsel-approved wording | Notification reference | Unapproved statement or deadline |
| Closure | Platform Owner and Privacy/Legal Reviewer | Complete evidence set | Closure decision | Open condition or missing evidence |
| Backup/restoration follow-through | Technical custodian and Privacy/Legal Reviewer | Approved backup decision | Restoration safeguards and review record | Risk of silent data reintroduction |

## 22. Decision record

Approval fields remain blank until authorized reviewers complete them.

| Decision item | Approved value | Approver | Date/time | Evidence reference |
|---|---|---|---|---|
| Applicable jurisdiction | | | | |
| Lawful basis | | | | |
| Identity standard | | | | |
| Approved action | | | | |
| Legal-hold outcome | | | | |
| Suppression treatment | | | | |
| Follow-up-history treatment | | | | |
| Administrator-attribution treatment | | | | |
| Backup treatment | | | | |
| Requester communication | | | | |
| Procedure version | | | | |
| Execution authorization | | | | |

## 23. Affected-record verification

Do not include personal data.

| Record category | Expected records | Approved action | Actual records | Verification result |
|---|---|---|---|---|
| Lead record | | | | |
| Follow-up history | | | | |
| Administrator attribution | | | | |
| Audit records | | | | |
| Application/security logs | | | | |
| Analytics/telemetry | | | | |
| Backups/recovery branches | | | | |
| Suppression record | | | | |

## 24. Open questions

Every issue initially remains `OPEN`.

| Issue ID | Question | Owner | Status | Decision/evidence reference |
|---|---|---|---|---|
| DEL-001 | What lawful basis applies? | Privacy/Legal Reviewer | OPEN | |
| DEL-002 | What identity-verification standard applies? | Privacy/Legal Reviewer | OPEN | |
| DEL-003 | What response deadline applies? | Qualified Legal Counsel | OPEN | |
| DEL-004 | When is deletion required versus anonymization? | Privacy/Legal Reviewer | OPEN | |
| DEL-005 | How must follow-up notes be treated? | Privacy/Legal Reviewer | OPEN | |
| DEL-006 | What administrator attribution must remain? | Legal/HR Reviewer | OPEN | |
| DEL-007 | What minimum audit evidence may remain? | Privacy/Legal Reviewer | OPEN | |
| DEL-008 | What is the legal-hold procedure? | Qualified Legal Counsel | OPEN | |
| DEL-009 | What suppression fields and duration are approved? | Privacy/Legal Reviewer | OPEN | |
| DEL-010 | What backup-expiration rule applies? | Privacy/Legal Reviewer | OPEN | |
| DEL-011 | How must restoration preserve the decision? | Independent Technical Verifier | OPEN | |
| DEL-012 | What cross-border requirements apply? | Qualified Legal Counsel | OPEN | |
| DEL-013 | What requester communication is required? | Qualified Legal Counsel | OPEN | |
| DEL-014 | Must tooling exist before Production launch? | Platform Owner and Privacy/Legal Reviewer | OPEN | |
| DEL-015 | What technical procedure version is approved? | Independent Technical Verifier | OPEN | |
| DEL-016 | What training is required? | HR Reviewer | OPEN | |
| DEL-017 | What independent verification is required? | Independent Technical Verifier | OPEN | |
| DEL-018 | What incident notifications apply? | Privacy/Legal Reviewer | OPEN | |

An issue remains open until a named reviewer records a written decision and evidence reference. Blank fields and verbal approval are insufficient.

## 25. Final verification and sign-off

No decision is prefilled. Each sign-off must record every field below.

### Privacy/Legal Reviewer

Name: ____________________  
Role: ____________________  
Decision: ____________________  
Conditions: ____________________  
Procedure version: ____________________  
Environment: ____________________  
Date/time and time zone: ____________________  
Signature: ____________________  
Evidence reference: ____________________  

### Platform Owner

Name: ____________________  
Role: ____________________  
Decision: ____________________  
Conditions: ____________________  
Procedure version: ____________________  
Environment: ____________________  
Date/time and time zone: ____________________  
Signature: ____________________  
Evidence reference: ____________________  

### Technical Executor

Name: ____________________  
Role: ____________________  
Decision: ____________________  
Conditions: ____________________  
Procedure version: ____________________  
Environment: ____________________  
Date/time and time zone: ____________________  
Signature: ____________________  
Evidence reference: ____________________  

### Independent Technical Verifier

Name: ____________________  
Role: ____________________  
Decision: ____________________  
Conditions: ____________________  
Procedure version: ____________________  
Environment: ____________________  
Date/time and time zone: ____________________  
Signature: ____________________  
Evidence reference: ____________________  

Signatures on this draft do not authorize execution unless every mandatory approval is complete and a separate case-specific execution authorization is issued.

## 26. Legal and HR review markers

The lawful basis, identity verification, response deadlines, legal holds and exemptions, retention, suppression, backup treatment, cross-border requirements, and requester communication remain **[LEGAL REVIEW REQUIRED]**.

Administrator attribution, personnel records, and administrator-training records remain **[LEGAL/HR REVIEW REQUIRED]**.

## 27. Final procedure state

- Procedure status: **Draft**
- Execution status: **NOT APPROVED**
- Default decision: **NOT APPROVED FOR EXECUTION**
- Deletion performed: **NO**
- Anonymization performed: **NO**
- Preview rehearsal performed: **NO**
- Production action authorized: **NO**
- Production decision: **NO-GO**
- Payments enabled: **NO**
- Nigeria Fundraising enabled: **NO**
