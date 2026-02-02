import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { withPermission, apiSuccess, apiError } from "@/lib/api-helpers";
import TaskAttachment from "@/models/TaskAttachment";
import Task from "@/models/Task";
import { FILE_UPLOAD } from "@/config/constants";

export const GET = withPermission("tasks:view", async (req, ctx) => {
  const { taskId } = await ctx.params;
  const attachments = await TaskAttachment.find({ task: taskId })
    .populate("uploadedBy", "firstName lastName email")
    .sort({ createdAt: -1 })
    .lean();

  return apiSuccess(attachments);
});

export const POST = withPermission("tasks:update", async (req, ctx, session) => {
  const { taskId } = await ctx.params;

  const task = await Task.findById(taskId);
  if (!task) return apiError("Task not found", 404);

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const isProofOfWork = formData.get("isProofOfWork") === "true";

  if (!file) return apiError("No file provided");

  if (file.size > FILE_UPLOAD.maxSize) {
    return apiError("File size exceeds 10MB limit");
  }

  if (!FILE_UPLOAD.allowedTypes.includes(file.type)) {
    return apiError("File type not allowed");
  }

  const ext = path.extname(file.name);
  const fileName = `${uuidv4()}${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", taskId);
  await mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, fileName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const attachment = await TaskAttachment.create({
    task: taskId,
    uploadedBy: session.user.id,
    fileName: file.name,
    fileUrl: `/uploads/${taskId}/${fileName}`,
    fileSize: file.size,
    mimeType: file.type,
    isProofOfWork,
  });

  return apiSuccess(attachment, 201);
});
