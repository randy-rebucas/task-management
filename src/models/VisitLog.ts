import mongoose, { Schema, Model } from "mongoose";
import { IVisitLog } from "@/types";

const VisitLogSchema = new Schema<IVisitLog>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  placesVisited: { type: String, required: true },
  peopleMet: { type: String, required: true },
  purpose: { type: String, required: true },
  outcome: { type: String, required: true },
  nextAction: { type: String, required: true },
  photos: [{ type: String }], // store file paths or URLs
}, { timestamps: true });

const VisitLog: Model<IVisitLog> = mongoose.models.VisitLog || mongoose.model<IVisitLog>("VisitLog", VisitLogSchema);

export default VisitLog;
