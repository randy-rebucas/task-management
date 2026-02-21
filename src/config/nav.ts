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
  permission?: string;
  children?: NavItem[];
}

export const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Field Hub",
    href: "/field",
    icon: Smartphone,
  },
  {
    title: "My Tasks",
    href: "/my-tasks",
    icon: CheckSquare,
  },
  {
    title: "Calendar",
    href: "/calendar",
    icon: CalendarDays,
  },
  {
    title: "All Tasks",
    href: "/tasks",
    icon: ListTodo,
    permission: "tasks:view_all",
  },
  {
    title: "Staff",
    href: "/staff",
    icon: Users,
    permission: "users:view",
  },
  {
    title: "Roles",
    href: "/roles",
    icon: Shield,
    permission: "roles:view",
  },
  {
    title: "Departments",
    href: "/departments",
    icon: Building2,
    permission: "departments:view",
  },
  {
    title: "Workflow",
    href: "/workflow",
    icon: GitBranch,
    permission: "workflow:configure",
  },
  {
    title: "Notifications",
    href: "/notifications",
    icon: Bell,
  },
  {
    title: "Reports",
    href: "/reports",
    icon: BarChart3,
    permission: "reports:view",
  },
  {
    title: "Activity Log",
    href: "/activity-log",
    icon: ScrollText,
    permission: "activity_logs:view",
  },
  {
    title: "Visit Logs",
    href: "/visit-logs",
    icon: ScrollText,
  },
  {
    title: "Field Monitoring",
    href: "/field-monitoring",
    icon: MapPin,
  },
  {
    title: "KPI Dashboard",
    href: "/kpi",
    icon: TrendingUp,
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: LineChart,
    permission: "reports:view",
  },
  {
    title: "Performance",
    href: "/performance",
    icon: Trophy,
    permission: "performance:view",
  },
  {
    title: "Proof of Work",
    href: "/proof-of-work",
    icon: ShieldCheck,
    permission: "proof_of_work:view",
  },
  {
    title: "CRM",
    href: "/crm",
    icon: Briefcase,
    permission: "crm:view",
    children: [
      { title: "Leads", href: "/crm/leads", icon: UserPlus },
      { title: "Clients", href: "/crm/clients", icon: Building2 },
      { title: "Pipeline", href: "/crm/pipeline", icon: KanbanSquare },
    ],
  },
  {
    title: "Knowledgebase",
    href: "/knowledgebase",
    icon: BookOpen,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    permission: "notifications:manage_rules",
    children: [
      { title: "General",      href: "/settings",              icon: Settings,    permission: "notifications:manage_rules" },
      { title: "Profile",      href: "/settings/profile",      icon: UserCircle },
      { title: "Subscription", href: "/settings/subscription", icon: Zap },
      { title: "Billing",      href: "/settings/billing",      icon: CreditCard,  permission: "settings:manage" },
    ],
  },
];
