import { withPermission, apiSuccess, apiError } from "@/features/auth/api-helpers";

export const DELETE = withPermission("tasks:update", async (req, ctx, _session, models) => {
  const { taskId, logId } = await ctx.params;

  const deleted = await models.TaskTimeLog.findOneAndDelete({
    _id: logId,
    task: taskId,
  });
  if (!deleted) return apiError("Time log entry not found", 404);

  // Recompute actualHours after deletion
  const task = await models.Task.findById(taskId) as any;
  if (task) {
    const totalMinutes = await models.TaskTimeLog.aggregate([
      { $match: { task: task._id } },
      { $group: { _id: null, total: { $sum: "$duration" } } },
    ]);
    task.actualHours = totalMinutes[0]?.total ? totalMinutes[0].total / 60 : 0;
    await task.save();
  }

  return apiSuccess({ deleted: true });
});
