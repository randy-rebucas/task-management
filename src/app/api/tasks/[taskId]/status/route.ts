import { getTenantPermissions, checkPermission } from "@/features/auth/rbac";
import { withPermission, apiSuccess, apiError } from "@/features/auth/api-helpers";
import { statusTransitionSchema } from "@/features/auth/validators";
import { logActivity } from "@/features/users/activity-logger";
import { triggerNotification } from "@/features/users/notification-service";
import { getNextTaskNumber } from "@/lib/task-counter";
export const PATCH = withPermission("tasks:update", async (req, ctx, session, models) => {
  const { taskId } = await ctx.params;
  const body = await req.json();
  const parsed = statusTransitionSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues?.[0]?.message || "Invalid request body";
    return apiError(firstError);
  }

  const task = await models.Task.findById(taskId).populate("status") as any;
  if (!task) return apiError("Task not found", 404);

  const fromStatus = task.status as unknown as { name?: string } | null;
  const toStatus = await models.WorkflowStatus.findById(parsed.data.toStatusId) as any;
  if (!toStatus) return apiError("Invalid target status", 400);

  // Check transition is allowed
  const transition = await models.WorkflowTransition.findOne({
    fromStatus: task.status,
    toStatus: parsed.data.toStatusId,
    isActive: true,
  }).populate("allowedRoles") as any;

  if (!transition) {
    return apiError(`Transition from "${fromStatus?.name}" to "${toStatus.name}" is not allowed`, 403);
  }

  // Check role is allowed for this transition
  if (transition.allowedRoles.length > 0) {
    const userRoles = await models.Role.find({ _id: { $in: session.user.roles } }) as any[];
    const userRoleIds = userRoles.map((r: any) => r._id.toString());
    const allowedRoleIds = transition.allowedRoles.map((r: any) => r._id.toString());
    const hasRole = userRoleIds.some((id) => allowedRoleIds.includes(id));
    if (!hasRole) {
      return apiError("Your role is not allowed to perform this transition", 403);
    }
  }

  // Check remarks requirement
  if (transition.requiresRemarks && !parsed.data.remarks) {
    return apiError("Remarks are required for this status transition", 400);
  }

  // Closing/finalising a task requires either being an assignee OR having tasks:approve
  if (toStatus.isFinal) {
    const isAssignee = (task.assignees as unknown as { toString(): string }[]).some(
      (a) => a.toString() === session.user.id
    );
    if (!isAssignee) {
      const userPerms = await getTenantPermissions(session.user.roles, models);
      if (!checkPermission(userPerms, "tasks:approve")) {
        return apiError("Only task assignees or users with approval permission can close tasks", 403);
      }
    }
  }

  const previousStatusName = fromStatus?.name;
  task.status = toStatus._id;

  if (toStatus.isFinal) {
    task.completedAt = new Date();
  }

  await task.save();

  // Auto-create a follow-up task when a client_meeting is completed (if enabled)
  const followUpEnabled = await models.AppSetting.findOne({ key: "automation.followUpTask" }).lean() as any;
  if (toStatus.isFinal && task.taskType === "client_meeting" && (followUpEnabled ? Boolean(followUpEnabled.value) : true)) {
    const defaultStatus = await models.WorkflowStatus.findOne({ isDefault: true, isActive: true }) as any;
    if (defaultStatus) {
      const nextNumber = await getNextTaskNumber(models);
      const followUp = await models.Task.create({
        taskNumber: nextNumber,
        title: `Follow-up: ${task.title}`,
        description: `Auto-generated follow-up from completed meeting: ${task.taskNumber}`,
        taskType: "lead_follow_up",
        status: defaultStatus._id,
        priority: task.priority,
        assignees: task.assignees,
        createdBy: session.user.id,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        ...(task.client && { client: task.client }),
        ...(task.lead   && { lead:   task.lead   }),
        ...(task.deal   && { deal:   task.deal   }),
      }) as any;
      await triggerNotification("task_assigned", {
        taskId: followUp._id.toString(),
        actorId: session.user.id,
        data: { taskTitle: followUp.title, actorName: session.user.name },
      }, models);
    }
  }

  // Add system comment for the transition
  if (parsed.data.remarks) {
    await models.TaskComment.create({
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
  }, models);

  return apiSuccess(task);
});
