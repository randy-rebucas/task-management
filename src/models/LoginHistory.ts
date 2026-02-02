import mongoose, { Schema, Model } from "mongoose";
import { ILoginHistory } from "@/types";

const LoginHistorySchema = new Schema<ILoginHistory>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    loginAt: { type: Date, default: Date.now },
    ipAddress: { type: String },
    userAgent: { type: String },
    success: { type: Boolean, required: true },
    failureReason: { type: String },
  },
  { timestamps: false }
);

LoginHistorySchema.index({ user: 1, loginAt: -1 });

const LoginHistory: Model<ILoginHistory> =
  mongoose.models.LoginHistory || mongoose.model<ILoginHistory>("LoginHistory", LoginHistorySchema);

export default LoginHistory;
