import mongoose, { Schema, Model } from "mongoose";
import { ICommissionRule } from "@/types";

const CommissionRuleSchema = new Schema<ICommissionRule>(
  {
    department: { type: Schema.Types.ObjectId, ref: "Department" },
    jobTitle: { type: String, trim: true },
    dealCommissionRate: { type: Number, min: 0, max: 100, default: 5 },
    leadConversionBonus: { type: Number, min: 0, default: 0 },
    bonusThresholds: [
      {
        minScore: { type: Number, min: 0, max: 100, required: true },
        bonusAmount: { type: Number, min: 0, required: true },
      },
    ],
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

CommissionRuleSchema.index({ department: 1 });
CommissionRuleSchema.index({ jobTitle: 1 });

const CommissionRule: Model<ICommissionRule> =
  mongoose.models.CommissionRule ||
  mongoose.model<ICommissionRule>("CommissionRule", CommissionRuleSchema);

export default CommissionRule;
