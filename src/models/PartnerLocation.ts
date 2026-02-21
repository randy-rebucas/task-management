import mongoose, { Schema, Model } from "mongoose";
import { IPartnerLocation } from "@/types";

const PartnerLocationSchema = new Schema<IPartnerLocation>(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    radius: { type: Number, default: 100, min: 10 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

PartnerLocationSchema.index({ isActive: 1 });
PartnerLocationSchema.index({ lat: 1, lng: 1 });

const PartnerLocation: Model<IPartnerLocation> =
  mongoose.models.PartnerLocation ||
  mongoose.model<IPartnerLocation>("PartnerLocation", PartnerLocationSchema);

export default PartnerLocation;
