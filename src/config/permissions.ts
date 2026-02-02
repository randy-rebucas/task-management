export const PERMISSIONS = [
  // Task Management
  { resource: "tasks", action: "create", description: "Create new tasks", group: "Task Management" },
  { resource: "tasks", action: "view", description: "View own/assigned tasks", group: "Task Management" },
  { resource: "tasks", action: "view_all", description: "View all tasks across departments", group: "Task Management" },
  { resource: "tasks", action: "update", description: "Update task details", group: "Task Management" },
  { resource: "tasks", action: "delete", description: "Delete/archive tasks", group: "Task Management" },
  { resource: "tasks", action: "assign", description: "Assign tasks to staff", group: "Task Management" },
  { resource: "tasks", action: "reassign", description: "Reassign tasks", group: "Task Management" },
  { resource: "tasks", action: "approve", description: "Approve task completion", group: "Task Management" },

  // User Management
  { resource: "users", action: "create", description: "Create new users", group: "User Management" },
  { resource: "users", action: "view", description: "View user list and profiles", group: "User Management" },
  { resource: "users", action: "update", description: "Update user details", group: "User Management" },
  { resource: "users", action: "delete", description: "Deactivate users", group: "User Management" },
  { resource: "users", action: "import", description: "Bulk import users via CSV", group: "User Management" },

  // Role Management
  { resource: "roles", action: "create", description: "Create new roles", group: "Role Management" },
  { resource: "roles", action: "view", description: "View roles and permissions", group: "Role Management" },
  { resource: "roles", action: "update", description: "Update roles", group: "Role Management" },
  { resource: "roles", action: "delete", description: "Delete custom roles", group: "Role Management" },
  { resource: "roles", action: "clone", description: "Clone existing roles", group: "Role Management" },

  // Department Management
  { resource: "departments", action: "create", description: "Create departments", group: "Department Management" },
  { resource: "departments", action: "view", description: "View departments", group: "Department Management" },
  { resource: "departments", action: "update", description: "Update departments", group: "Department Management" },
  { resource: "departments", action: "delete", description: "Delete departments", group: "Department Management" },

  // Workflow Configuration
  { resource: "workflow", action: "configure", description: "Configure task statuses and transitions", group: "Workflow" },

  // Reports
  { resource: "reports", action: "view", description: "View reports and analytics", group: "Reports" },
  { resource: "reports", action: "export", description: "Export reports to PDF/Excel/CSV", group: "Reports" },

  // Activity Logs
  { resource: "activity_logs", action: "view", description: "View activity and audit logs", group: "Audit" },

  // Notifications
  { resource: "notifications", action: "manage_rules", description: "Configure notification rules", group: "Notifications" },

  // Dashboards
  { resource: "dashboard", action: "admin", description: "Access admin dashboard", group: "Dashboards" },
  { resource: "dashboard", action: "manager", description: "Access manager dashboard", group: "Dashboards" },
  { resource: "dashboard", action: "staff", description: "Access staff dashboard", group: "Dashboards" },
] as const;

export const ROLE_DEFINITIONS = {
  "super-admin": {
    name: "Super Admin",
    description: "Full system access with all permissions",
    permissions: PERMISSIONS.map((p) => `${p.resource}:${p.action}`),
  },
  admin: {
    name: "Admin",
    description: "System administration without workflow configuration",
    permissions: PERMISSIONS.filter(
      (p) => p.resource !== "workflow"
    ).map((p) => `${p.resource}:${p.action}`),
  },
  manager: {
    name: "Manager",
    description: "Team and task management with reporting access",
    permissions: [
      "tasks:create", "tasks:view", "tasks:view_all", "tasks:update", "tasks:assign",
      "tasks:reassign", "tasks:approve",
      "users:view",
      "roles:view",
      "departments:view",
      "reports:view", "reports:export",
      "activity_logs:view",
      "dashboard:manager", "dashboard:staff",
    ],
  },
  staff: {
    name: "Staff",
    description: "Task execution and personal task management",
    permissions: [
      "tasks:create", "tasks:view", "tasks:update",
      "users:view",
      "departments:view",
      "dashboard:staff",
    ],
  },
  viewer: {
    name: "Viewer",
    description: "Read-only access to tasks and reports",
    permissions: [
      "tasks:view",
      "users:view",
      "departments:view",
      "reports:view",
      "dashboard:staff",
    ],
  },
} as const;

export const DEFAULT_WORKFLOW_STATUSES = [
  { name: "To Do", slug: "to-do", color: "#6b7280", order: 1, isDefault: true, isFinal: false },
  { name: "In Progress", slug: "in-progress", color: "#3b82f6", order: 2, isDefault: false, isFinal: false },
  { name: "On Hold", slug: "on-hold", color: "#f59e0b", order: 3, isDefault: false, isFinal: false },
  { name: "For Review", slug: "for-review", color: "#8b5cf6", order: 4, isDefault: false, isFinal: false },
  { name: "Completed", slug: "completed", color: "#10b981", order: 5, isDefault: false, isFinal: true },
  { name: "Cancelled", slug: "cancelled", color: "#ef4444", order: 6, isDefault: false, isFinal: true },
];
