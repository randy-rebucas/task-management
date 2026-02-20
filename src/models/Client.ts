import mongoose, { Schema, Model } from "mongoose";
import { IClient } from "@/types";

const ClientSchema = new Schema<IClient>(
  {
    name: { type: String, required: true, trim: true },
    company: { type: String, trim: true },
    industry: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    website: { type: String, trim: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    department: { type: Schema.Types.ObjectId, ref: "Department" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

ClientSchema.index({ status: 1 });
ClientSchema.index({ assignedTo: 1 });
ClientSchema.index({ createdBy: 1 });
ClientSchema.index({ name: "text", company: "text", email: "text" });

const Client: Model<IClient> =
  mongoose.models.Client || mongoose.model<IClient>("Client", ClientSchema);

export default Client;
