import { withPermission, apiSuccess, apiError } from "@/features/auth/api-helpers";
import { createCommentSchema } from "@/features/auth/validators";
import { triggerNotification } from "@/features/users/notification-service";
export const GET = withPermission("tasks:view", async (req, ctx, _session, models) => {
  const { taskId } = await ctx.params;
  const comments = await models.TaskComment.find({ task: taskId })
    .populate("author", "firstName lastName email avatar")
    .sort({ createdAt: 1 })
    .lean();

  return apiSuccess(comments);
});

export const POST = withPermission("tasks:update", async (req, ctx, session, models) => {
  const { taskId } = await ctx.params;
  const body = await req.json();
  const parsed = createCommentSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const task = await models.Task.findById(taskId) as any;
  if (!task) return apiError("Task not found", 404);

  const comment = await models.TaskComment.create({
    task: taskId,
    author: session.user.id,
    content: parsed.data.content,
    parentComment: parsed.data.parentComment,
  });

  await triggerNotification("comment_added", {
    taskId,
    actorId: session.user.id,
    data: { taskTitle: task.title, actorName: session.user.name },
  }, models);

  const populated = await comment.populate("author", "firstName lastName email avatar");
  return apiSuccess(populated, 201);
});
