import mongoose, { Schema, Model } from "mongoose";
import { INotification } from "@/types";

const NOTIFICATION_TYPES = [
  "task_assigned",
  "task_updated",
  "status_changed",
  "comment_added",
  "deadline_approaching",
  "task_overdue",
  "approval_needed",
  "approval_resolved",
  "mention",
  "system",
] as const;

const NotificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, required: true, enum: NOTIFICATION_TYPES },
    title: { type: String, required: true },
    message: { type: String, required: true },
    relatedTask: { type: Schema.Types.ObjectId, ref: "Task" },
    relatedUser: { type: Schema.Types.ObjectId, ref: "User" },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
    emailSent: { type: Boolean, default: false },
    emailSentAt: { type: Date },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, type: 1 });

const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);

export default Notification;
