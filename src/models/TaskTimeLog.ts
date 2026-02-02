import mongoose, { Schema, Model } from "mongoose";
import { ITaskTimeLog } from "@/types";

const TaskTimeLogSchema = new Schema<ITaskTimeLog>(
  {
    task: { type: Schema.Types.ObjectId, ref: "Task", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    duration: { type: Number, required: true, min: 0 },
    description: { type: String },
  },
  { timestamps: true }
);

TaskTimeLogSchema.index({ task: 1 });
TaskTimeLogSchema.index({ user: 1, startTime: -1 });

const TaskTimeLog: Model<ITaskTimeLog> =
  mongoose.models.TaskTimeLog || mongoose.model<ITaskTimeLog>("TaskTimeLog", TaskTimeLogSchema);

export default TaskTimeLog;
