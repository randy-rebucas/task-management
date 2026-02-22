import { withPermission, apiSuccess, apiError } from "@/features/auth/api-helpers";
import { createSubtaskSchema } from "@/features/auth/validators";
export const GET = withPermission("tasks:view", async (req, ctx) => {
  const { taskId } = await ctx.params;
  const task = await models.Task.findById(taskId).select("subtasks").lean();
  if (!task) return apiError("Task not found", 404);
  return apiSuccess(task.subtasks);
});

export const POST = withPermission("tasks:update", async (req, ctx) => {
  const { taskId } = await ctx.params;
  const body = await req.json();
  const parsed = createSubtaskSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, 400);
  }

  const task = await models.Task.findByIdAndUpdate(
    taskId,
    { $push: { subtasks: { title: parsed.data.title, completed: false } } },
    { new: true }
  ).select("subtasks");

  if (!task) return apiError("Task not found", 404);
  return apiSuccess(task.subtasks[task.subtasks.length - 1], 201);
});
