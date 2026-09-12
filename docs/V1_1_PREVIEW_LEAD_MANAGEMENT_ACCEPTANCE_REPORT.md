# PoliSmart Africa AI

## V1.1 Preview Lead Management Acceptance Report

### Document control

| Field                        | Value                                                |
| ---------------------------- | ---------------------------------------------------- |
| Document owner               | PoliSmart Africa AI Platform Owner                   |
| Version                      | 1.0                                                  |
| Status                       | Preview acceptance completed                         |
| Date                         | 2026-09-12                                           |
| Preview branch               | `release/v1.1`                                       |
| Final accepted commit        | `b3d472834f1c00d49dd77277a04f3749e30b4128`           |
| Final accepted deployment ID | `dpl_CTfy95T3taEVfkxBByDZSUhDeUhR`                   |
| Final accepted Preview URL   | `https://poli-smart-nif96xj3d-poli-smart.vercel.app` |
| Overall Preview acceptance   | PASS                                                 |
| Production decision          | NO-GO                                                |

## 1. Scope and limitations

This report covers V1.1 Preview lead-management and follow-up acceptance only. It does not authorize a Production deployment, a Production migration, payment processing, or Nigeria fundraising.

The write-based acceptance work used only a clearly synthetic `example.test` lead. No real lead was opened during the write acceptance phases. This report contains no lead identity, contact information, record identifier, follow-up note, session credential, or database credential.

## 2. Release identity and environment isolation

The accepted release was the `release/v1.1` branch at commit `b3d472834f1c00d49dd77277a04f3749e30b4128`, deployed as Preview deployment `dpl_CTfy95T3taEVfkxBByDZSUhDeUhR` at `https://poli-smart-nif96xj3d-poli-smart.vercel.app`.

Production deployment identity, commit, branch, aliases, variables, and database remained unchanged throughout Preview acceptance. Migration `0013_lead_follow_up_workflow` was not rerun during acceptance.

The previously completed Step 2B.8B Preview-only migration verification established that migration 0013 was applied to the isolated Preview database and that its schema, constraints, indexes, and narrow runtime privileges were correct. This report reuses that evidence without reproducing connection strings, credentials, or secret values.

## 3. Acceptance chronology

1. Initial read-only acceptance encountered a stale, pre-deployment browser bundle.
2. Opening a fresh tab or performing a hard reload loaded the correct deployment; the CLOSED-state UI then passed its read-only check.
3. Exactly one pending follow-up was created on the authorized synthetic lead using the approved synthetic note.
4. The follow-up was completed exactly once.
5. Follow-up creation and completion did not change the lead status.
6. The synthetic lead was transitioned from NEW to CONTACTED.
7. Testing identified a missing accessible success confirmation after a server-confirmed status change.
8. The accessibility defect was corrected, covered by regression tests, committed, and deployed to Preview.
9. The live retest transitioned the synthetic lead from CONTACTED to QUALIFIED and displayed exactly: `Lead status changed to QUALIFIED.`
10. The lead was not advanced to CLOSED.
11. Final follow-up state was one completed follow-up and zero pending follow-ups.

## 4. Defects and corrections

| Observation or defect                                                     | Classification                                             | Resolution or correction                                                                      | Evidence                                                                                                                      | Residual status |
| ------------------------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------- |
| A stale browser bundle displayed pre-deployment behavior                  | Operational acceptance issue, not a current runtime defect | Opened a fresh tab or performed a hard reload and reconfirmed deployment identity             | Current CLOSED-state UI passed after refresh                                                                                  | Closed          |
| Server-confirmed status changes lacked an accessible success confirmation | Application accessibility defect                           | Added visible, polite live-region confirmation based on the server-confirmed resulting status | Corrective commit `b3d472834f1c00d49dd77277a04f3749e30b4128`; deployment `dpl_CTfy95T3taEVfkxBByDZSUhDeUhR`; live retest PASS | Closed          |

No observed security defect remains open from Preview acceptance.

## 5. Final acceptance matrix

| Acceptance area                  | Live evidence                                                                  | Automated or configuration evidence                                                                         | Decision     | Limitation                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------- |
| Release identity                 | Preview deployment, branch, commit, and URL verified                           | Vercel deployment metadata reconfirmed                                                                      | PASS         | None                                                                                     |
| Health and routing               | Preview health, readiness, and routing passed                                  | Deployment and routing tests passed                                                                         | PASS         | None                                                                                     |
| Authentication                   | Dedicated Preview Super Administrator authenticated through the normal flow    | Authentication regression tests passed                                                                      | PASS         | None                                                                                     |
| Authorization                    | Super Administrator access succeeded                                           | Campaign Administrator denial, tenant boundaries, and fail-closed authorization tests passed                | PASS         | Campaign Administrator was not tested live                                               |
| Lead review                      | Authorized list, detail, filtering, and ordering behavior passed               | Protected lead-review tests passed                                                                          | PASS         | None                                                                                     |
| Status transitions               | Synthetic lead progressed NEW to CONTACTED to QUALIFIED                        | Forward-only, atomic, conflict, no-op, and invalid-status tests passed                                      | PASS         | Lead was intentionally not advanced to CLOSED                                            |
| Follow-up workflow               | One follow-up was created and completed exactly once                           | Creation, completion, attribution, ordering, and immutability tests passed                                  | PASS         | None                                                                                     |
| Accessibility                    | Live retest displayed the exact success message in an accessible status region | Accessibility regression tests passed                                                                       | PASS         | None                                                                                     |
| Workspace Search boundary        | Approved search returned no authorized lead or follow-up results               | Search-exclusion and authorization tests passed                                                             | PASS         | None                                                                                     |
| AI-grounding boundary            | Approved AI check exposed no lead or follow-up content                         | Grounding-exclusion tests and configuration review passed                                                   | PASS         | Live AI response reported insufficient evidence                                          |
| Browser storage and URL boundary | Follow-up note was absent from the URL, localStorage, and sessionStorage       | Client behavior review supported the boundary                                                               | PASS         | Raw browser storage was not exported                                                     |
| Public-access boundary           | Unauthenticated requests were denied without record-existence leakage          | Authentication-first route tests passed                                                                     | PASS         | Response mechanism differs by request type                                               |
| API validation                   | Not run live                                                                   | Invalid-input, safe-error, authorization, conflict, and transition tests passed                             | PASS         | Live invalid requests were not run because credential-safe tooling was unavailable       |
| Logging                          | Retained Preview acceptance-window logs contained no prohibited content        | Logs contained safe structural route, status, request-ID, and controlled error metadata                     | PASS         | Inspection was limited to retained deployment-scoped entries; raw logs were not exported |
| Telemetry                        | No lead or follow-up content was found                                         | Vercel Web Analytics and Speed Insights only; no session replay or third-party monitoring integration found | PASS         | Raw telemetry payloads were not exported                                                 |
| Email boundary                   | No acceptance status or follow-up action sent email                            | Administrative status and follow-up routes have no notification-service invocation                          | PASS         | Unrelated mailbox content was not inspected                                              |
| Database schema and privileges   | Previously verified in Preview-only migration Step 2B.8B                       | Migration safety tests passed; runtime DELETE and unrestricted UPDATE remain denied                         | PASS         | Database was not reconnected during final acceptance                                     |
| `updated_at`                     | Not verified live                                                              | Repository and API tests passed, including status-update and follow-up independence semantics               | NOT VERIFIED | No valid pre-write live baseline existed; no extra write was performed for evidence      |
| Regression validation            | Accepted Preview remained operational                                          | 223/223 tests, lint, TypeScript, build, dependency audit, and Markdown structure passed                     | PASS         | Eight pre-existing documentation-only Prettier warnings remain non-blocking              |

## 6. Evidence limitations

- Campaign Administrator live testing was not performed because no approved safe account was available. Automated authorization evidence passed.
- Live invalid-request API testing was not performed because credential-safe tooling was unavailable. Automated API validation passed.
- Live `updated_at` behavior was not verified because no valid pre-write baseline existed. Repository and API tests passed.
- Raw logs and telemetry payloads were intentionally not exported.
- Logging review was limited to retained Preview acceptance-window entries.
- These statements are documented evidence limitations; they are not claims of live verification.
- The 91 identifiers in the broader acceptance script were not all represented as individually executed live tests. Evidence comprised live tests, automated compensating tests, configuration review, and explicitly unverified items.

The limitations were reviewed and accepted for the Preview-only decision. They do not demonstrate a defect and do not authorize Production.

## 7. Privacy and security evidence

- No follow-up note, lead contact data, session data, authorization data, database URL, or environment value was found in the inspected Preview logs.
- Vercel Web Analytics and Speed Insights are enabled.
- Session replay is not enabled.
- No third-party monitoring integration was found.
- No lead or follow-up content was found in telemetry.
- Administrative status and follow-up routes do not send email.
- No lead or follow-up data was exposed through Workspace Search or AI grounding.
- No public follow-up endpoint or page was found.
- No notes were found in URLs, localStorage, or sessionStorage.
- Follow-up history remained append-only through the supported interface; no edit or delete control was present.
- Production and its database were not touched.

## 8. Validation evidence

| Validation                    | Result                                                            |
| ----------------------------- | ----------------------------------------------------------------- |
| Complete automated test suite | 223/223 PASS                                                      |
| Status tests                  | PASS                                                              |
| API tests                     | PASS                                                              |
| Authorization tests           | PASS                                                              |
| Follow-up tests               | PASS                                                              |
| Migration safety tests        | PASS                                                              |
| Lint                          | PASS                                                              |
| TypeScript                    | PASS                                                              |
| Local production build        | PASS                                                              |
| Dependency audit              | PASS — 0 vulnerabilities                                          |
| Markdown structure            | PASS                                                              |
| Documentation formatting      | Eight existing documentation-only Prettier warnings; non-blocking |

## 9. Evidence classification and execution accuracy

Live evidence in this report refers only to behavior observed through the accepted Preview deployment. Automated evidence refers to the passing local regression suite. Configuration evidence refers to read-only inspection of application, deployment, security, telemetry, and route configuration. Items lacking safe evidence remain explicitly marked NOT VERIFIED.

This report does not claim that every one of the 91 acceptance-script test identifiers was executed live. It does not convert automated evidence into live evidence, and it does not convert the `updated_at` limitation into a live PASS.

Overall Preview acceptance remains PASS because the recorded limitations were explicitly reviewed and accepted, the compensating automated evidence passed, and no observed security defect remains open from Preview acceptance.

## 10. Remaining Production gates

The following gates remain mandatory before any Production authorization:

- Qualified legal, privacy, and HR review.
- Approval of retention periods and suppression-record decisions.
- Approval of deletion and irreversible-anonymization criteria and procedures.
- Administrator training completion and signed acknowledgement.
- A verified Production recovery checkpoint and migration baseline.
- Approval of the exact Production release commit.
- Explicit, recorded Production authorization.
- Confirmation that all relevant legal-review markers and open governance decisions have been resolved or formally accepted.

Vercel access and sign-in have been restored and Vercel 2FA is not recorded as an unresolved blocker. Recovery-code governance remains an operational security consideration; no recovery code is included in this report.

Payments remain inactive, and Nigeria fundraising remains unavailable.

## 11. Final decisions

| Decision                           | Outcome |
| ---------------------------------- | ------- |
| Overall Preview acceptance         | PASS    |
| Ready for acceptance-report review | YES     |
| Ready for Production               | NO      |
| Production decision                | NO-GO   |

This Preview acceptance decision does not authorize deployment, migration, promotion, configuration changes, record changes, or any other action in Production.
