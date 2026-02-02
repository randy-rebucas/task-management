import mongoose, { Schema, Model } from "mongoose";
import { ITask } from "@/types";

const TaskSchema = new Schema<ITask>(
  {
    taskNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "" },
    status: { type: Schema.Types.ObjectId, ref: "WorkflowStatus", required: true },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    category: { type: String, trim: true },
    assignees: [{ type: Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    department: { type: Schema.Types.ObjectId, ref: "Department" },
    dueDate: { type: Date },
    startDate: { type: Date },
    completedAt: { type: Date },
    estimatedHours: { type: Number, min: 0 },
    actualHours: { type: Number, default: 0, min: 0 },
    tags: [{ type: String }],
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

TaskSchema.index({ taskNumber: 1 });
TaskSchema.index({ status: 1 });
TaskSchema.index({ priority: 1 });
TaskSchema.index({ assignees: 1 });
TaskSchema.index({ createdBy: 1 });
TaskSchema.index({ department: 1 });
TaskSchema.index({ dueDate: 1 });
TaskSchema.index({ isArchived: 1, status: 1 });
TaskSchema.index({ title: "text", description: "text" });

TaskSchema.pre("save", async function (next) {
  if (this.isNew) {
    const Counter = mongoose.models.Counter || mongoose.model("Counter",
      new Schema({ _id: String, seq: { type: Number, default: 0 } })
    );
    const counter = await Counter.findByIdAndUpdate(
      "taskNumber",
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.taskNumber = `TASK-${String(counter.seq).padStart(4, "0")}`;
  }
  next();
});

const Task: Model<ITask> =
  mongoose.models.Task || mongoose.model<ITask>("Task", TaskSchema);

export default Task;
