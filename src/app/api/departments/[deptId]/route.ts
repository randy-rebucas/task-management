import { withPermission, apiSuccess, apiError } from "@/features/auth/api-helpers";
import { updateDepartmentSchema } from "@/features/auth/validators";
import { logActivity } from "@/features/users/activity-logger";
export const GET = withPermission("departments:view", async (req, ctx) => {
  const { deptId } = await ctx.params;
  const dept = await models.Department.findById(deptId)
    .populate("head", "firstName lastName email")
    .populate("parentDepartment", "name code")
    .lean();
  if (!dept) return apiError("Department not found", 404);
  return apiSuccess(dept);
});

export const PUT = withPermission("departments:update", async (req, ctx, session, models) => {
  const { deptId } = await ctx.params;
  const body = await req.json();
  const parsed = updateDepartmentSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const dept = await models.Department.findByIdAndUpdate(deptId, parsed.data, { new: true });
  if (!dept) return apiError("Department not found", 404);

  await logActivity({
    actor: session.user.id,
    action: "department.updated",
    resource: "department",
    resourceId: deptId,
    details: { fields: Object.keys(parsed.data) },
    req,
  });

  return apiSuccess(dept);
});

export const DELETE = withPermission("departments:delete", async (req, ctx, session, models) => {
  const { deptId } = await ctx.params;
  const dept = await models.Department.findByIdAndUpdate(deptId, { isActive: false }, { new: true });
  if (!dept) return apiError("Department not found", 404);

  await logActivity({
    actor: session.user.id,
    action: "department.deactivated",
    resource: "department",
    resourceId: deptId,
    details: { name: dept.name },
    req,
  });

  return apiSuccess({ message: "Department deactivated" });
});
