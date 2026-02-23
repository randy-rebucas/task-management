import { withPermission, apiSuccess, apiError } from "@/features/auth/api-helpers";
import { FILE_UPLOAD } from "@/config/constants";
import { uploadFile } from "@/lib/storage";

export const GET = withPermission("tasks:view", async (req, ctx, _session, models) => {
  const { taskId } = await ctx.params;
  const attachments = await models.TaskAttachment.find({ task: taskId })
    .populate("uploadedBy", "firstName lastName email")
    .sort({ createdAt: -1 })
    .lean();

  return apiSuccess(attachments);
});

export const POST = withPermission("tasks:update", async (req, ctx, session, models) => {
  const { taskId } = await ctx.params;

  const task = await models.Task.findById(taskId);
  if (!task) return apiError("Task not found", 404);

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const isProofOfWork = formData.get("isProofOfWork") === "true";
  const attachmentType = formData.get("attachmentType") === "voice_note" ? "voice_note" : "file";

  if (!file) return apiError("No file provided");

  if (file.size > FILE_UPLOAD.maxSize) {
    return apiError("File size exceeds 10MB limit");
  }

  if (!FILE_UPLOAD.allowedTypes.includes(file.type)) {
    return apiError("File type not allowed");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { fileUrl } = await uploadFile(taskId, file.name, buffer);

  const attachment = await models.TaskAttachment.create({
    task: taskId,
    uploadedBy: session.user.id,
    fileName: file.name,
    fileUrl,
    fileSize: file.size,
    mimeType: file.type,
    attachmentType,
    isProofOfWork,
  });

  return apiSuccess(attachment, 201);
});
