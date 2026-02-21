import { Types } from "mongoose";

export interface IVisitLog {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  placesVisited: string;
  peopleMet: string;
  purpose: string;
  outcome: string;
  nextAction: string;
  photos: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IPermission {
  _id: Types.ObjectId;
  resource: string;
  action: string;
  description: string;
  group: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRole {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  permissions: Types.ObjectId[] | IPermission[];
  isSystem: boolean;
  isActive: boolean;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUser {
  _id: Types.ObjectId;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  phone?: string;
  roles: Types.ObjectId[] | IRole[];
  department?: Types.ObjectId;
  team?: string;
  jobTitle?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IDepartment {
  _id: Types.ObjectId;
  name: string;
  code: string;
  description?: string;
  head?: Types.ObjectId;
  parentDepartment?: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type TaskType =
  | "field_visit"
  | "client_meeting"
  | "orientation_event"
  | "lead_follow_up"
  | "proposal_submission"
  | "collection_payment"
  | "partner_onboarding"
  | "internal_task";

export interface ISubtask {
  _id: Types.ObjectId;
  title: string;
  completed: boolean;
  completedAt?: Date;
  assignee?: Types.ObjectId;
}

export type DealStage =
  | "prospect"
  | "contacted"
  | "meeting"
  | "proposal"
  | "negotiation"
  | "closed_won"
  | "closed_lost";

export type LeadStatus = "new" | "contacted" | "qualified" | "unqualified" | "converted";
export type LeadSource = "referral" | "cold_call" | "social_media" | "website" | "event" | "other";

export interface IClient {
  _id: Types.ObjectId;
  name: string;
  company?: string;
  industry?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  contactPersonName?: string;
  contactPersonTitle?: string;
  contactPersonPhone?: string;
  assignedTo?: Types.ObjectId;
  department?: Types.ObjectId;
  status: "active" | "inactive";
  notes?: string;
  followUpDate?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILead {
  _id: Types.ObjectId;
  name: string;
  company?: string;
  industry?: string;
  address?: string;
  website?: string;
  contactPersonTitle?: string;
  email?: string;
  phone?: string;
  source: LeadSource;
  status: LeadStatus;
  assignedTo?: Types.ObjectId;
  convertedToClient?: Types.ObjectId;
  notes?: string;
  followUpDate?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type CrmInteractionType = "call" | "email" | "meeting" | "note" | "visit";

export interface ICrmInteraction {
  _id: Types.ObjectId;
  lead?: Types.ObjectId;
  client?: Types.ObjectId;
  type: CrmInteractionType;
  date: Date;
  summary: string;
  outcome?: string;
  nextAction?: string;
  loggedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICrmAttachment {
  _id: Types.ObjectId;
  lead?: Types.ObjectId;
  client?: Types.ObjectId;
  deal?: Types.ObjectId;
  uploadedBy: Types.ObjectId;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  documentType: "proposal" | "contract" | "other";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDeal {
  _id: Types.ObjectId;
  title: string;
  lead?: Types.ObjectId;
  client?: Types.ObjectId;
  stage: DealStage;
  value: number;
  currency: string;
  probability: number;
  expectedCloseDate?: Date;
  assignedTo?: Types.ObjectId;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITask {
  _id: Types.ObjectId;
  taskNumber: string;
  title: string;
  description: string;
  status: Types.ObjectId;
  priority: "low" | "medium" | "high" | "urgent";
  taskType?: TaskType;
  category?: string;
  assignees: Types.ObjectId[];
  createdBy: Types.ObjectId;
  department?: Types.ObjectId;
  dueDate?: Date;
  startDate?: Date;
  completedAt?: Date;
  estimatedHours?: number;
  actualHours: number;
  tags: string[];
  isRecurring: boolean;
  recurringConfig?: {
    frequency: "daily" | "weekly" | "monthly" | "yearly";
    interval: number;
    daysOfWeek?: number[];
    endDate?: Date;
  };
  subtasks: ISubtask[];
  isArchived: boolean;
  lead?: Types.ObjectId;
  client?: Types.ObjectId;
  deal?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITaskComment {
  _id: Types.ObjectId;
  task: Types.ObjectId;
  author: Types.ObjectId;
  content: string;
  isSystemGenerated: boolean;
  parentComment?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITaskAttachment {
  _id: Types.ObjectId;
  task: Types.ObjectId;
  uploadedBy: Types.ObjectId;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  attachmentType: "file" | "voice_note";
  isProofOfWork: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITaskTimeLog {
  _id: Types.ObjectId;
  task: Types.ObjectId;
  user: Types.ObjectId;
  startTime: Date;
  endTime?: Date;
  duration: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITaskDependency {
  _id: Types.ObjectId;
  task: Types.ObjectId;
  dependsOn: Types.ObjectId;
  type: "blocks" | "blocked_by" | "related";
  createdAt: Date;
  updatedAt: Date;
}

export interface IWorkflowStatus {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  color: string;
  order: number;
  isDefault: boolean;
  isFinal: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWorkflowTransition {
  _id: Types.ObjectId;
  fromStatus: Types.ObjectId;
  toStatus: Types.ObjectId;
  allowedRoles: Types.ObjectId[];
  requiresRemarks: boolean;
  requiresApproval: boolean;
  approverRoles: Types.ObjectId[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotification {
  _id: Types.ObjectId;
  recipient: Types.ObjectId;
  type: string;
  title: string;
  message: string;
  relatedTask?: Types.ObjectId;
  relatedUser?: Types.ObjectId;
  isRead: boolean;
  readAt?: Date;
  emailSent: boolean;
  emailSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationRule {
  _id: Types.ObjectId;
  event: string;
  channels: ("in_app" | "email")[];
  recipientStrategy: "assignees" | "creator" | "department_head" | "specific_roles";
  recipientRoles?: Types.ObjectId[];
  deadlineThresholdHours?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IActivityLog {
  _id: Types.ObjectId;
  actor: Types.ObjectId;
  action: string;
  resource: string;
  resourceId: Types.ObjectId;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface ILoginHistory {
  _id: Types.ObjectId;
  user?: Types.ObjectId;
  loginAt: Date;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  failureReason?: string;
}

export interface IRoutePoint {
  lat: number;
  lng: number;
  timestamp: Date;
}

export interface IFieldSession {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  task?: Types.ObjectId;
  date: Date;
  checkIn: {
    time: Date;
    location: { lat: number; lng: number };
    address?: string;
    photo?: string;
  };
  checkOut?: {
    time: Date;
    location: { lat: number; lng: number };
    photo?: string;
  };
  duration?: number;
  routePoints: IRoutePoint[];
  notes?: string;
  status: "active" | "completed";
  createdAt: Date;
  updatedAt: Date;
}

export type PermissionString = `${string}:${string}`;

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  error: string;
  details?: unknown;
}

export interface ICommissionRule {
  _id: Types.ObjectId;
  department?: Types.ObjectId;
  jobTitle?: string;
  dealCommissionRate: number;
  leadConversionBonus: number;
  bonusThresholds: Array<{ minScore: number; bonusAmount: number }>;
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPerformanceTarget {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  month: number;
  year: number;
  targetRevenue: number;
  targetDeals: number;
  targetTasks: number;
  targetLeads: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPartnerLocation {
  _id: Types.ObjectId;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  radius: number;
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProofOfWork {
  _id: Types.ObjectId;
  task: Types.ObjectId;
  submittedBy: Types.ObjectId;
  photos: string[];
  signatureUrl?: string;
  capturedAt: Date;
  capturedLocation?: { lat: number; lng: number };
  qrCheckIn?: {
    partnerLocation: Types.ObjectId;
    scannedAt: Date;
    isWithinRadius: boolean;
    distanceMetres: number;
  };
  verificationStatus: "pending" | "verified" | "rejected";
  verifiedBy?: Types.ObjectId;
  verifiedAt?: Date;
  rejectionReason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
