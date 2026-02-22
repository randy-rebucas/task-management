import { getTenantPermissions, checkPermission } from "@/features/auth/rbac";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await models.User.findById(session.user.id)
    .populate("roles")
    .populate("department")
    .lean();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const permissions = await getTenantPermissions(session.user.roles, models);

  return NextResponse.json({
    ...user,
    password: undefined,
    permissions: Array.from(permissions),
  });
}

const profileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName:  z.string().min(1).max(50).optional(),
  phone:     z.string().max(30).optional(),
  jobTitle:  z.string().max(100).optional(),
  team:      z.string().max(100).optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const user = await models.User.findById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  Object.assign(user, parsed.data);
  await user.save();

  return NextResponse.json({ ok: true });
}

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(8, "New password must be at least 8 characters"),
});

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = passwordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const user = await models.User.findById(session.user.id).select("+password");
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const isMatch = await bcrypt.compare(parsed.data.currentPassword, user.password as string);
  if (!isMatch) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  user.password = parsed.data.newPassword; // pre-save hook hashes it
  await user.save();

  return NextResponse.json({ ok: true });
}
