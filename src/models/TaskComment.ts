import mongoose, { Schema, Model } from "mongoose";
import { ITaskComment } from "@/types";

const TaskCommentSchema = new Schema<ITaskComment>(
  {
    task: { type: Schema.Types.ObjectId, ref: "Task", required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    isSystemGenerated: { type: Boolean, default: false },
    parentComment: { type: Schema.Types.ObjectId, ref: "TaskComment" },
  },
  { timestamps: true }
);

TaskCommentSchema.index({ task: 1, createdAt: -1 });

const TaskComment: Model<ITaskComment> =
  mongoose.models.TaskComment || mongoose.model<ITaskComment>("TaskComment", TaskCommentSchema);

export default TaskComment;
