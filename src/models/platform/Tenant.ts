import mongoose, { Schema, Model, Document } from "mongoose";

export type TenantPlan = "trial" | "starter" | "growth" | "business" | "enterprise";
export type TenantStatus = "active" | "suspended" | "cancelled" | "pending";

export interface ITenant extends Document {
  slug: string;          // subdomain e.g. "acme"
  name: string;          // display name e.g. "Acme Corp"
  dbName: string;        // MongoDB database name e.g. "tenant_acme"
  adminEmail: string;
  plan: TenantPlan;
  status: TenantStatus;
  trialEndsAt?: Date;
  logoUrl?: string;
  primaryColor?: string;
  maxUsers: number;
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema = new Schema<ITenant>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    dbName: { type: String, required: true, unique: true },
    adminEmail: { type: String, required: true, lowercase: true, trim: true },
    plan: {
      type: String,
      enum: ["trial", "starter", "growth", "business", "enterprise"],
      default: "trial",
    },
    status: {
      type: String,
      enum: ["active", "suspended", "cancelled", "pending"],
      default: "pending",
    },
    trialEndsAt: { type: Date },
    logoUrl: { type: String },
    primaryColor: { type: String, default: "#6366f1" },
    maxUsers: { type: Number, default: 5 },
  },
  { timestamps: true }
);

TenantSchema.index({ slug: 1 });
TenantSchema.index({ adminEmail: 1 });
TenantSchema.index({ status: 1 });

// Use platform DB connection for Tenant model
// This file is imported via `platformDb` helper, NOT the default mongoose connection
export { TenantSchema };

let TenantModel: Model<ITenant> | null = null;

export function getTenantModel(conn: mongoose.Connection): Model<ITenant> {
  return conn.models.Tenant || conn.model<ITenant>("Tenant", TenantSchema);
}

export default getTenantModel;
