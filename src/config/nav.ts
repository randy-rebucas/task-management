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
    title: "My Tasks",
    href: "/my-tasks",
    icon: CheckSquare,
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
    title: "Settings",
    href: "/settings",
    icon: Settings,
    permission: "notifications:manage_rules",
  },
];
