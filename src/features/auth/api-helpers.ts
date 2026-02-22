import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTenantPermissions, checkPermission } from "@/features/auth/rbac";
import { getTenantConnection } from "@/lib/tenant-db";
import { getTenantModels, TenantModels } from "@/lib/tenant-models";
import { Session } from "next-auth";
import mongoose from "mongoose";

type RouteContext = { params: Promise<Record<string, string>> };

type TenantHandler = (
  req: NextRequest,
  ctx: RouteContext,
  session: Session,
  models: TenantModels,
  tenantConn: mongoose.Connection
) => Promise<NextResponse>;

/**
 * Resolves the tenant DB connection and models from request headers.
 * Returns null if the tenant cannot be resolved.
 */
/**
 * Resolve tenant DB from request headers, ?__tenant param, or a pre-known dbName fallback.
 * Pass `tenantDbName` from the session JWT as the fallback so this works in every
 * environment (local dev, ngrok, Vercel preview) even when middleware headers are absent.
 */
export async function getTenantModelsFromRequest(
  req: NextRequest,
  tenantDbNameFallback?: string | null
): Promise<{ conn: mongoose.Connection; models: TenantModels } | null> {
  // 1. Headers injected by middleware for subdomain requests
  let dbName = req.headers.get("x-tenant-db");

  // 2. Local dev fallback via ?__tenant=slug
  if (!dbName) {
    const slug = new URL(req.url).searchParams.get("__tenant");
    if (slug) {
      const { getPlatformDb } = await import("@/lib/platform-db");
      const getTenantModel = (await import("@/models/platform/Tenant")).default;
      const pdb = await getPlatformDb();
      const T = getTenantModel(pdb);
      const t = await T.findOne({ slug }).lean();
      dbName = t ? (t as any).dbName : null;
    }
  }

  // 3. Session JWT fallback — always available for authenticated requests
  if (!dbName && tenantDbNameFallback) {
    dbName = tenantDbNameFallback;
  }

  if (!dbName) return null;

  const conn = await getTenantConnection(dbName);
  return { conn, models: getTenantModels(conn) };
}

export function withAuth(handler: TenantHandler) {
  return async (req: NextRequest, ctx: RouteContext) => {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await getTenantModelsFromRequest(req, session.user.tenantDbName);

    if (!result) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
    }

    // Cross-tenant protection: reject sessions that don't belong to this tenant
    const requestTenantSlug = req.headers.get("x-tenant-slug")
      ?? req.nextUrl.searchParams.get("__tenant");
    if (requestTenantSlug && session.user.tenantSlug !== requestTenantSlug) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return handler(req, ctx, session as Session, result.models, result.conn);
  };
}

export function withPermission(permission: string, handler: TenantHandler) {
  return withAuth(async (req, ctx, session, models, conn) => {
    const perms = await getTenantPermissions(session.user.roles, models);
    if (!checkPermission(perms, permission)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return handler(req, ctx, session, models, conn);
  });
}

export function apiError(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function apiSuccess<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status });
}

export function getPaginationParams(url: URL) {
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const rawLimit = parseInt(url.searchParams.get("limit") || "20", 10);
  const limit = Math.min(Math.max(1, rawLimit), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
