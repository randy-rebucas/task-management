import { withPermission, apiSuccess, apiError } from "@/features/auth/api-helpers";
import { createRoleSchema } from "@/features/auth/validators";
import { logActivity } from "@/features/users/activity-logger";
import slugify from "slugify";
import type { IRole } from "@/types";

export const GET = withPermission("roles:view", async (_req, _ctx, _session, models) => {
  const roles = await models.Role.find()
    .populate("permissions")
    .sort({ createdAt: -1 })
    .lean();

  return apiSuccess(roles);
});

export const POST = withPermission("roles:create", async (req, ctx, session, models) => {
  const body = await req.json();
  const parsed = createRoleSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const slug = slugify(parsed.data.name, { lower: true, strict: true });
  const existing = await models.Role.findOne({ slug });
  if (existing) return apiError("A role with this name already exists", 409);

  // Validate permission IDs
  const permCount = await models.Permission.countDocuments({
    _id: { $in: parsed.data.permissions },
  });
  if (permCount !== parsed.data.permissions.length) {
    return apiError("Some permission IDs are invalid");
  }

  const role = await models.Role.create({
    name: parsed.data.name,
    slug,
    description: parsed.data.description || "",
    permissions: parsed.data.permissions,
    isSystem: false,
    createdBy: session.user.id,
  }) as unknown as IRole & { _id: { toString: () => string } };

  await logActivity({
    actor: session.user.id,
    action: "role.created",
    resource: "role",
    resourceId: role._id.toString(),
    details: { name: role.name },
    req,
  });

  return apiSuccess(role, 201);
});
