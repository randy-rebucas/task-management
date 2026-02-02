import mongoose, { Schema, Model } from "mongoose";
import { IWorkflowTransition } from "@/types";

const WorkflowTransitionSchema = new Schema<IWorkflowTransition>(
  {
    fromStatus: { type: Schema.Types.ObjectId, ref: "WorkflowStatus", required: true },
    toStatus: { type: Schema.Types.ObjectId, ref: "WorkflowStatus", required: true },
    allowedRoles: [{ type: Schema.Types.ObjectId, ref: "Role" }],
    requiresRemarks: { type: Boolean, default: false },
    requiresApproval: { type: Boolean, default: false },
    approverRoles: [{ type: Schema.Types.ObjectId, ref: "Role" }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

WorkflowTransitionSchema.index({ fromStatus: 1, toStatus: 1 }, { unique: true });

const WorkflowTransition: Model<IWorkflowTransition> =
  mongoose.models.WorkflowTransition ||
  mongoose.model<IWorkflowTransition>("WorkflowTransition", WorkflowTransitionSchema);

export default WorkflowTransition;
