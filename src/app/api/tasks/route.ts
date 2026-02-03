import { NextRequest } from "next/server";
import { withAuth, withPermission, apiSuccess, apiError, getPaginationParams } from "@/lib/api-helpers";
import { createTaskSchema } from "@/lib/validators";
import { logActivity } from "@/lib/activity-logger";
import { triggerNotification } from "@/lib/notification-service";
import { getUserPermissions } from "@/lib/rbac";
import Task from "@/models/Task";
import WorkflowStatus from "@/models/WorkflowStatus";

export const GET = withAuth(async (req, ctx, session) => {
  const perms = await getUserPermissions(session.user.roles);
  const url = new URL(req.url);
  const { page, limit, skip } = getPaginationParams(url);

  const search = url.searchParams.get("search") || "";
  const status = url.searchParams.get("status");
  const priority = url.searchParams.get("priority");
  const assignee = url.searchParams.get("assignee");
  const department = url.searchParams.get("department");
  const isArchived = url.searchParams.get("isArchived") === "true";

  const filter: Record<string, unknown> = { isArchived };

  if (!perms.has("tasks:view_all")) {
    filter.$or = [
      { assignees: session.user.id },
      { createdBy: session.user.id },
    ];
  }

  if (search) filter.$text = { $search: search };
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (assignee) filter.assignees = assignee;
  if (department) filter.department = department;

  const [data, total] = await Promise.all([
    Task.find(filter)
      .populate("status", "name slug color")
      .populate("assignees", "firstName lastName email avatar")
      .populate("createdBy", "firstName lastName email")
      .populate("department", "name code")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Task.countDocuments(filter),
  ]);

  return apiSuccess({
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

export const POST = withPermission("tasks:create", async (req, ctx, session) => {
  const body = await req.json();
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const defaultStatus = await WorkflowStatus.findOne({ isDefault: true });
  if (!defaultStatus) return apiError("No default workflow status configured", 500);

  const taskNumber = await Task.countDocuments() + 1;

  const task = new Task({
    ...parsed.data,
    taskNumber: `TASK-${String(taskNumber).padStart(4, "0")}`,
    status: defaultStatus._id,
    createdBy: session.user.id,
  });
  await task.save();

  await logActivity({
    actor: session.user.id,
    action: "task.created",
    resource: "task",
    resourceId: task._id.toString(),
    details: { title: task.title, taskNumber: task.taskNumber },
    req,
  });

  if (parsed.data.assignees?.length) {
    await triggerNotification("task_assigned", {
      taskId: task._id.toString(),
      actorId: session.user.id,
      data: { taskTitle: task.title, actorName: session.user.name },
    });
  }

  // Ensure taskNumber is included in the response
  return apiSuccess({ ...task.toObject(), taskNumber: task.taskNumber }, 201);
});
