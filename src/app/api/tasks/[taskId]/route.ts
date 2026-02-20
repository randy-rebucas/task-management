import Department from "@/models/Department";
import { withPermission, apiSuccess, apiError } from "@/features/auth/api-helpers";
import { updateTaskSchema } from "@/features/auth/validators";
import { logActivity } from "@/features/users/activity-logger";
import { triggerNotification } from "@/features/users/notification-service";
import Task from "@/models/Task";
// Ensure CRM models are registered before populate
import "@/models/Lead";
import "@/models/Client";
import "@/models/Deal";

export const GET = withPermission("tasks:view", async (req, ctx) => {
  const { taskId } = await ctx.params;
  const task = await Task.findById(taskId)
    .populate("status")
    .populate("assignees", "firstName lastName email avatar")
    .populate("createdBy", "firstName lastName email")
    .populate("department", "name code")
    .populate("lead", "name company status email")
    .populate("client", "name company status email")
    .populate("deal", "title stage value")
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

  // Explicitly handle CRM null-clearing: if fields are empty string, unset them
  const updateData: Record<string, unknown> = { ...parsed.data };
  const unsetFields: Record<string, number> = {};
  for (const field of ["lead", "client", "deal"] as const) {
    if (updateData[field] === "" || updateData[field] === null) {
      delete updateData[field];
      unsetFields[field] = 1;
    }
  }
  const mongoUpdate: Record<string, unknown> = { $set: updateData };
  if (Object.keys(unsetFields).length) mongoUpdate.$unset = unsetFields;

  const task = await Task.findByIdAndUpdate(taskId, mongoUpdate, { new: true });
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
