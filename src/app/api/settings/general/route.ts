import { NextResponse } from "next/server";
import { withAuth, withPermission } from "@/features/auth/api-helpers";
import type { IAppSetting } from "@/models/AppSetting";
import mongoose from "mongoose";

type LeanSetting = IAppSetting & { _id: mongoose.Types.ObjectId };

export const GET = withAuth(async (_req, _ctx, _session, models) => {
  const keys = ["theme", "paginationLimit", "fileUploadMaxSize"];
  const settingsArr = await models.AppSetting.find({ key: { $in: keys } }).lean() as unknown as LeanSetting[];
  const settings: Record<string, unknown> = {};
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
  const settingsArr2 = await models.AppSetting.find({ key: { $in: keys } }).lean() as unknown as LeanSetting[];
  const settings: Record<string, unknown> = {};
  for (const s of settingsArr2) {
    settings[s.key] = s.value;
  }
  return NextResponse.json(settings);
});
