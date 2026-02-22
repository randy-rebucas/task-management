/**
 * Multi-tenant aware seed script.
 *
 * What it does:
 *   1. Creates/upserts a tenant record in the `platform` DB.
 *   2. Seeds the tenant DB (permissions, roles, departments, workflow statuses,
 *      app settings, and the first admin user) via the shared seedTenant helper.
 *
 * Configurable via env vars (all have sensible defaults):
 *   TENANT_SLUG        – subdomain slug   (default: "localpro")
 *   TENANT_NAME        – display name     (default: "LocalPro")
 *   ADMIN_EMAIL        – admin email      (default: "admin@taskmanager.com")
 *   ADMIN_PASSWORD     – admin password   (default: "Admin@123")
 *   ADMIN_FIRST_NAME   – first name       (default: "Super")
 *   ADMIN_LAST_NAME    – last name        (default: "Admin")
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import { getPlatformDb } from "@/lib/platform-db";
import getTenantModel from "@/models/platform/Tenant";
import { getTenantConnection, tenantDbName } from "@/lib/tenant-db";
import { seedTenant } from "@/lib/seed-tenant";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error("MONGODB_URI is not set in .env.local");

// ── Config ─────────────────────────────────────────────────────────────────────
const TENANT_SLUG       = process.env.TENANT_SLUG       || "localpro";
const TENANT_NAME       = process.env.TENANT_NAME       || "LocalPro";
const ADMIN_EMAIL       = process.env.ADMIN_EMAIL       || "admin@taskmanager.com";
const ADMIN_PASSWORD    = process.env.ADMIN_PASSWORD    || "Admin@123";
const ADMIN_FIRST_NAME  = process.env.ADMIN_FIRST_NAME  || "Super";
const ADMIN_LAST_NAME   = process.env.ADMIN_LAST_NAME   || "Admin";

async function seed() {
  console.log("=== Multi-Tenant Seed ===\n");
  console.log(`  Tenant slug : ${TENANT_SLUG}`);
  console.log(`  Tenant name : ${TENANT_NAME}`);
  console.log(`  Admin email : ${ADMIN_EMAIL}`);

  // ── 1. Upsert tenant in platform DB ─────────────────────────────────────────
  console.log("\n--- Step 1: Platform DB — upsert tenant ---");
  const platformDb = await getPlatformDb();
  const Tenant = getTenantModel(platformDb);

  const dbName = tenantDbName(TENANT_SLUG);

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 365); // 1-year trial for seed

  const tenant = await Tenant.findOneAndUpdate(
    { slug: TENANT_SLUG },
    {
      slug: TENANT_SLUG,
      name: TENANT_NAME,
      dbName,
      adminEmail: ADMIN_EMAIL.toLowerCase(),
      plan: "trial",
      status: "active",
      trialEndsAt,
      maxUsers: 100,
    },
    { upsert: true, new: true }
  );
  console.log(`  Tenant "${tenant.name}" (slug: ${tenant.slug}, db: ${tenant.dbName}) — OK`);

  // ── 2. Seed tenant DB ────────────────────────────────────────────────────────
  console.log("\n--- Step 2: Tenant DB — seed data ---");
  const tenantConn = await getTenantConnection(dbName);

  const { permissionsCount } = await seedTenant({
    conn: tenantConn,
    adminEmail:      ADMIN_EMAIL,
    adminPassword:   ADMIN_PASSWORD,
    adminFirstName:  ADMIN_FIRST_NAME,
    adminLastName:   ADMIN_LAST_NAME,
  });

  console.log(`  Seeded ${permissionsCount} permissions, roles, departments, workflow statuses.`);
  console.log(`  Admin user: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);

  // ── Done ─────────────────────────────────────────────────────────────────────
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN;

  console.log("\n=== Seed Complete ===");
  console.log(`\nLogin URLs:`);
  console.log(`  Local dev  : http://localhost:3000/login?__tenant=${TENANT_SLUG}`);
  if (appDomain) {
    console.log(`  Production : https://${TENANT_SLUG}.${appDomain}/login`);
  }
  console.log(`\nCredentials:`);
  console.log(`  Email   : ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log(`  Tenant  : ${TENANT_SLUG}\n`);

  // Close named connections manually (platform + tenant)
  try { await platformDb.close(); } catch {}
  try { await tenantConn.close(); } catch {}
  try { await mongoose.disconnect(); } catch {}

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
