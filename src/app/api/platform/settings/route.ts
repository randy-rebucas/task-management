import { NextRequest, NextResponse } from "next/server";
import { getPlatformDb } from "@/lib/platform-db";
import { getPlatformSettingModel, DEFAULT_PLATFORM_SETTINGS } from "@/models/platform/PlatformSetting";

function checkAuth(req: NextRequest) {
  return req.headers.get("x-super-admin-secret") === process.env.SUPER_ADMIN_SECRET;
}

// GET /api/platform/settings — return all settings (seeding defaults on first call)
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const conn = await getPlatformDb();
  const Setting = getPlatformSettingModel(conn);

  // Seed missing defaults
  const existing = await Setting.find({}).lean() as { key: string }[];
  const existingKeys = new Set(existing.map((s) => s.key));
  const toInsert = DEFAULT_PLATFORM_SETTINGS.filter((d) => !existingKeys.has(d.key));
  if (toInsert.length) await Setting.insertMany(toInsert);

  const settings = await Setting.find({}).sort({ group: 1, key: 1 }).lean();
  return NextResponse.json({ settings });
}

// PATCH /api/platform/settings — update one setting { key, value }
export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as { key?: string; value?: unknown };
  if (!body.key) return NextResponse.json({ error: "key is required" }, { status: 400 });
  if (body.value === undefined) return NextResponse.json({ error: "value is required" }, { status: 400 });

  const conn = await getPlatformDb();
  const Setting = getPlatformSettingModel(conn);

  const setting = await Setting.findOneAndUpdate(
    { key: body.key },
    { value: body.value },
    { new: true, upsert: true }
  ).lean();

  return NextResponse.json({ setting });
}
