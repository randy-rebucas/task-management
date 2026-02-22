import { withPermission, apiSuccess, apiError } from "@/features/auth/api-helpers";
import { createDepartmentSchema } from "@/features/auth/validators";
import { logActivity } from "@/features/users/activity-logger";
import type { IDepartment } from "@/types";
export const GET = withPermission("departments:view", async (_req, _ctx, _session, models) => {
  const departments = await models.Department.find()
    .populate("head", "firstName lastName email")
    .populate("parentDepartment", "name code")
    .sort({ name: 1 })
    .lean();

  return apiSuccess(departments);
});

export const POST = withPermission("departments:create", async (req, ctx, session, models) => {
  const body = await req.json();
  const parsed = createDepartmentSchema.safeParse(body);
  if (!parsed.success) {
    const fallbackMsg = typeof parsed.error === 'object' && parsed.error.issues && parsed.error.issues.length > 0
      ? parsed.error.issues[0].message
      : 'Invalid request';
    return apiError(fallbackMsg);
  }

  const existing = await models.Department.findOne({
    $or: [{ name: parsed.data.name }, { code: parsed.data.code }],
  });
  if (existing) return apiError("Department name or code already exists", 409);

  const dept = await models.Department.create(parsed.data) as unknown as IDepartment & { _id: { toString: () => string } };

  await logActivity({
    actor: session.user.id,
    action: "department.created",
    resource: "department",
    resourceId: dept._id.toString(),
    details: { name: dept.name },
    req,
  });

  return apiSuccess(dept, 201);
});
