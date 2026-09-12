# PoliSmart Africa AI

## V1.1 Lead Management Administrator Training and Acknowledgement Guide

### Draft — Training Not Yet Completed

| Document control | Value |
|---|---|
| Document owner | Platform Owner |
| Technical custodian | Technical Administrator |
| Version | V1.1 Draft |
| Status | Draft — Training Not Yet Completed |
| Effective date | Not effective |
| Legal status | Retention and jurisdictional provisions pending qualified legal review |

This guide is a draft training resource. It does not confirm that anyone has completed training, provide legal advice, approve retention periods, or authorize Production use. Production remains **NO-GO**.

## 1. Training purpose

This training prepares authorized administrators to review Early Access and Demo requests and manage human-led follow-ups safely. It covers role boundaries, controlled lead statuses, follow-up scheduling and completion, minimal note writing, append-only history, privacy and security, retention and deletion escalation, and Preview-versus-Production separation.

The workflow is not a CRM, automated marketing system, political-profiling system, payment platform, or automated decision system.

## 2. Who must complete the training

Training must be completed before Production lead-management access by Super Administrators who review leads or follow-ups, Platform Owners overseeing the workflow, Technical Administrators supporting approved procedures or incidents, and operational verifiers who may view lead records during acceptance.

Campaign Administrators do not receive lead-management access through this training. Completion may be recorded only after all topics, scenarios, acknowledgement, and verifier sign-off are finished.

## 3. Super Administrator responsibilities

An authorized Super Administrator may review leads for an approved operational purpose, assign a permitted human-selected status, schedule justified follow-ups, write factual and minimal notes, complete a follow-up after the action occurs, review append-only history, and identify upcoming or overdue follow-ups.

A Super Administrator must not share credentials or sessions, use lead data for an unrelated purpose, enter sensitive information in notes, edit or casually delete history, score or profile leads, send automated or bulk outreach, place lead information into AI or Workspace Search, perform direct SQL, or treat access as Production authorization.

## 4. Campaign Administrator prohibitions

Campaign Administrators are prohibited from listing or retrieving leads, opening lead details, changing lead status, creating or viewing follow-ups, promoting themselves or another user to Super Administrator, bypassing protected routes, or using a privileged person’s account or session.

Requests for access must be denied and referred to the Platform Owner when clarification is needed. Training does not expand the Campaign Administrator role.

## 5. Lead statuses and controlled transitions

Lead status and follow-up completion are separate. Completing a follow-up does not change lead status.

| Current status | Permitted next status | Operational requirement |
|---|---|---|
| `NEW` | `CONTACTED` | Genuine outreach occurred. |
| `NEW` | `QUALIFIED` | Human review confirmed qualification without requiring prior outreach. |
| `NEW` | `CLOSED` | The request is invalid, duplicate, withdrawn, unsuitable, or concluded. |
| `CONTACTED` | `QUALIFIED` | Human review confirmed qualification. |
| `CONTACTED` | `CLOSED` | No further action is appropriate. |
| `QUALIFIED` | `CLOSED` | Active consideration or follow-up ended. |
| `CLOSED` | None | Reopening is prohibited in V1.1. |
| Same status | No transition | Harmless no-op; `updated_at` remains unchanged. |

`NEW` identifies a request awaiting substantive review or outreach. `CONTACTED` records genuine outreach but does not imply a response. `QUALIFIED` records human confirmation that further consideration is appropriate; it does not promise access or service. `CLOSED` records the end of active consideration or follow-up, not deletion.

Backward transitions are prohibited. For an incorrectly assigned status, stop and escalate to the Platform Owner and Technical Administrator. V1.1 provides no reopening or backward-correction mechanism. A future mechanism requires separately reviewed authorization, auditability, tests, and release approval.

## 6. Scheduling and completing follow-ups

Before scheduling, confirm that contact is necessary and authorized, check history to avoid duplication, select a reasonable future date and time, and enter a brief factual note. Database timestamps use UTC; the interface may localize display time. Business-day calculations depend on the approved operating calendar, and timing targets are not contractual guarantees.

Mark a follow-up completed only after the action occurs. Completion uses a server-generated time and the authenticated administrator’s identity. Do not supply or manipulate either value. Confirm the result and separately decide whether an authorized forward status transition is appropriate.

## 7. Append-only history and corrections

Follow-up history is append-only. Administrators cannot edit a note, change attribution or creation time, casually delete history, or rewrite it to conceal an error.

Correct a safe factual error with a new factual follow-up entry that identifies the earlier entry without repeating unnecessary information. If a note contains sensitive or dangerous content, stop processing, do not repeat it, and escalate to the Privacy/Legal Reviewer and Technical Administrator.

## 8. Acceptable follow-up-note examples

- “Requested a product demonstration next week.”
- “Initial outreach attempted through the approved channel; no response received.”
- “Requester asked to be contacted after the stated review period.”
- “Demonstration completed; awaiting the requester’s internal review.”
- “Correction: the prior entry referenced the wrong meeting date. The agreed date is recorded here.”

Notes describe necessary operational action and must not duplicate contact details.

## 9. Prohibited note content

Never enter passwords, authentication codes, tokens, credentials, payment or bank information, identity documents, government identifiers, medical information, ethnicity, religion, sexual orientation, disability information, political opinions, inferred voting behavior, discriminatory labels, unsupported allegations, copied email threads, unnecessary contact details, donor or propensity scores, personalized political-targeting instructions, or AI-generated legal conclusions.

“High-value prospect based on inferred political influence” is prohibited because it combines scoring, profiling, and political inference.

## 10. Privacy, AI, Workspace Search, email, and logging boundaries

Lead contact information and follow-up notes must remain excluded from AI Assistant prompts and grounding, model training, Workspace Search, behavioral profiling, scoring, personalized political targeting, analytics or telemetry content, URLs, browser storage, and unredacted logs.

The workflow does not authorize automated outreach, bulk email, or transmission of follow-up-note content through transactional email. Logs may retain safe structural metadata such as event type, time, request ID, and controlled error code, but never contact details, note text, credentials, tokens, or message bodies.

## 11. Credential and session security

Use only your assigned account. Never share passwords, verification or reset links, authentication codes, sessions, or database credentials. Sign out of unattended or shared devices, verify the intended environment before acting, report suspected exposure immediately, and avoid screenshots containing lead information or tokens.

Never place credentials or complete database URLs in chat, tickets, notes, source code, or documentation.

## 12. Handling lead categories

### Duplicate or invalid submissions

Verify the classification and close the lead when appropriate. Never merge or delete records through direct SQL.

Proposed retention: 30 days after classification. **[LEGAL REVIEW REQUIRED — not effective.]**

### Unresponsive leads

Record only genuine outreach. Administrators should ordinarily stop after three unanswered attempts or 30 days unless the requester asked for later contact or another documented reason applies.

Proposed retention: 90 days after the last attempt, subject to a maximum routine active-review period of 180 days from submission. **[LEGAL REVIEW REQUIRED — not effective.]**

### Qualified leads

Qualification requires human review and may not use scoring, profiling, political inference, or sensitive traits.

Proposed retention: 12 months after the last meaningful interaction, followed by documented review. **[LEGAL REVIEW REQUIRED — not effective.]**

### Closed or unqualified leads

No further status transition is available in V1.1. Closure is not deletion.

Proposed retention: 90 days after closure. **[LEGAL REVIEW REQUIRED — not effective.]**

The shorter approved privacy-minimizing period ordinarily governs. Longer retention requires a documented lawful reason, hold, dispute, security need, or approved suppression requirement.

## 13. Lawful deletion and anonymization escalation

Administrators must not perform direct deletion, direct SQL, migration editing, or improvised anonymization. Record a request safely, escalate it to the Platform Owner and Privacy/Legal Reviewer, verify identity through the approved process, evaluate holds and lawful requirements, obtain documented authorization, and have a minimum-privileged Technical Administrator execute a separately approved procedure.

The absence of a casual delete control does not override lawful data-subject rights.

## 14. Privacy and security incident escalation

Immediately report unauthorized access, credential exposure, Campaign Administrator or public access, cross-environment access, sensitive note content, unexpected history changes, AI or Workspace Search exposure, unsafe logging, or unexpected automated email.

Stop unnecessary processing, do not copy sensitive content into a ticket, preserve only safe identifiers and timestamps, and notify the Technical Administrator, Platform Owner, and Privacy/Legal Reviewer as appropriate.

## 15. Preview-versus-Production separation

Preview and Production are separate environments. Verify the domain, environment, and account before acting. Preview data and access do not authorize Production use.

If Production is opened accidentally during Preview testing, stop immediately, do not inspect or modify lead records, close the page, preserve only safe environment and timing metadata, and notify the test coordinator if any interaction may have occurred.

Production remains **NO-GO** until every release gate passes and explicit written authorization is issued.

## 16. Prohibited actions

Do not grant yourself privileges, share credentials or sessions, use direct SQL, edit or casually delete history, reopen a closed lead, use backward status transitions, send automated or bulk outreach, score or profile leads, infer sensitive traits, use lead data in AI or Workspace Search, collect payment credentials, enable payments, enable Nigeria Fundraising, copy Preview data into Production, or treat training as Production authorization.

## 17. Practical administrator scenarios

### Scenario 1 — A normal Demo request

**Correct action:** Review it for an approved purpose, keep it `NEW` until substantive review, then use an authorized forward transition and schedule a justified follow-up.

**Prohibited action:** Automatically score the requester, send bulk outreach, or copy the submission into AI.

**Required escalation:** None unless privacy, security, legal, or jurisdictional concerns arise.

### Scenario 2 — An unresponsive lead

**Correct action:** Record genuine attempts, use reasonable intervals, and transition forward to `CLOSED` when the approved stopping point is reached.

**Prohibited action:** Continue indefinite contact, fabricate responses, or retain records indefinitely merely because history exists.

**Required escalation:** Refer exceptional retention or renewed-contact requests to the Platform Owner and Privacy/Legal Reviewer.

### Scenario 3 — A duplicate submission

**Correct action:** Verify the duplicate and transition it from `NEW` to `CLOSED` when appropriate.

**Prohibited action:** Delete it through SQL, merge records informally, or copy personal information into another note.

**Required escalation:** Report suspected abuse to the Technical Administrator.

### Scenario 4 — A lead containing sensitive information

**Correct action:** Stop unnecessary processing, avoid repeating the content, and notify the Privacy/Legal Reviewer and Technical Administrator.

**Prohibited action:** Copy the information into notes, email, AI, screenshots, or tickets.

**Required escalation:** Immediate privacy and security review.

### Scenario 5 — An incorrectly written follow-up note

**Correct action:** Add a safe factual corrective entry. For sensitive content, stop and invoke the approved incident and deletion/anonymization process.

**Prohibited action:** Edit, overwrite, or casually delete history, or repeat sensitive content.

**Required escalation:** Escalate sensitive, discriminatory, defamatory, or security-relevant content.

### Scenario 6 — A Campaign Administrator requesting access

**Correct action:** Explain that lead management is restricted to authorized Super Administrators and refer the request to the Platform Owner.

**Prohibited action:** Share a session, change a role, reveal lead information, or bypass the route.

**Required escalation:** Report repeated bypass attempts as a security concern.

### Scenario 7 — Suspected credential exposure

**Correct action:** Stop using the affected session and follow the approved containment process.

**Prohibited action:** Paste the credential into a ticket, test it repeatedly, or continue using the session.

**Required escalation:** Immediately notify the Technical Administrator and Platform Owner.

### Scenario 8 — A deletion request

**Correct action:** Record it safely, verify identity through the approved process, and await documented legal and operational authorization.

**Prohibited action:** Use direct SQL, casually delete history, promise an unverified deadline, or deny the request because the UI lacks deletion.

**Required escalation:** Platform Owner, Privacy/Legal Reviewer, and minimum-privileged Technical Administrator.

### Scenario 9 — An administrator accidentally opening Production

**Correct action:** Stop without interacting, close the page, and report any possible interaction using safe metadata.

**Prohibited action:** Continue Preview testing or create synthetic Production records without separate authorization.

**Required escalation:** Notify the release or test coordinator immediately if any write may have occurred.

### Scenario 10 — A request involving Nigeria Fundraising

**Correct action:** Explain that Nigeria Fundraising remains unavailable and refer policy questions for qualified legal review.

**Prohibited action:** Enable Fundraising, collect payment information, promise availability, or bypass country controls.

**Required escalation:** Platform Owner and Privacy/Legal Reviewer; separate country-enablement authorization is required.

## 18. Training-completion checklist

- [ ] I understand the authorized purpose and role boundaries.
- [ ] I can apply the controlled forward status rules.
- [ ] I understand `CLOSED` cannot be reopened in V1.1.
- [ ] I can schedule and complete follow-ups safely.
- [ ] I understand status and follow-up completion are separate.
- [ ] I can write factual and minimal notes.
- [ ] I understand append-only correction procedures.
- [ ] I understand AI, Workspace Search, profiling, scoring, and targeting exclusions.
- [ ] I understand credential, email, logging, and environment boundaries.
- [ ] I understand retention periods remain pending legal approval.
- [ ] I know how to escalate deletion requests and incidents.
- [ ] I understand payments are inactive and Nigeria Fundraising is unavailable.
- [ ] I completed all practical scenarios with the trainer.
- [ ] I understand training does not authorize Production.

## 19. Administrator acknowledgement

I acknowledge that access is limited to authorized operational purposes; accounts and credentials must not be shared; notes must be factual, minimal, and free of sensitive information; follow-up history cannot be edited or casually deleted; lead data cannot be used for AI grounding, model training, Workspace Search, scoring, profiling, donor scoring, or personalized political targeting; automated outreach is unauthorized; payments are inactive; Nigeria Fundraising is unavailable; Production requires separate authorization; and suspected incidents must be reported immediately.

Administrator name: ______________________________

Authorized role: _________________________________

Environment covered: ____________________________

Administrator signature: _________________________

Date and time, including time zone: ______________

Completed acknowledgement forms must be access-controlled, must not contain passwords, authentication codes, session details, or database credentials, and must not be stored with lead follow-up notes. They must not be used for AI training or Workspace Search. They must be retained only under an approved personnel or training-record schedule.

**[LEGAL/HR REVIEW REQUIRED]** The acknowledgement-record retention period requires qualified legal and HR confirmation and is not yet effective.

No acknowledgement is valid until completed by the administrator and verified by the designated trainer.

## 20. Trainer/verifier sign-off

The trainer/verifier confirms the administrator’s identity and authorized role were verified; required topics and scenarios were covered; role boundaries, safe follow-up handling, privacy restrictions, incident escalation, and environment separation were understood; and no Production authorization was implied or granted.

Trainer/verifier name: ____________________________

Role: ___________________________________________

Signature: ______________________________________

Completion date and time, including time zone: _____

Outstanding conditions: ___________________________

Training result: `COMPLETE / INCOMPLETE / REQUIRES REMEDIATION`

## 21. Review and maintenance

The Platform Owner must review this guide after qualified legal review, approval or change of retention periods, material authorization or workflow changes, a relevant incident, a change to supported jurisdictions, or any future consideration of automated email, payments, Fundraising, AI, or Search integration.

Until formal approval and completed sign-off, this guide remains **Draft — Training Not Yet Completed** and Production remains **NO-GO**.
