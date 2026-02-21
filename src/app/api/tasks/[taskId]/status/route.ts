import { withPermission, apiSuccess, apiError } from "@/features/auth/api-helpers";
import { getUserPermissions, checkPermission } from "@/features/auth/rbac";
import { statusTransitionSchema } from "@/features/auth/validators";
import { logActivity } from "@/features/users/activity-logger";
import { triggerNotification } from "@/features/users/notification-service";
import Task from "@/models/Task";
import WorkflowStatus from "@/models/WorkflowStatus";
import WorkflowTransition from "@/models/WorkflowTransition";
import TaskComment from "@/models/TaskComment";
import Role from "@/models/Role";
import AppSetting from "@/models/AppSetting";

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

  const fromStatus = task.status as unknown as { name?: string } | null;
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

  // Closing/finalising a task requires either being an assignee OR having tasks:approve
  if (toStatus.isFinal) {
    const isAssignee = (task.assignees as unknown as { toString(): string }[]).some(
      (a) => a.toString() === session.user.id
    );
    if (!isAssignee) {
      const userPerms = await getUserPermissions(session.user.roles);
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
  const followUpEnabled = await AppSetting.findOne({ key: "automation.followUpTask" }).lean();
  if (toStatus.isFinal && task.taskType === "client_meeting" && (followUpEnabled ? Boolean(followUpEnabled.value) : true)) {
    const defaultStatus = await WorkflowStatus.findOne({ isDefault: true, isActive: true });
    if (defaultStatus) {
      const taskCount = await Task.countDocuments();
      const followUp = await Task.create({
        taskNumber: `TASK-${String(taskCount + 1).padStart(4, "0")}`,
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
      });
      await triggerNotification("task_assigned", {
        taskId: followUp._id.toString(),
        actorId: session.user.id,
        data: { taskTitle: followUp.title, actorName: session.user.name },
      });
    }
  }

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
