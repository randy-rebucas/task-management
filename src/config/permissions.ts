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

  // Visit Logs
  { resource: "visit_logs", action: "create", description: "Submit new visit logs", group: "Visit Logs" },
  { resource: "visit_logs", action: "view", description: "View own visit logs", group: "Visit Logs" },
  { resource: "visit_logs", action: "view_all", description: "View all users' visit logs", group: "Visit Logs" },
  { resource: "visit_logs", action: "delete", description: "Delete visit log entries", group: "Visit Logs" },

  // Dashboards
  { resource: "dashboard", action: "admin", description: "Access admin dashboard", group: "Dashboards" },
  { resource: "dashboard", action: "manager", description: "Access manager dashboard", group: "Dashboards" },
  { resource: "dashboard", action: "staff", description: "Access staff dashboard", group: "Dashboards" },

  // CRM
  { resource: "crm", action: "view", description: "View leads, clients, and deals", group: "CRM" },
  { resource: "crm", action: "create", description: "Create leads, clients, and deals", group: "CRM" },
  { resource: "crm", action: "update", description: "Update leads, clients, and deals", group: "CRM" },
  { resource: "crm", action: "delete", description: "Delete leads, clients, and deals", group: "CRM" },

  // Performance
  { resource: "performance", action: "view", description: "View performance targets and summaries", group: "Performance" },
  { resource: "performance", action: "manage", description: "Set and manage performance targets", group: "Performance" },

  // Proof of Work
  { resource: "proof_of_work", action: "view", description: "View proof of work submissions and locations", group: "Proof of Work" },
  { resource: "proof_of_work", action: "submit", description: "Submit proof of work entries", group: "Proof of Work" },
  { resource: "proof_of_work", action: "manage", description: "Manage proof of work locations and review/delete submissions", group: "Proof of Work" },

  // Settings (admin-only)
  { resource: "settings", action: "manage", description: "Manage system settings and billing configuration", group: "Settings" },

  // Subscriptions
  { resource: "subscriptions", action: "manage", description: "Manage account subscription — cancel, upgrade (owner only)", group: "Subscriptions" },
] as const;

export const ROLE_DEFINITIONS = {
  "super-admin": {
    name: "Super Admin",
    description: "Full system access with all permissions",
    permissions: PERMISSIONS.map((p) => `${p.resource}:${p.action}`),
  },
  "operations-manager": {
    name: "Operations Manager",
    description: "Oversees operations, manages tasks and teams across departments with full reporting access",
    permissions: [
      "tasks:create", "tasks:view", "tasks:view_all", "tasks:update", "tasks:delete",
      "tasks:assign", "tasks:reassign", "tasks:approve",
      "users:view", "users:update",
      "departments:create", "departments:view", "departments:update",
      "reports:view", "reports:export",
      "activity_logs:view",
      "visit_logs:create", "visit_logs:view", "visit_logs:view_all", "visit_logs:delete",
      "notifications:manage_rules",
      "dashboard:manager", "dashboard:staff",
      "crm:view", "crm:create", "crm:update", "crm:delete",
      "performance:view", "performance:manage",
      "proof_of_work:view", "proof_of_work:manage",
    ],
  },
  "field-coordinator": {
    name: "Field Coordinator",
    description: "Coordinates field activities, assigns tasks, and tracks visit logs across teams",
    permissions: [
      "tasks:create", "tasks:view", "tasks:view_all", "tasks:update", "tasks:assign",
      "users:view",
      "departments:view",
      "reports:view",
      "activity_logs:view",
      "visit_logs:create", "visit_logs:view", "visit_logs:view_all",
      "dashboard:manager", "dashboard:staff",
      "crm:view", "crm:create", "crm:update",
      "performance:view",
      "proof_of_work:view", "proof_of_work:submit", "proof_of_work:manage",
    ],
  },
  "sales-officer": {
    name: "Sales Officer",
    description: "Manages sales-related tasks and logs field visits",
    permissions: [
      "tasks:create", "tasks:view", "tasks:update",
      "users:view",
      "departments:view",
      "visit_logs:create", "visit_logs:view",
      "dashboard:staff",
      "crm:view", "crm:create", "crm:update",
      "proof_of_work:submit",
    ],
  },
  "partner-onboarding-officer": {
    name: "Partner Onboarding Officer",
    description: "Handles partner onboarding tasks and manages new user creation",
    permissions: [
      "tasks:create", "tasks:view", "tasks:update",
      "users:create", "users:view",
      "departments:view",
      "visit_logs:create", "visit_logs:view",
      "dashboard:staff",
      "crm:view", "crm:create", "crm:update",
      "proof_of_work:submit",
    ],
  },
  finance: {
    name: "Finance",
    description: "Reviews task progress and generates financial and operational reports",
    permissions: [
      "tasks:view", "tasks:view_all",
      "users:view",
      "departments:view",
      "reports:view", "reports:export",
      "activity_logs:view",
      "visit_logs:view", "visit_logs:view_all",
      "dashboard:staff",
      "crm:view",
      "performance:view",
      "proof_of_work:view",
    ],
  },
  "viewer-auditor": {
    name: "Viewer / Auditor",
    description: "Read-only access to tasks, reports, audit logs, and visit logs for compliance review",
    permissions: [
      "tasks:view", "tasks:view_all",
      "users:view",
      "roles:view",
      "departments:view",
      "reports:view", "reports:export",
      "activity_logs:view",
      "visit_logs:view", "visit_logs:view_all",
      "dashboard:staff",
      "crm:view",
      "performance:view",
      "proof_of_work:view",
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
