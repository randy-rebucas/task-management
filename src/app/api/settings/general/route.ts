import { NextResponse } from "next/server";
import { withAuth, withPermission } from "@/features/auth/api-helpers";

export const GET = withAuth(async () => {
  const keys = ["theme", "paginationLimit", "fileUploadMaxSize"];
  const settingsArr = await models.AppSetting.find({ key: { $in: keys } }).lean();
  const settings: Record<string, any> = {};
  for (const s of settingsArr) {
    settings[s.key] = s.value;
  }
  // Provide defaults if missing
  if (!settings.theme) settings.theme = "light";
  if (!settings.paginationLimit) settings.paginationLimit = 20;
  if (!settings.fileUploadMaxSize) settings.fileUploadMaxSize = 10485760;
  return NextResponse.json(settings);
});

export const PUT = withPermission("settings:manage", async (req, _ctx, _session, models) => {
  const body = await req.json();
  const keys = ["theme", "paginationLimit", "fileUploadMaxSize"];
  for (const key of keys) {
    if (body[key] !== undefined) {
      await models.AppSetting.findOneAndUpdate(
        { key },
        { value: body[key] },
        { upsert: true, new: true }
      );
    }
  }
  // Return updated settings
  const settingsArr = await models.AppSetting.find({ key: { $in: keys } }).lean();
  const settings: Record<string, any> = {};
  for (const s of settingsArr) {
    settings[s.key] = s.value;
  }
  return NextResponse.json(settings);
});
