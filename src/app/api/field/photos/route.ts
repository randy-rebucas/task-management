import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { withAuth, apiSuccess, apiError } from "@/features/auth/api-helpers";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export const POST = withAuth(async (req) => {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") return apiError("No file provided", 400);
    if (file.size > MAX_SIZE) return apiError("File size exceeds 10MB limit", 400);
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return apiError("Only JPEG, PNG and WebP images are allowed", 400);
    }

    const ext = file.type.split("/")[1];
    const fileName = `${randomUUID()}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "field");
    await mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, fileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    return apiSuccess({ url: `/uploads/field/${fileName}` }, 201);
  } catch (err) {
    console.error("[POST /api/field/photos]", err);
    return apiError("Failed to upload photo", 500);
  }
});
