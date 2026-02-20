import { withPermission, apiSuccess, apiError } from "@/features/auth/api-helpers";
import { updateSubtaskSchema } from "@/features/auth/validators";
import Task from "@/models/Task";

export const PATCH = withPermission("tasks:update", async (req, ctx) => {
  const { taskId, subtaskId } = await ctx.params;
  const body = await req.json();
  const parsed = updateSubtaskSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, 400);
  }

  const update: Record<string, unknown> = {
    "subtasks.$.completed": parsed.data.completed,
  };
  if (parsed.data.completed) {
    update["subtasks.$.completedAt"] = new Date();
  } else {
    update["subtasks.$.completedAt"] = null;
  }

  const task = await Task.findOneAndUpdate(
    { _id: taskId, "subtasks._id": subtaskId },
    { $set: update },
    { new: true }
  ).select("subtasks");

  if (!task) return apiError("Task or subtask not found", 404);
  return apiSuccess(task.subtasks.find((s: any) => s._id.toString() === subtaskId));
});

export const DELETE = withPermission("tasks:update", async (req, ctx) => {
  const { taskId, subtaskId } = await ctx.params;

  const task = await Task.findByIdAndUpdate(
    taskId,
    { $pull: { subtasks: { _id: subtaskId } } },
    { new: true }
  ).select("subtasks");

  if (!task) return apiError("Task not found", 404);
  return apiSuccess({ deleted: true });
});
