import { withPermission, apiSuccess } from "@/features/auth/api-helpers";
import { NextResponse } from "next/server";

const AUTOMATION_KEYS = [
  "automation.followUpTask",
  "automation.escalation",
  "automation.escalationDays",
  "automation.performanceReport",
  "automation.fieldSummary",
];

const DEFAULTS: Record<string, unknown> = {
  "automation.followUpTask":    true,
  "automation.escalation":      true,
  "automation.escalationDays":  3,
  "automation.performanceReport": true,
  "automation.fieldSummary":    true,
};

export const GET = withPermission("settings:manage", async (_req, _ctx, _session, models) => {
  const rows = await models.AppSetting.find({ key: { $in: AUTOMATION_KEYS } }).lean();
  const result: Record<string, unknown> = { ...DEFAULTS };
  for (const row of rows) result[(row as any).key] = (row as any).value;
  return NextResponse.json(result);
});

export const PUT = withPermission("settings:manage", async (req, _ctx, _session, models) => {
  const body = await req.json();
  for (const key of AUTOMATION_KEYS) {
    if (body[key] !== undefined) {
      await models.AppSetting.findOneAndUpdate(
        { key },
        { value: body[key] },
        { upsert: true, new: true }
      );
    }
  }
  const rows = await models.AppSetting.find({ key: { $in: AUTOMATION_KEYS } }).lean();
  const result: Record<string, unknown> = { ...DEFAULTS };
  for (const row of rows) result[(row as any).key] = (row as any).value;
  return apiSuccess(result);
});
