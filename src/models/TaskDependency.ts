import mongoose, { Schema, Model } from "mongoose";
import { ITaskDependency } from "@/types";

const TaskDependencySchema = new Schema<ITaskDependency>(
  {
    task: { type: Schema.Types.ObjectId, ref: "Task", required: true },
    dependsOn: { type: Schema.Types.ObjectId, ref: "Task", required: true },
    type: {
      type: String,
      enum: ["blocks", "blocked_by", "related"],
      default: "blocked_by",
    },
  },
  { timestamps: true }
);

TaskDependencySchema.index({ task: 1, dependsOn: 1 }, { unique: true });

const TaskDependency: Model<ITaskDependency> =
  mongoose.models.TaskDependency ||
  mongoose.model<ITaskDependency>("TaskDependency", TaskDependencySchema);

export default TaskDependency;
