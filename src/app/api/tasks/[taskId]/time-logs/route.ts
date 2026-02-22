import { withPermission, apiSuccess, apiError } from "@/features/auth/api-helpers";
import { createTimeLogSchema } from "@/features/auth/validators";
export const GET = withPermission("tasks:view", async (req, ctx, _session, models) => {
  const { taskId } = await ctx.params;
  const logs = await models.TaskTimeLog.find({ task: taskId })
    .populate("user", "firstName lastName email")
    .sort({ startTime: -1 })
    .lean();

  return apiSuccess(logs);
});

export const POST = withPermission("tasks:update", async (req, ctx, session, models) => {
  const { taskId } = await ctx.params;
  const body = await req.json();
  const parsed = createTimeLogSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const task = await models.Task.findById(taskId) as any;
  if (!task) return apiError("Task not found", 404);

  const timeLog = await models.TaskTimeLog.create({
    task: taskId,
    user: session.user.id,
    startTime: parsed.data.startTime,
    endTime: parsed.data.endTime,
    duration: parsed.data.duration,
    description: parsed.data.description,
  });

  // Update actual hours on task
  const totalMinutes = await models.TaskTimeLog.aggregate([
    { $match: { task: task._id } },
    { $group: { _id: null, total: { $sum: "$duration" } } },
  ]);
  task.actualHours = totalMinutes[0]?.total ? totalMinutes[0].total / 60 : 0;
  await task.save();

  return apiSuccess(timeLog, 201);
});
