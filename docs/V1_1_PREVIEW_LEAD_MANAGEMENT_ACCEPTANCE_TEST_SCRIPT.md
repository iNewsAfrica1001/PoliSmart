# PoliSmart Africa AI

## V1.1 Preview Lead Management Acceptance Test Script and Evidence Record

**Draft — Not Yet Executed**

## Document control

| Field | Value |
|---|---|
| Document status | Draft — Not Yet Executed |
| Overall acceptance status | **BLOCKED** |
| Production decision | **NO-GO** |
| Target branch | `release/v1.1` |
| Approved Preview candidate | `092618a61f5e4f132b4c73eb61baa6b184b4f090` |
| Candidate state at creation | Local; not pushed or deployed |
| Current remote release commit | `88096e520efa1305cee48994fa8949936a4c6667` |
| Blocking prerequisite | Vercel access remains unresolved |

The approved candidate is one exact immutable commit. If another commit is added before execution, this record must be formally updated and the complete validation suite rerun. Documentation readiness does not authorize a push or deployment.

## Mandatory execution sequence

Stop immediately on any failure.

1. Restore and verify authorized Vercel access.
2. Before pushing, record the sanitized current Production deployment ID and Production aliases; confirm the Production branch remains `main` and `release/v1.1` remains Preview-only.
3. Confirm the local branch, exact approved commit, and clean worktree.
4. Push only `release/v1.1` to `origin/release/v1.1`, without force.
5. Confirm the remote branch points to the exact approved commit.
6. Confirm Vercel creates a Preview deployment only and that it uses the exact approved commit.
7. Wait for the Preview deployment to reach `READY`.
8. Record sanitized Production deployment and alias metadata again and compare it with the pre-push baseline. Stop if Production changed.
9. Verify Preview health, readiness, and routing.
10. Use only the dedicated Preview Super Administrator and clearly synthetic Preview data.
11. Execute the functional, authorization, privacy, transition, follow-up, database, and regression tests below.
12. Record sanitized evidence that distinguishes live observations from automated-test results.

## Test data controls

- Use reserved `example.test` email addresses, clearly fictional names and organizations, and a unique test-run identifier.
- Do not use a real mailbox, person, organization, lead, or Production record.
- Separate synthetic leads are required where terminal transitions prevent later tests. Ordering must never require a backward transition or reopening `CLOSED`.
- Test records remain in Preview unless a separately approved retention procedure applies. Do not clean up or reset state using direct SQL.
- Use the exact synthetic follow-up note: **Synthetic Preview follow-up test.**

## Status definitions

| Decision | Meaning |
|---|---|
| PASS | Observed behavior exactly matches the expected result and safe evidence is recorded. |
| FAIL | Observed behavior differs from the expected result. |
| BLOCKED | A prerequisite or safe verification requirement is unavailable. |
| NOT RUN | The test has not been executed. |

All tests are initially **NOT RUN**. The overall decision is **BLOCKED**.

## A. Release identity

| Field | Recorded value |
|---|---|
| Git branch | |
| Git commit | |
| Remote release commit | |
| Vercel deployment ID | |
| Preview URL | |
| Preview environment | |
| Production branch | |
| Production deployment before push | |
| Production aliases before push | |
| Production deployment after Preview READY | |
| Production aliases after Preview READY | |
| Test operator | |
| Independent verifier | |
| Test date/time in UTC | |

| Test ID | Requirement | Procedure | Expected result | Actual result | Evidence reference | Status |
|---|---|---|---|---|---|---|
| REL-01 | Local identity | Verify branch, candidate commit, and worktree before push. | `release/v1.1`; exact approved commit; clean worktree. | | | NOT RUN |
| REL-02 | Pre-push Production baseline | Record sanitized Production deployment, aliases, and branch before push. | Production branch is `main`; baseline recorded safely. | | | NOT RUN |
| REL-03 | Preview-only branch | Verify `release/v1.1` is not the Production branch. | Branch is Preview-only. | | | NOT RUN |
| REL-04 | Safe push | Push only the release branch without force. | Push succeeds without force, merge, or rebase. | | | NOT RUN |
| REL-05 | Remote identity | Resolve the remote branch after push. | Exact approved commit. | | | NOT RUN |
| REL-06 | Deployment identity | Inspect sanitized deployment metadata. | Preview environment, release branch, exact approved commit. | | | NOT RUN |
| REL-07 | Production comparison | After Preview is READY, repeat and compare Production metadata. | Deployment and aliases are unchanged. | | | NOT RUN |

## B. Health and routing

| Test ID | Requirement | Procedure | Expected result | Actual result | Evidence reference | Status |
|---|---|---|---|---|---|---|
| HLT-01 | Application loads | Open the approved Preview URL. | Application loads without fatal errors. | | | NOT RUN |
| HLT-02 | Health | Request the Preview health endpoint. | Approved healthy response. | | | NOT RUN |
| HLT-03 | Readiness | Request the Preview readiness endpoint. | Approved ready response. | | | NOT RUN |
| HLT-04 | Unknown route | Request a nonexistent route. | Safe not-found response; no sensitive metadata. | | | NOT RUN |
| HLT-05 | Login routing | Open the normal Preview login route. | Preview login loads normally. | | | NOT RUN |
| HLT-06 | Protected routing | Open `/admin/prelaunch-leads` signed out. | Authentication required; no lead data shown. | | | NOT RUN |

## C. Authentication and authorization

| Test ID | Requirement | Procedure | Expected result | Actual result | Evidence reference | Status |
|---|---|---|---|---|---|---|
| AUT-01 | Unauthenticated denial | Request protected list, detail, status, and follow-up routes without a session. | HTTP 401; no repository access or disclosure. | | | NOT RUN |
| AUT-02 | Campaign Administrator denial | Repeat with a dedicated Preview Campaign Administrator. | HTTP 403; no lead data or repository access. | | | NOT RUN |
| AUT-03 | Super Administrator access | Sign in normally with the dedicated Preview Super Administrator. | Authorized lead review succeeds. | | | NOT RUN |
| AUT-04 | Authorization ordering | Use approved sanitized instrumentation or existing evidence. | Authentication and `platform-audit:read` precede repository access. | | | NOT RUN |
| AUT-05 | No existence leakage | Request existing-shaped and unknown IDs while unauthorized. | Responses reveal no record existence. | | | NOT RUN |
| AUT-06 | No escalation path | Review Campaign Administrator controls and protected requests. | No self-promotion or Super Administrator capability. | | | NOT RUN |

## D. Early Access and Demo submissions

Live rate-limit testing must use only the minimum synthetic requests established by the configured threshold, without concurrency, sustained traffic, or load testing. Stop immediately after the first expected HTTP 429. Avoid email. If notifications cannot be safely isolated, mark the test **BLOCKED**.

| Test ID | Requirement | Procedure | Expected result | Actual result | Evidence reference | Status |
|---|---|---|---|---|---|---|
| SUB-01 | Early Access | Submit one valid fictional request using an `example.test` address and run ID. | Neutral acceptance; one Preview record. | | | NOT RUN |
| SUB-02 | Demo request | Submit one valid fictional request using an `example.test` address and run ID. | Neutral acceptance; one Preview record. | | | NOT RUN |
| SUB-03 | Required fields | Omit required fields one at a time. | Safe validation; no record created. | | | NOT RUN |
| SUB-04 | Unknown fields | Add one unsupported field. | Rejected; unsupported data not stored. | | | NOT RUN |
| SUB-05 | Neutral response | Inspect the public response. | No internal ID, reviewer, or storage metadata. | | | NOT RUN |
| SUB-06 | Rate limiting | Send only the minimum sequential synthetic requests, stopping at the first 429. | Controlled HTTP 429; no email or load test. | | | NOT RUN |
| SUB-07 | Data provenance | Review inputs and evidence. | No real person, organization, mailbox, or reused lead. | | | NOT RUN |

## E. Lead review

| Test ID | Requirement | Procedure | Expected result | Actual result | Evidence reference | Status |
|---|---|---|---|---|---|---|
| REV-01 | Lead list | Open the protected page as the Preview Super Administrator. | Authorized list loads. | | | NOT RUN |
| REV-02 | Lead detail | Open a designated synthetic lead. | Correct detail; no unrelated data. | | | NOT RUN |
| REV-03 | Request-type filter | Filter Early Access and Demo separately. | Only matching records. | | | NOT RUN |
| REV-04 | Country filter | Filter by a synthetic country. | Only case-insensitive matches. | | | NOT RUN |
| REV-05 | Status filter | Test each recognized status. | Only matching records. | | | NOT RUN |
| REV-06 | `updated_at` | Compare safe timestamps around status and follow-up actions. | Changes only after a successful lead-status transition. | | | NOT RUN |
| REV-07 | Safe errors | Request invalid filters and identifiers. | Controlled 400/404/409; no sensitive metadata. | | | NOT RUN |
| REV-08 | Public denial | Request list and detail without authentication. | No public lead access. | | | NOT RUN |

## F. Controlled status transitions

Use separate synthetic fixtures where terminal transitions prevent reuse. Never reset state using SQL. Same-status tests must use recognized statuses. Unknown-status requests must be controlled API requests and must not create records.

| Test ID | Requirement | Procedure | Expected result | Actual result | Evidence reference | Status |
|---|---|---|---|---|---|---|
| STA-01 | `NEW → CONTACTED` | Transition a dedicated synthetic `NEW` lead. | HTTP 200; persisted; `updated_at` changes. | | | NOT RUN |
| STA-02 | `NEW → QUALIFIED` | Transition a separate synthetic `NEW` lead. | HTTP 200; persisted; `updated_at` changes. | | | NOT RUN |
| STA-03 | `NEW → CLOSED` | Transition a separate synthetic `NEW` lead. | HTTP 200; persisted; `updated_at` changes. | | | NOT RUN |
| STA-04 | `CONTACTED → QUALIFIED` | Transition a dedicated contacted lead. | HTTP 200; persisted; `updated_at` changes. | | | NOT RUN |
| STA-05 | `CONTACTED → CLOSED` | Transition a separate contacted lead. | HTTP 200; persisted; `updated_at` changes. | | | NOT RUN |
| STA-06 | `QUALIFIED → CLOSED` | Transition a qualified lead. | HTTP 200; persisted; `updated_at` changes. | | | NOT RUN |
| STP-01 | Block `CONTACTED → NEW` | Submit the prohibited transition. | HTTP 409; status and timestamp unchanged. | | | NOT RUN |
| STP-02 | Block `QUALIFIED → NEW` | Submit the prohibited transition. | HTTP 409; status and timestamp unchanged. | | | NOT RUN |
| STP-03 | Block `QUALIFIED → CONTACTED` | Submit the prohibited transition. | HTTP 409; status and timestamp unchanged. | | | NOT RUN |
| STP-04 | Block `CLOSED → NEW` | Attempt reopening. | HTTP 409; status and timestamp unchanged. | | | NOT RUN |
| STP-05 | Block `CLOSED → CONTACTED` | Attempt reopening. | HTTP 409; status and timestamp unchanged. | | | NOT RUN |
| STP-06 | Block `CLOSED → QUALIFIED` | Attempt reopening. | HTTP 409; status and timestamp unchanged. | | | NOT RUN |
| STI-01 | Same-status no-op | Submit each recognized current status unchanged. | HTTP 200; `updated_at` unchanged. | | | NOT RUN |
| STI-02 | Invalid transition | Submit a recognized prohibited transition. | Safe HTTP 409; no change. | | | NOT RUN |
| STI-03 | Closed UI | Open a closed lead. | No transition control. | | | NOT RUN |
| STI-04 | Valid UI options | Inspect each recognized current status. | Only permitted next statuses shown. | | | NOT RUN |
| STI-05 | Concurrent change | Where safe, use two sessions against one synthetic fixture. | Stale update receives 409 and refreshes safely. | | | NOT RUN |
| STI-06 | Unknown status | Send unknown, empty, null, and non-string statuses through controlled requests. | Rejected without record creation, update, or server error. | | | NOT RUN |

## G. Follow-up workflow

Use exactly one scheduled follow-up per designated follow-up test lead unless a test explicitly requires another. Prevent accidental duplicate submission. Evidence the pending state before completion, and record original completion metadata before the repeated-completion test.

| Test ID | Requirement | Procedure | Expected result | Actual result | Evidence reference | Status |
|---|---|---|---|---|---|---|
| FUP-01 | Form | Open a designated synthetic lead. | Accessible note and date/time fields. | | | NOT RUN |
| FUP-02 | Note validation | Test empty and over-limit notes. | Client and server reject; no record. | | | NOT RUN |
| FUP-03 | Future time | Test missing, invalid, and past times. | Rejected; no record. | | | NOT RUN |
| FUP-04 | UTC conversion | Schedule a future local time. | Correct ISO UTC timestamp sent. | | | NOT RUN |
| FUP-05 | Minimal creation payload | Inspect the transient request without exporting it. | Only `note` and `scheduledAt`. | | | NOT RUN |
| FUP-06 | Session-derived creator | Create the single designated follow-up. | Creator comes from the session. | | | NOT RUN |
| FUP-07 | Pending history | Confirm before completing. | Exactly one matching pending entry. | | | NOT RUN |
| FUP-08 | Oldest-first history | Use an explicitly designated multi-entry fixture. | Deterministic oldest-first display. | | | NOT RUN |
| FUP-09 | Upcoming/overdue | Observe approved fixtures without clock or SQL manipulation. | Correct indicators and filters. | | | NOT RUN |
| FUP-10 | Notes excluded from list | Inspect lead-list response and cards. | Follow-up note absent. | | | NOT RUN |
| FUP-11 | Minimal completion payload | Complete only after pending evidence is recorded. | Empty PATCH; no administrator ID or timestamp. | | | NOT RUN |
| FUP-12 | Server metadata | Record sanitized completion metadata. | Time and administrator are server-derived. | | | NOT RUN |
| FUP-13 | Immutable completion | Look for edit/delete controls and try unsupported fields. | No edit/delete; unsupported fields rejected. | | | NOT RUN |
| FUP-14 | Repeated completion | Repeat only after recording original completion metadata. | HTTP 409; original metadata unchanged. | | | NOT RUN |
| FUP-15 | Status independence | Compare lead status before and after follow-up activity. | Unchanged. | | | NOT RUN |
| FUP-16 | Lead timestamp independence | Compare lead `updated_at` before and after follow-up activity. | Unchanged. | | | NOT RUN |

## H. Privacy and data boundaries

| Test ID | Requirement | Procedure | Expected result | Actual result | Evidence reference | Status |
|---|---|---|---|---|---|---|
| PRV-01 | Workspace Search exclusion | Search for the synthetic run ID and note phrase. | No lead/contact/follow-up result. | | | NOT RUN |
| PRV-02 | AI-grounding exclusion | Query the AI Assistant for synthetic lead details. | No retrieval, citation, or disclosure. | | | NOT RUN |
| PRV-03 | Model-training exclusion | Review approved data-flow evidence. | No lead or follow-up data used for training. | | | NOT RUN |
| PRV-04 | Email boundary | Perform follow-up actions with notifications safely isolated. | No email triggered. | | | NOT RUN |
| PRV-05 | Logging boundary | Inspect only approved sanitized logs. | No contact details or note content. | | | NOT RUN |
| PRV-06 | URL boundary | Inspect addresses and request URLs. | No note content in any URL. | | | NOT RUN |
| PRV-07 | Browser storage | Inspect keys transiently without exporting storage. | No note in localStorage or sessionStorage. | | | NOT RUN |
| PRV-08 | Analytics/telemetry | Inspect approved transient network metadata. | No note or contact data sent. | | | NOT RUN |
| PRV-09 | Evidence boundary | Review the evidence set. | No real lead data or secrets. | | | NOT RUN |

## I. Database verification

Use only a separately approved, secure Preview verification method. Never substitute Production credentials. If the target cannot be proven, mark this section **UNVERIFIED**, set the overall result to **BLOCKED**, and stop.

| Test ID | Requirement | Procedure | Expected result | Actual result | Evidence reference | Status |
|---|---|---|---|---|---|---|
| DBV-01 | Preview identity | Verify masked database, role, endpoint, and branch metadata. | Isolated V1.1 Preview; not Production. | | | NOT RUN |
| DBV-02 | Migration 0013 | Inspect migration history read-only. | Finished and not rolled back. | | | NOT RUN |
| DBV-03 | Objects | Inspect safe schema metadata. | Table, columns, RESTRICT FKs, check, and indexes present. | | | NOT RUN |
| DBV-04 | Runtime SELECT/INSERT | Inspect effective privileges. | SELECT and INSERT granted. | | | NOT RUN |
| DBV-05 | Column UPDATE | Inspect effective privileges. | UPDATE only on `completed_at` and `completed_by_id`. | | | NOT RUN |
| DBV-06 | No broad mutation | Inspect table privileges. | No DELETE or unrestricted table UPDATE. | | | NOT RUN |
| DBV-07 | Synthetic-only records | Review safe test identifiers. | Only designated synthetic records added. | | | NOT RUN |
| DBV-08 | Existing records | Compare approved safe counts/fingerprints. | Existing records unchanged except documented synthetic records. | | | NOT RUN |

## J. Regression validation

| Test ID | Requirement | Procedure | Expected result | Actual result | Evidence reference | Status |
|---|---|---|---|---|---|---|
| REG-01 | Complete tests | Run the full automated suite. | All pass; no unexpected skips/focus. | | | NOT RUN |
| REG-02 | Lint | Run repository lint. | PASS. | | | NOT RUN |
| REG-03 | TypeScript | Run type checking. | PASS. | | | NOT RUN |
| REG-04 | Build | Run the local production build. | PASS; no deployment. | | | NOT RUN |
| REG-05 | Dependency audit | Run audit without automatic fixing. | Zero vulnerabilities or separately approved exception. | | | NOT RUN |
| REG-06 | Worktree | Inspect Git status after validation. | Clean. | | | NOT RUN |

## K. Acceptance decision

| Area | Decision | Evidence/reference | Outstanding item |
|---|---|---|---|
| Release identity | NOT RUN | | Restore Vercel access and deploy the exact candidate to Preview. |
| Health and routing | NOT RUN | | |
| Authentication and authorization | NOT RUN | | |
| Public submissions | NOT RUN | | |
| Lead review | NOT RUN | | |
| Controlled status transitions | NOT RUN | | |
| Follow-up workflow | NOT RUN | | |
| Privacy boundaries | NOT RUN | | |
| Database verification | NOT RUN | | |
| Regression validation | NOT RUN | | |
| Overall Preview acceptance | BLOCKED | | Candidate is not pushed or deployed; Vercel access is unresolved. |

## L. Evidence rules and index

Permitted evidence is limited to safe identifiers, HTTP status codes, commit hashes, deployment IDs, UTC timestamps, test IDs, automated-test summaries, and redacted screenshots. Evidence must distinguish observed live behavior from automated-test results.

Never retain credentials, OTPs, cookies, session tokens, database URLs, environment values, Production data, real lead information, raw browser-storage exports, or raw network exports. Screenshots must not contain unredacted contact details. Do not copy note content into evidence beyond the approved synthetic phrase.

| Evidence reference | Test IDs covered | Safe description | Captured by | Captured at UTC | Redaction verified |
|---|---|---|---|---|---|
| | | | | | |

## M. Stop conditions

Stop immediately for any of the following:

- Wrong branch or commit, remote mismatch, or force/merge/rebase requirement.
- Production deployment or alias change.
- Preview/Production target ambiguity or database-target uncertainty.
- Authentication failure or Campaign Administrator access.
- Selection or disclosure of a real lead.
- Credential, token, cookie, OTP, URL, or environment-value exposure.
- Migration inconsistency, data corruption, or unexpected record mutation.
- AI, Search, email, logging, analytics, telemetry, or browser-storage boundary failure.
- Any action unexpectedly touches Production.

Do not improvise a fix during acceptance. Record the condition as **FAIL** or **BLOCKED** and obtain separate authorization.

## N. Sign-off

### Test operator

Name: ____________________________________  
Role: _____________________________________  
Signature: _________________________________  
Date/time UTC: _____________________________  

### Independent verifier

Name: ____________________________________  
Role: _____________________________________  
Signature: _________________________________  
Date/time UTC: _____________________________  

### Platform Owner

Name: ____________________________________  
Decision: `PASS / FAIL / BLOCKED / NOT RUN`  
Signature: _________________________________  
Date/time UTC: _____________________________  

### Privacy/Legal Reviewer, where required

Name: ____________________________________  
Review scope: ______________________________  
Decision: __________________________________  
Signature: _________________________________  
Date/time UTC: _____________________________  

### Final Preview decision

`PASS / FAIL / BLOCKED / NOT RUN`

Outstanding defects: ________________________________________________

Production remains **NO-GO** unless separately authorized after all release, legal, security, operational, recovery, and database-identity gates pass.
