import { withPermission, apiSuccess, apiError } from "@/lib/api-helpers";
import { createDepartmentSchema } from "@/lib/validators";
import { logActivity } from "@/lib/activity-logger";
import Department from "@/models/Department";

export const GET = withPermission("departments:view", async () => {
  const departments = await Department.find()
    .populate("head", "firstName lastName email")
    .populate("parentDepartment", "name code")
    .sort({ name: 1 })
    .lean();

  return apiSuccess(departments);
});

export const POST = withPermission("departments:create", async (req, ctx, session) => {
  const body = await req.json();
  const parsed = createDepartmentSchema.safeParse(body);
  if (!parsed.success) {
    const fallbackMsg = typeof parsed.error === 'object' && parsed.error.issues && parsed.error.issues.length > 0
      ? parsed.error.issues[0].message
      : 'Invalid request';
    return apiError(fallbackMsg);
  }

  const existing = await Department.findOne({
    $or: [{ name: parsed.data.name }, { code: parsed.data.code }],
  });
  if (existing) return apiError("Department name or code already exists", 409);

  const dept = await Department.create(parsed.data);

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
