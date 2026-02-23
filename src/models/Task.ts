import mongoose, { Schema, Model } from "mongoose";
import { ITask } from "@/types";

const SubtaskSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    assignee: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { _id: true }
);

const RecurringConfigSchema = new Schema(
  {
    frequency: {
      type: String,
      enum: ["daily", "weekly", "monthly", "yearly"],
      required: true,
    },
    interval: { type: Number, default: 1, min: 1 },
    daysOfWeek: [{ type: Number, min: 0, max: 6 }],
    endDate: { type: Date },
  },
  { _id: false }
);

const TaskSchema = new Schema<ITask>(
  {
    taskNumber: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "" },
    status: { type: Schema.Types.ObjectId, ref: "WorkflowStatus", required: true },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    taskType: {
      type: String,
      enum: [
        "field_visit",
        "client_meeting",
        "orientation_event",
        "lead_follow_up",
        "proposal_submission",
        "collection_payment",
        "partner_onboarding",
        "internal_task",
      ],
    },
    category: { type: String, trim: true },
    assignees: [{ type: Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    department: { type: Schema.Types.ObjectId, ref: "Department" },
    dueDate: { type: Date },
    startDate: { type: Date },
    completedAt: { type: Date },
    estimatedHours: { type: Number, min: 0 },
    actualHours: { type: Number, default: 0, min: 0 },
    tags: [{ type: String }],
    isRecurring: { type: Boolean, default: false },
    recurringConfig: { type: RecurringConfigSchema },
    subtasks: { type: [SubtaskSchema], default: [] },
    isArchived: { type: Boolean, default: false },
    lead: { type: Schema.Types.ObjectId, ref: "Lead" },
    client: { type: Schema.Types.ObjectId, ref: "Client" },
    deal: { type: Schema.Types.ObjectId, ref: "Deal" },
  },
  { timestamps: true }
);

TaskSchema.index({ status: 1 });
TaskSchema.index({ priority: 1 });
TaskSchema.index({ taskType: 1 });
TaskSchema.index({ assignees: 1 });
TaskSchema.index({ assignees: 1, completedAt: 1 }); // coordinator-efficiency analytics
TaskSchema.index({ createdBy: 1 });
TaskSchema.index({ department: 1 });
TaskSchema.index({ dueDate: 1 });
TaskSchema.index({ isArchived: 1, status: 1 });
TaskSchema.index({ title: "text", description: "text" });
TaskSchema.index({ lead: 1 });
TaskSchema.index({ client: 1 });
TaskSchema.index({ deal: 1 });
// Additional composite indexes
TaskSchema.index({ isArchived: 1, dueDate: 1 });      // overdue-task reports
TaskSchema.index({ department: 1, status: 1 });       // department-scoped dashboards

const Task: Model<ITask> =
  mongoose.models.Task || mongoose.model<ITask>("Task", TaskSchema);

export default Task;
