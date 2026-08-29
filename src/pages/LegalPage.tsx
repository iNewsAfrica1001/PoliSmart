import { ArrowLeft, Bot, Database, LockKeyhole, ShieldCheck } from "lucide-react";

type LegalPageProps = { kind: "privacy" | "terms" };

export function LegalPage({ kind }: LegalPageProps) {
  return kind === "privacy" ? <PrivacyPolicy /> : <TermsOfService />;
}

function LegalHeader({ title, summary }: { title: string; summary: string }) {
  return (
    <header className="legal-header">
      <a className="legal-brand" href="/" aria-label="Return to PoliSmart Africa AI">
        <span className="brand-symbol">P</span>
        <span>
          <strong>PoliSmart Africa AI</strong>
          <small>LEGAL INFORMATION</small>
        </span>
      </a>
      <a className="legal-back" href="/">
        <ArrowLeft aria-hidden="true" /> Back to sign in
      </a>
      <span className="eyebrow">OWNER/LEGAL REVIEW DRAFT</span>
      <h1>{title}</h1>
      <p>{summary}</p>
      <div className="legal-review" role="note">
        This production-ready draft requires qualified legal review before final approval.
        Jurisdiction-specific privacy provisions, cross-border transfer requirements, retention
        schedules, intellectual-property terms, and liability provisions remain marked for review.
        The effective date will be confirmed at public release.
      </div>
    </header>
  );
}

function LegalFooter() {
  return (
    <footer className="legal-footer">
      <nav aria-label="Legal pages">
        <a href="/privacy">Privacy Policy</a>
        <a href="/terms">Terms of Service</a>
        <a href="mailto:support@polismartafrica.ai">Contact support</a>
      </nav>
      <p>
        PoliSmart Africa AI is operated by SentinelAI LLC, 3204 Pearsall Ave, Bronx, NY 10469,
        United States.
      </p>
    </footer>
  );
}

function PrivacyPolicy() {
  return (
    <main className="legal-page">
      <LegalHeader
        title="Privacy Policy"
        summary="How PoliSmart Africa AI handles information in the current Version 1 service."
      />
      <article className="legal-document">
        <p className="legal-updated">
          EFFECTIVE DATE: TO BE CONFIRMED AT PUBLIC RELEASE · Draft review date: 29 August 2026
        </p>

        <section>
          <h2>1. Scope and operator</h2>
          <p>
            This policy applies to PoliSmart Africa AI at polismartafrica.ai, operated by SentinelAI
            LLC, 3204 Pearsall Ave, Bronx, NY 10469, United States. The service is an AI-assisted
            campaign intelligence and management platform for authorized organizations.
          </p>
        </section>

        <section>
          <h2>2. Information handled by V1</h2>
          <div className="legal-callout-grid">
            <div>
              <LockKeyhole aria-hidden="true" />
              <h3>Accounts and authentication</h3>
              <p>
                Name, organization name, country, work email, role and membership information,
                password hashes, verification/reset token hashes, and session records.
              </p>
            </div>
            <div>
              <Database aria-hidden="true" />
              <h3>Campaign and operational data</h3>
              <p>
                Campaigns, tasks, events, policy work, authorized volunteer information, uploaded
                documents, approvals, and related organization-supplied records.
              </p>
            </div>
            <div>
              <Bot aria-hidden="true" />
              <h3>AI and usage data</h3>
              <p>
                AI questions, bounded retrieved evidence, generated responses, citations, feedback,
                model/provider records, safety flags, and usage or error information.
              </p>
            </div>
            <div>
              <ShieldCheck aria-hidden="true" />
              <h3>Security and operations</h3>
              <p>
                Login, upload, deletion, approval, permission, AI-generation, and administrative
                audit events; request IDs, timestamps, safe error codes, and operational metrics.
              </p>
            </div>
          </div>
          <p>
            Volunteer contact details may be stored only when the organization records that contact
            use is authorized. Organizations are responsible for ensuring that information they
            submit is lawful, accurate, relevant, and appropriately authorized.
          </p>
        </section>

        <section>
          <h2>3. How information is used</h2>
          <ul>
            <li>Provide secure accounts, organization workspaces, campaigns, and V1 workflows.</li>
            <li>
              Authenticate users, enforce roles, isolate organizations, and maintain sessions.
            </li>
            <li>Send email verification and password-recovery messages.</li>
            <li>Retrieve approved evidence and generate campaign-scoped AI assistance.</li>
            <li>Maintain citations, approvals, auditability, rate limits, safety, and security.</li>
            <li>
              Diagnose failures, operate the service, and respond to authorized support requests.
            </li>
          </ul>
        </section>

        <section>
          <h2>4. AI disclosure</h2>
          <p>
            AI-generated content may contain errors. The product separates{" "}
            <strong>Observed Data</strong>, which is retrieved evidence, from{" "}
            <strong>AI Interpretation</strong>, which is generated explanation. AI assists human
            decision-making and does not guarantee predictions, campaign outcomes, or policy
            results. Users must review citations, country coverage, weighting, sample information,
            source limitations, and the underlying evidence before making consequential decisions.
            Users remain responsible for campaign, policy, legal, compliance, and communications
            decisions.
          </p>
          <p>
            Respondent-level Afrobarometer CSV records are not sent to the AI provider. The AI path
            uses approved safeguarded aggregates and authorized campaign knowledge.
          </p>
        </section>

        <section>
          <h2>5. Public-opinion data</h2>
          <p>
            PoliSmart uses selected aggregate Afrobarometer survey results as an independent public
            research source. PoliSmart does not own Afrobarometer, and use of its public research
            does not imply endorsement, sponsorship, or partnership. Coverage is limited to the
            available countries, rounds, questions, valid responses, weighting, and minimum-sample
            safeguards. The current product does not use this data for individual voter targeting,
            sensitive-trait persuasion, psychological profiling, or individual political scoring.
          </p>
        </section>

        <section>
          <h2>6. Cookies and sessions</h2>
          <p>
            The service uses a necessary authentication session cookie. In production it is
            configured as Secure, HttpOnly, SameSite=Strict, and scoped to the application. The
            cookie supports login and authorized access; it is not available to client-side
            JavaScript. Password reset revokes existing sessions. This draft does not describe
            optional advertising cookies because they are not an implemented V1 capability.
          </p>
        </section>

        <section>
          <h2>7. Email verification and recovery</h2>
          <p>
            Registration and password recovery use time-limited, single-use links sent from the
            authorized transactional mailbox through Microsoft Graph. Verification and reset tokens
            are stored as hashes rather than reusable plain-text values. Neutral responses reduce
            account-enumeration risk.
          </p>
        </section>

        <section>
          <h2>8. Service providers and international processing</h2>
          <p>
            V1 relies on Vercel for hosting/runtime and private object storage, Neon for PostgreSQL,
            Microsoft Graph/Microsoft 365 for transactional email, and OpenAI for server-side model
            inference. SentinelAI LLC is a United States operator, and these providers may process
            or store information in the United States or other countries different from the user's
            or organization's country. Providers receive information only as needed for their
            service role and configured application workflow. Mandatory privacy rights under
            applicable law are not waived. Jurisdiction-specific privacy notices, transfer
            mechanisms, and local-law requirements are <strong>LEGAL REVIEW REQUIRED</strong>. This
            draft does not claim certification or established compliance with a specific national or
            regional privacy framework.
          </p>
        </section>

        <section>
          <h2>9. Security practices</h2>
          <p>
            PoliSmart uses password hashing, hashed opaque tokens, protected session cookies,
            server-side authorization, tenant-scoped repositories, rate limits, input validation,
            audit logging, private document storage, and separate runtime/migration database roles.
            No system is absolutely secure. Organizations should use strong unique passwords,
            protect administrator access, assign least-privilege roles, and report suspected misuse.
          </p>
        </section>

        <section>
          <h2>10. Retention</h2>
          <p>
            Information is retained for as long as reasonably necessary to provide the service,
            maintain security, meet legitimate operational requirements, resolve disputes, and
            satisfy applicable legal obligations. Account and organization information supports the
            active workspace; campaign information supports authorized operations and auditability;
            authentication and security records support access control and incident investigation;
            operational logs support reliability and security; and AI prompts, responses, citations,
            feedback, and governance records support the requested feature, review, and
            auditability. Single-use token records have expiration and use states. Data should not
            be retained longer than justified for its documented purpose.
          </p>
          <p>
            Exact category-by-category periods, deletion workflows, archival rules, litigation
            holds, and legally required periods are{" "}
            <strong>LEGAL REVIEW / OPERATIONAL POLICY REQUIRED</strong>.
          </p>
        </section>

        <section>
          <h2>11. Account and privacy requests</h2>
          <p>
            Authorized users may request account or privacy assistance at{" "}
            <a href="mailto:support@polismartafrica.ai">support@polismartafrica.ai</a>. Requests may
            require identity, organization, and authority verification. Available rights and
            response periods depend on applicable law; this draft does not promise rights or timing
            beyond what applies.
          </p>
        </section>

        <section>
          <h2>12. Children and minors</h2>
          <p>
            PoliSmart V1 is designed for authorized professional organization users, not children.
            Organizations should not create accounts for children or submit children's information
            unless they have confirmed a lawful, reviewed basis and applicable safeguards. Contact
            support if information about a minor may have been submitted so the matter can be
            reviewed safely.
          </p>
        </section>

        <section>
          <h2>13. Changes and contact</h2>
          <p>
            This policy may be updated as the service, providers, or legal requirements change.
            Material changes should be dated and communicated through an appropriate product or
            organization channel before they take effect. Questions may be sent to{" "}
            <a href="mailto:support@polismartafrica.ai">support@polismartafrica.ai</a>.
          </p>
        </section>
      </article>
      <LegalFooter />
    </main>
  );
}

function TermsOfService() {
  return (
    <main className="legal-page">
      <LegalHeader
        title="Terms of Service"
        summary="Rules for authorized use of the current PoliSmart Africa AI Version 1 service."
      />
      <article className="legal-document">
        <p className="legal-updated">
          EFFECTIVE DATE: TO BE CONFIRMED AT PUBLIC RELEASE · Draft review date: 29 August 2026
        </p>

        <section>
          <h2>1. Acceptance and operator</h2>
          <p>
            These draft terms apply to use of PoliSmart Africa AI, operated by SentinelAI LLC, 3204
            Pearsall Ave, Bronx, NY 10469, United States. By creating an account or using the
            service, a user confirms that they are authorized to act for the identified organization
            and agrees to follow these terms. If the user lacks that authority or does not agree,
            they must not use the service.
          </p>
        </section>

        <section>
          <h2>2. Authorized organization use</h2>
          <p>
            The service is for lawful campaign, governance, policy, communications, field, event,
            volunteer, and aggregate public-intelligence work by authorized organization users.
            Access is limited by organization membership, campaign context, and server-enforced
            permissions. Users must follow applicable law and their organization's approvals,
            policies, and data responsibilities.
          </p>
        </section>

        <section>
          <h2>3. Accounts and responsibilities</h2>
          <ul>
            <li>Provide accurate registration and organization information.</li>
            <li>Keep credentials private and use strong, unique passwords.</li>
            <li>Complete email verification and promptly report suspected account compromise.</li>
            <li>Assign roles according to actual duties and least privilege.</li>
            <li>Do not share sessions, verification links, reset links, or access tokens.</li>
          </ul>
          <p>
            Campaign Administrators cannot assign, modify, promote, or obtain Super Administrator.
            Attempts to circumvent that boundary or other authorization controls are prohibited.
          </p>
        </section>

        <section>
          <h2>4. Acceptable use and prohibited misuse</h2>
          <p>Users must not use PoliSmart to:</p>
          <ul>
            <li>
              Break law, violate rights, or access another organization without authorization.
            </li>
            <li>
              Enable individualized political manipulation, voter suppression, sensitive-trait
              profiling, psychological targeting, or individual political scoring.
            </li>
            <li>
              Create fabricated endorsements, deceptive political impersonation, unlawful content,
              or unauthorized automated publication.
            </li>
            <li>Upload malware, evade rate limits, probe security, or disrupt the service.</li>
            <li>
              Submit personal, confidential, or campaign information without authority or a lawful
              purpose.
            </li>
            <li>
              Misrepresent AI output or public research as verified fact, prediction, or
              endorsement.
            </li>
          </ul>
        </section>

        <section>
          <h2>5. Campaign data responsibilities</h2>
          <p>
            Organizations remain responsible for campaign records, documents, volunteer contact
            authorization, lawful collection, accuracy, notices, permissions, retention, and use of
            information they submit. Users must keep work in the correct organization and campaign
            and must not import voter profiling or prohibited persuasion datasets.
          </p>
        </section>

        <section>
          <h2>6. AI limitations and human responsibility</h2>
          <p>
            AI-generated content may be incomplete, incorrect, or unsuitable. Observed Data and AI
            Interpretation are distinct. Citations and underlying evidence, country coverage,
            weighting, and sample safeguards must be reviewed. The service does not guarantee
            campaign, election, policy, media, or public-opinion outcomes. Users remain responsible
            for consequential decisions and required human, legal, compliance, and communications
            review. PoliSmart does not autonomously publish campaign communications.
          </p>
        </section>

        <section>
          <h2>7. Intellectual property and submitted content</h2>
          <p>
            SentinelAI LLC and its licensors retain rights in the PoliSmart application, branding,
            and service materials. Organizations retain whatever rights they lawfully hold in
            content they submit. They authorize processing of submitted content only as needed to
            operate, secure, support, and improve the configured service. Users must have permission
            to upload and use third-party content. Final jurisdiction-specific license and
            intellectual-property language requires owner/legal review.
          </p>
        </section>

        <section>
          <h2>8. Third-party services and public data</h2>
          <p>
            V1 relies on Vercel, Neon, Microsoft Graph/Microsoft 365, OpenAI, and Vercel Blob. Their
            service availability and applicable terms may affect PoliSmart. Afrobarometer is an
            independent public research source. PoliSmart does not own Afrobarometer, and its use
            does not imply endorsement, sponsorship, or partnership. Users must respect source
            limitations and applicable third-party rights.
          </p>
        </section>

        <section>
          <h2>9. Availability and changes</h2>
          <p>
            The service may experience maintenance, provider outages, rate limits, security
            restrictions, or errors. Continuous or error-free availability is not promised. Features
            may be corrected, secured, limited, or changed through documented change management.
            Material changes should be communicated through an appropriate channel.
          </p>
        </section>

        <section>
          <h2>10. Suspension and termination principles</h2>
          <p>
            Access may be limited or suspended when reasonably necessary to address security risk,
            suspected unauthorized access, prohibited misuse, legal requirements, or material breach
            of these terms. Decisions should be documented, proportionate, authorized, and reviewed;
            AI must not make the final suspension decision. Account closure and data handling remain
            subject to verified authority, retention needs, and applicable law.
          </p>
        </section>

        <section>
          <h2>11. Draft disclaimers and limitation concepts</h2>
          <p>
            PoliSmart is a decision-support and operations tool, not legal advice, an election
            prediction, or a substitute for professional judgment. Public data and third-party
            services may be incomplete, delayed, or unavailable. To the extent permitted by
            applicable law, final terms are expected to define appropriate warranty disclaimers and
            limits of liability. Specific exclusions, caps, remedies, and exceptions require
            qualified legal review to confirm enforceability and mandatory-law exceptions before
            final approval.
          </p>
        </section>

        <section>
          <h2>12. Proposed governing law — draft for legal review</h2>
          <p>
            These Terms are proposed to be governed by the laws of the State of New York, without
            regard to conflict-of-law principles, except to the extent that applicable law requires
            otherwise. Nothing in these Terms is intended to waive rights or protections that cannot
            lawfully be waived. <strong>LEGAL REVIEW REQUIRED</strong> before this provision is
            approved or made effective.
          </p>
        </section>

        <section>
          <h2>13. Proposed dispute forum — draft for legal review</h2>
          <p>
            Subject to applicable law, disputes arising from these Terms or the service are proposed
            to be brought in the state courts located in Bronx County, New York, or the United
            States federal court with jurisdiction over Bronx County, New York. The parties would
            consent to those courts' personal jurisdiction and venue, except where applicable law
            requires a different forum. This draft does not include mandatory arbitration, a
            class-action waiver, or a jury-trial waiver. <strong>LEGAL REVIEW REQUIRED</strong>{" "}
            before this provision is approved or made effective.
          </p>
        </section>

        <section>
          <h2>14. Payments and billing</h2>
          <p>
            Payments and Billing are not implemented in V1. PoliSmart does not currently process
            payments, connect a payment provider, collect payment credentials, or offer active paid
            subscriptions through the product. Paid plans or billing may be introduced in a future
            release; additional billing or payment terms may apply when those services become
            available and will be provided before activation.
          </p>
        </section>

        <section>
          <h2>15. Changes to these terms and contact</h2>
          <p>
            Draft terms may be updated to reflect service or legal changes. Final terms should show
            an effective date and provide appropriate notice before binding changes take effect.
            Questions may be sent to{" "}
            <a href="mailto:support@polismartafrica.ai">support@polismartafrica.ai</a>.
          </p>
        </section>
      </article>
      <LegalFooter />
    </main>
  );
}
