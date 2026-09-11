import { Bell, ChevronDown, Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { navigation } from "../../config/navigation";
import { WorkspaceSearch } from "./WorkspaceSearch";

type AppShellProps = {
  children: ReactNode;
  onSignOut: () => void;
  activePage: string;
  onNavigate: (page: string) => void;
  userName: string;
  workspaceName: string;
  role: string;
  canReadCompliance?: boolean;
  canReadFundraising?: boolean;
  canReviewPrelaunchLeads?: boolean;
  tenantId: string;
};

const roleLabel = (role: string) =>
  role
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export function AppShell({
  children,
  onSignOut,
  activePage,
  onNavigate,
  userName,
  workspaceName,
  role,
  canReadCompliance = false,
  canReadFundraising = false,
  canReviewPrelaunchLeads = false,
  tenantId,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const initials =
    userName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "PA";

  return (
    <div className="workspace">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <aside className={mobileOpen ? "sidebar sidebar--open" : "sidebar"}>
        <div className="sidebar-brand">
          <span className="brand-symbol" aria-hidden="true">
            P
          </span>
          <span>
            <strong>PoliSmart Africa AI</strong>
            <small>CAMPAIGN INTELLIGENCE</small>
          </span>
          <button
            className="mobile-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X />
          </button>
        </div>
        <nav aria-label="Workspace navigation">
          {navigation
            .filter((item) =>
              (item.page !== "compliance" || canReadCompliance) &&
              (item.page !== "fundraising" || canReadFundraising) &&
              (item.page !== "prelaunch-leads" || canReviewPrelaunchLeads))
            .map(({ label, icon: Icon, page, enabled }) => (
              <button
                className={activePage === page ? "nav-item nav-item--active" : "nav-item"}
                key={label}
                disabled={!enabled}
                title={!enabled ? `${label} is coming soon` : undefined}
                onClick={() => {
                  onNavigate(page);
                  setMobileOpen(false);
                }}
              >
                <Icon aria-hidden="true" />
                <span>{label}</span>
                {!enabled && <small>SOON</small>}
              </button>
            ))}
        </nav>
        <div className="sidebar-footer">
          <span>Workspace</span>
          <strong>{workspaceName}</strong>
          <small>Secure organization workspace</small>
          <a className="sidebar-support" href="mailto:support@polismartafrica.ai">
            Contact support
          </a>
          <nav className="sidebar-legal" aria-label="Legal information">
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
          </nav>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu />
          </button>
          <WorkspaceSearch tenantId={tenantId} onNavigate={onNavigate} />
          <div className="topbar-actions">
            <button className="icon-button" aria-label="Notifications" disabled>
              <Bell />
            </button>
            <button
              className="profile-menu"
              onClick={onSignOut}
              aria-label="Sign out of PoliSmart Africa AI"
              title="Sign out"
            >
              <span>{initials}</span>
              <span>
                <strong>{userName}</strong>
                <small>{roleLabel(role)} · Sign out</small>
              </span>
              <ChevronDown aria-hidden="true" />
            </button>
          </div>
        </header>
        <main id="main-content">{children}</main>
      </div>
      {mobileOpen && (
        <button
          className="nav-scrim"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation overlay"
        />
      )}
    </div>
  );
}
