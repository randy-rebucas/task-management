/**
 * POST /api/platform/register
 * Public endpoint — creates a new tenant and seeds initial data.
 * Called from the company sign-up page on the main domain.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPlatformDb } from "@/lib/platform-db";
import getTenantModel from "@/models/platform/Tenant";
import { getPlatformSettingModel } from "@/models/platform/PlatformSetting";
import { getTenantConnection, tenantDbName } from "@/lib/tenant-db";
import { seedTenant } from "@/lib/seed-tenant";
import { sendEmail } from "@/lib/email";
import { RESERVED_SUBDOMAINS } from "@/config/constants";

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
    const Setting = getPlatformSettingModel(platformDb);

    // ── Check self-registration feature flag ─────────────────────────────────
    const selfRegSetting = await Setting.findOne({ key: "feature.self_registration" }).lean();
    if (selfRegSetting && selfRegSetting.value === false) {
      return NextResponse.json(
        { error: "Self-registration is currently disabled. Please contact support." },
        { status: 403 }
      );
    }

    // ── Reserved subdomains (single source of truth from constants) ───────────
    if (RESERVED_SUBDOMAINS.has(subdomain)) {
      return NextResponse.json(
        { error: "This subdomain is reserved. Please choose another." },
        { status: 400 }
      );
    }

    // ── Check subdomain availability ─────────────────────────────────────────
    const existing = await Tenant.findOne({ slug: subdomain });
    if (existing) {
      return NextResponse.json(
        { error: "This subdomain is already taken. Please choose another." },
        { status: 409 }
      );
    }

    // ── Read platform settings for trial duration and plan limits ─────────────
    const [trialDaysSetting, maxUsersSetting] = await Promise.all([
      Setting.findOne({ key: "trial_duration_days" }).lean(),
      Setting.findOne({ key: "plan_limits.trial" }).lean(),
    ]);
    const trialDays   = typeof trialDaysSetting?.value  === "number" ? trialDaysSetting.value  : 14;
    const trialMaxUsers = typeof maxUsersSetting?.value === "number" ? maxUsersSetting.value : 5;

    // ── Create the tenant record ──────────────────────────────────────────────
    const dbName = tenantDbName(subdomain);
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    const tenant = await Tenant.create({
      slug: subdomain,
      name: companyName,
      dbName,
      adminEmail: adminEmail.toLowerCase(),
      plan: "trial",
      status: "active",
      trialEndsAt,
      maxUsers: trialMaxUsers,
    });

    // ── Provision tenant DB and seed default data (rollback on failure) ───────
    try {
      const tenantConn = await getTenantConnection(dbName);
      await seedTenant({
        conn: tenantConn,
        adminEmail,
        adminPassword,
        adminFirstName,
        adminLastName,
      });
    } catch (seedError) {
      // Roll back the tenant record so the subdomain stays available
      await Tenant.deleteOne({ _id: tenant._id }).catch(() => {});
      console.error("[POST /api/platform/register] Seed failed, tenant rolled back:", seedError);
      return NextResponse.json(
        { error: "Failed to provision your workspace. Please try again." },
        { status: 500 }
      );
    }

    // ── Build canonical login URL ─────────────────────────────────────────────
    const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "tasksmgr.solutions";
    const loginUrl = `https://${subdomain}.${appDomain}/login`;

    // ── Send welcome email ────────────────────────────────────────────────────
    await sendEmail({
      to: adminEmail.toLowerCase(),
      subject: `Your ${companyName} workspace is ready on TaskMgr`,
      text: [
        `Hi ${adminFirstName},`,
        ``,
        `Your workspace is live! Sign in at:`,
        `${loginUrl}`,
        ``,
        `Your trial runs until ${trialEndsAt.toDateString()} (${trialDays} days).`,
        `Max users on trial: ${trialMaxUsers}`,
        ``,
        `— The TaskMgr Team`,
      ].join("\n"),
      html: `
        <h2>Hi ${adminFirstName}, your workspace is ready! 🎉</h2>
        <p>Your <strong>${companyName}</strong> workspace is live.</p>
        <p><a href="${loginUrl}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Sign in to your workspace →</a></p>
        <p style="margin-top:16px;color:#6b7280;font-size:14px;">
          Trial ends: <strong>${trialEndsAt.toDateString()}</strong> · Max users: <strong>${trialMaxUsers}</strong>
        </p>
        <p style="color:#6b7280;font-size:14px;">— The TaskMgr Team</p>
      `,
    }).catch((emailErr) => {
      // Non-fatal: log but don't fail the response
      console.warn("[POST /api/platform/register] Welcome email failed:", emailErr);
    });

    return NextResponse.json(
      {
        message: "Tenant created successfully",
        tenantId: tenant._id.toString(),
        subdomain,
        loginUrl,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/platform/register]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
