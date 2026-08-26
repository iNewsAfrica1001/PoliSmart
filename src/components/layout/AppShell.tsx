import { Bell, ChevronDown, Menu, Search, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { navigation } from "../../config/navigation";

type AppShellProps = {
  children: ReactNode;
  onSignOut: () => void;
  activePage: string;
  onNavigate: (page: string) => void;
};

export function AppShell({ children, onSignOut, activePage, onNavigate }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

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
            <strong>PoliSmart</strong>
            <small>AFRICA AI</small>
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
          {navigation.map(({ label, icon: Icon, page, enabled }) => (
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
          <strong>Sentinel LLC</strong>
          <small>Foundation environment</small>
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
          <div className="search">
            <Search aria-hidden="true" />
            <label className="sr-only" htmlFor="global-search">
              Search workspace
            </label>
            <input id="global-search" placeholder="Search workspace" disabled />
          </div>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="Notifications" disabled>
              <Bell />
            </button>
            <button className="profile-menu" onClick={onSignOut}>
              <span>SL</span>
              <span>
                <strong>Sentinel LLC</strong>
                <small>Administrator</small>
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
