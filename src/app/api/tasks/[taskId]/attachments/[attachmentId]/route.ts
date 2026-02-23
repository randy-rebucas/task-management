import { withPermission, apiSuccess, apiError } from "@/features/auth/api-helpers";
import { deleteFile } from "@/lib/storage";

export const DELETE = withPermission("tasks:update", async (req, ctx, _session, models) => {
  const { taskId, attachmentId } = await ctx.params;

  const attachment = await models.TaskAttachment.findOne({
    _id: attachmentId,
    task: taskId,
  }) as any;
  if (!attachment) return apiError("Attachment not found", 404);

  // Remove physical file from storage
  await deleteFile(attachment.fileUrl);

  await models.TaskAttachment.deleteOne({ _id: attachmentId });

  return apiSuccess({ deleted: true });
});
