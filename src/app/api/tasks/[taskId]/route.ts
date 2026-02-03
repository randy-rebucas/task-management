import { withPermission, apiSuccess, apiError } from "@/lib/api-helpers";
import { updateTaskSchema } from "@/lib/validators";
import { logActivity } from "@/lib/activity-logger";
import { triggerNotification } from "@/lib/notification-service";
import Task from "@/models/Task";

export const GET = withPermission("tasks:view", async (req, ctx) => {
  const { taskId } = await ctx.params;
  const task = await Task.findById(taskId)
    .populate("status")
    .populate("assignees", "firstName lastName email avatar")
    .populate("createdBy", "firstName lastName email")
    .populate("department", "name code")
    .lean();

  if (!task) return apiError("Task not found", 404);

  // Get allowed transitions for the current status
  const WorkflowTransition = (await import("@/models/WorkflowTransition")).default;
  const transitions = await WorkflowTransition.find({
    fromStatus: task.status._id,
    isActive: true,
  })
    .populate("toStatus", "name slug color order isFinal")
    .lean();

  // Only return minimal info needed for the frontend
  const allowedTransitions = transitions.map((t: any) => ({
    _id: t._id,
    toStatus: t.toStatus,
    requiresRemarks: t.requiresRemarks,
    requiresApproval: t.requiresApproval,
  }));

  return apiSuccess({ ...task, allowedTransitions });
});

export const PUT = withPermission("tasks:update", async (req, ctx, session) => {
  const { taskId } = await ctx.params;
  const body = await req.json();
  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const task = await Task.findByIdAndUpdate(taskId, parsed.data, { new: true });
  if (!task) return apiError("Task not found", 404);

  await logActivity({
    actor: session.user.id,
    action: "task.updated",
    resource: "task",
    resourceId: taskId,
    details: { fields: Object.keys(parsed.data) },
    req,
  });

  await triggerNotification("task_updated", {
    taskId,
    actorId: session.user.id,
    data: { taskTitle: task.title, actorName: session.user.name },
  });

  return apiSuccess(task);
});

export const DELETE = withPermission("tasks:delete", async (req, ctx, session) => {
  const { taskId } = await ctx.params;
  const task = await Task.findByIdAndUpdate(taskId, { isArchived: true }, { new: true });
  if (!task) return apiError("Task not found", 404);

  await logActivity({
    actor: session.user.id,
    action: "task.archived",
    resource: "task",
    resourceId: taskId,
    details: { title: task.title },
    req,
  });

  return apiSuccess({ message: "Task archived" });
});
