import path from "path";
import { v4 as uuidv4 } from "uuid";
import { withAuth, apiSuccess, apiError } from "@/features/auth/api-helpers";
import { FILE_UPLOAD } from "@/config/constants";
import { uploadFile } from "@/lib/storage";

export const POST = withAuth(async (req, _ctx, _session, _models) => {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) return apiError("No file provided");

  if (file.size > FILE_UPLOAD.maxSize) {
    return apiError("File size exceeds 10MB limit");
  }

  if (!FILE_UPLOAD.allowedTypes.includes(file.type)) {
    return apiError("File type not allowed");
  }

  const ext = path.extname(file.name);
  const fileName = `${uuidv4()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { fileUrl } = await uploadFile("general", fileName, buffer);

  return apiSuccess({
    url: fileUrl,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
  });
});
