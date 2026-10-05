# Privacy Provider Owner Evidence Checklist

**For:** Platform Owner  
**System:** PoliSmart Africa AI V1.1A  
**Source of truth:** `docs/PRIVACY_PROVIDER_DPA_CROSS_BORDER_EVIDENCE_REGISTER.md`  
**Purpose:** Collect account-specific evidence for qualified privacy-counsel review. This checklist is not legal advice or approval.

## How to use this checklist

1. Create one restricted folder for each provider below.
2. Save documents as PDF or an uneditable export where possible. Record the document title, version/effective date, download date, account/plan to which it applies, and source location.
3. Capture account pages only when needed to prove the plan, region, settings, or contractual applicability. Redact identifiers that counsel does not need.
4. Never include passwords, API keys, access tokens, database URLs, OAuth/client secrets, private keys, authentication cookies, recovery codes, or session exports.
5. A public webpage is background evidence, not proof that its terms apply to the PoliSmart account.
6. Use only these classifications:
   - **ALREADY VERIFIED** — account-specific evidence is already present and reviewed.
   - **OWNER MUST OBTAIN** — retrieve it from the account, billing/plan page, accepted terms, or contract archive.
   - **PROVIDER MUST SUPPLY** — request it from provider support, sales, privacy, legal, or the trust center when the account does not expose it.
   - **LEGAL COUNSEL MUST ASSESS** — counsel must decide applicability or sufficiency.
   - **NOT APPLICABLE — REASON REQUIRED** — use only after documenting the reason and obtaining counsel confirmation where appropriate.

No provider below currently has account-specific DPA applicability or acceptance classified as **ALREADY VERIFIED**.

---

## 1. Vercel — hosting, runtime, domains, logs, monitoring, and analytics

**PROVIDER:** Vercel  
**SERVICE USED:** Production hosting, serverless API runtime, TLS and domains, deployment/runtime logs, Error Anomaly monitoring, Web Analytics, and Speed Insights.  
**WHY POLISMART USES IT:** Vercel runs and monitors the public application and its server-side API.

**WHERE TO LOOK:** Vercel Account/Team Settings, Project Settings, Billing/Plan, Legal, Security/Trust Center, Data Processing Addendum, Subprocessors, and data-residency/log-retention settings. If unavailable: **OWNER TO LOCATE IN PROVIDER ACCOUNT OR REQUEST FROM PROVIDER**.

**ACCOUNT-SPECIFIC EVIDENCE TO COLLECT:**

- [ ] Current Terms of Service/customer agreement applicable to the PoliSmart account — **OWNER MUST OBTAIN**
- [ ] DPA or equivalent contractual privacy document — **OWNER MUST OBTAIN**; **LEGAL COUNSEL MUST ASSESS** plan coverage
- [ ] Proof whether the DPA is incorporated automatically or requires execution/acceptance — **OWNER MUST OBTAIN** or **PROVIDER MUST SUPPLY**
- [ ] Current subprocessor list and effective date — **OWNER MUST OBTAIN**; public list exists, account applicability is unverified
- [ ] Hosting/function/log/analytics processing-region evidence — **OWNER MUST OBTAIN** or **PROVIDER MUST SUPPLY**
- [ ] International/cross-border transfer terms — **OWNER MUST OBTAIN**; **LEGAL COUNSEL MUST ASSESS**
- [ ] SCCs or equivalent transfer mechanism, if applicable — **OWNER MUST OBTAIN**; **LEGAL COUNSEL MUST ASSESS**
- [ ] Deployment, function-log, analytics, and monitoring retention documentation — **PROVIDER MUST SUPPLY** if not exposed in the account
- [ ] Deletion/account-termination documentation — **PROVIDER MUST SUPPLY**
- [ ] Security/privacy documentation — **OWNER MUST OBTAIN** from Vercel Legal/Security/Trust Center
- [ ] Account plan/service evidence showing which terms apply — **OWNER MUST OBTAIN**

---

## 2. Vercel Blob

**PROVIDER:** Vercel  
**SERVICE USED:** Private Vercel Blob object storage for uploaded knowledge documents.  
**WHY POLISMART USES IT:** It stores document files used by the protected knowledge workflow.

**WHERE TO LOOK:** Vercel Project Storage/Blob settings, Billing/Plan, Legal, Security/Trust Center, DPA, Subprocessors, Data Residency, and object lifecycle/deletion documentation. If unavailable: **OWNER TO LOCATE IN PROVIDER ACCOUNT OR REQUEST FROM PROVIDER**.

**ACCOUNT-SPECIFIC EVIDENCE TO COLLECT:**

- [ ] Applicable Vercel agreement and Blob-specific terms — **OWNER MUST OBTAIN**
- [ ] Applicable Vercel DPA/addendum — **OWNER MUST OBTAIN**; **LEGAL COUNSEL MUST ASSESS** Blob coverage
- [ ] Proof of automatic incorporation or required acceptance — **OWNER MUST OBTAIN** or **PROVIDER MUST SUPPLY**
- [ ] Blob-relevant subprocessor list — **OWNER MUST OBTAIN** or **PROVIDER MUST SUPPLY**
- [ ] Store region/data-residency evidence — **OWNER MUST OBTAIN**
- [ ] Cross-border transfer terms — **OWNER MUST OBTAIN**; **LEGAL COUNSEL MUST ASSESS**
- [ ] SCCs/equivalent mechanism — **OWNER MUST OBTAIN**; **LEGAL COUNSEL MUST ASSESS**
- [ ] Object, version, backup, and soft-deletion retention documentation — **PROVIDER MUST SUPPLY**
- [ ] Permanent deletion and account-termination handling — **PROVIDER MUST SUPPLY**
- [ ] Blob security/privacy documentation — **OWNER MUST OBTAIN** or **PROVIDER MUST SUPPLY**
- [ ] Account/store/plan evidence establishing applicable terms — **OWNER MUST OBTAIN**

---

## 3. Neon

**PROVIDER:** Neon  
**SERVICE USED:** Managed PostgreSQL database, branches, recovery checkpoints, and point-in-time recovery capabilities.  
**WHY POLISMART USES IT:** Neon is the durable system of record for accounts, tenants, campaigns, privacy cases, audit evidence, geography, and other business records.

**WHERE TO LOOK:** Neon Organization/Project Settings, Billing/Plan, Legal, Privacy, Security/Trust Center, DPA, Subprocessors, Data Residency/Region, Backup/Restore, Branches, and account deletion. If unavailable: **OWNER TO LOCATE IN PROVIDER ACCOUNT OR REQUEST FROM PROVIDER**.

**ACCOUNT-SPECIFIC EVIDENCE TO COLLECT:**

- [ ] Current agreement/terms for the Neon account — **OWNER MUST OBTAIN**
- [ ] Neon DPA/addendum — **PROVIDER MUST SUPPLY** unless available in the account
- [ ] Proof of DPA incorporation/execution/acceptance — **PROVIDER MUST SUPPLY**
- [ ] Current Neon subprocessor list — **PROVIDER MUST SUPPLY**
- [ ] Production project physical hosting/processing region — **OWNER MUST OBTAIN**
- [ ] International/cross-border transfer terms — **PROVIDER MUST SUPPLY**; **LEGAL COUNSEL MUST ASSESS**
- [ ] SCCs/equivalent mechanism — **PROVIDER MUST SUPPLY**; **LEGAL COUNSEL MUST ASSESS**
- [ ] Point-in-time history, backup, branch, and log retention — **OWNER MUST OBTAIN** or **PROVIDER MUST SUPPLY**
- [ ] Branch/database/account deletion and termination handling — **PROVIDER MUST SUPPLY**
- [ ] Security/privacy documentation — **OWNER MUST OBTAIN** or **PROVIDER MUST SUPPLY**
- [ ] Account plan/project/region evidence establishing applicable terms — **OWNER MUST OBTAIN**

---

## 4. OpenAI API

**PROVIDER:** OpenAI  
**SERVICE USED:** Server-side Responses API inference for bounded, authorized AI features and geographic grounding.  
**WHY POLISMART USES IT:** OpenAI generates structured AI assistance from approved, minimized context. The application requests that responses are not stored, but provider/account handling still requires evidence.

**WHERE TO LOOK:** OpenAI Platform Organization/Project Settings, Billing, Data Controls, Legal/Policies, Business Terms, DPA, Subprocessors, Security/Trust materials, usage/retention documentation, and regional/data-residency settings. If unavailable: **OWNER TO LOCATE IN PROVIDER ACCOUNT OR REQUEST FROM PROVIDER**.

**ACCOUNT-SPECIFIC EVIDENCE TO COLLECT:**

- [ ] Applicable API/business agreement — **OWNER MUST OBTAIN**
- [ ] OpenAI API DPA/addendum — **OWNER MUST OBTAIN**; **LEGAL COUNSEL MUST ASSESS** applicability
- [ ] Proof of automatic incorporation or execution/acceptance — **OWNER MUST OBTAIN** or **PROVIDER MUST SUPPLY**
- [ ] Current OpenAI subprocessor list — **OWNER MUST OBTAIN**
- [ ] Project data-residency/processing-location evidence — **OWNER MUST OBTAIN** or **PROVIDER MUST SUPPLY**
- [ ] International/cross-border transfer terms — **OWNER MUST OBTAIN**; **LEGAL COUNSEL MUST ASSESS**
- [ ] SCCs/equivalent mechanism — **OWNER MUST OBTAIN**; **LEGAL COUNSEL MUST ASSESS**
- [ ] API input/output, abuse-monitoring, usage, and log retention — **PROVIDER MUST SUPPLY** or owner must archive current policy
- [ ] Project/account deletion and provider deletion handling — **PROVIDER MUST SUPPLY**
- [ ] Security/privacy and incident documentation — **OWNER MUST OBTAIN** or **PROVIDER MUST SUPPLY**
- [ ] Organization/project/plan and data-control evidence — **OWNER MUST OBTAIN**

---

## 5. Microsoft Graph / Microsoft 365

**PROVIDER:** Microsoft  
**SERVICE USED:** Microsoft Graph and Microsoft 365/Exchange transactional email for email verification and password reset.  
**WHY POLISMART USES IT:** It sends essential account messages from the approved mailbox.

**WHERE TO LOOK:** Microsoft 365 Admin Center, Entra ID/Azure portal, Billing, Service health, Data Location, Product Terms, DPA, Service Trust Portal, Subprocessors, Exchange retention, audit, and deletion settings. If unavailable: **OWNER TO LOCATE IN PROVIDER ACCOUNT OR REQUEST FROM PROVIDER**.

**ACCOUNT-SPECIFIC EVIDENCE TO COLLECT:**

- [ ] Governing Microsoft customer agreement/Product Terms — **OWNER MUST OBTAIN**
- [ ] Microsoft Products and Services DPA — **OWNER MUST OBTAIN**; **LEGAL COUNSEL MUST ASSESS** applicability
- [ ] Proof of incorporation/acceptance for the tenant/subscription — **OWNER MUST OBTAIN**
- [ ] Graph/Microsoft 365/Exchange subprocessor documentation — **OWNER MUST OBTAIN** or **PROVIDER MUST SUPPLY**
- [ ] Tenant/mailbox data-location evidence — **OWNER MUST OBTAIN**
- [ ] Cross-border transfer terms — **OWNER MUST OBTAIN**; **LEGAL COUNSEL MUST ASSESS**
- [ ] SCCs/equivalent mechanism — **OWNER MUST OBTAIN**; **LEGAL COUNSEL MUST ASSESS**
- [ ] Exchange message, message-trace, audit, and backup retention — **OWNER MUST OBTAIN**
- [ ] Mailbox/tenant deletion and termination handling — **OWNER MUST OBTAIN** or **PROVIDER MUST SUPPLY**
- [ ] Service Trust/security/privacy documents — **OWNER MUST OBTAIN**
- [ ] Subscription/tenant/service evidence establishing applicable terms — **OWNER MUST OBTAIN**

---

## 6. Upstash-compatible Redis/KV REST service

**PROVIDER:** Upstash-compatible service; the owner must first confirm the actual provider  
**SERVICE USED:** Distributed, expiring counters for Production rate limiting.  
**WHY POLISMART USES IT:** It coordinates abuse and request-rate controls across application instances without storing raw business content by design.

**WHERE TO LOOK:** The provider account connected to the Production rate-limit REST endpoint, then Account/Database Settings, Billing/Plan, Region, Legal, Trust/Security, DPA, Subprocessors, backups, logs, TTL/eviction, and deletion. If the provider identity is unclear: **OWNER TO LOCATE IN PROVIDER ACCOUNT OR REQUEST FROM PROVIDER**.

**ACCOUNT-SPECIFIC EVIDENCE TO COLLECT:**

- [ ] Confirmed provider identity and applicable agreement — **OWNER MUST OBTAIN**
- [ ] Applicable DPA/addendum — **OWNER MUST OBTAIN** or **PROVIDER MUST SUPPLY**
- [ ] Proof of incorporation/execution/acceptance — **PROVIDER MUST SUPPLY** if not in account
- [ ] Current subprocessor list — **PROVIDER MUST SUPPLY**
- [ ] Database/region/data-residency evidence — **OWNER MUST OBTAIN**
- [ ] Cross-border transfer terms — **PROVIDER MUST SUPPLY**; **LEGAL COUNSEL MUST ASSESS**
- [ ] SCCs/equivalent mechanism — **PROVIDER MUST SUPPLY**; **LEGAL COUNSEL MUST ASSESS**
- [ ] Counter TTL, logs, backups, eviction, and residual retention — **OWNER MUST OBTAIN** or **PROVIDER MUST SUPPLY**
- [ ] Database/account deletion and termination handling — **PROVIDER MUST SUPPLY**
- [ ] Security/privacy documentation — **OWNER MUST OBTAIN** or **PROVIDER MUST SUPPLY**
- [ ] Account/plan/region evidence establishing applicable terms — **OWNER MUST OBTAIN**

---

## 7. UptimeRobot

**PROVIDER:** UptimeRobot  
**SERVICE USED:** Independent monitoring of the Production domain, health endpoint, and readiness endpoint, with email alerts.  
**WHY POLISMART USES IT:** It warns the owner when the public application or required dependencies appear unavailable.

**WHERE TO LOOK:** UptimeRobot Account Settings, Billing/Plan, Legal, Privacy, Security, DPA, Subprocessors, monitor settings, data location, alert-contact settings, logs/history retention, and account deletion. If unavailable: **OWNER TO LOCATE IN PROVIDER ACCOUNT OR REQUEST FROM PROVIDER**.

**ACCOUNT-SPECIFIC EVIDENCE TO COLLECT:**

- [ ] Applicable terms/customer agreement — **OWNER MUST OBTAIN**
- [ ] DPA/addendum or documented controller terms — **PROVIDER MUST SUPPLY**
- [ ] Proof of incorporation/execution/acceptance — **PROVIDER MUST SUPPLY**
- [ ] Current subprocessor list — **PROVIDER MUST SUPPLY**
- [ ] Monitoring and alert processing locations — **PROVIDER MUST SUPPLY**
- [ ] Cross-border transfer terms — **PROVIDER MUST SUPPLY**; **LEGAL COUNSEL MUST ASSESS**
- [ ] SCCs/equivalent mechanism — **PROVIDER MUST SUPPLY**; **LEGAL COUNSEL MUST ASSESS**
- [ ] Monitor history, logs, incidents, and alert retention — **OWNER MUST OBTAIN** or **PROVIDER MUST SUPPLY**
- [ ] Monitor/account deletion and termination handling — **PROVIDER MUST SUPPLY**
- [ ] Security/privacy documentation — **OWNER MUST OBTAIN** or **PROVIDER MUST SUPPLY**
- [ ] Account/plan evidence establishing applicable terms — **OWNER MUST OBTAIN**

---

## 8. WhatsApp / Meta

**PROVIDER:** Meta / WhatsApp  
**SERVICE USED:** Optional user-initiated handoff from the public homepage to WhatsApp; no WhatsApp API, webhook, chatbot, automated sending, or message ingestion is implemented.  
**WHY POLISMART USES IT:** A visitor may choose to open WhatsApp with a fixed draft greeting and decide whether to send it outside PoliSmart.

**WHERE TO LOOK:** The WhatsApp/Meta business account, applicable Business Terms, Privacy, Legal, Security, Data Processing Terms, Subprocessors, data-transfer terms, account/message retention, rights tools, and deletion documentation. If unavailable: **OWNER TO LOCATE IN PROVIDER ACCOUNT OR REQUEST FROM PROVIDER**.

**ACCOUNT-SPECIFIC EVIDENCE TO COLLECT:**

- [ ] Applicable WhatsApp/Meta consumer or business terms — **OWNER MUST OBTAIN**
- [ ] DPA/data-processing terms or documented reason not applicable — **OWNER MUST OBTAIN**; **LEGAL COUNSEL MUST ASSESS** provider role
- [ ] Proof of incorporation/execution/acceptance — **OWNER MUST OBTAIN** or **PROVIDER MUST SUPPLY**
- [ ] Current subprocessor/affiliate documentation — **PROVIDER MUST SUPPLY**
- [ ] Message/account processing-location evidence — **PROVIDER MUST SUPPLY**
- [ ] Cross-border transfer terms — **PROVIDER MUST SUPPLY**; **LEGAL COUNSEL MUST ASSESS**
- [ ] SCCs/equivalent mechanism — **PROVIDER MUST SUPPLY**; **LEGAL COUNSEL MUST ASSESS**
- [ ] Message, metadata, backup, and account retention — **OWNER MUST OBTAIN** or **PROVIDER MUST SUPPLY**
- [ ] Rights, message/account deletion, and termination handling — **OWNER MUST OBTAIN** or **PROVIDER MUST SUPPLY**
- [ ] Security/privacy documentation — **OWNER MUST OBTAIN** or **PROVIDER MUST SUPPLY**
- [ ] Account type/business-number evidence establishing applicable terms — **OWNER MUST OBTAIN**

---

## 9. GitHub

**PROVIDER:** GitHub  
**SERVICE USED:** Source repository and Git source for the Vercel deployment workflow; not an application runtime datastore.  
**WHY POLISMART USES IT:** GitHub stores and versions the reviewed source code used to create deployments.

**WHERE TO LOOK:** GitHub Organization/Repository Settings, Billing/Plan, Terms, Customer Agreement, DPA, Privacy, Trust Center, Subprocessors, Actions/artifact/log retention, security, audit log, secret scanning, data residency, and account/repository deletion. If unavailable: **OWNER TO LOCATE IN PROVIDER ACCOUNT OR REQUEST FROM PROVIDER**.

**ACCOUNT-SPECIFIC EVIDENCE TO COLLECT:**

- [ ] Applicable GitHub terms/customer agreement — **OWNER MUST OBTAIN**
- [ ] GitHub DPA/addendum or documented reason not applicable — **OWNER MUST OBTAIN**; **LEGAL COUNSEL MUST ASSESS** plan coverage
- [ ] Proof of incorporation/execution/acceptance — **OWNER MUST OBTAIN**
- [ ] Current GitHub subprocessor list — **OWNER MUST OBTAIN**
- [ ] Repository/account processing-location evidence — **OWNER MUST OBTAIN** or **PROVIDER MUST SUPPLY**
- [ ] Cross-border transfer terms — **OWNER MUST OBTAIN**; **LEGAL COUNSEL MUST ASSESS**
- [ ] SCCs/equivalent mechanism — **OWNER MUST OBTAIN**; **LEGAL COUNSEL MUST ASSESS**
- [ ] Repository, Actions, artifact, audit, and log retention — **OWNER MUST OBTAIN**
- [ ] Repository/account deletion and termination handling — **OWNER MUST OBTAIN** or **PROVIDER MUST SUPPLY**
- [ ] Security/privacy documentation and relevant account controls — **OWNER MUST OBTAIN**
- [ ] Organization/account/plan evidence establishing applicable terms — **OWNER MUST OBTAIN**

---

## Documents to send to privacy counsel

Create nine provider folders using the names below. Include a short cover note stating the service purpose, approved Production use, missing items, and the date collected.

### Vercel — hosting/runtime/domains/logs/analytics

- [ ] Applicable customer agreement/terms
- [ ] DPA/addendum
- [ ] Subprocessor documentation
- [ ] Cross-border/transfer documentation
- [ ] Hosting/data-residency evidence
- [ ] Retention/deletion documentation
- [ ] Account/plan applicability evidence
- [ ] Outstanding questions

### Vercel Blob

- [ ] Applicable customer agreement/terms
- [ ] DPA/addendum
- [ ] Subprocessor documentation
- [ ] Cross-border/transfer documentation
- [ ] Hosting/data-residency evidence
- [ ] Retention/deletion documentation
- [ ] Account/store/plan applicability evidence
- [ ] Outstanding questions

### Neon

- [ ] Applicable customer agreement/terms
- [ ] DPA/addendum
- [ ] Subprocessor documentation
- [ ] Cross-border/transfer documentation
- [ ] Hosting/data-residency evidence
- [ ] Retention/deletion documentation
- [ ] Account/plan/project applicability evidence
- [ ] Outstanding questions

### OpenAI API

- [ ] Applicable customer agreement/terms
- [ ] DPA/addendum
- [ ] Subprocessor documentation
- [ ] Cross-border/transfer documentation
- [ ] Hosting/data-residency evidence
- [ ] Retention/deletion documentation
- [ ] Organization/project/plan applicability evidence
- [ ] Outstanding questions

### Microsoft Graph / Microsoft 365

- [ ] Applicable customer agreement/terms
- [ ] DPA/addendum
- [ ] Subprocessor documentation
- [ ] Cross-border/transfer documentation
- [ ] Hosting/data-residency evidence
- [ ] Retention/deletion documentation
- [ ] Tenant/subscription applicability evidence
- [ ] Outstanding questions

### Upstash-compatible Redis/KV REST service

- [ ] Applicable customer agreement/terms
- [ ] DPA/addendum
- [ ] Subprocessor documentation
- [ ] Cross-border/transfer documentation
- [ ] Hosting/data-residency evidence
- [ ] Retention/deletion documentation
- [ ] Provider identity/account/plan applicability evidence
- [ ] Outstanding questions

### UptimeRobot

- [ ] Applicable customer agreement/terms
- [ ] DPA/addendum or controller terms
- [ ] Subprocessor documentation
- [ ] Cross-border/transfer documentation
- [ ] Hosting/data-residency evidence
- [ ] Retention/deletion documentation
- [ ] Account/plan applicability evidence
- [ ] Outstanding questions

### WhatsApp / Meta

- [ ] Applicable customer agreement/terms
- [ ] DPA/data-processing terms or reason not applicable
- [ ] Subprocessor/affiliate documentation
- [ ] Cross-border/transfer documentation
- [ ] Hosting/data-residency evidence
- [ ] Retention/deletion and rights documentation
- [ ] Account type/business-number applicability evidence
- [ ] Outstanding questions

### GitHub

- [ ] Applicable customer agreement/terms
- [ ] DPA/addendum or reason not applicable
- [ ] Subprocessor documentation
- [ ] Cross-border/transfer documentation
- [ ] Hosting/data-residency evidence
- [ ] Retention/deletion documentation
- [ ] Organization/account/plan applicability evidence
- [ ] Outstanding questions

## Questions for qualified privacy counsel

Do not answer these questions in the evidence package. Ask counsel to provide a written decision for each provider and applicable jurisdiction.

1. Is the applicable DPA sufficient for PoliSmart Africa AI's intended Production processing?
2. Does the provider act as processor, subprocessor, independent controller, joint controller, or another role for each relevant processing activity?
3. Are the documented international transfers acceptable for Nigeria and every jurisdiction in which PoliSmart intends to operate?
4. Are additional contractual transfer safeguards, assessments, registrations, or approvals required?
5. Are the provider's subprocessors and subprocessor-change procedures acceptable?
6. Are the provider's retention, backup, deletion, and termination provisions consistent with PoliSmart's privacy obligations and legal-hold requirements?
7. Are additional disclosures required in PoliSmart's Privacy Policy, Terms, collection notices, or user communications?
8. Does any provider require additional consent, configuration, contractual execution, data-residency selection, regional restriction, or feature limitation before use?
9. What categories of personal, campaign, authentication, audit, and communications data may be sent to each provider, and what must be prohibited?
10. What evidence must PoliSmart retain to demonstrate continuing compliance, and how often must it be refreshed?

## Security reminder

The counsel package may identify contracts, plans, account settings, regions, and service configuration, but it must not contain passwords, API keys, access tokens, database URLs, OAuth/client secrets, private keys, authentication cookies, recovery codes, or live session exports.
