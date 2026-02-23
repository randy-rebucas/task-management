import { getTenantPermissions, checkPermission } from "@/features/auth/rbac";
import { withAuth, withPermission, apiSuccess, apiError, getPaginationParams } from "@/features/auth/api-helpers";
import { createTaskSchema } from "@/features/auth/validators";
import { logActivity } from "@/features/users/activity-logger";
import { triggerNotification } from "@/features/users/notification-service";
import { getNextTaskNumber } from "@/lib/task-counter";

// Register CRM models so Mongoose populate works
export const GET = withAuth(async (req, ctx, session, models) => {
  try {
    const perms = await getTenantPermissions(session.user.roles, models);
    const url = new URL(req.url);
    const { page, limit, skip } = getPaginationParams(url);

    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status");
    const priority = url.searchParams.get("priority");
    const assignee = url.searchParams.get("assignee");
    const department = url.searchParams.get("department");
    const isArchived = url.searchParams.get("isArchived") === "true";
    const dueDateFrom = url.searchParams.get("dueDateFrom");
    const dueDateTo   = url.searchParams.get("dueDateTo");

    const filter: Record<string, unknown> = { isArchived };

    if (!checkPermission(perms, "tasks:view_all")) {
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
    if (dueDateFrom || dueDateTo) {
      filter.dueDate = {
        ...(dueDateFrom && { $gte: new Date(dueDateFrom) }),
        ...(dueDateTo   && { $lte: new Date(dueDateTo) }),
      };
    }

    const [data, total] = await Promise.all([
      models.Task.find(filter)
        .populate("status", "name slug color")
        .populate("assignees", "firstName lastName email avatar")
        .populate("createdBy", "firstName lastName email")
        .populate("department", "name code")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      models.Task.countDocuments(filter),
    ]);

    return apiSuccess({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("[API /tasks GET]", error);
    return apiError("Internal Server Error", 500);
  }
});

export const POST = withPermission("tasks:create", async (req, ctx, session, models) => {
  const body = await req.json();
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const defaultStatus = await models.WorkflowStatus.findOne({ isDefault: true });
  if (!defaultStatus) return apiError("No default workflow status configured", 500);

  const taskNumber = await getNextTaskNumber(models);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const task = new models.Task({
    ...parsed.data,
    taskNumber,
    status: defaultStatus._id,
    createdBy: session.user.id,
  }) as any;
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
    }, models);
  }

  return apiSuccess(task.toObject(), 201);
});
