import { NextResponse } from "next/server";
import { getPlatformDb } from "@/lib/platform-db";
import { getPlatformSettingModel } from "@/models/platform/PlatformSetting";

/**
 * GET /api/install/status
 * Returns whether the platform setup wizard has been completed.
 * This route is unauthenticated — it only reveals a boolean.
 */
export async function GET() {
  try {
    const conn = await getPlatformDb();
    const Setting = getPlatformSettingModel(conn);
    const record = await Setting.findOne({ key: "install.completed" }).lean() as
      | { value: unknown }
      | null;

    const completed = record?.value === true;
    return NextResponse.json({ completed });
  } catch {
    // If DB is unreachable, treat as not yet installed so admin can configure
    return NextResponse.json({ completed: false });
  }
}
