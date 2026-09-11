import {
  ArrowRight,
  BookOpenCheck,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  Database,
  FileCheck2,
  Flag,
  Globe2,
  LockKeyhole,
  Megaphone,
  Radio,
  ShieldCheck,
} from "lucide-react";

const capabilities = [
  [Globe2, "Political Intelligence", "Grounded public-opinion and campaign intelligence supported by trusted data and citations."],
  [BrainCircuit, "AI Assistant", "Evidence-aware AI support for campaign research and decision-making."],
  [Flag, "Campaign Management", "Organize campaign work, teams, operations and activities in one workspace."],
  [BookOpenCheck, "Knowledge Base", "Upload, review and approve organizational knowledge for grounded AI use."],
  [LockKeyhole, "Workspace Search", "Find authorized campaign information quickly across supported workspace data."],
  [Megaphone, "Policy & Communications", "Support structured policy and communications workflows with human oversight."],
  [Radio, "Media Monitoring", "Review campaign-scoped media records from authorized integrations."],
  [CalendarDays, "Events & Operations", "Coordinate campaign events and operational activities."],
] as const;

export function MarketingHomePage() {
  return (
    <div className="marketing-page">
      <header className="marketing-nav">
        <a className="marketing-brand" href="/" aria-label="PoliSmart Africa AI home">
          <span className="brand-symbol">P</span>
          <span>
            <strong>PoliSmart Africa AI</strong>
            <small>CAMPAIGN INTELLIGENCE</small>
          </span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#capabilities">Capabilities</a>
          <a href="#grounded-ai">Grounded AI</a>
          <a href="#security">Security</a>
          <a className="marketing-nav-cta" href="/login">
            Sign In <ArrowRight aria-hidden="true" />
          </a>
        </nav>
      </header>

      <main>
        <section className="marketing-hero">
          <div className="marketing-hero-copy">
            <span className="marketing-kicker">BUILT FOR AFRICAN POLITICAL AND GOVERNANCE ENVIRONMENTS</span>
            <h1>
              Grounded Intelligence.
              <br />
              <em>Better Campaign Decisions.</em>
            </h1>
            <p>
              PoliSmart Africa AI brings campaign management, grounded political intelligence,
              public-opinion data, AI-assisted workflows and field operations into one secure
              platform for authorized teams.
            </p>
            <section className="prelaunch-cta" aria-labelledby="prelaunch-heading">
              <h2 id="prelaunch-heading">PoliSmart Africa AI is coming soon.</h2>
              <p>
                Be among the first campaign professionals and organizations to experience
                AI-powered political intelligence built for African realities.
              </p>
              <div className="prelaunch-actions" aria-label="Pre-launch opportunities">
                <a className="marketing-button marketing-button--gold" href="/early-access">
                  Request Early Access
                </a>
                <a className="marketing-button marketing-button--outline" href="/request-demo">
                  Request a Demo
                </a>
              </div>
              <small>Early access is limited during our pre-launch period.</small>
            </section>
            <div className="marketing-actions">
              <a className="marketing-button marketing-button--gold" href="/login">
                Sign In <ArrowRight aria-hidden="true" />
              </a>
              <a className="marketing-button marketing-button--outline" href="#capabilities">
                Explore Capabilities
              </a>
            </div>
            <div className="marketing-proof" aria-label="Platform principles">
              <span><CheckCircle2 aria-hidden="true" /> Evidence-aware</span>
              <span><CheckCircle2 aria-hidden="true" /> Organization-based</span>
              <span><CheckCircle2 aria-hidden="true" /> Human-reviewed</span>
            </div>
          </div>
          <div className="marketing-hero-visual" aria-hidden="true">
            <div className="signal-orbit signal-orbit--one" />
            <div className="signal-orbit signal-orbit--two" />
            <div className="signal-core"><Globe2 /></div>
            <span className="signal-label signal-label--data">OBSERVED DATA</span>
            <span className="signal-label signal-label--country">COUNTRY CONTEXT</span>
            <span className="signal-label signal-label--review">HUMAN REVIEW</span>
          </div>
        </section>

        <section className="marketing-section marketing-intro" aria-labelledby="platform-heading">
          <div>
            <span className="marketing-kicker">ONE CAMPAIGN WORKSPACE</span>
            <h2 id="platform-heading">From evidence to coordinated action</h2>
          </div>
          <p>
            Designed for campaign leaders, policy teams, analysts, field organizers and authorized
            administrators who need a shared operational picture without losing evidence context.
          </p>
        </section>

        <section id="capabilities" className="capability-grid" aria-label="Platform capabilities">
          {capabilities.map(([Icon, title, detail], index) => (
            <article key={title}>
              <span className="capability-number">{String(index + 1).padStart(2, "0")}</span>
              <Icon aria-hidden="true" />
              <h3>{title}</h3>
              <p>{detail}</p>
            </article>
          ))}
        </section>

        <section id="grounded-ai" className="grounded-section">
          <div className="grounded-copy">
            <span className="marketing-kicker marketing-kicker--light">GROUNDED AI</span>
            <h2>Evidence first. Interpretation clearly identified.</h2>
            <p>
              PoliSmart prioritizes evidence-grounded assistance—not unsupported political
              predictions. Approved Knowledge Base material and safeguarded public-opinion
              aggregates support controlled workflows with citations and country context.
            </p>
            <p>
              AI output can contain errors. Teams should review cited evidence and remain responsible
              for campaign, policy and communications decisions.
            </p>
          </div>
          <div className="evidence-stack">
            <article>
              <span>01</span><div><strong>Observed Data</strong><p>Safeguarded evidence, sources, samples and weighting context.</p></div>
            </article>
            <article>
              <span>02</span><div><strong>AI Interpretation</strong><p>Clearly separated analysis grounded in the available evidence.</p></div>
            </article>
            <article>
              <span>03</span><div><strong>Human Review</strong><p>Authorized people assess context and retain decision responsibility.</p></div>
            </article>
          </div>
        </section>

        <section className="context-grid">
          <article>
            <Globe2 aria-hidden="true" />
            <span className="marketing-kicker">AFRICAN CONTEXT</span>
            <h2>Built for African political and governance environments.</h2>
            <p>
              PoliSmart is shaped for African political, electoral, governance, public-opinion and
              campaign settings while respecting that countries, institutions and available evidence
              differ. Country grounding helps keep analysis within the context supported by data.
            </p>
          </article>
          <article className="afrobarometer-card">
            <Database aria-hidden="true" />
            <span className="marketing-kicker">PUBLIC-OPINION EVIDENCE</span>
            <h2>Afrobarometer-supported intelligence</h2>
            <p>
              Where configured and available, Afrobarometer data can support evidence-based
              public-opinion intelligence with question, wave, country, weighting and sample context.
              Coverage is not universal and varies by dataset.
            </p>
            <small>
              Afrobarometer is an independent public research source. PoliSmart Africa AI is an
              independent platform and is not endorsed by, affiliated with or partnered with
              Afrobarometer unless formally established.
            </small>
          </article>
        </section>

        <section id="security" className="security-section">
          <div>
            <span className="marketing-kicker">SECURITY & RESPONSIBLE AI</span>
            <h2>Designed for responsible political intelligence</h2>
            <p>
              Privacy-conscious workflows combine organization boundaries, role-based permissions,
              document approval and human oversight. Access and approvals remain server-enforced.
            </p>
          </div>
          <ul>
            <li><FileCheck2 aria-hidden="true" /><span><strong>Grounded responses</strong>Citations keep supporting evidence visible for review.</span></li>
            <li><ShieldCheck aria-hidden="true" /><span><strong>Human review and approval</strong>Authorized people remain responsible for consequential decisions.</span></li>
            <li><LockKeyhole aria-hidden="true" /><span><strong>Role-based access</strong>Campaign data stays scoped to authorized workspaces.</span></li>
            <li><BrainCircuit aria-hidden="true" /><span><strong>Privacy safeguards</strong>No donor scoring, sensitive-trait profiling or personalized political targeting.</span></li>
          </ul>
        </section>

        <section className="coming-soon-section" aria-labelledby="coming-soon-heading">
          <div>
            <span className="marketing-kicker">PRODUCT ROADMAP</span>
            <h2 id="coming-soon-heading">Coming Soon</h2>
            <p>Reserved future capabilities—clearly separated from the operational platform today.</p>
          </div>
          <article><span>COMING SOON</span><h3>Reports</h3><p>Structured reporting and export workflows for authorized campaign teams.</p></article>
          <article><span>COMING SOON</span><h3>Billing & Payments</h3><p>Future account billing capabilities. PoliSmart does not currently process payments.</p></article>
        </section>

        <section className="marketing-final-cta">
          <span className="marketing-kicker marketing-kicker--light">POLISMART AFRICA AI</span>
          <h2>Prepare for smarter campaign decisions.</h2>
          <p>Request early access or a guided demonstration during the PoliSmart Africa AI pre-launch period.</p>
          <div className="prelaunch-actions" aria-label="Pre-launch opportunities">
            <a className="marketing-button marketing-button--gold" href="/early-access">Request Early Access</a>
            <a className="marketing-button marketing-button--outline" href="/request-demo">Request a Demo</a>
          </div>
          <small>Need help? <a href="mailto:support@polismartafrica.ai">support@polismartafrica.ai</a></small>
        </section>
      </main>

      <footer className="marketing-footer">
        <div className="marketing-brand">
          <span className="brand-symbol">P</span>
          <span><strong>PoliSmart Africa AI</strong><small>Operated by SentinelAI LLC</small></span>
        </div>
        <address>3204 Pearsall Ave<br />Bronx, NY 10469<br />United States</address>
        <nav aria-label="Footer navigation"><a href="/privacy">Privacy Policy</a><a href="/terms">Terms of Service</a><a href="/login">Login</a></nav>
      </footer>
    </div>
  );
}
