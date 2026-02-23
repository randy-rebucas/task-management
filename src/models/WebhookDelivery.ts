import mongoose, { Schema, Model } from "mongoose";

export interface IWebhookDelivery {
  webhookId: mongoose.Types.ObjectId;
  event: string;
  url: string;
  payload: Record<string, unknown>;
  status: "pending" | "success" | "failed";
  responseCode?: number;
  responseBody?: string;
  durationMs?: number;
  retryCount: number;
  deliveredAt?: Date;
  nextRetryAt?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookDeliverySchema = new Schema<IWebhookDelivery>(
  {
    webhookId:    { type: Schema.Types.ObjectId, required: true, index: true },
    event:        { type: String, required: true, trim: true },
    url:          { type: String, required: true },
    payload:      { type: Schema.Types.Mixed, required: true },
    status:       { type: String, enum: ["pending", "success", "failed"], default: "pending" },
    responseCode: { type: Number },
    responseBody: { type: String },
    durationMs:   { type: Number },
    retryCount:   { type: Number, default: 0, min: 0 },
    deliveredAt:  { type: Date },
    nextRetryAt:  { type: Date },
    error:        { type: String },
  },
  { timestamps: true }
);

// Efficient fetch: all deliveries for a specific webhook ordered newest first
WebhookDeliverySchema.index({ webhookId: 1, createdAt: -1 });
// Cron retry jobs: find undelivered items ready to retry
WebhookDeliverySchema.index({ status: 1, nextRetryAt: 1 });

const WebhookDelivery: Model<IWebhookDelivery> =
  mongoose.models.WebhookDelivery ||
  mongoose.model<IWebhookDelivery>("WebhookDelivery", WebhookDeliverySchema);

export default WebhookDelivery;
