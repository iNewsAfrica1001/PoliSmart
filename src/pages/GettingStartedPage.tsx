import {
  Bot,
  CheckCircle2,
  FolderOpen,
  LayoutDashboard,
  MapPinned,
  Megaphone,
  CalendarDays,
  UsersRound,
} from "lucide-react";
import type { SessionUser } from "../lib/auth";

type Destination = {
  page: string;
  title: string;
  description: string;
  icon: typeof LayoutDashboard;
};

export function GettingStartedPage({
  user,
  onNavigate,
  onDismiss,
}: {
  user: SessionUser;
  onNavigate: (page: string) => void;
  onDismiss: () => void;
}) {
  const membership = user.memberships[0];
  const destinations: Destination[] = [
    {
      page: "dashboard",
      title: "Review the Command Center",
      description: "See campaign-scoped activity and assigned geographic context.",
      icon: LayoutDashboard,
    },
    {
      page: "campaigns",
      title: "Choose a campaign",
      description: "Campaign selection keeps operational and intelligence work in the correct scope.",
      icon: Megaphone,
    },
    {
      page: "knowledge",
      title: "Open the Knowledge Base",
      description: membership?.canApproveKnowledge
        ? "Upload source material and approve eligible documents before grounded use."
        : "Review campaign source material available to your role.",
      icon: FolderOpen,
    },
    {
      page: "ai",
      title: "Use the AI Assistant",
      description: "Ask factual questions within the selected campaign and assigned geography.",
      icon: Bot,
    },
  ];

  if (membership?.canManageTeam)
    destinations.push({
      page: "team",
      title: "Manage authorized team access",
      description: "Invite team members and review access without sharing credentials.",
      icon: UsersRound,
    });
  if (membership?.canCreateEvents)
    destinations.push({
      page: "events",
      title: "Plan campaign events",
      description: "Create events within the selected campaign and its authorized geography.",
      icon: CalendarDays,
    });
  if (membership?.canCreateVolunteers)
    destinations.push({
      page: "volunteers",
      title: "Coordinate volunteers",
      description: "Add volunteers to the organization roster without assigning unsupported geography.",
      icon: UsersRound,
    });
  if (membership?.canViewCampaignGeography)
    destinations.push({
      page: "campaign-geography",
      title: "Review Campaign Geography",
      description: membership.canManageCampaignGeography
        ? "Review and manage the campaign's authorized operating geography."
        : "Review the campaign's authorized operating geography.",
      icon: MapPinned,
    });

  return (
    <section className="getting-started" aria-labelledby="getting-started-title">
      <header>
        <span className="eyebrow">GETTING STARTED</span>
        <h1 id="getting-started-title">Welcome to your PoliSmartAfrica AI workspace</h1>
        <p>
          Start with the areas available to your organization role. Access checks remain enforced
          by the server, and campaign work stays scoped to the selected tenant and campaign.
        </p>
      </header>
      <div className="getting-started-grid">
        {destinations.map(({ page, title, description, icon: Icon }) => (
          <button
            type="button"
            key={page}
            onClick={() => onNavigate(page)}
            className="getting-started-card"
          >
            <Icon aria-hidden="true" />
            <span>
              <strong>{title}</strong>
              <small>{description}</small>
            </span>
          </button>
        ))}
      </div>
      <div className="getting-started-note">
        <CheckCircle2 aria-hidden="true" />
        <p>
          Need help later? Reopen this guide from <strong>Getting Started</strong> in the workspace
          sidebar or contact support.
        </p>
      </div>
      <button type="button" className="secondary-button" onClick={onDismiss}>
        Skip for now
      </button>
      <p className="getting-started-brand">PoliSmartAfrica AI — A platform of SentinelAI LLC.</p>
    </section>
  );
}
