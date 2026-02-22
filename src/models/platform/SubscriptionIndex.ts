/**
 * Platform-level subscription index.
 * Maps a PayPal subscription ID to the tenant DB that owns it.
 * Written by /api/subscriptions/activate and read by the PayPal webhook handler
 * so it can route status updates to the correct tenant database.
 */
import mongoose, { Schema, Model, Connection, Document } from "mongoose";

export interface ISubscriptionIndex extends Document {
  paypalSubscriptionId: string;
  tenantDbName: string;
  tenantSlug: string;
  plan: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionIndexSchema = new Schema<ISubscriptionIndex>(
  {
    paypalSubscriptionId: { type: String, required: true, unique: true, index: true },
    tenantDbName:         { type: String, required: true },
    tenantSlug:           { type: String, required: true, index: true },
    plan:                 { type: String, required: true },
    email:                { type: String, required: true, lowercase: true },
  },
  { timestamps: true }
);

export function getSubscriptionIndexModel(conn: Connection): Model<ISubscriptionIndex> {
  return (
    (conn.models.SubscriptionIndex as Model<ISubscriptionIndex>) ??
    conn.model<ISubscriptionIndex>("SubscriptionIndex", SubscriptionIndexSchema)
  );
}
