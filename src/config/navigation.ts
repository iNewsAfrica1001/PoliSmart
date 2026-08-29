import {
  BarChart3,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  ClipboardCheck,
  FileBarChart,
  Landmark,
  LayoutDashboard,
  Megaphone,
  MessageSquareText,
  Radio,
  Settings,
  ShieldCheck,
  WalletCards,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export type NavigationItem = {
  label: string;
  icon: LucideIcon;
  page: string;
  enabled: boolean;
};

export const navigation: NavigationItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, page: "dashboard", enabled: true },
  { label: "AI Assistant", icon: Bot, page: "ai", enabled: true },
  { label: "Knowledge Base", icon: BarChart3, page: "knowledge", enabled: true },
  { label: "Policy", icon: Landmark, page: "policy", enabled: true },
  { label: "Media", icon: Radio, page: "media", enabled: true },
  { label: "Communications", icon: MessageSquareText, page: "communications", enabled: true },
  { label: "Campaigns", icon: Megaphone, page: "campaigns", enabled: true },
  { label: "Field Operations", icon: BriefcaseBusiness, page: "field", enabled: true },
  { label: "Volunteers", icon: UsersRound, page: "volunteers", enabled: true },
  { label: "Events", icon: CalendarDays, page: "events", enabled: true },
  { label: "Reports", icon: FileBarChart, page: "reports", enabled: false },
  { label: "Billing", icon: WalletCards, page: "billing", enabled: false },
  { label: "Compliance", icon: ShieldCheck, page: "compliance", enabled: true },
  { label: "Administration", icon: Settings, page: "administration", enabled: false },
];

export const readinessItems = [
  { label: "Workspace configured", icon: ClipboardCheck, status: "Ready" },
  { label: "Data connections", icon: BarChart3, status: "Not connected" },
  { label: "Team invitations", icon: UsersRound, status: "Not started" },
];
