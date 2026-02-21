import mongoose, { Schema, Model } from "mongoose";
import { IPerformanceTarget } from "@/types";

const PerformanceTargetSchema = new Schema<IPerformanceTarget>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    month: { type: Number, min: 1, max: 12, required: true },
    year: { type: Number, required: true },
    targetRevenue: { type: Number, min: 0, default: 0 },
    targetDeals: { type: Number, min: 0, default: 0 },
    targetTasks: { type: Number, min: 0, default: 0 },
    targetLeads: { type: Number, min: 0, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

PerformanceTargetSchema.index({ user: 1, month: 1, year: 1 }, { unique: true });

const PerformanceTarget: Model<IPerformanceTarget> =
  mongoose.models.PerformanceTarget ||
  mongoose.model<IPerformanceTarget>("PerformanceTarget", PerformanceTargetSchema);

export default PerformanceTarget;
