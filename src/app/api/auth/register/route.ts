import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { createUserSchema } from "@/features/auth/validators";
import { logActivity } from "@/features/users/activity-logger";

export async function POST(req: NextRequest) {
  await dbConnect();
  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const existing = await User.findOne({ email: parsed.data.email });
  if (existing) {
    return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
  }

  // Default role assignment (e.g., 'staff')
  if (!parsed.data.roles || parsed.data.roles.length === 0) {
    parsed.data.roles = [process.env.DEFAULT_ROLE_ID || "staff_role_id"];
  }

  const user = await User.create(parsed.data);

  await logActivity({
    actor: user._id,
    action: "user.registered",
    resource: "user",
    resourceId: user._id,
    details: { email: user.email },
    req,
  });

  return NextResponse.json({ message: "Registration successful" }, { status: 201 });
}
