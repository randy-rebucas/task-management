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

export const updateRoleSchema = z.object({
	name: z.string().min(1).max(50).optional(),
	description: z.string().max(200).optional(),
	permissions: z.array(z.string()).min(1).optional(),
	isActive: z.boolean().optional(),
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

export const updateDepartmentSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	code: z.string().min(1).max(20).toUpperCase().optional(),
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

const taskTypeEnum = z.enum([
	"field_visit",
	"client_meeting",
	"orientation_event",
	"lead_follow_up",
	"proposal_submission",
	"collection_payment",
	"partner_onboarding",
	"internal_task",
]);

const recurringConfigSchema = z.object({
	frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
	interval: z.number().min(1).default(1),
	daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
	endDate: z.string().optional(),
});

export const createSubtaskSchema = z.object({
	title: z.string().min(1).max(200),
	assignee: z.string().optional(),
});

export const updateSubtaskSchema = z.object({
	completed: z.boolean(),
});

// Tasks
export const createTaskSchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]),
    taskType: taskTypeEnum.optional(),
    dueDate: z.string().optional(),
    startDate: z.string().optional(),
    assignees: z.array(z.string()).optional(),
    department: z.string().optional(),
    estimatedHours: z.number().min(0).optional(),
    tags: z.array(z.string()).optional(),
    category: z.string().optional(),
    attachments: z.array(z.string()).optional(),
    dependencies: z.array(z.string()).optional(),
    isRecurring: z.boolean().optional(),
    recurringConfig: recurringConfigSchema.optional(),
    lead: z.string().optional(),
    client: z.string().optional(),
    deal: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.taskType && FIELD_TASK_TYPES_SET.has(data.taskType)) {
      if (!data.lead && !data.client && !data.deal) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Field-type tasks must be linked to a Lead, Client, or Deal.",
          path: ["lead"],
        });
      }
    }
  });

export const updateTaskSchema = z.object({
	title: z.string().min(1).max(200).optional(),
	description: z.string().optional(),
	priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
	taskType: taskTypeEnum.optional(),
	dueDate: z.string().optional(),
	startDate: z.string().optional(),
	assignees: z.array(z.string()).optional(),
	department: z.string().optional(),
	estimatedHours: z.number().min(0).optional(),
	tags: z.array(z.string()).optional(),
	category: z.string().optional(),
	attachments: z.array(z.string()).optional(),
	dependencies: z.array(z.string()).optional(),
	status: z.string().optional(),
	isRecurring: z.boolean().optional(),
	recurringConfig: recurringConfigSchema.optional(),
	lead: z.string().optional(),
	client: z.string().optional(),
	deal: z.string().optional(),
});

export const createCommentSchema = z.object({
	content: z.string().min(1),
	parentComment: z.string().optional(),
});

export const createTimeLogSchema = z.object({
	startTime: z.string().min(1, "Start time is required"),
	endTime: z.string().optional(),
	duration: z.number().min(0),
	description: z.string().optional(),
});

export const assignTaskSchema = z.object({
	assignees: z.array(z.string().min(1)).min(1, "At least one assignee is required"),
	remarks: z.string().optional(),
});

export const createDependencySchema = z.object({
	dependsOn: z.string().min(1),
	type: z.enum(["blocks", "blocked_by", "related"]).default("blocked_by"),
});

export const statusTransitionSchema = z.object({
	toStatusId: z.string().min(1, "Target status is required"),
	remarks: z.string().optional(),
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
	fromStatus: z.string().min(1, "From status is required"),
	toStatus: z.string().min(1, "To status is required"),
	allowedRoles: z.array(z.string()).optional(),
	requiresRemarks: z.boolean().optional(),
	requiresApproval: z.boolean().optional(),
	approverRoles: z.array(z.string()).optional(),
});

export const exportReportSchema = z.object({
	format: z.enum(["csv", "excel", "pdf"]),
});

// CRM
const FIELD_TASK_TYPES_SET = new Set([
  "field_visit",
  "client_meeting",
  "lead_follow_up",
  "proposal_submission",
  "collection_payment",
  "partner_onboarding",
]);

export const createInteractionSchema = z.object({
  type: z.enum(["call", "email", "meeting", "note", "visit"]),
  date: z.string().min(1, "Date is required"),
  summary: z.string().min(1, "Summary is required"),
  outcome: z.string().optional(),
  nextAction: z.string().optional(),
});

export const createCrmAttachmentSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  fileUrl: z.string().min(1, "File URL is required"),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
  documentType: z.enum(["proposal", "contract", "other"]).optional(),
  notes: z.string().optional(),
});

export const createClientSchema = z.object({
  name: z.string().min(1).max(200),
  company: z.string().optional(),
  industry: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().optional(),
  contactPersonName: z.string().optional(),
  contactPersonTitle: z.string().optional(),
  contactPersonPhone: z.string().optional(),
  followUpDate: z.string().optional(),
  assignedTo: z.string().optional(),
  department: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  notes: z.string().optional(),
});

export const updateClientSchema = createClientSchema.partial();

export const createLeadSchema = z.object({
  name: z.string().min(1).max(200),
  company: z.string().optional(),
  industry: z.string().optional(),
  address: z.string().optional(),
  website: z.string().optional(),
  contactPersonTitle: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  source: z.enum(["referral", "cold_call", "social_media", "website", "event", "other"]),
  status: z.enum(["new", "contacted", "qualified", "unqualified", "converted"]).optional(),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
  followUpDate: z.string().optional(),
});

export const updateLeadSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  company: z.string().optional(),
  industry: z.string().optional(),
  address: z.string().optional(),
  website: z.string().optional(),
  contactPersonTitle: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  source: z.enum(["referral", "cold_call", "social_media", "website", "event", "other"]).optional(),
  status: z.enum(["new", "contacted", "qualified", "unqualified", "converted"]).optional(),
  assignedTo: z.string().optional(),
  convertedToClient: z.string().optional(),
  notes: z.string().optional(),
  followUpDate: z.string().optional(),
});

export const createDealSchema = z.object({
  title: z.string().min(1).max(200),
  lead: z.string().optional(),
  client: z.string().optional(),
  stage: z.enum(["prospect", "contacted", "meeting", "proposal", "negotiation", "closed_won", "closed_lost"]).optional(),
  value: z.number().min(0).optional(),
  currency: z.string().optional(),
  probability: z.number().min(0).max(100).optional(),
  expectedCloseDate: z.string().optional(),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
});

export const updateDealSchema = createDealSchema.partial();

// Performance & Incentives
export const createCommissionRuleSchema = z.object({
  department: z.string().optional(),
  jobTitle: z.string().optional(),
  dealCommissionRate: z.number().min(0).max(100).default(5),
  leadConversionBonus: z.number().min(0).default(0),
  bonusThresholds: z.array(z.object({
    minScore: z.number().min(0).max(100),
    bonusAmount: z.number().min(0),
  })).optional(),
  isActive: z.boolean().optional(),
});

export const updateCommissionRuleSchema = createCommissionRuleSchema.partial();

export const createPerformanceTargetSchema = z.object({
  user: z.string().min(1, "User is required"),
  month: z.number().min(1).max(12),
  year: z.number().min(2020),
  targetRevenue: z.number().min(0).default(0),
  targetDeals: z.number().min(0).default(0),
  targetTasks: z.number().min(0).default(0),
  targetLeads: z.number().min(0).default(0),
});

export const updatePerformanceTargetSchema = z.object({
  targetRevenue: z.number().min(0).optional(),
  targetDeals: z.number().min(0).optional(),
  targetTasks: z.number().min(0).optional(),
  targetLeads: z.number().min(0).optional(),
});
// Proof of Work schemas
export const createPartnerLocationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
  radius: z.number().min(10).default(100),
  isActive: z.boolean().optional(),
});

export const updatePartnerLocationSchema = createPartnerLocationSchema.partial();

export const submitProofSchema = z.object({
  task: z.string().min(1, "Task is required"),
  photos: z.array(z.string()).min(1, "At least one photo is required"),
  signatureUrl: z.string().optional(),
  capturedAt: z.string().datetime(),
  capturedLocation: z.object({ lat: z.number(), lng: z.number() }).optional(),
  qrCheckIn: z.object({
    partnerLocation: z.string(),
    scannedAt: z.string().datetime(),
  }).optional(),
  notes: z.string().optional(),
});

export const verifyProofSchema = z.object({
  verificationStatus: z.enum(["verified", "rejected"]),
  rejectionReason: z.string().optional(),
});
