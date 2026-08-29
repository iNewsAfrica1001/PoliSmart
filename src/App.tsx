import { useEffect, useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import { authApi, type SessionUser } from "./lib/auth";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { OperationsPage } from "./pages/OperationsPage";
import { KnowledgePage } from "./pages/KnowledgePage";
import { AssistantPage } from "./pages/AssistantPage";
import { IntelligenceWorkflowsPage } from "./pages/IntelligenceWorkflowsPage";
import { GovernancePage } from "./pages/GovernancePage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { LegalPage } from "./pages/LegalPage";

const pageTitles: Record<string, string> = {
  dashboard: "Dashboard",
  ai: "AI Assistant",
  knowledge: "Knowledge Base",
  policy: "Policy Center",
  media: "Media Monitoring",
  communications: "Communications Studio",
  campaigns: "Campaigns",
  field: "Field Operations",
  volunteers: "Volunteers",
  events: "Events",
  compliance: "Compliance",
};

export default function App() {
  const currentUrl = new URL(window.location.href);
  if (currentUrl.pathname === "/privacy") {
    document.title = "Privacy Policy | PoliSmart Africa AI";
    return <LegalPage kind="privacy" />;
  }
  if (currentUrl.pathname === "/terms") {
    document.title = "Terms of Service | PoliSmart Africa AI";
    return <LegalPage kind="terms" />;
  }
  if (currentUrl.pathname === "/reset-password") {
    document.title = "Reset password | PoliSmart Africa AI";
    return <ResetPasswordPage token={currentUrl.searchParams.get("token") ?? ""} />;
  }
  if (currentUrl.pathname === "/verify-email") {
    document.title = "Verify email | PoliSmart Africa AI";
    return <VerifyEmailPage token={currentUrl.searchParams.get("token") ?? ""} />;
  }
  return <WorkspaceApp />;
}

function WorkspaceApp() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("dashboard");
  useEffect(() => {
    authApi
      .me()
      .then(({ user: current }) => setUser(current))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    document.title = user
      ? `${pageTitles[page] || "Workspace"} | PoliSmart Africa AI`
      : "PoliSmart Africa AI | Grounded campaign intelligence";
  }, [page, user]);
  if (loading)
    return (
      <div className="session-loading" role="status">
        Loading secure workspace…
      </div>
    );
  if (!user)
    return (
      <LoginPage
        onContinue={async (email, password) => {
          const result = await authApi.login(email, password);
          setUser(result.user);
        }}
      />
    );
  const membership = user.memberships[0];
  return (
    <AppShell
      activePage={page}
      userName={user.displayName}
      workspaceName={membership?.organization.name || "Organization workspace"}
      role={membership?.role || "MEMBER"}
      onNavigate={setPage}
      onSignOut={() => {
        void authApi.logout().finally(() => setUser(null));
      }}
    >
      {page === "dashboard" ? (
        <DashboardPage user={user} onCreateCampaign={() => setPage("campaigns")} />
      ) : page === "ai" ? (
        <AssistantPage user={user} onCreateCampaign={() => setPage("campaigns")} />
      ) : page === "policy" || page === "media" || page === "communications" ? (
        <IntelligenceWorkflowsPage user={user} module={page} />
      ) : page === "compliance" ? (
        <GovernancePage user={user} />
      ) : page === "knowledge" ? (
        <KnowledgePage user={user} />
      ) : (
        <OperationsPage
          user={user}
          section={page as "campaigns" | "field" | "volunteers" | "events"}
          onOpenDashboard={() => setPage("dashboard")}
        />
      )}
    </AppShell>
  );
}
