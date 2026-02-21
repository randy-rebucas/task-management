import AppSetting from "@/models/AppSetting";
import { dbConnect } from "@/lib/db";
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

export const GET = async () => {
  await dbConnect();
  const rows = await AppSetting.find({ key: { $in: AUTOMATION_KEYS } }).lean();
  const result: Record<string, unknown> = { ...DEFAULTS };
  for (const row of rows) result[row.key] = row.value;
  return NextResponse.json(result);
};

export const PUT = withPermission("settings:manage", async (req) => {
  await dbConnect();
  const body = await req.json();
  for (const key of AUTOMATION_KEYS) {
    if (body[key] !== undefined) {
      await AppSetting.findOneAndUpdate(
        { key },
        { value: body[key] },
        { upsert: true, new: true }
      );
    }
  }
  const rows = await AppSetting.find({ key: { $in: AUTOMATION_KEYS } }).lean();
  const result: Record<string, unknown> = { ...DEFAULTS };
  for (const row of rows) result[row.key] = row.value;
  return apiSuccess(result);
});
