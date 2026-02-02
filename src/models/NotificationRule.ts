import mongoose, { Schema, Model } from "mongoose";
import { INotificationRule } from "@/types";

const NotificationRuleSchema = new Schema<INotificationRule>(
  {
    event: { type: String, required: true },
    channels: [{ type: String, enum: ["in_app", "email"] }],
    recipientStrategy: {
      type: String,
      required: true,
      enum: ["assignees", "creator", "department_head", "specific_roles"],
    },
    recipientRoles: [{ type: Schema.Types.ObjectId, ref: "Role" }],
    deadlineThresholdHours: { type: Number },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const NotificationRule: Model<INotificationRule> =
  mongoose.models.NotificationRule ||
  mongoose.model<INotificationRule>("NotificationRule", NotificationRuleSchema);

export default NotificationRule;
