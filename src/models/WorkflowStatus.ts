import mongoose, { Schema, Model } from "mongoose";
import { IWorkflowStatus } from "@/types";


const WorkflowStatusSchema = new Schema<IWorkflowStatus>({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, lowercase: true }, // removed unique here
  color: { type: String, default: "#6b7280" },
  order: { type: Number, required: true },
  isDefault: { type: Boolean, default: false },
  isFinal: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

WorkflowStatusSchema.index({ slug: 1 }, { unique: true });
WorkflowStatusSchema.index({ order: 1 });

const WorkflowStatus: Model<IWorkflowStatus> =
  mongoose.models.WorkflowStatus ||
  mongoose.model<IWorkflowStatus>("WorkflowStatus", WorkflowStatusSchema);

export default WorkflowStatus;
