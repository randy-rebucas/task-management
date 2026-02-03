import { withPermission, apiSuccess, apiError } from "@/lib/api-helpers";
import { createRoleSchema } from "@/lib/validators";
import { logActivity } from "@/lib/activity-logger";
import Role from "@/models/Role";
import Permission from "@/models/Permission";
import slugify from "slugify";

export const GET = withPermission("roles:view", async () => {
  const roles = await Role.find()
    .populate("permissions")
    .sort({ createdAt: -1 })
    .lean();

  return apiSuccess(roles);
});

export const POST = withPermission("roles:create", async (req, ctx, session) => {
  const body = await req.json();
  const parsed = createRoleSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const slug = slugify(parsed.data.name, { lower: true, strict: true });
  const existing = await Role.findOne({ slug });
  if (existing) return apiError("A role with this name already exists", 409);

  // Validate permission IDs
  const permCount = await Permission.countDocuments({
    _id: { $in: parsed.data.permissions },
  });
  if (permCount !== parsed.data.permissions.length) {
    return apiError("Some permission IDs are invalid");
  }

  const role = await Role.create({
    name: parsed.data.name,
    slug,
    description: parsed.data.description || "",
    permissions: parsed.data.permissions,
    isSystem: false,
    createdBy: session.user.id,
  });

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
