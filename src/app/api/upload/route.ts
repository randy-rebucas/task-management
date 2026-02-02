import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { withAuth, apiSuccess, apiError } from "@/lib/api-helpers";
import { FILE_UPLOAD } from "@/config/constants";

export const POST = withAuth(async (req) => {
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
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, fileName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  return apiSuccess({
    url: `/uploads/${fileName}`,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
  });
});
