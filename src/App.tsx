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

export default function App() {
  const currentUrl = new URL(window.location.href);
  if (currentUrl.pathname === "/reset-password")
    return <ResetPasswordPage token={currentUrl.searchParams.get("token") ?? ""} />;
  if (currentUrl.pathname === "/verify-email")
    return <VerifyEmailPage token={currentUrl.searchParams.get("token") ?? ""} />;
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
  return (
    <AppShell
      activePage={page}
      onNavigate={setPage}
      onSignOut={() => {
        void authApi.logout().finally(() => setUser(null));
      }}
    >
      {page === "dashboard" ? (
        <DashboardPage user={user} />
      ) : page === "ai" ? (
        <AssistantPage user={user} />
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
        />
      )}
    </AppShell>
  );
}
