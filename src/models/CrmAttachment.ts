import mongoose, { Schema, Model } from "mongoose";
import { ICrmAttachment } from "@/types";

const CrmAttachmentSchema = new Schema<ICrmAttachment>(
  {
    lead:         { type: Schema.Types.ObjectId, ref: "Lead" },
    client:       { type: Schema.Types.ObjectId, ref: "Client" },
    deal:         { type: Schema.Types.ObjectId, ref: "Deal" },
    uploadedBy:   { type: Schema.Types.ObjectId, ref: "User", required: true },
    fileName:     { type: String, required: true, trim: true },
    fileUrl:      { type: String, required: true },
    fileSize:     { type: Number },
    mimeType:     { type: String },
    documentType: {
      type: String,
      enum: ["proposal", "contract", "other"],
      default: "other",
    },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

CrmAttachmentSchema.index({ lead: 1 });
CrmAttachmentSchema.index({ client: 1 });
CrmAttachmentSchema.index({ deal: 1 });

const CrmAttachment: Model<ICrmAttachment> =
  mongoose.models.CrmAttachment ||
  mongoose.model<ICrmAttachment>("CrmAttachment", CrmAttachmentSchema);

export default CrmAttachment;
