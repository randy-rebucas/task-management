import { withPermission, apiSuccess, apiError } from "@/lib/api-helpers";
import { updateDepartmentSchema } from "@/lib/validators";
import { logActivity } from "@/lib/activity-logger";
import Department from "@/models/Department";

export const GET = withPermission("departments:view", async (req, ctx) => {
  const { deptId } = await ctx.params;
  const dept = await Department.findById(deptId)
    .populate("head", "firstName lastName email")
    .populate("parentDepartment", "name code")
    .lean();
  if (!dept) return apiError("Department not found", 404);
  return apiSuccess(dept);
});

export const PUT = withPermission("departments:update", async (req, ctx, session) => {
  const { deptId } = await ctx.params;
  const body = await req.json();
  const parsed = updateDepartmentSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const dept = await Department.findByIdAndUpdate(deptId, parsed.data, { new: true });
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

export const DELETE = withPermission("departments:delete", async (req, ctx, session) => {
  const { deptId } = await ctx.params;
  const dept = await Department.findByIdAndUpdate(deptId, { isActive: false }, { new: true });
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
