/**
 * Super-admin API: Manage a specific tenant by ID.
 */
import { NextRequest, NextResponse } from "next/server";
import { getPlatformDb } from "@/lib/platform-db";
import getTenantModel from "@/models/platform/Tenant";

function checkSuperAdminAuth(req: NextRequest) {
  const secret = req.headers.get("x-super-admin-secret");
  return secret === process.env.SUPER_ADMIN_SECRET;
}

type Ctx = { params: Promise<{ tenantId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  if (!checkSuperAdminAuth(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { tenantId } = await ctx.params;
  const platformDb = await getPlatformDb();
  const Tenant = getTenantModel(platformDb);
  const tenant = await Tenant.findById(tenantId).lean();
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Fetch user + subscription counts from the tenant DB
  let userCount = 0;
  let subscriptionCount = 0;
  try {
    const { getTenantConnection } = await import("@/lib/tenant-db");
    const { getTenantModels } = await import("@/lib/tenant-models");
    const conn = await getTenantConnection((tenant as unknown as { dbName: string }).dbName);
    const models = getTenantModels(conn);
    [userCount, subscriptionCount] = await Promise.all([
      models.User.countDocuments({}),
      models.Subscription.countDocuments({}),
    ]);
  } catch {
    // non-critical — tenant DB might not be seeded yet
  }

  return NextResponse.json({ tenant, userCount, subscriptionCount });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  if (!checkSuperAdminAuth(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { tenantId } = await ctx.params;
  const body = await req.json();

  // Only allow updating plan, status, maxUsers
  const allowed = ["plan", "status", "maxUsers", "primaryColor", "logoUrl"];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) update[key] = body[key];
  }

  const platformDb = await getPlatformDb();
  const Tenant = getTenantModel(platformDb);
  const tenant = await Tenant.findByIdAndUpdate(tenantId, update, { new: true }).lean();
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ tenant });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  if (!checkSuperAdminAuth(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { tenantId } = await ctx.params;
  const platformDb = await getPlatformDb();
  const Tenant = getTenantModel(platformDb);
  // Soft-delete by marking as cancelled
  await Tenant.findByIdAndUpdate(tenantId, { status: "cancelled" });
  return NextResponse.json({ message: "Tenant cancelled" });
}
