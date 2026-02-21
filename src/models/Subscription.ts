import mongoose, { Schema, Document, Model } from "mongoose";

export type SubscriptionPlan = "starter" | "growth" | "business" | "enterprise";
export type SubscriptionStatus =
  | "APPROVAL_PENDING"
  | "APPROVED"
  | "ACTIVE"
  | "SUSPENDED"
  | "CANCELLED"
  | "EXPIRED";

export interface ISubscription extends Document {
  user?: mongoose.Types.ObjectId;
  email: string;
  paypalSubscriptionId: string;
  paypalPlanId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startTime?: Date;
  nextBillingTime?: Date;
  trialEndTime?: Date;
  amount: number;
  currency: string;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", index: true },
    email: { type: String, required: true, lowercase: true, index: true },
    paypalSubscriptionId: { type: String, required: true, unique: true },
    paypalPlanId: { type: String, required: true },
    plan: {
      type: String,
      enum: ["starter", "growth", "business", "enterprise"],
      required: true,
    },
    status: {
      type: String,
      enum: [
        "APPROVAL_PENDING",
        "APPROVED",
        "ACTIVE",
        "SUSPENDED",
        "CANCELLED",
        "EXPIRED",
      ],
      default: "APPROVAL_PENDING",
    },
    startTime: Date,
    nextBillingTime: Date,
    trialEndTime: Date,
    amount: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    cancelledAt: Date,
  },
  { timestamps: true }
);

export const Subscription: Model<ISubscription> =
  mongoose.models.Subscription ||
  mongoose.model<ISubscription>("Subscription", SubscriptionSchema);
