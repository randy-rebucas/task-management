import { withPermission, apiSuccess, apiError } from "@/lib/api-helpers";
import { logActivity } from "@/lib/activity-logger";
import User from "@/models/User";
import Papa from "papaparse";

export const POST = withPermission("users:import", async (req, ctx, session) => {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) return apiError("No file provided");

  const text = await file.text();
  const { data, errors } = Papa.parse(text, { header: true, skipEmptyLines: true });

  if (errors.length > 0) {
    return apiError(`CSV parsing error: ${errors[0].message}`);
  }

  const results = { created: 0, skipped: 0, errors: [] as string[] };

  for (const row of data as Record<string, string>[]) {
    try {
      if (!row.email || !row.firstName || !row.lastName || !row.password) {
        results.errors.push(`Missing required fields for row: ${row.email || "unknown"}`);
        results.skipped++;
        continue;
      }

      const exists = await User.findOne({ email: row.email.toLowerCase() });
      if (exists) {
        results.errors.push(`User ${row.email} already exists`);
        results.skipped++;
        continue;
      }

      await User.create({
        email: row.email.toLowerCase(),
        password: row.password,
        firstName: row.firstName,
        lastName: row.lastName,
        phone: row.phone || undefined,
        team: row.team || undefined,
        jobTitle: row.jobTitle || undefined,
        roles: row.roles ? row.roles.split(";").map((r: string) => r.trim()) : [],
        department: row.department || undefined,
      });
      results.created++;
    } catch (err) {
      results.errors.push(`Failed to create ${row.email}: ${(err as Error).message}`);
      results.skipped++;
    }
  }

  await logActivity({
    actor: session.user.id,
    action: "user.bulk_imported",
    resource: "user",
    resourceId: session.user.id,
    details: { created: results.created, skipped: results.skipped },
    req,
  });

  return apiSuccess(results);
});
