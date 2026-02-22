import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import Role from "@/models/Role";
import { Subscription } from "@/models/Subscription";
import { registerSchema } from "@/features/auth/validators";
import { logActivity } from "@/features/users/activity-logger";

export async function POST(req: NextRequest) {
  await dbConnect();
  const body = await req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const existing = await User.findOne({ email: parsed.data.email });
  if (existing) {
    return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
  }

  // Assign the default role for self-registered users
  const defaultRole = await Role.findOne({ slug: "viewer-auditor" }).select("_id").lean();
  const roles = defaultRole ? [defaultRole._id] : [];

  const user = await User.create({ ...parsed.data, roles });

  // Link any pending subscription created before account registration
  await Subscription.findOneAndUpdate(
    {
      email: user.email.toLowerCase(),
      user: { $exists: false },
      status: { $in: ["APPROVAL_PENDING", "APPROVED", "ACTIVE"] },
    },
    { user: user._id }
  );

  await logActivity({
    actor: user._id.toString(),
    action: "user.registered",
    resource: "user",
    resourceId: user._id.toString(),
    details: { email: user.email },
    req,
  });

  return NextResponse.json({ message: "Registration successful" }, { status: 201 });
}
