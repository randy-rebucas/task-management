import mongoose, { Schema, Model } from "mongoose";
import { IDeal } from "@/types";

const DealSchema = new Schema<IDeal>(
  {
    title: { type: String, required: true, trim: true },
    lead: { type: Schema.Types.ObjectId, ref: "Lead" },
    client: { type: Schema.Types.ObjectId, ref: "Client" },
    stage: {
      type: String,
      enum: [
        "prospect",
        "contacted",
        "meeting",
        "proposal",
        "negotiation",
        "closed_won",
        "closed_lost",
      ],
      default: "prospect",
    },
    value: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "PHP" },
    probability: { type: Number, default: 0, min: 0, max: 100 },
    expectedCloseDate: { type: Date },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

DealSchema.index({ stage: 1 });
DealSchema.index({ assignedTo: 1 });
DealSchema.index({ createdBy: 1 });
DealSchema.index({ lead: 1 });
DealSchema.index({ client: 1 });
DealSchema.index({ title: "text" });

const Deal: Model<IDeal> =
  mongoose.models.Deal || mongoose.model<IDeal>("Deal", DealSchema);

export default Deal;
