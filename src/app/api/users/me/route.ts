import { getTenantPermissions } from "@/features/auth/rbac";
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { withAuth, apiSuccess, apiError } from "@/features/auth/api-helpers";

const profileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName:  z.string().min(1).max(50).optional(),
  phone:     z.string().max(30).optional(),
  jobTitle:  z.string().max(100).optional(),
  team:      z.string().max(100).optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(8, "New password must be at least 8 characters"),
});

export const GET = withAuth(async (_req, _ctx, session, models) => {
  const user = await models.User.findById(session.user.id)
    .populate("roles")
    .populate("department")
    .lean();

  if (!user) return apiError("User not found", 404);

  // Use the freshly fetched user's roles (not the stale JWT roles) so that
  // any role changes made by an admin are reflected immediately.
  const permissions = await getTenantPermissions((user as any).roles, models);

  return NextResponse.json({
    ...user,
    password: undefined,
    permissions: Array.from(permissions),
  });
});

export const PATCH = withAuth(async (req, _ctx, session, models) => {
  const body = await req.json();
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const user = await models.User.findById(session.user.id) as any;
  if (!user) return apiError("User not found", 404);

  Object.assign(user, parsed.data);
  await user.save();

  return apiSuccess({ ok: true });
});

export const PUT = withAuth(async (req, _ctx, session, models) => {
  const body = await req.json();
  const parsed = passwordSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const user = await models.User.findById(session.user.id).select("+password") as any;
  if (!user) return apiError("User not found", 404);

  const isMatch = await bcrypt.compare(parsed.data.currentPassword, user.password as string);
  if (!isMatch) return apiError("Current password is incorrect");

  user.password = parsed.data.newPassword; // pre-save hook hashes it
  await user.save();

  return apiSuccess({ ok: true });
});
