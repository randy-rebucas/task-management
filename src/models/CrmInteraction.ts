import mongoose, { Schema, Model } from "mongoose";
import { ICrmInteraction } from "@/types";

const CrmInteractionSchema = new Schema<ICrmInteraction>(
  {
    lead:       { type: Schema.Types.ObjectId, ref: "Lead" },
    client:     { type: Schema.Types.ObjectId, ref: "Client" },
    type: {
      type: String,
      enum: ["call", "email", "meeting", "note", "visit"],
      required: true,
    },
    date:       { type: Date, required: true },
    summary:    { type: String, required: true, trim: true },
    outcome:    { type: String, trim: true },
    nextAction: { type: String, trim: true },
    loggedBy:   { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

CrmInteractionSchema.index({ lead: 1, date: -1 });
CrmInteractionSchema.index({ client: 1, date: -1 });

const CrmInteraction: Model<ICrmInteraction> =
  mongoose.models.CrmInteraction ||
  mongoose.model<ICrmInteraction>("CrmInteraction", CrmInteractionSchema);

export default CrmInteraction;
