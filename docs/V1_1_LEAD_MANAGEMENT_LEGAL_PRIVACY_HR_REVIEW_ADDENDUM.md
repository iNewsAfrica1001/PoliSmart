# PoliSmart Africa AI

## V1.1 Lead Management Legal, Privacy, and HR Review Addendum

**Draft — Questions for Qualified Counsel and HR/Privacy Review**

| Document control | Value |
|---|---|
| Document owner | Platform Owner |
| Technical custodian | Technical Administrator |
| Version | V1.1 Draft |
| Status | Draft — Review Not Yet Completed |
| Effective date | Not effective |
| Production decision | NO-GO |
| Intended reviewers | Qualified Legal Counsel, Privacy Reviewer, HR Reviewer, Platform Owner, and Technical Verifier |

This addendum is a concise decision package. It does not provide legal advice, establish legally required retention periods, approve any jurisdiction, confirm completed training, or authorize Production. The latest candidate commit is not deployed, Vercel access remains unresolved, and Preview acceptance remains blocked.

## 1. Executive summary

PoliSmart Africa AI V1.1 provides internal administration of public Early Access and Demo requests. Access is restricted to authenticated Super Administrators with the existing audit-read capability; Campaign Administrators are prohibited. Lead status decisions are human-led, and follow-up history is append-only through the application.

The workflow has no payment processing, automated outreach, bulk email, automated qualification, profiling, scoring, donor scoring, or personalized political targeting. Lead data and follow-up notes are excluded from AI grounding, model training, and Workspace Search. Nigeria Fundraising remains unavailable and requires separate legal review and explicit country authorization. Production is not authorized.

## 2. System behavior summary

### Data collected

Early Access and Demo requests may contain a name, work email, organization, country, role or job title, request type, primary interest or organization type, preferred Demo timing, an optional note, controlled status, and creation/update timestamps. The forms are not intended to collect payment credentials, authentication secrets, government identifiers, sensitive traits, or unnecessary personal data.

### Follow-up records and status workflow

A follow-up contains a bounded operational note, scheduled date/time, session-derived creator, immutable creation timestamp, optional completion timestamp, and session-derived completer. The controlled statuses are `NEW`, `CONTACTED`, `QUALIFIED`, and `CLOSED`. Only forward transitions are permitted; reopening `CLOSED` and backward transitions are prohibited. Qualification is a human administrative decision and does not promise access or service.

### Attribution, privacy, and technical boundaries

Administrator attribution and completion metadata are derived server-side. Runtime database access is narrowly limited to `SELECT`, `INSERT`, and column-level completion updates for follow-ups; no `DELETE` or unrestricted table update is granted. Contact details and notes remain excluded from AI, model training, Workspace Search, profiling, scoring, political targeting, URLs, browser storage, analytics content, and unredacted logs.

### Deletion boundary

There is no ordinary application delete control for lead or follow-up history. This does not override lawful rights or obligations. Deletion or anonymization requires a separately approved procedure covering authorization, identity verification, linked history, audit evidence, legal holds, backups, suppression records, and requester notification.

## 3. Retention proposals requiring decisions

Every period below is a proposal, not a statement of legal requirement or approval. **[LEGAL REVIEW REQUIRED]**

| Record category | Proposed period | Proposed trigger | Counsel decision | Approved period | Conditions/notes |
|---|---|---|---|---|---|
| Duplicate or invalid submissions | 30 days | Classification as duplicate or invalid | Pending | | Confirm earlier-deletion and abuse-evidence requirements. |
| Unresponsive leads | 90 days | Last outreach | Pending | | Routine active review ordinarily capped at 180 days from submission. |
| Closed or unqualified leads | 90 days | Closure | Pending | | Confirm dispute, objection, and legal-hold treatment. |
| Qualified leads | 12 months | Last meaningful interaction | Pending | | Require documented review before further retention. |
| Follow-up history | Retained with its lead and ordinarily governed by the shorter approved period | Applicable lead-retention trigger | Pending | | Decide whether notes require earlier anonymization. |
| Security and audit records | 12 months | Record creation | Pending | | Confirm incident, dispute, and preservation exceptions. |
| Minimal suppression records | To be determined | Valid objection, withdrawal, or do-not-contact request | Pending | | Define minimum fields, basis, access, uses, and duration. |

**[LEGAL REVIEW REQUIRED]** No proposal becomes effective until the appropriate reviewer records a written decision.

## 4. Legal and privacy questions

Qualified counsel and the Privacy Reviewer must provide written decisions on:

1. The lawful basis for collecting Early Access and Demo requests and for human follow-up.
2. Required collection-point and general Privacy Notice language.
3. Consent, proof-of-consent, withdrawal, and objection requirements.
4. Direct-marketing and electronic-communications restrictions, including whether follow-up is operational communication, direct marketing, or varies by context.
5. Data-subject access, correction, objection, restriction, portability, and deletion rights.
6. Applicable response periods and a proportionate identity-verification standard.
7. Retention, deletion, and anonymization requirements.
8. Minimum suppression-record requirements.
9. Legal holds and dispute, complaint, or investigation preservation.
10. Backup expiration, restoration, and post-restoration treatment.
11. Cross-border transfer mechanisms, disclosures, and safeguards.
12. Processor and subprocessor obligations.
13. Security-incident and breach-notification duties and deadlines.
14. Administrator monitoring and manual note-review restrictions.
15. Country-by-country notices and launch limitations.
16. Nigeria-specific privacy, communications, political, and campaign requirements.
17. Whether this workflow may launch before any future Fundraising capability.
18. Whether tested deletion or anonymization tooling must exist before Production launch.

## 5. HR and training-record questions

**[LEGAL/HR REVIEW REQUIRED]**

HR and privacy reviewers must decide:

1. Who must complete administrator training.
2. Who may act as trainer and independent verifier.
3. Whether electronic acknowledgement is acceptable and what makes it valid.
4. Required training and acknowledgement record retention.
5. Access restrictions for acknowledgement records.
6. Staff departure and role-change procedures, including revocation timing.
7. Recertification frequency.
8. Corrective action for policy violations.
9. Separation between personnel records and lead records.
10. Whether acknowledgement records may be stored in the project repository and, if not, the approved system.

The training guide remains Draft — Training Not Yet Completed. No person is represented as trained or authorized for Production.

## 6. Deletion and anonymization decisions

| Decision area | Required written decision |
|---|---|
| Approval authority | Identify who may approve deletion or anonymization. |
| Identity verification | Define who verifies the requester and the proportionate evidence required. |
| Technical executor | Identify the minimum-privileged role permitted to execute the procedure. |
| Deletion versus anonymization | Define when each outcome applies. |
| Follow-up history | Define whether linked notes are deleted, anonymized, retained, or restricted. |
| Audit evidence | Define the minimum lawful evidence retained after action. |
| Backups | Define expiry, restoration controls, and post-restoration handling. |
| Legal holds | Define who issues, reviews, and releases a hold. |
| Suppression records | Define minimum fields, duration, access, and permitted use. |
| Requester notification | Define wording, channel, timing, and exceptions. |
| Audit documentation | Define approver, executor, timestamps, reason, scope, and evidence. |
| Production prerequisite | Decide whether tested deletion/anonymization tooling must exist before launch. |

Administrators must not use direct SQL, alter migration history, or improvise deletion or anonymization.

## 7. Jurisdiction decisions

Nigeria is the first review jurisdiction but is not approved. No jurisdiction is approved merely because it appears below.

| Jurisdiction | Early Access permitted | Demo permitted | Follow-up permitted | Approved legal basis | Retention approved | Additional notice required | Launch decision |
|---|---|---|---|---|---|---|---|
| Nigeria | Pending | Pending | Pending | Pending | No | Pending | NOT APPROVED |
| Other African jurisdictions | Pending individually | Pending individually | Pending individually | Not established | No | Pending | NOT APPROVED |
| United States | Pending | Pending | Pending | Pending | No | Pending | NOT APPROVED |
| Other jurisdictions | Pending individually | Pending individually | Pending individually | Not established | No | Pending | NOT APPROVED |

Lead-management review does not enable Nigeria Fundraising. Fundraising requires a separate legal review and explicit country authorization.

## 8. Decision authority and required written approvals

- Legal Counsel decides legal questions only for the jurisdictions stated in the signed review.
- The Privacy Reviewer confirms privacy-operational requirements.
- The HR Reviewer confirms training and personnel-record requirements.
- The Technical Verifier confirms implementation evidence but does not provide legal approval.
- The Platform Owner coordinates the final business decision but cannot waive mandatory legal, privacy, security, or technical gates.
- Signing this addendum does not itself authorize Production.

Every legal sign-off must identify the jurisdiction or jurisdictions covered, document version reviewed, review date, assumptions relied upon, conditions or required changes, classification of follow-up as operational communication or direct marketing (or whether it varies by context), and any expiry or mandatory re-review trigger.

Each reviewer must select one decision: `APPROVED`, `APPROVED WITH CONDITIONS`, `REJECTED`, or `MORE INFORMATION REQUIRED`. No option is preselected.

### Qualified Legal Counsel

Name/organization: ______________________________  
Decision: _______________________________________  
Jurisdiction(s): _________________________________  
Document version/date reviewed: __________________  
Assumptions: ____________________________________  
Follow-up classification: ________________________  
Conditions/required changes: _____________________  
Expiry or re-review trigger: ______________________  
Signature and date/time zone: ____________________  

### Privacy Reviewer

Name: __________________________________________  
Decision: _______________________________________  
Requirements/conditions: _________________________  
Signature and date/time zone: ____________________  

### HR Reviewer

Name: __________________________________________  
Decision: _______________________________________  
Training/personnel-record conditions: ____________  
Signature and date/time zone: ____________________  

### Platform Owner

Name: __________________________________________  
Decision: _______________________________________  
Conditions/unresolved gates: _____________________  
Signature and date/time zone: ____________________  

### Technical Verifier

Name: __________________________________________  
Decision: _______________________________________  
Evidence verified/unverified: ____________________  
Signature and date/time zone: ____________________  

## 9. Open-issues register

An issue remains `OPEN` until a named reviewer records a written decision and evidence reference. Blank fields do not mean approval. `APPROVED WITH CONDITIONS` remains `OPEN` until every condition is verified complete. Verbal approval is insufficient for the Production gate.

| Issue ID | Question | Owner | Decision needed by | Status | Decision/evidence reference |
|---|---|---|---|---|---|
| LHR-001 | Lawful basis for collection | Legal Counsel | Before Production authorization | OPEN | |
| LHR-002 | Lawful basis and consent for follow-up | Legal Counsel / Privacy Reviewer | Before Production authorization | OPEN | |
| LHR-003 | Required Privacy Notice wording | Legal Counsel / Privacy Reviewer | Before Production authorization | OPEN | |
| LHR-004 | Direct-marketing and electronic-communications restrictions | Legal Counsel | Before Production authorization | OPEN | |
| LHR-005 | Data-subject rights, timing, and identity verification | Legal Counsel / Privacy Reviewer | Before Production authorization | OPEN | |
| LHR-006 | Final retention periods | Legal Counsel / Privacy Reviewer | Before Production authorization | OPEN | |
| LHR-007 | Suppression-record scope and duration | Legal Counsel / Privacy Reviewer | Before Production authorization | OPEN | |
| LHR-008 | Deletion/anonymization procedure and tooling | Platform Owner / Legal / Technical Verifier | Before Production authorization | OPEN | |
| LHR-009 | Legal holds, disputes, backups, and restoration | Legal Counsel / Technical Verifier | Before Production authorization | OPEN | |
| LHR-010 | Cross-border transfers and processors | Legal Counsel / Privacy Reviewer | Before Production authorization | OPEN | |
| LHR-011 | Incident and breach-notification obligations | Legal Counsel / Security Owner | Before Production authorization | OPEN | |
| LHR-012 | Training population and verifier qualifications | HR Reviewer / Platform Owner | Before Production access | OPEN | |
| LHR-013 | Electronic acknowledgement and retention | HR Reviewer / Privacy Reviewer | Before Production access | OPEN | |
| LHR-014 | Departure, role change, and recertification | HR Reviewer / Technical Verifier | Before Production access | OPEN | |
| LHR-015 | Storage for acknowledgement records | HR Reviewer / Privacy Reviewer | Before collecting training records | OPEN | |
| LHR-016 | Nigeria requirements and launch decision | Qualified Nigeria Counsel | Before Nigeria launch | OPEN | |
| LHR-017 | Separation from future Fundraising | Legal Counsel / Platform Owner | Before Fundraising authorization | OPEN | |
| LHR-018 | Vercel restoration and Preview acceptance | Technical Verifier | Before Production authorization | OPEN | |

## 10. Production gate

Production remains **NO-GO** until:

- Required legal, privacy, and HR decisions are documented in writing.
- Retention periods and suppression requirements are approved.
- A deletion/anonymization procedure is approved.
- Training requirements are approved and completed.
- Vercel access is restored.
- The exact candidate commit is deployed to Preview.
- Preview acceptance passes.
- All remaining security, operational, recovery, jurisdiction, and release gates pass.
- Explicit written Production authorization is issued.

Payments remain inactive. Nigeria Fundraising remains unavailable. No jurisdiction or reviewer approval is implied by this draft.
