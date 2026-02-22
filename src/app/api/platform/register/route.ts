/**
 * POST /api/platform/register
 * Public endpoint — creates a new tenant and seeds initial data.
 * Called from the company sign-up page on the main domain.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPlatformDb } from "@/lib/platform-db";
import getTenantModel from "@/models/platform/Tenant";
import { getTenantConnection, tenantDbName } from "@/lib/tenant-db";
import { seedTenant } from "@/lib/seed-tenant";

const registerTenantSchema = z.object({
  companyName: z.string().min(2).max(100),
  subdomain: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/, "Subdomain must be lowercase letters, numbers, and hyphens (e.g. my-company)"),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
  adminFirstName: z.string().min(1).max(50),
  adminLastName: z.string().min(1).max(50),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerTenantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { companyName, subdomain, adminEmail, adminPassword, adminFirstName, adminLastName } =
      parsed.data;

    const platformDb = await getPlatformDb();
    const Tenant = getTenantModel(platformDb);

    // Check subdomain availability
    const existing = await Tenant.findOne({ slug: subdomain });
    if (existing) {
      return NextResponse.json(
        { error: "This subdomain is already taken. Please choose another." },
        { status: 409 }
      );
    }

    // Reserved subdomains
    const RESERVED = new Set(["www", "admin", "api", "app", "mail", "smtp", "ftp", "status", "docs", "platform", "support", "billing"]);
    if (RESERVED.has(subdomain)) {
      return NextResponse.json(
        { error: "This subdomain is reserved. Please choose another." },
        { status: 400 }
      );
    }

    // Create the tenant record
    const dbName = tenantDbName(subdomain);
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14-day trial

    const tenant = await Tenant.create({
      slug: subdomain,
      name: companyName,
      dbName,
      adminEmail: adminEmail.toLowerCase(),
      plan: "trial",
      status: "active",
      trialEndsAt,
      maxUsers: 10,
    });

    // Provision tenant database and seed default data
    const tenantConn = await getTenantConnection(dbName);
    await seedTenant({
      conn: tenantConn,
      adminEmail,
      adminPassword,
      adminFirstName,
      adminLastName,
    });

    return NextResponse.json(
      {
        message: "Tenant created successfully",
        tenantId: tenant._id.toString(),
        subdomain,
        loginUrl: `//${subdomain}.${req.headers.get("host")?.replace(/^[^.]+\./, "") ?? "localhost:3000"}/login`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/platform/register]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
