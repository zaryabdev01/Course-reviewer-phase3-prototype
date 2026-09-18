import type { AccountType, OrganisationRole } from "@/contracts";
import {
  LayoutDashboard,
  Library,
  FolderPlus,
  Store,
  ClipboardCheck,
  Building2,
  Users,
  Grid3x3,
  CalendarClock,
  Share2,
  FileBarChart,
  Download,
  MessageSquare,
  Bell,
  CreditCard,
  ShieldCheck,
  Building,
  UserCog,
} from "lucide-react";
import type { ComponentType } from "react";

export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  accountTypes: AccountType[];
  orgRoles?: OrganisationRole[]; // only checked when accountType === "organisational"
  badgeKey?: "notifications" | "usageAlerts";
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      {
        to: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        accountTypes: ["professional", "organisational", "platform_admin", "platform_super_admin"],
      },
    ],
  },
  {
    title: "Learning",
    items: [
      {
        to: "/content-library",
        label: "Content Library",
        icon: Library,
        accountTypes: ["professional", "organisational"],
        orgRoles: ["org_administrator", "org_manager"],
      },
      {
        to: "/development",
        label: "Development",
        icon: FolderPlus,
        accountTypes: ["professional", "organisational"],
      },
      {
        to: "/learning-exchange",
        label: "Learning Exchange",
        icon: Store,
        accountTypes: ["professional", "organisational"],
      },
      {
        to: "/allocations",
        label: "Allocation",
        icon: ClipboardCheck,
        accountTypes: ["organisational"],
        orgRoles: ["org_administrator", "org_manager"],
      },
    ],
  },
  {
    title: "Organisation",
    items: [
      {
        to: "/org/structure",
        label: "Org Structure & Teams",
        icon: Building2,
        accountTypes: ["organisational"],
        orgRoles: ["org_administrator"],
      },
      {
        to: "/org/team",
        label: "Team",
        icon: Users,
        accountTypes: ["organisational"],
        orgRoles: ["org_administrator", "org_manager"],
      },
    ],
  },
  {
    title: "Training Matrix",
    items: [
      {
        to: "/matrix",
        label: "Compliance Matrix",
        icon: Grid3x3,
        accountTypes: ["organisational"],
        orgRoles: ["org_administrator", "org_manager"],
      },
      {
        to: "/workforce",
        label: "Workforce Planner",
        icon: CalendarClock,
        accountTypes: ["organisational"],
        orgRoles: ["org_administrator", "org_manager"],
      },
    ],
  },
  {
    title: "Distribution Hub",
    items: [
      {
        to: "/distribution-hub",
        label: "Leasing & Delivery",
        icon: Share2,
        accountTypes: ["organisational"],
        orgRoles: ["org_administrator"],
      },
    ],
  },
  {
    title: "Insights",
    items: [
      {
        to: "/reports",
        label: "Reports",
        icon: FileBarChart,
        accountTypes: ["professional", "organisational"],
      },
      {
        to: "/downloads",
        label: "Downloads",
        icon: Download,
        accountTypes: ["professional", "organisational"],
      },
    ],
  },
  {
    title: "Connect",
    items: [
      {
        to: "/messages",
        label: "Messages",
        icon: MessageSquare,
        accountTypes: ["professional", "organisational"],
      },
      {
        to: "/notifications",
        label: "Notifications",
        icon: Bell,
        accountTypes: ["professional", "organisational", "platform_admin", "platform_super_admin"],
        badgeKey: "notifications",
      },
    ],
  },
  {
    title: "Billing & Compliance",
    items: [
      {
        to: "/billing",
        label: "Billing & Revenue",
        icon: CreditCard,
        accountTypes: ["professional", "organisational"],
        orgRoles: ["org_administrator"],
      },
      {
        to: "/audit-log",
        label: "Audit Log",
        icon: ShieldCheck,
        accountTypes: ["organisational", "platform_admin", "platform_super_admin"],
        orgRoles: ["org_administrator"],
      },
    ],
  },
  {
    title: "Platform Admin",
    items: [
      {
        to: "/platform/organisations",
        label: "Organisations",
        icon: Building,
        accountTypes: ["platform_admin", "platform_super_admin"],
      },
      {
        to: "/platform/users",
        label: "Users & Roles",
        icon: UserCog,
        accountTypes: ["platform_admin", "platform_super_admin"],
      },
    ],
  },
];

export function navSectionsFor(accountType: AccountType, orgRole?: OrganisationRole): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (!item.accountTypes.includes(accountType)) return false;
      if (accountType === "organisational" && item.orgRoles) {
        return orgRole ? item.orgRoles.includes(orgRole) : false;
      }
      return true;
    }),
  })).filter((section) => section.items.length > 0);
}
