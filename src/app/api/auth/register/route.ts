import { NextRequest, NextResponse } from "next/server";
import { getTenantModelsFromRequest } from "@/features/auth/api-helpers";
import { registerSchema } from "@/features/auth/validators";
import { logActivity } from "@/features/users/activity-logger";

export async function POST(req: NextRequest) {
  const tenantCtx = await getTenantModelsFromRequest(req);
  if (!tenantCtx) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
  }
  const { models } = tenantCtx;

  const body = await req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const existing = await models.User.findOne({ email: parsed.data.email });
  if (existing) {
    return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
  }

  // Assign the default role for self-registered users
  const defaultRole = await models.Role.findOne({ slug: "viewer-auditor" }).select("_id").lean();
  const roles = defaultRole ? [(defaultRole as any)._id] : [];

  const user = await models.User.create({ ...parsed.data, roles });

  await logActivity({
    actor: (user as any)._id.toString(),
    action: "user.registered",
    resource: "user",
    resourceId: (user as any)._id.toString(),
    details: { email: (user as any).email },
    req,
    models,
  });

  return NextResponse.json({ message: "Registration successful" }, { status: 201 });
}

