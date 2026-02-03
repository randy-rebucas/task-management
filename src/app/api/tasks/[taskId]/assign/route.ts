import { withPermission, apiSuccess, apiError } from "@/lib/api-helpers";
import { assignTaskSchema } from "@/lib/validators";
import { logActivity } from "@/lib/activity-logger";
import { triggerNotification } from "@/lib/notification-service";
import Task from "@/models/Task";

export const PATCH = withPermission("tasks:assign", async (req, ctx, session) => {
  const { taskId } = await ctx.params;
  const body = await req.json();
  const parsed = assignTaskSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const task = await Task.findById(taskId);
  if (!task) return apiError("Task not found", 404);

  const previousAssignees = task.assignees.map((a) => a.toString());
  task.assignees = parsed.data.assignees as never[];
  await task.save();

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
  });

  return apiSuccess(task);
});
