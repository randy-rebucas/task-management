import mongoose, { Schema, Model } from "mongoose";
import { IProofOfWork } from "@/types";

const QrCheckInSchema = new Schema(
  {
    partnerLocation: { type: Schema.Types.ObjectId, ref: "PartnerLocation" },
    scannedAt: { type: Date },
    isWithinRadius: { type: Boolean },
    distanceMetres: { type: Number },
  },
  { _id: false }
);

const CapturedLocationSchema = new Schema(
  { lat: { type: Number, required: true }, lng: { type: Number, required: true } },
  { _id: false }
);

const ProofOfWorkSchema = new Schema<IProofOfWork>(
  {
    task: { type: Schema.Types.ObjectId, ref: "Task", required: true },
    submittedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    photos: { type: [String], default: [] },
    signatureUrl: { type: String },
    capturedAt: { type: Date, required: true },
    capturedLocation: { type: CapturedLocationSchema },
    qrCheckIn: { type: QrCheckInSchema },
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date },
    rejectionReason: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

ProofOfWorkSchema.index({ task: 1 });
ProofOfWorkSchema.index({ submittedBy: 1 });
ProofOfWorkSchema.index({ verificationStatus: 1 });

const ProofOfWork: Model<IProofOfWork> =
  mongoose.models.ProofOfWork ||
  mongoose.model<IProofOfWork>("ProofOfWork", ProofOfWorkSchema);

export default ProofOfWork;
