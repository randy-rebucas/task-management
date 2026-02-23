/**
 * Cron notification handler.
 *
 * Call this endpoint on a schedule (hourly recommended) to trigger all
 * smart notification jobs.
 *
 * Required env var:
 *   CRON_SECRET=<your-secret-token>
 *
 * Example (Vercel Cron in vercel.json):
 *   { "crons": [{ "path": "/api/cron/notify", "schedule": "0 * * * *" }] }
 *
 * Example (manual test):
 *   curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/notify
 */

import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { deliverNotification } from "@/features/notifications/deliver";
import { getPlatformDb } from "@/lib/platform-db";
import { getTenantConnection } from "@/lib/tenant-db";
import { getTenantModels } from "@/lib/tenant-models";
import { getTenantModel } from "@/models/platform/Tenant";
import type { TenantModels } from "@/lib/tenant-models";

const INACTIVE_HOURS = Number(process.env.FIELD_INACTIVE_HOURS ?? 8);

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function hoursAgo(h: number) {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

function daysAgo(d: number) {
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000);
}

function startOfWeek() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Resolve channels for a named event rule, falling back to ["in_app"]. */
async function getChannels(models: TenantModels, event: string): Promise<("in_app" | "email")[]> {
  const rule = await models.NotificationRule.findOne({ event, isActive: true }).lean() as { channels?: string[] } | null;
  if (rule && rule.channels && rule.channels.length > 0) {
    return rule.channels as ("in_app" | "email")[];
  }
  return ["in_app"];
}

// ─── Job 1: Deadline reminders ───────────────────────────────────────────────
async function runDeadlineReminders(models: TenantModels) {
  const now = new Date();
  const in25h = new Date(Date.now() + 25 * 60 * 60 * 1000);

  const [channels, tasks] = await Promise.all([
    getChannels(models, "task-due-soon"),
    models.Task.find({
      dueDate: { $gt: now, $lt: in25h },
      completedAt: { $exists: false },
      assignees: { $exists: true, $not: { $size: 0 } },
    })
      .populate("assignees", "email firstName lastName")
      .lean() as unknown as Promise<{ _id: { toString(): string }; title: string; dueDate?: Date; assignees: unknown[] }[]>,
  ]);

  if (!tasks.length) return 0;

  type Assignee = { _id: { toString(): string }; email: string; firstName: string; lastName: string };

  // Batch dedup: one query for all recently-notified (recipient, task) combos
  const recentNotifs = await (models.Notification.find({
    type: "deadline_approaching",
    createdAt: { $gt: hoursAgo(20) },
    relatedTask: { $in: tasks.map((t) => t._id) },
  }).select("recipient relatedTask").lean() as unknown) as { recipient: unknown; relatedTask: unknown }[];

  const notifiedSet = new Set(recentNotifs.map((n) => `${n.recipient}:${n.relatedTask}`));

  const deliveries: Promise<unknown>[] = [];
  for (const task of tasks) {
    const dueStr = task.dueDate ? new Date(task.dueDate).toLocaleString() : "soon";
    for (const assignee of (task.assignees as unknown as Assignee[]) ?? []) {
      if (notifiedSet.has(`${assignee._id}:${task._id}`)) continue;
      deliveries.push(
        deliverNotification({
          recipient: assignee._id.toString(),
          recipientEmail: assignee.email,
          type: "deadline_approaching",
          title: `Task due soon: ${task.title}`,
          message: `Your task "${task.title}" is due at ${dueStr}. Please complete it on time.`,
          relatedTask: task._id.toString(),
          channels,
        })
      );
    }
  }

  await Promise.all(deliveries);
  return deliveries.length;
}

// ─── Job 2: Overdue alerts ────────────────────────────────────────────────────
async function runOverdueAlerts(models: TenantModels) {
  const now = new Date();
  const todayStart = startOfToday();

  const [channels, tasks] = await Promise.all([
    getChannels(models, "task-overdue"),
    models.Task.find({
      dueDate: { $lt: now },
      completedAt: { $exists: false },
      assignees: { $exists: true, $not: { $size: 0 } },
    })
      .populate("assignees", "email firstName lastName")
      .lean() as unknown as Promise<{ _id: { toString(): string }; title: string; dueDate?: Date; assignees: unknown[] }[]>,
  ]);

  if (!tasks.length) return 0;

  type Assignee = { _id: { toString(): string }; email: string; firstName: string; lastName: string };

  // Batch dedup: already-alerted (recipient, task) combos today
  const recentNotifs = await (models.Notification.find({
    type: "task_overdue",
    createdAt: { $gte: todayStart },
    relatedTask: { $in: tasks.map((t) => t._id) },
  }).select("recipient relatedTask").lean() as unknown) as { recipient: unknown; relatedTask: unknown }[];

  const notifiedSet = new Set(recentNotifs.map((n) => `${n.recipient}:${n.relatedTask}`));

  const deliveries: Promise<unknown>[] = [];
  for (const task of tasks) {
    for (const assignee of (task.assignees as unknown as Assignee[]) ?? []) {
      if (notifiedSet.has(`${assignee._id}:${task._id}`)) continue;
      deliveries.push(
        deliverNotification({
          recipient: assignee._id.toString(),
          recipientEmail: assignee.email,
          type: "task_overdue",
          title: `Overdue task: ${task.title}`,
          message: `Your task "${task.title}" was due on ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "a past date"} and has not been completed.`,
          relatedTask: task._id.toString(),
          channels,
        })
      );
    }
  }

  await Promise.all(deliveries);
  return deliveries.length;
}

// ─── Job 3: Lead stagnation ───────────────────────────────────────────────────
async function runLeadStagnation(models: TenantModels) {
  const sevenDaysAgo = daysAgo(7);
  const now = new Date();

  const [channels, leads] = await Promise.all([
    getChannels(models, "lead-stagnation"),
    models.Lead.find({
      status: { $nin: ["converted", "unqualified"] },
      assignedTo: { $exists: true },
      $or: [
        { followUpDate: { $lt: now } },
        { updatedAt: { $lt: sevenDaysAgo } },
      ],
    })
      .populate("assignedTo", "email firstName lastName")
      .lean() as unknown as Promise<{ _id: { toString(): string }; name: string; assignedTo: unknown }[]>,
  ]);

  if (!leads.length) return 0;

  type Assignee = { _id: { toString(): string }; email: string; firstName: string; lastName: string };

  // Batch dedup: fetch all recent lead_stagnation notifications for these assignees
  const assigneeIds = leads
    .map((l) => (l.assignedTo as unknown as Assignee | null)?._id?.toString())
    .filter((id): id is string => id != null);
  const recentNotifs = await (models.Notification.find({
    type: "lead_stagnation",
    recipient: { $in: assigneeIds },
    createdAt: { $gt: hoursAgo(24) },
  }).select("recipient message").lean() as unknown) as { recipient: unknown; message?: string }[];

  const notifiedSet = new Set<string>();
  for (const n of recentNotifs) {
    const match = n.message?.match(/ID: ([a-f0-9]{24})/);
    if (match) notifiedSet.add(`${n.recipient}:${match[1]}`);
  }

  const deliveries: Promise<unknown>[] = [];
  for (const lead of leads) {
    const assignedTo = lead.assignedTo as unknown as Assignee | null;
    if (!assignedTo) continue;
    if (notifiedSet.has(`${assignedTo._id}:${lead._id}`)) continue;
    deliveries.push(
      deliverNotification({
        recipient: assignedTo._id.toString(),
        recipientEmail: assignedTo.email,
        type: "lead_stagnation",
        title: `Lead follow-up overdue: ${lead.name}`,
        message: `Lead "${lead.name}" requires your attention. Follow-up is overdue or no activity in 7+ days.`,
        relatedResource: lead._id.toString(),
        channels,
      })
    );
  }

  await Promise.all(deliveries);
  return deliveries.length;
}

// ─── Job 4: Inactive field coordinator ───────────────────────────────────────
async function runFieldInactive(models: TenantModels) {
  const todayStart = startOfToday();
  const cutoff = hoursAgo(INACTIVE_HOURS);

  const [channels, allUsers] = await Promise.all([
    getChannels(models, "field-inactive"),
    models.User.find({ isActive: true }).populate("roles", "slug name").lean(),
  ]);

  const fieldUsers = allUsers.filter((u) =>
    (u.roles as { slug: string }[]).some((r) => r.slug.includes("field"))
  );
  const adminUsers = allUsers.filter((u) =>
    (u.roles as { slug: string }[]).some((r) => r.slug.includes("admin") || r.slug.includes("manager"))
  );

  if (!fieldUsers.length) return 0;

  const fieldUserIds = fieldUsers.map((u) => u._id);

  // Batch: latest check-in per field user via aggregation (replaces N findOne calls)
  const sessions = await models.FieldSession.aggregate([
    { $match: { user: { $in: fieldUserIds }, "checkIn.time": { $gte: todayStart } } },
    { $sort: { "checkIn.time": -1 } },
    { $group: { _id: "$user", checkIn: { $first: "$checkIn" }, checkOut: { $first: "$checkOut" } } },
  ]);
  const sessionMap = new Map(sessions.map((s) => [String(s._id), s]));

  // Batch dedup for coordinators
  const recentCoordIds = await models.Notification.distinct("recipient", {
    type: "field_inactive",
    createdAt: { $gt: hoursAgo(23) },
    recipient: { $in: fieldUserIds },
  });
  const notifiedCoordsSet = new Set(recentCoordIds.map(String));

  // Batch dedup for admins using relatedResource (coordinator ID)
  const recentAdminNotifs = await (models.Notification.find({
    type: "field_inactive",
    createdAt: { $gt: hoursAgo(23) },
    recipient: { $in: adminUsers.map((u) => u._id) },
    relatedResource: { $in: fieldUserIds },
  }).select("recipient relatedResource").lean() as unknown) as { recipient: unknown; relatedResource: unknown }[];
  const notifiedAdminSet = new Set(recentAdminNotifs.map((n) => `${n.recipient}:${n.relatedResource}`));

  let sent = 0;
  const deliveries: Promise<unknown>[] = [];

  for (const coordinator of fieldUsers) {
    const session = sessionMap.get(String(coordinator._id));
    const isInactive =
      !session ||
      (!session.checkOut?.time && new Date(session.checkIn.time) < cutoff);

    if (!isInactive || notifiedCoordsSet.has(String(coordinator._id))) continue;

    const name = `${coordinator.firstName} ${coordinator.lastName}`;

    deliveries.push(
      deliverNotification({
        recipient: coordinator._id.toString(),
        recipientEmail: coordinator.email,
        type: "field_inactive",
        title: "Reminder: Please check in",
        message: `You have not checked in today. Please start a field session when you begin your shift.`,
        channels,
      })
    );

    for (const admin of adminUsers) {
      if (notifiedAdminSet.has(`${admin._id}:${coordinator._id}`)) continue;
      deliveries.push(
        deliverNotification({
          recipient: admin._id.toString(),
          recipientEmail: admin.email,
          type: "field_inactive",
          title: `Field coordinator inactive: ${name}`,
          message: `${name} has not checked in today after ${INACTIVE_HOURS} hours.`,
          relatedResource: coordinator._id.toString(),
          channels,
        })
      );
    }

    sent++;
  }

  await Promise.all(deliveries);
  return sent;
}

// ─── Job 5: Weekly summary ────────────────────────────────────────────────────
async function runWeeklySummary(models: TenantModels) {
  const setting = await models.AppSetting.findOne({ key: "weekly_summary_last_sent" }).lean() as { value?: string } | null;
  if (setting?.value && new Date(setting.value as string) > daysAgo(6)) return 0;

  const weekStart = startOfWeek();
  const now = new Date();
  const weekLabel = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  // Fetch users + team-wide stats in parallel
  const [allUsers, teamCompleted, teamOverdue, teamNewLeads] = await Promise.all([
    models.User.find({ isActive: true }).populate("roles", "slug").lean(),
    models.Task.countDocuments({ completedAt: { $gte: weekStart, $lte: now } }),
    models.Task.countDocuments({ dueDate: { $lt: now }, completedAt: { $exists: false } }),
    models.Lead.countDocuments({ createdAt: { $gte: weekStart, $lte: now } }),
  ]);

  if (!allUsers.length) return 0;

  // Per-user stats via 3 aggregations instead of N×3 countDocuments calls
  const [completedAgg, overdueAgg, leadsAgg] = await Promise.all([
    models.Task.aggregate([
      { $match: { completedAt: { $gte: weekStart, $lte: now } } },
      { $unwind: "$assignees" },
      { $group: { _id: "$assignees", count: { $sum: 1 } } },
    ]),
    models.Task.aggregate([
      { $match: { dueDate: { $lt: now }, completedAt: { $exists: false } } },
      { $unwind: "$assignees" },
      { $group: { _id: "$assignees", count: { $sum: 1 } } },
    ]),
    models.Lead.aggregate([
      { $match: { assignedTo: { $exists: true }, createdAt: { $gte: weekStart, $lte: now } } },
      { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
    ]),
  ]);

  const completedMap = new Map(completedAgg.map((r) => [String(r._id), r.count as number]));
  const overdueMap   = new Map(overdueAgg.map((r)   => [String(r._id), r.count as number]));
  const leadsMap     = new Map(leadsAgg.map((r)     => [String(r._id), r.count as number]));

  const isAdmin = (u: typeof allUsers[0]) =>
    (u.roles as { slug: string }[]).some(
      (r) => r.slug.includes("admin") || r.slug.includes("manager")
    );

  const emailTasks: Promise<unknown>[] = [];

  for (const user of allUsers) {
    const id = String(user._id);
    const myCompleted = completedMap.get(id) ?? 0;
    const myOverdue   = overdueMap.get(id)   ?? 0;
    const myLeads     = leadsMap.get(id)     ?? 0;

    const personalText =
      `Weekly Summary – Week of ${weekLabel}\n\n` +
      `Tasks completed this week: ${myCompleted}\n` +
      `Overdue tasks: ${myOverdue}\n` +
      `New leads assigned: ${myLeads}\n\n` +
      `Log in to view details.`;

    const personalHtml =
      `<h2>Weekly Summary – Week of ${weekLabel}</h2>` +
      `<table style="border-collapse:collapse;min-width:260px">` +
      `<tr><td style="padding:6px 16px 6px 0;color:#6b7280">Tasks completed</td><td style="padding:6px 0;font-weight:600">${myCompleted}</td></tr>` +
      `<tr><td style="padding:6px 16px 6px 0;color:#6b7280">Overdue tasks</td><td style="padding:6px 0;font-weight:600;color:${myOverdue > 0 ? "#dc2626" : "inherit"}">${myOverdue}</td></tr>` +
      `<tr><td style="padding:6px 16px 6px 0;color:#6b7280">New leads assigned</td><td style="padding:6px 0;font-weight:600">${myLeads}</td></tr>` +
      `</table>`;

    emailTasks.push(
      sendEmail({
        to: user.email,
        subject: `Your Weekly Summary – Week of ${weekLabel}`,
        text: personalText,
        html: personalHtml,
      }).catch((err) => console.error(`[weeklySummary] personal email failed for ${user.email}:`, err))
    );

    if (isAdmin(user)) {
      const teamText =
        `Team Weekly Summary – Week of ${weekLabel}\n\n` +
        `Team tasks completed: ${teamCompleted}\n` +
        `Total overdue tasks: ${teamOverdue}\n` +
        `New leads this week: ${teamNewLeads}\n\n` +
        `Log in to view the full team report.`;

      const teamHtml =
        `<h2>Team Weekly Summary – Week of ${weekLabel}</h2>` +
        `<table style="border-collapse:collapse;min-width:260px">` +
        `<tr><td style="padding:6px 16px 6px 0;color:#6b7280">Team tasks completed</td><td style="padding:6px 0;font-weight:600">${teamCompleted}</td></tr>` +
        `<tr><td style="padding:6px 16px 6px 0;color:#6b7280">Total overdue tasks</td><td style="padding:6px 0;font-weight:600;color:${teamOverdue > 0 ? "#dc2626" : "inherit"}">${teamOverdue}</td></tr>` +
        `<tr><td style="padding:6px 16px 6px 0;color:#6b7280">New leads this week</td><td style="padding:6px 0;font-weight:600">${teamNewLeads}</td></tr>` +
        `</table>`;

      emailTasks.push(
        sendEmail({
          to: user.email,
          subject: `Team Weekly Summary – Week of ${weekLabel}`,
          text: teamText,
          html: teamHtml,
        }).catch((err) => console.error(`[weeklySummary] team email failed for ${user.email}:`, err))
      );
    }
  }

  await Promise.all(emailTasks);

  await models.AppSetting.findOneAndUpdate(
    { key: "weekly_summary_last_sent" },
    { key: "weekly_summary_last_sent", value: now.toISOString() },
    { upsert: true }
  );

  return allUsers.length;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all active tenants from platform DB
  const platformDb = await getPlatformDb();
  const TenantModel = getTenantModel(platformDb);
  const tenants = await TenantModel.find({ status: "active" }).select("slug dbName name").lean();

  const allResults: Record<string, unknown>[] = [];

  // AUDIT-07: process all tenants in parallel to avoid sequential timeout on Vercel
  const tenantResults = await Promise.allSettled(
    tenants.map(async (tenant) => {
      const conn = await getTenantConnection(tenant.dbName as string);
      const models = getTenantModels(conn);

      const [deadlineResult, overdueResult, stagnationResult, fieldResult, weeklyResult] =
        await Promise.allSettled([
          runDeadlineReminders(models),
          runOverdueAlerts(models),
          runLeadStagnation(models),
          runFieldInactive(models),
          runWeeklySummary(models),
        ]);

      const pick = (r: PromiseSettledResult<number>) =>
        r.status === "fulfilled" ? r.value : `error: ${String((r as PromiseRejectedResult).reason)}`;

      return {
        tenant: tenant.slug,
        deadline_reminders: pick(deadlineResult),
        overdue_alerts:     pick(overdueResult),
        lead_stagnation:    pick(stagnationResult),
        field_inactive:     pick(fieldResult),
        weekly_summary:     pick(weeklyResult),
      };
    })
  );

  for (const result of tenantResults) {
    if (result.status === "fulfilled") {
      allResults.push(result.value);
    } else {
      allResults.push({ error: String(result.reason) });
    }
  }

  return NextResponse.json({
    ok: true,
    ts: new Date().toISOString(),
    tenants: allResults,
  });
}
