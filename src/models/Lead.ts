import mongoose, { Schema, Model } from "mongoose";
import { ILead } from "@/types";

const LeadSchema = new Schema<ILead>(
  {
    name: { type: String, required: true, trim: true },
    company: { type: String, trim: true },
    industry: { type: String, trim: true },
    address: { type: String, trim: true },
    website: { type: String, trim: true },
    contactPersonTitle: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    source: {
      type: String,
      enum: ["referral", "cold_call", "social_media", "website", "event", "other"],
      required: true,
    },
    status: {
      type: String,
      enum: ["new", "contacted", "qualified", "unqualified", "converted"],
      default: "new",
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    convertedToClient: { type: Schema.Types.ObjectId, ref: "Client" },
    notes: { type: String },
    followUpDate: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

LeadSchema.index({ status: 1 });
LeadSchema.index({ source: 1 });
LeadSchema.index({ assignedTo: 1 });
LeadSchema.index({ createdBy: 1 });
LeadSchema.index({ name: "text", company: "text", email: "text" });
// Composite indexes for list queries
LeadSchema.index({ status: 1, createdAt: -1 });       // filtered + sorted lists
LeadSchema.index({ assignedTo: 1, createdAt: -1 });   // my-leads view
LeadSchema.index({ followUpDate: 1 });                // follow-up reminders

const Lead: Model<ILead> =
  mongoose.models.Lead || mongoose.model<ILead>("Lead", LeadSchema);

export default Lead;
