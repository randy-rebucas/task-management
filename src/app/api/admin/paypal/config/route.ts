import { NextResponse } from "next/server";
import { withPermission } from "@/features/auth/api-helpers";
import { PLAN_CONFIG } from "@/lib/paypal";
import type { IAppSetting } from "@/models/AppSetting";
import mongoose from "mongoose";

type LeanSetting = IAppSetting & { _id: mongoose.Types.ObjectId };

const KEYS = [
  "paypal.plan.starter.id",
  "paypal.plan.growth.id",
  "paypal.plan.business.id",
  "paypal.product.id",
  "paypal.webhook.id",
] as const;

export const GET = withPermission("settings:manage", async (_req, _ctx, _session, models) => {
  const rows = await models.AppSetting.find({ key: { $in: KEYS } }).lean() as unknown as LeanSetting[];
  const stored: Record<string, string> = {};
  for (const r of rows) stored[r.key] = r.value as string;

  return NextResponse.json({
    starter:   { stored: stored["paypal.plan.starter.id"]  || "", env: PLAN_CONFIG.starter.planId },
    growth:    { stored: stored["paypal.plan.growth.id"]   || "", env: PLAN_CONFIG.growth.planId },
    business:  { stored: stored["paypal.plan.business.id"] || "", env: PLAN_CONFIG.business.planId },
    productId: stored["paypal.product.id"]  || "",
    webhookId: stored["paypal.webhook.id"]  || process.env.PAYPAL_WEBHOOK_ID || "",
    env: process.env.PAYPAL_ENV ?? "sandbox",
  });
});

export const PUT = withPermission("settings:manage", async (req, _ctx, _session, models) => {
  const body = await req.json() as Record<string, string>;

  const mapping: Record<string, string> = {
    starter:   "paypal.plan.starter.id",
    growth:    "paypal.plan.growth.id",
    business:  "paypal.plan.business.id",
    productId: "paypal.product.id",
    webhookId: "paypal.webhook.id",
  };

  for (const [field, key] of Object.entries(mapping)) {
    if (body[field] !== undefined) {
      await models.AppSetting.findOneAndUpdate(
        { key },
        { value: body[field] },
        { upsert: true, new: true }
      );
    }
  }

  return NextResponse.json({ ok: true });
});
