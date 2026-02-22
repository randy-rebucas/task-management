import { withPermission, apiSuccess, apiError } from "@/features/auth/api-helpers";
import { assignTaskSchema } from "@/features/auth/validators";
import { logActivity } from "@/features/users/activity-logger";
import { triggerNotification } from "@/features/users/notification-service";
export const PATCH = withPermission("tasks:assign", async (req, ctx, session, models) => {
  const { taskId } = await ctx.params;
  const body = await req.json();
  const parsed = assignTaskSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const existing = await models.Task.findById(taskId).select("assignees title").lean();
  if (!existing) return apiError("Task not found", 404);

  const previousAssignees = existing.assignees.map((a) => a.toString());

  const task = await models.Task.findByIdAndUpdate(
    taskId,
    { assignees: parsed.data.assignees },
    { new: true }
  );
  if (!task) return apiError("Task not found", 404);

  await logActivity({
    actor: session.user.id,
    action: "task.reassigned",
    resource: "task",
    resourceId: taskId,
    details: {
      previousAssignees,
      newAssignees: parsed.data.assignees,
      remarks: parsed.data.remarks,
    },
    req,
  });

  await triggerNotification("task_assigned", {
    taskId,
    actorId: session.user.id,
    additionalRecipients: parsed.data.assignees,
    data: { taskTitle: task.title, actorName: session.user.name },
  }, models);

  return apiSuccess(task);
});
