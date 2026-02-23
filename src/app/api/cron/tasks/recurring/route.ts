import { NextResponse } from "next/server";
import { getPlatformDb } from "@/lib/platform-db";
import { getTenantConnection } from "@/lib/tenant-db";
import { getTenantModels } from "@/lib/tenant-models";
import { getTenantModel } from "@/models/platform/Tenant";

/**
 * Cron: Spawn recurring task instances.
 * Schedule: every day at 00:05 UTC  (see vercel.json)
 *
 * For each tenant, finds tasks where:
 *  - isRecurring = true
 *  - isArchived  = false
 *  - recurringConfig.frequency / interval / daysOfWeek matches today
 *  - recurringConfig.endDate is in the future (or not set)
 *
 * Creates a new task instance with the same fields, assigned to the same
 * assignees, using the default WorkflowStatus.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const platformDb = await getPlatformDb();
  const Tenant = getTenantModel(platformDb);
  const tenants = await Tenant.find({ status: "active" }).lean() as any[];

  const now = new Date();
  const todayDow = now.getDay(); // 0=Sun … 6=Sat
  const results: Record<string, number> = {};

  for (const tenant of tenants) {
    try {
      const conn = await getTenantConnection(tenant.dbUri ?? tenant.slug);
      const models = getTenantModels(conn);

      const defaultStatus = await models.WorkflowStatus.findOne({
        isDefault: true,
        isActive: true,
      }).lean() as any;
      if (!defaultStatus) continue;

      const recurringTasks = await models.Task.find({
        isRecurring: true,
        isArchived: false,
        $or: [
          { "recurringConfig.endDate": { $gte: now } },
          { "recurringConfig.endDate": { $exists: false } },
        ],
      }).lean() as any[];

      let spawned = 0;

      for (const template of recurringTasks) {
        const cfg = template.recurringConfig;
        if (!cfg) continue;

        const shouldRun = checkSchedule(cfg, now, todayDow);
        if (!shouldRun) continue;

        // Avoid duplicate: don't spawn if a clone was already created today
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const alreadySpawned = await models.Task.findOne({
          title: `[Recurring] ${template.title}`,
          createdAt: { $gte: startOfDay },
        }).lean();
        if (alreadySpawned) continue;

        // Atomic task number
        const counter = await (models.AppSetting as any).findOneAndUpdate(
          { key: "__task_counter__" },
          { $inc: { value: 1 } },
          { new: true, upsert: true }
        ).lean() as { value: number };

        await models.Task.create({
          taskNumber: `TASK-${String(counter.value).padStart(4, "0")}`,
          title: `[Recurring] ${template.title}`,
          description: template.description,
          status: defaultStatus._id,
          priority: template.priority,
          taskType: template.taskType,
          category: template.category,
          assignees: template.assignees,
          createdBy: template.createdBy,
          department: template.department,
          dueDate: getNextDueDate(cfg, now),
          estimatedHours: template.estimatedHours,
          tags: template.tags,
          lead: template.lead,
          client: template.client,
          deal: template.deal,
        });
        spawned++;
      }

      results[tenant.slug] = spawned;
    } catch (err) {
      console.error(`[cron/tasks/recurring] tenant=${tenant.slug}`, err);
    }
  }

  return NextResponse.json({ ok: true, results });
}

// ── Helpers ────────────────────────────────────────────────────────────────

function checkSchedule(
  cfg: { frequency: string; interval: number; daysOfWeek?: number[] },
  now: Date,
  todayDow: number
): boolean {
  const { frequency, interval = 1, daysOfWeek } = cfg;

  // For simplicity, interval is checked by counting days since Unix epoch
  const daysSinceEpoch = Math.floor(now.getTime() / (1000 * 60 * 60 * 24));

  switch (frequency) {
    case "daily":
      return daysSinceEpoch % interval === 0;
    case "weekly":
      if (daysOfWeek && daysOfWeek.length > 0) {
        return daysOfWeek.includes(todayDow);
      }
      // Default: every N weeks on same day-of-week
      return Math.floor(daysSinceEpoch / 7) % interval === 0;
    case "monthly":
      return now.getDate() === 1 && (now.getMonth() % interval === 0);
    case "yearly":
      return now.getDate() === 1 && now.getMonth() === 0;
    default:
      return false;
  }
}

function getNextDueDate(cfg: { frequency: string; interval: number }, from: Date): Date {
  const d = new Date(from);
  switch (cfg.frequency) {
    case "daily":   d.setDate(d.getDate() + cfg.interval); break;
    case "weekly":  d.setDate(d.getDate() + 7 * cfg.interval); break;
    case "monthly": d.setMonth(d.getMonth() + cfg.interval); break;
    case "yearly":  d.setFullYear(d.getFullYear() + cfg.interval); break;
  }
  return d;
}
