/**
 * Super-admin API: List and manage all tenants.
 * Requires a SUPER_ADMIN_SECRET header for authentication.
 * These routes are served under the admin.yourdomain.com subdomain.
 */
import { NextRequest, NextResponse } from "next/server";
import { getPlatformDb } from "@/lib/platform-db";
import getTenantModel from "@/models/platform/Tenant";
import { getTenantConnection, tenantDbName } from "@/lib/tenant-db";
import { seedTenant } from "@/lib/seed-tenant";
import { z } from "zod";

function checkSuperAdminAuth(req: NextRequest) {
  const secret = req.headers.get("x-super-admin-secret");
  return secret === process.env.SUPER_ADMIN_SECRET;
}

// GET /api/platform/tenants — list all tenants with summary counts
export async function GET(req: NextRequest) {
  if (!checkSuperAdminAuth(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("q") ?? "";
  const statusFilter = searchParams.get("status") ?? "";
  const planFilter   = searchParams.get("plan") ?? "";

  const platformDb = await getPlatformDb();
  const Tenant = getTenantModel(platformDb);

  const filter: Record<string, unknown> = {};
  if (statusFilter) filter.status = statusFilter;
  if (planFilter)   filter.plan   = planFilter;
  if (search)       filter.$or    = [{ name: { $regex: search, $options: "i" } }, { slug: { $regex: search, $options: "i" } }, { adminEmail: { $regex: search, $options: "i" } }];

  const [tenants, counts] = await Promise.all([
    Tenant.find(filter).sort({ createdAt: -1 }).lean(),
    Tenant.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const statusCounts: Record<string, number> = {};
  for (const c of counts) statusCounts[c._id as string] = c.count as number;

  return NextResponse.json({ tenants, total: tenants.length, statusCounts });
}

const createTenantSchema = z.object({
  companyName: z.string().min(2).max(100),
  subdomain: z.string().min(3).max(30).regex(/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
  adminFirstName: z.string().min(1),
  adminLastName: z.string().min(1),
  plan: z.enum(["trial", "starter", "growth", "business", "enterprise"]).optional(),
});

// POST /api/platform/tenants — create tenant (super-admin manual provisioning)
export async function POST(req: NextRequest) {
  if (!checkSuperAdminAuth(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createTenantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const platformDb = await getPlatformDb();
  const Tenant = getTenantModel(platformDb);

  const existing = await Tenant.findOne({ slug: parsed.data.subdomain });
  if (existing) {
    return NextResponse.json({ error: "Subdomain already taken" }, { status: 409 });
  }

  const dbName = tenantDbName(parsed.data.subdomain);
  const tenant = await Tenant.create({
    slug: parsed.data.subdomain,
    name: parsed.data.companyName,
    dbName,
    adminEmail: parsed.data.adminEmail.toLowerCase(),
    plan: parsed.data.plan ?? "trial",
    status: "active",
    maxUsers: 10,
  });

  const tenantConn = await getTenantConnection(dbName);
  await seedTenant({
    conn: tenantConn,
    adminEmail: parsed.data.adminEmail,
    adminPassword: parsed.data.adminPassword,
    adminFirstName: parsed.data.adminFirstName,
    adminLastName: parsed.data.adminLastName,
  });

  return NextResponse.json(
    { message: "Tenant created", tenantId: tenant._id.toString() },
    { status: 201 }
  );
}
