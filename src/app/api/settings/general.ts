
import AppSetting from "@/models/AppSetting";
import { dbConnect } from "@/lib/db";
import { NextResponse } from "next/server";
import { withPermission } from "@/lib/api-helpers";

export const GET = async () => {
  await dbConnect();
  const keys = ["theme", "paginationLimit", "fileUploadMaxSize"];
  const settingsArr = await AppSetting.find({ key: { $in: keys } }).lean();
  const settings: Record<string, any> = {};
  for (const s of settingsArr) {
    settings[s.key] = s.value;
  }
  // Provide defaults if missing
  if (!settings.theme) settings.theme = "light";
  if (!settings.paginationLimit) settings.paginationLimit = 20;
  if (!settings.fileUploadMaxSize) settings.fileUploadMaxSize = 10485760;
  return NextResponse.json(settings);
};

export const PUT = withPermission("settings:manage", async (req) => {
  await dbConnect();
  const body = await req.json();
  const keys = ["theme", "paginationLimit", "fileUploadMaxSize"];
  for (const key of keys) {
    if (body[key] !== undefined) {
      await AppSetting.findOneAndUpdate(
        { key },
        { value: body[key] },
        { upsert: true, new: true }
      );
    }
  }
  // Return updated settings
  const settingsArr = await AppSetting.find({ key: { $in: keys } }).lean();
  const settings: Record<string, any> = {};
  for (const s of settingsArr) {
    settings[s.key] = s.value;
  }
  return NextResponse.json(settings);
});
