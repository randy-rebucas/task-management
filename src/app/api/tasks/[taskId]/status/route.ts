import { withPermission, apiSuccess, apiError } from "@/lib/api-helpers";
import { statusTransitionSchema } from "@/lib/validators";
import { logActivity } from "@/lib/activity-logger";
import { triggerNotification } from "@/lib/notification-service";
import { getUserPermissions } from "@/lib/rbac";
import Task from "@/models/Task";
import WorkflowStatus from "@/models/WorkflowStatus";
import WorkflowTransition from "@/models/WorkflowTransition";
import TaskComment from "@/models/TaskComment";
import Role from "@/models/Role";

export const PATCH = withPermission("tasks:update", async (req, ctx, session) => {
  const { taskId } = await ctx.params;
  const body = await req.json();
  const parsed = statusTransitionSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues?.[0]?.message || "Invalid request body";
    return apiError(firstError);
  }

  const task = await Task.findById(taskId).populate("status");
  if (!task) return apiError("Task not found", 404);

  const fromStatus = await WorkflowStatus.findById(task.status);
  const toStatus = await WorkflowStatus.findById(parsed.data.toStatusId);
  if (!toStatus) return apiError("Invalid target status", 400);

  // Check transition is allowed
  const transition = await WorkflowTransition.findOne({
    fromStatus: task.status,
    toStatus: parsed.data.toStatusId,
    isActive: true,
  }).populate("allowedRoles");

  if (!transition) {
    return apiError(`Transition from "${fromStatus?.name}" to "${toStatus.name}" is not allowed`, 403);
  }

  // Check role is allowed for this transition
  if (transition.allowedRoles.length > 0) {
    const userRoles = await Role.find({ _id: { $in: session.user.roles } });
    const userRoleIds = userRoles.map((r) => r._id.toString());
    const allowedRoleIds = transition.allowedRoles.map((r) => (r as { _id: { toString(): string } })._id.toString());
    const hasRole = userRoleIds.some((id) => allowedRoleIds.includes(id));
    if (!hasRole) {
      return apiError("Your role is not allowed to perform this transition", 403);
    }
  }

  // Check remarks requirement
  if (transition.requiresRemarks && !parsed.data.remarks) {
    return apiError("Remarks are required for this status transition", 400);
  }

  const previousStatusName = fromStatus?.name;
  task.status = toStatus._id;

  if (toStatus.isFinal) {
    task.completedAt = new Date();
  }

  await task.save();

  // Add system comment for the transition
  if (parsed.data.remarks) {
    await TaskComment.create({
      task: taskId,
      author: session.user.id,
      content: `Status changed from "${previousStatusName}" to "${toStatus.name}": ${parsed.data.remarks}`,
      isSystemGenerated: true,
    });
  }

  await logActivity({
    actor: session.user.id,
    action: "task.status_changed",
    resource: "task",
    resourceId: taskId,
    details: {
      from: previousStatusName,
      to: toStatus.name,
      remarks: parsed.data.remarks,
    },
    req,
  });

  await triggerNotification("status_changed", {
    taskId,
    actorId: session.user.id,
    data: {
      taskTitle: task.title,
      fromStatus: previousStatusName,
      toStatus: toStatus.name,
      actorName: session.user.name,
    },
  });

  return apiSuccess(task);
});
