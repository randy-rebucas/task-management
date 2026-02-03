import { withPermission, apiSuccess, apiError } from "@/lib/api-helpers";
import { updateUserSchema } from "@/lib/validators";
import { logActivity } from "@/lib/activity-logger";
import User from "@/models/User";

export const GET = withPermission("users:view", async (req, ctx) => {
  const { userId } = await ctx.params;
  const user = await User.findById(userId)
    .populate("roles", "name slug")
    .populate("department", "name code")
    .lean();

  if (!user) return apiError("User not found", 404);
  return apiSuccess(user);
});

export const PUT = withPermission("users:update", async (req, ctx, session) => {
  const { userId } = await ctx.params;
  const body = await req.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message);
  }

  const user = await User.findById(userId);
  if (!user) return apiError("User not found", 404);

  Object.assign(user, parsed.data);
  await user.save();

  await logActivity({
    actor: session.user.id,
    action: "user.updated",
    resource: "user",
    resourceId: userId,
    details: { fields: Object.keys(parsed.data) },
    req,
  });

  return apiSuccess(user);
});

export const DELETE = withPermission("users:delete", async (req, ctx, session) => {
  const { userId } = await ctx.params;
  const user = await User.findById(userId);
  if (!user) return apiError("User not found", 404);

  user.isActive = false;
  await user.save();

  await logActivity({
    actor: session.user.id,
    action: "user.deactivated",
    resource: "user",
    resourceId: userId,
    details: { email: user.email },
    req,
  });

  return apiSuccess({ message: "User deactivated" });
});
