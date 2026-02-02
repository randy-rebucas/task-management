import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { getUserPermissions } from "@/lib/rbac";
import User from "@/models/User";

export async function GET(req: NextRequest) {
  await dbConnect();
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await User.findById(session.user.id)
    .populate("roles")
    .populate("department")
    .lean();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const permissions = await getUserPermissions(session.user.roles);

  return NextResponse.json({
    ...user,
    password: undefined,
    permissions: Array.from(permissions),
  });
}
