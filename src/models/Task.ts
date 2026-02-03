import mongoose, { Schema, Model } from "mongoose";
import { ITask } from "@/types";

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
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Removed duplicate index for taskNumber
TaskSchema.index({ status: 1 });
TaskSchema.index({ priority: 1 });
TaskSchema.index({ assignees: 1 });
TaskSchema.index({ createdBy: 1 });
TaskSchema.index({ department: 1 });
TaskSchema.index({ dueDate: 1 });
TaskSchema.index({ isArchived: 1, status: 1 });
TaskSchema.index({ title: "text", description: "text" });

const Task: Model<ITask> =
  mongoose.models.Task || mongoose.model<ITask>("Task", TaskSchema);

export default Task;
