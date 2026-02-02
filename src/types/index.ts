import { Types } from "mongoose";

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

export interface ITask {
  _id: Types.ObjectId;
  taskNumber: string;
  title: string;
  description: string;
  status: Types.ObjectId;
  priority: "low" | "medium" | "high" | "urgent";
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
  isArchived: boolean;
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
  user: Types.ObjectId;
  loginAt: Date;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  failureReason?: string;
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
