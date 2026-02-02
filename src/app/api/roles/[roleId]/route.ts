import { withPermission, apiSuccess, apiError } from "@/lib/api-helpers";
import { updateRoleSchema } from "@/lib/validators";
import { logActivity } from "@/lib/activity-logger";
import Role from "@/models/Role";
import slugify from "slugify";

export const GET = withPermission("roles:view", async (req, ctx) => {
  const { roleId } = await ctx.params;
  const role = await Role.findById(roleId).populate("permissions").lean();
  if (!role) return apiError("Role not found", 404);
  return apiSuccess(role);
});

export const PUT = withPermission("roles:update", async (req, ctx, session) => {
  const { roleId } = await ctx.params;
  const role = await Role.findById(roleId);
  if (!role) return apiError("Role not found", 404);

  const body = await req.json();
  const parsed = updateRoleSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message);

  if (parsed.data.name) {
    role.name = parsed.data.name;
    role.slug = slugify(parsed.data.name, { lower: true, strict: true });
  }
  if (parsed.data.description !== undefined) role.description = parsed.data.description;
  if (parsed.data.permissions) role.permissions = parsed.data.permissions as never[];
  if (parsed.data.isActive !== undefined) role.isActive = parsed.data.isActive;

  await role.save();

  await logActivity({
    actor: session.user.id,
    action: "role.updated",
    resource: "role",
    resourceId: roleId,
    details: { fields: Object.keys(parsed.data) },
    req,
  });

  return apiSuccess(role);
});

export const DELETE = withPermission("roles:delete", async (req, ctx, session) => {
  const { roleId } = await ctx.params;
  const role = await Role.findById(roleId);
  if (!role) return apiError("Role not found", 404);
  if (role.isSystem) return apiError("Cannot delete system roles", 403);

  await Role.findByIdAndDelete(roleId);

  await logActivity({
    actor: session.user.id,
    action: "role.deleted",
    resource: "role",
    resourceId: roleId,
    details: { name: role.name },
    req,
  });

  return apiSuccess({ message: "Role deleted" });
});
