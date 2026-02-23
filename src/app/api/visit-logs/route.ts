
import { withPermission, apiSuccess, apiError, getPaginationParams } from "@/features/auth/api-helpers";
import { getTenantPermissions, checkPermission } from "@/features/auth/rbac";
import { createVisitLogSchema } from "@/features/auth/validators";
import crypto from "crypto";
import { uploadFile, deleteFile } from "@/lib/storage";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

async function cleanupFiles(fileUrls: string[]) {
  await Promise.all(fileUrls.map((url) => deleteFile(url).catch(() => {})));
}

export const POST = withPermission("visit_logs:create", async (req, ctx, session, models) => {
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
          await cleanupFiles(savedFiles);
          return apiError(`Invalid file type: ${file.type}. Only images are allowed.`);
        }
        const ext = file.type.split("/")[1];
        const filename = `${crypto.randomUUID()}.${ext}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        const { fileUrl } = await uploadFile("visit-logs", filename, buffer);
        savedFiles.push(fileUrl);
      }
    }
    const parsed = createVisitLogSchema.safeParse({ ...fields, photos: savedFiles });
    if (!parsed.success) {
      await cleanupFiles(savedFiles);
      return apiError(parsed.error.issues[0].message);
    }
    const visitLog = await models.VisitLog.create({ ...parsed.data, user: session.user.id });
    return apiSuccess(visitLog);
  } else {
    // fallback for JSON
    const body = await req.json();
    const parsed = createVisitLogSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message);
    }
    const visitLog = await models.VisitLog.create({ ...parsed.data, user: session.user.id });
    return apiSuccess(visitLog);
  }
});

export const GET = withPermission("visit_logs:view", async (req, ctx, session, models) => {
  const url = new URL(req.url);
  const { page, limit, skip } = getPaginationParams(url);
  const search = url.searchParams.get("search") || "";
  const requestedUser = url.searchParams.get("userId");

  const perms = await getTenantPermissions(session.user.roles, models);
  const canViewAll = checkPermission(perms, "visit_logs:view_all");

  const filter: Record<string, unknown> = {};
  if (canViewAll && requestedUser) {
    filter.user = requestedUser;
  } else if (!canViewAll) {
    filter.user = session.user.id;
  }
  if (search) {
    filter.$or = [
      { placesVisited: { $regex: search, $options: "i" } },
      { peopleMet: { $regex: search, $options: "i" } },
      { purpose: { $regex: search, $options: "i" } },
    ];
  }

  const [data, total] = await Promise.all([
    models.VisitLog.find(filter)
      .populate("user", "firstName lastName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    models.VisitLog.countDocuments(filter),
  ]);

  return apiSuccess({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
});
