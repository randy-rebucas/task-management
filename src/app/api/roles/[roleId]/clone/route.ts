import { withPermission, apiSuccess, apiError } from "@/features/auth/api-helpers";
import { logActivity } from "@/features/users/activity-logger";
import slugify from "slugify";

export const POST = withPermission("roles:clone", async (req, ctx, session, models) => {
  const { roleId } = await ctx.params;
  const sourceRole = await models.Role.findById(roleId) as any;
  if (!sourceRole) return apiError("Role not found", 404);

  const body = await req.json();
  const name = body.name || `${sourceRole.name} (Copy)`;
  const slug = slugify(name, { lower: true, strict: true });

  const existing = await models.Role.findOne({ slug });
  if (existing) return apiError("A role with this name already exists", 409);

  const cloned = await models.Role.create({
    name,
    slug,
    description: body.description || sourceRole.description,
    permissions: sourceRole.permissions,
    isSystem: false,
    createdBy: session.user.id,
  });

  await logActivity({
    actor: session.user.id,
    action: "role.cloned",
    resource: "role",
    resourceId: cloned._id.toString(),
    details: { sourceRole: sourceRole.name, newRole: name },
    req,
  });

  return apiSuccess(cloned, 201);
});
