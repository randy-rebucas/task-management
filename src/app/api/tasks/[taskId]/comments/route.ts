import { withPermission, apiSuccess, apiError } from "@/lib/api-helpers";
import { createCommentSchema } from "@/lib/validators";
import { triggerNotification } from "@/lib/notification-service";
import TaskComment from "@/models/TaskComment";
import Task from "@/models/Task";

export const GET = withPermission("tasks:view", async (req, ctx) => {
  const { taskId } = await ctx.params;
  const comments = await TaskComment.find({ task: taskId })
    .populate("author", "firstName lastName email avatar")
    .sort({ createdAt: 1 })
    .lean();

  return apiSuccess(comments);
});

export const POST = withPermission("tasks:view", async (req, ctx, session) => {
  const { taskId } = await ctx.params;
  const body = await req.json();
  const parsed = createCommentSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  const task = await Task.findById(taskId);
  if (!task) return apiError("Task not found", 404);

  const comment = await TaskComment.create({
    task: taskId,
    author: session.user.id,
    content: parsed.data.content,
    parentComment: parsed.data.parentComment,
  });

  await triggerNotification("comment_added", {
    taskId,
    actorId: session.user.id,
    data: { taskTitle: task.title, actorName: session.user.name },
  });

  const populated = await comment.populate("author", "firstName lastName email avatar");
  return apiSuccess(populated, 201);
});
