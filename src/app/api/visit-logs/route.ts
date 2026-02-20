
import { withAuth, apiSuccess, apiError, getPaginationParams } from "@/features/auth/api-helpers";
import { createVisitLogSchema } from "@/features/auth/validators";
import VisitLog from "@/models/VisitLog";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);


export const POST = withAuth(async (req, ctx, session) => {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const fields: Record<string, any> = {};
    for (const [key, value] of formData.entries()) {
      if (key === "photos") continue;
      fields[key] = value;
    }
    const files = formData.getAll("photos");
    const savedFiles: string[] = [];
    for (const file of files) {
      if (typeof file === "object" && "arrayBuffer" in file) {
        if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
          return apiError(`Invalid file type: ${file.type}. Only images are allowed.`);
        }
        const ext = file.type.split("/")[1];
        const filename = `${crypto.randomUUID()}.${ext}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        const uploadDir = path.join(process.cwd(), "public", "uploads", "visit-logs");
        await fs.mkdir(uploadDir, { recursive: true });
        const filePath = path.join(uploadDir, filename);
        await fs.writeFile(filePath, buffer);
        savedFiles.push(`/uploads/visit-logs/${filename}`);
      }
    }
    const parsed = createVisitLogSchema.safeParse({ ...fields, photos: savedFiles });
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message);
    }
    const visitLog = await VisitLog.create({ ...parsed.data, user: session.user.id });
    return apiSuccess(visitLog);
  } else {
    // fallback for JSON
    const body = await req.json();
    const parsed = createVisitLogSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message);
    }
    const visitLog = await VisitLog.create({ ...parsed.data, user: session.user.id });
    return apiSuccess(visitLog);
  }
});

export const GET = withAuth(async (req, ctx, session) => {
  const url = new URL(req.url);
  const { page, limit, skip } = getPaginationParams(url);
  const search = url.searchParams.get("search") || "";

  const filter: Record<string, unknown> = { user: session.user.id };
  if (search) {
    filter.$or = [
      { placesVisited: { $regex: search, $options: "i" } },
      { peopleMet: { $regex: search, $options: "i" } },
      { purpose: { $regex: search, $options: "i" } },
    ];
  }

  const [data, total] = await Promise.all([
    VisitLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    VisitLog.countDocuments(filter),
  ]);

  return apiSuccess({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
});
