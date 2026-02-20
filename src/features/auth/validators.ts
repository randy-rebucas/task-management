import { z } from "zod";

// Visit Logs
export const createVisitLogSchema = z.object({
	placesVisited: z.string().min(1),
	peopleMet: z.string().min(1),
	purpose: z.string().min(1),
	outcome: z.string().min(1),
	nextAction: z.string().min(1),
	photos: z.array(z.string()).optional(),
});
// Notification Rules
export const createNotificationRuleSchema = z.object({
	event: z.string().min(1),
	channels: z.array(z.enum(["in_app", "email"])).min(1),
	recipientStrategy: z.enum(["assignees", "creator", "department_head", "specific_roles"]),
	recipientRoles: z.array(z.string()).optional(),
	deadlineThresholdHours: z.number().optional(),
	isActive: z.boolean().optional(),
});
// Roles
export const createRoleSchema = z.object({
	name: z.string().min(1).max(50),
	description: z.string().max(200).optional(),
	permissions: z.array(z.string()).min(1),
});
// Departments
export const createDepartmentSchema = z.object({
	name: z.string().min(1).max(100),
	code: z.string().min(1).max(20).toUpperCase(),
	description: z.string().optional(),
	head: z.string().optional(),
	parentDepartment: z.string().optional(),
	isActive: z.boolean().optional(),
});

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
	department: z.string().optional(),
	team: z.string().optional(),
	jobTitle: z.string().optional(),
	phone: z.string().optional(),
	isActive: z.boolean().optional(),
});

// Tasks
export const createTaskSchema = z.object({
	title: z.string().min(1).max(200),
	description: z.string().optional(),
	priority: z.enum(["low", "medium", "high", "urgent"]),
	dueDate: z.string().optional(),
	assignee: z.string().optional(),
	department: z.string().optional(),
	attachments: z.array(z.string()).optional(),
	dependencies: z.array(z.string()).optional(),
});

export const updateTaskSchema = z.object({
	title: z.string().min(1).max(200).optional(),
	description: z.string().optional(),
	priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
	dueDate: z.string().optional(),
	assignee: z.string().optional(),
	department: z.string().optional(),
	attachments: z.array(z.string()).optional(),
	dependencies: z.array(z.string()).optional(),
	status: z.string().optional(),
});

export const createCommentSchema = z.object({
	content: z.string().min(1),
});

export const createTimeLogSchema = z.object({
	duration: z.number().min(1),
	note: z.string().optional(),
});

export const assignTaskSchema = z.object({
	assignee: z.string().min(1),
});

export const createDependencySchema = z.object({
	dependencyId: z.string().min(1),
});

export const statusTransitionSchema = z.object({
	status: z.string().min(1),
});

export const createWorkflowStatusSchema = z.object({
	name: z.string().min(1),
	slug: z.string().min(1),
	color: z.string().min(1),
	order: z.number().min(1),
	isDefault: z.boolean(),
	isFinal: z.boolean(),
});

export const createTransitionSchema = z.object({
	from: z.string().min(1),
	to: z.string().min(1),
	name: z.string().min(1),
});

export const exportReportSchema = z.object({
	format: z.enum(["csv", "excel", "pdf"]),
});