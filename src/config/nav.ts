import {
  LayoutDashboard,
  CheckSquare,
  ListTodo,
  Users,
  Shield,
  Building2,
  GitBranch,
  Bell,
  BarChart3,
  ScrollText,
  Settings,
  MapPin,
  TrendingUp,
  Briefcase,
  UserPlus,
  KanbanSquare,
  CalendarDays,
  Trophy,
  ShieldCheck,
  LineChart,
  Smartphone,
  CreditCard,
  UserCircle,
  Zap,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Single permission required (AND). */
  permission?: string;
  /** Any one of these permissions is sufficient (OR). Overrides `permission` when set. */
  permissions?: string[];
  group?: string;
  children?: NavItem[];
}

export const navItems: NavItem[] = [
  // ── Main ──────────────────────────────────────────
  { group: "Main",   title: "Dashboard",    href: "/dashboard",  icon: LayoutDashboard },
  { group: "Main",   title: "My Tasks",     href: "/my-tasks",   icon: CheckSquare },
  { group: "Main",   title: "Calendar",     href: "/calendar",   icon: CalendarDays },
  { group: "Main",   title: "Notifications",href: "/notifications", icon: Bell },

  // ── Tasks & Workflow ────────────────────────────
  { group: "Tasks & Workflow", title: "All Tasks",     href: "/tasks",        icon: ListTodo,   permission: "tasks:view_all" },
  { group: "Tasks & Workflow", title: "Workflow",      href: "/workflow",     icon: GitBranch,  permission: "workflow:configure" },
  { group: "Tasks & Workflow", title: "Proof of Work", href: "/proof-of-work", icon: ShieldCheck, permissions: ["proof_of_work:view", "proof_of_work:submit"] },

  // ── Field ────────────────────────────────────────
  { group: "Field",  title: "Field Hub",        href: "/field",           icon: Smartphone, permission: "visit_logs:create" },
  { group: "Field",  title: "Field Monitoring",  href: "/field-monitoring", icon: MapPin,     permission: "visit_logs:view_all" },
  { group: "Field",  title: "Visit Logs",        href: "/visit-logs",      icon: ScrollText, permission: "visit_logs:view" },

  // ── CRM & Sales ──────────────────────────────────
  {
    group: "CRM & Sales",
    title: "CRM",
    href: "/crm",
    icon: Briefcase,
    permission: "crm:view",
    children: [
      { title: "Leads",    href: "/crm/leads",    icon: UserPlus },
      { title: "Clients",  href: "/crm/clients",  icon: Building2 },
      { title: "Pipeline", href: "/crm/pipeline", icon: KanbanSquare },
    ],
  },

  // ── Performance & Analytics ──────────────────────
  { group: "Analytics", title: "KPI Dashboard", href: "/kpi",          icon: TrendingUp },
  { group: "Analytics", title: "Analytics",     href: "/analytics",    icon: LineChart,  permission: "reports:view" },
  { group: "Analytics", title: "Performance",   href: "/performance",  icon: Trophy,     permission: "performance:view" },
  { group: "Analytics", title: "Reports",       href: "/reports",      icon: BarChart3,  permission: "reports:view" },
  { group: "Analytics", title: "Activity Log",  href: "/activity-log", icon: ScrollText, permission: "activity_logs:view" },

  // ── People & Org ─────────────────────────────────
  { group: "People & Org", title: "Staff",       href: "/staff",       icon: Users,     permission: "users:view" },
  { group: "People & Org", title: "Roles",       href: "/roles",       icon: Shield,    permission: "roles:view" },
  { group: "People & Org", title: "Departments", href: "/departments", icon: Building2, permission: "departments:view" },

  // ── Support ──────────────────────────────────────
  { group: "Support", title: "Knowledgebase", href: "/knowledgebase", icon: BookOpen },
  {
    group: "Support",
    title: "Settings",
    href: "/settings",
    icon: Settings,
    children: [
      { title: "General",      href: "/settings",              icon: Settings,    permission: "settings:manage" },
      { title: "Profile",      href: "/settings/profile",      icon: UserCircle },
      { title: "Subscription", href: "/settings/subscription", icon: Zap, permission: "subscriptions:manage" },
      { title: "Billing",      href: "/settings/billing",      icon: CreditCard,  permission: "settings:manage" },
    ],
  },
];
