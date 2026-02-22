import { NextRequest, NextResponse } from "next/server";
import { getPlatformDb } from "@/lib/platform-db";
import getTenantModel from "@/models/platform/Tenant";
import { getTenantConnection } from "@/lib/tenant-db";
import { getTenantModels } from "@/lib/tenant-models";

function checkAuth(req: NextRequest) {
  return req.headers.get("x-super-admin-secret") === process.env.SUPER_ADMIN_SECRET;
}

type Ctx = { params: Promise<{ tenantId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { tenantId } = await ctx.params;
  const platformDb = await getPlatformDb();
  const Tenant = getTenantModel(platformDb);
  const tenant = await Tenant.findById(tenantId).lean() as { dbName: string } | null;
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const conn = await getTenantConnection(tenant.dbName);
  const models = getTenantModels(conn);

  const subscriptions = await models.Subscription.find({})
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ subscriptions, total: subscriptions.length });
}
