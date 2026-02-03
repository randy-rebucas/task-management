import { z } from "zod";

// Auth
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

// Users
export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  roles: z.array(z.string()).min(1),
  department: z.string().optional(),
  team: z.string().optional(),
  jobTitle: z.string().optional(),
  phone: z.string().optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  roles: z.array(z.string()).min(1).optional(),
  department: z.string().nullable().optional(),
  team: z.string().optional(),
  jobTitle: z.string().optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

// Roles
export const createRoleSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().optional(),
  permissions: z.array(z.string()).min(1),
});

export const updateRoleSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

// Departments
export const createDepartmentSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(10).toUpperCase(),
  description: z.string().optional(),
  head: z.string().optional(),
  parentDepartment: z.string().optional(),
});

export const updateDepartmentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  code: z.string().min(1).max(10).toUpperCase().optional(),
  description: z.string().optional(),
  head: z.string().nullable().optional(),
  parentDepartment: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

// Tasks
export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  category: z.string().optional(),
  assignees: z.array(z.string()).optional(),
  dueDate: z.string().optional(),
  startDate: z.string().optional(),
  estimatedHours: z.number().min(0).optional(),
  tags: z.array(z.string()).optional(),
  department: z.string().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  category: z.string().optional(),
  assignees: z.array(z.string()).optional(),
  dueDate: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  estimatedHours: z.number().min(0).nullable().optional(),
  tags: z.array(z.string()).optional(),
  department: z.string().nullable().optional(),
});

export const statusTransitionSchema = z.object({
  toStatusId: z.string(),
  remarks: z.string().optional(),
});

export const assignTaskSchema = z.object({
  assignees: z.array(z.string()).min(1),
  remarks: z.string().optional(),
});

// Comments
export const createCommentSchema = z.object({
  content: z.string().min(1),
  parentComment: z.string().optional(),
});

// Time Logs
export const createTimeLogSchema = z.object({
  startTime: z.string(),
  endTime: z.string().optional(),
  duration: z.number().min(0),
  description: z.string().optional(),
});

// Dependencies
export const createDependencySchema = z.object({
  dependsOn: z.string(),
  type: z.enum(["blocks", "blocked_by", "related"]).default("blocked_by"),
});

// Workflow
export const createWorkflowStatusSchema = z.object({
  name: z.string().min(1).max(50),
  slug: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  order: z.number().int().min(0),
  isDefault: z.boolean().optional(),
  isFinal: z.boolean().optional(),
});

export const createTransitionSchema = z.object({
  fromStatus: z.string(),
  toStatus: z.string(),
  allowedRoles: z.array(z.string()).optional(),
  requiresRemarks: z.boolean().optional(),
  requiresApproval: z.boolean().optional(),
  approverRoles: z.array(z.string()).optional(),
});

// Notification Rules
export const createNotificationRuleSchema = z.object({
  event: z.string().min(1),
  channels: z.array(z.enum(["in_app", "email"])).min(1),
  recipientStrategy: z.enum(["assignees", "creator", "department_head", "specific_roles"]),
  recipientRoles: z.array(z.string()).optional(),
  deadlineThresholdHours: z.number().optional(),
});

// Export
export const exportReportSchema = z.object({
  type: z.enum(["task-summary", "staff-workload", "overdue"]),
  format: z.enum(["pdf", "excel", "csv"]),
  filters: z.record(z.string(), z.unknown()).optional(),
});
