import { NextResponse, NextRequest } from "next/server";
import { withPermission } from "@/features/auth/api-helpers";
import { PLAN_CONFIG } from "@/lib/paypal";
import { getPlatformDb } from "@/lib/platform-db";
import { getPlatformSettingModel } from "@/models/platform/PlatformSetting";

const KEYS = [
  "paypal.plan.starter.id",
  "paypal.plan.growth.id",
  "paypal.plan.business.id",
  "paypal.webhook.id",
] as const;

// These are platform-wide settings (same PayPal plans for all tenants).
// Read/write from the platform DB, not per-tenant AppSettings.
export const GET = withPermission("settings:manage", async (_req, _ctx, _session, _models) => {
  const pdb = await getPlatformDb();
  const Setting = getPlatformSettingModel(pdb);
  const rows = await Setting.find({ key: { $in: KEYS } }).lean() as { key: string; value: unknown }[];
  const stored: Record<string, string> = {};
  for (const r of rows) stored[r.key] = (r.value as string) || "";

  return NextResponse.json({
    starter:   { stored: stored["paypal.plan.starter.id"]  || "", env: PLAN_CONFIG.starter.planId },
    growth:    { stored: stored["paypal.plan.growth.id"]   || "", env: PLAN_CONFIG.growth.planId },
    business:  { stored: stored["paypal.plan.business.id"] || "", env: PLAN_CONFIG.business.planId },
    webhookId: stored["paypal.webhook.id"] || process.env.PAYPAL_WEBHOOK_ID || "",
    env: process.env.PAYPAL_ENV ?? "sandbox",
  });
});

export const PUT = withPermission("settings:manage", async (req: NextRequest, _ctx, _session, _models) => {
  const body = await req.json() as Record<string, string>;

  const mapping: Record<string, string> = {
    starter:   "paypal.plan.starter.id",
    growth:    "paypal.plan.growth.id",
    business:  "paypal.plan.business.id",
    webhookId: "paypal.webhook.id",
  };

  const pdb = await getPlatformDb();
  const Setting = getPlatformSettingModel(pdb);

  for (const [field, key] of Object.entries(mapping)) {
    if (body[field] !== undefined) {
      await Setting.findOneAndUpdate(
        { key },
        { value: body[field] },
        { upsert: true, new: true }
      );
    }
  }

  return NextResponse.json({ ok: true });
});

