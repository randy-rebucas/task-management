import { NextRequest, NextResponse } from "next/server";
import { getPlatformDb } from "@/lib/platform-db";
import getTenantModel from "@/models/platform/Tenant";
import { getTenantConnection } from "@/lib/tenant-db";
import { getTenantModels } from "@/lib/tenant-models";

function checkAuth(req: NextRequest) {
  return req.headers.get("x-super-admin-secret") === process.env.SUPER_ADMIN_SECRET;
}

type Ctx = { params: Promise<{ tenantId: string }> };

// GET /api/platform/tenants/[id]/app-settings
export async function GET(req: NextRequest, ctx: Ctx) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { tenantId } = await ctx.params;
  const platformDb = await getPlatformDb();
  const Tenant = getTenantModel(platformDb);
  const tenant = await Tenant.findById(tenantId).lean() as { dbName: string } | null;
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const conn = await getTenantConnection(tenant.dbName);
  const models = getTenantModels(conn);

  const settings = await models.AppSetting.find({}).sort({ key: 1 }).lean();
  return NextResponse.json({ settings });
}

// PATCH /api/platform/tenants/[id]/app-settings — update one setting { key, value }
export async function PATCH(req: NextRequest, ctx: Ctx) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { tenantId } = await ctx.params;
  const body = await req.json() as { key?: string; value?: unknown };
  if (!body.key) return NextResponse.json({ error: "key is required" }, { status: 400 });
  if (body.value === undefined) return NextResponse.json({ error: "value is required" }, { status: 400 });

  const platformDb = await getPlatformDb();
  const Tenant = getTenantModel(platformDb);
  const tenant = await Tenant.findById(tenantId).lean() as { dbName: string } | null;
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const conn = await getTenantConnection(tenant.dbName);
  const models = getTenantModels(conn);

  const setting = await models.AppSetting.findOneAndUpdate(
    { key: body.key },
    { key: body.key, value: body.value },
    { upsert: true, new: true }
  ).lean();

  return NextResponse.json({ setting });
}
