/**
 * GET /api/plans
 * Returns plan display data (label, price, maxUsers) sourced entirely from the
 * platform database. Requires a valid tenant session.
 */
import { NextResponse } from "next/server";
import { withAuth } from "@/features/auth/api-helpers";
import { getPlatformDb } from "@/lib/platform-db";
import { getPlatformSettingModel } from "@/models/platform/PlatformSetting";

const PLAN_KEYS = ["trial", "starter", "growth", "business", "enterprise"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

export interface PlanInfo {
  key: PlanKey;
  label: string;
  amount: number;
  maxUsers: number;
}

const DEFAULT_PRICES: Record<PlanKey, number> = {
  trial:      0,
  starter:    49,
  growth:     149,
  business:   299,
  enterprise: 0,
};

const DEFAULT_LIMITS: Record<PlanKey, number> = {
  trial:      5,
  starter:    25,
  growth:     50,
  business:   150,
  enterprise: 9999,
};

export const GET = withAuth(async () => {
  const pdb = await getPlatformDb();
  const Setting = getPlatformSettingModel(pdb);

  const rows = await Setting.find({
    key: {
      $in: [
        ...PLAN_KEYS.map((k) => `plan_limits.${k}`),
        ...PLAN_KEYS.map((k) => `plan_price.${k}`),
        ...PLAN_KEYS.map((k) => `plan_label.${k}`),
      ],
    },
  }).lean() as { key: string; value: unknown }[];

  const map: Record<string, unknown> = {};
  for (const r of rows) map[r.key] = r.value;

  const plans: PlanInfo[] = PLAN_KEYS.map((key) => ({
    key,
    label:    String(map[`plan_label.${key}`]  ?? key.charAt(0).toUpperCase() + key.slice(1)),
    amount:   Number(map[`plan_price.${key}`]  ?? DEFAULT_PRICES[key]),
    maxUsers: Number(map[`plan_limits.${key}`] ?? DEFAULT_LIMITS[key]),
  }));

  return NextResponse.json({ plans });
});
