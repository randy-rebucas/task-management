import mongoose, { Schema, Model } from "mongoose";
import { ITaskAttachment } from "@/types";

const TaskAttachmentSchema = new Schema<ITaskAttachment>(
  {
    task: { type: Schema.Types.ObjectId, ref: "Task", required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, required: true },
    isProofOfWork: { type: Boolean, default: false },
  },
  { timestamps: true }
);

TaskAttachmentSchema.index({ task: 1 });

const TaskAttachment: Model<ITaskAttachment> =
  mongoose.models.TaskAttachment ||
  mongoose.model<ITaskAttachment>("TaskAttachment", TaskAttachmentSchema);

export default TaskAttachment;
