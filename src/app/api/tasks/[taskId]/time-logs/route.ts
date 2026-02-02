import { withPermission, apiSuccess, apiError } from "@/lib/api-helpers";
import { createTimeLogSchema } from "@/lib/validators";
import TaskTimeLog from "@/models/TaskTimeLog";
import Task from "@/models/Task";

export const GET = withPermission("tasks:view", async (req, ctx) => {
  const { taskId } = await ctx.params;
  const logs = await TaskTimeLog.find({ task: taskId })
    .populate("user", "firstName lastName email")
    .sort({ startTime: -1 })
    .lean();

  return apiSuccess(logs);
});

export const POST = withPermission("tasks:update", async (req, ctx, session) => {
  const { taskId } = await ctx.params;
  const body = await req.json();
  const parsed = createTimeLogSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const task = await Task.findById(taskId);
  if (!task) return apiError("Task not found", 404);

  const timeLog = await TaskTimeLog.create({
    task: taskId,
    user: session.user.id,
    startTime: parsed.data.startTime,
    endTime: parsed.data.endTime,
    duration: parsed.data.duration,
    description: parsed.data.description,
  });

  // Update actual hours on task
  const totalMinutes = await TaskTimeLog.aggregate([
    { $match: { task: task._id } },
    { $group: { _id: null, total: { $sum: "$duration" } } },
  ]);
  task.actualHours = totalMinutes[0]?.total ? totalMinutes[0].total / 60 : 0;
  await task.save();

  return apiSuccess(timeLog, 201);
});
