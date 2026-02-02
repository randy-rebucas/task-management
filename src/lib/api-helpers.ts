import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserPermissions, checkPermission } from "@/lib/rbac";
import { dbConnect } from "@/lib/db";
import { Session } from "next-auth";

type RouteContext = { params: Promise<Record<string, string>> };

type AuthenticatedHandler = (
  req: NextRequest,
  ctx: RouteContext,
  session: Session
) => Promise<NextResponse>;

export function withAuth(handler: AuthenticatedHandler) {
  return async (req: NextRequest, ctx: RouteContext) => {
    await dbConnect();
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return handler(req, ctx, session as Session);
  };
}

export function withPermission(permission: string, handler: AuthenticatedHandler) {
  return withAuth(async (req, ctx, session) => {
    const perms = await getUserPermissions(session.user.roles);
    if (!checkPermission(perms, permission)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return handler(req, ctx, session);
  });
}

export function apiError(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function apiSuccess<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status });
}

export function getPaginationParams(url: URL) {
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
