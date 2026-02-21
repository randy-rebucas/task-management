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
import { dbConnect } from "@/lib/db";
import Task from "@/models/Task";
import Lead from "@/models/Lead";
import FieldSession from "@/models/FieldSession";
import User from "@/models/User";
import Notification from "@/models/Notification";
import NotificationRule from "@/models/NotificationRule";
import AppSetting from "@/models/AppSetting";
import { sendEmail } from "@/lib/email";
import { deliverNotification } from "@/features/notifications/deliver";

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
async function getChannels(event: string): Promise<("in_app" | "email")[]> {
  const rule = await NotificationRule.findOne({ event, isActive: true }).lean();
  if (rule && rule.channels && rule.channels.length > 0) {
    return rule.channels as ("in_app" | "email")[];
  }
  return ["in_app"];
}

// ─── Job 1: Deadline reminders ───────────────────────────────────────────────
async function runDeadlineReminders() {
  const now = new Date();
  const in25h = new Date(Date.now() + 25 * 60 * 60 * 1000);
  const channels = await getChannels("task-due-soon");

  const tasks = await Task.find({
    dueDate: { $gt: now, $lt: in25h },
    completedAt: { $exists: false },
    assignees: { $exists: true, $not: { $size: 0 } },
  })
    .populate("assignees", "email firstName lastName")
    .lean();

  let sent = 0;
  for (const task of tasks) {
    const assignees = task.assignees as unknown as { _id: { toString(): string }; email: string; firstName: string; lastName: string }[];
    for (const assignee of assignees ?? []) {
      const alreadyNotified = await Notification.exists({
        recipient: assignee._id,
        relatedTask: task._id,
        type: "deadline_approaching",
        createdAt: { $gt: hoursAgo(20) },
      });
      if (alreadyNotified) continue;

      const dueStr = task.dueDate ? new Date(task.dueDate).toLocaleString() : "soon";
      await deliverNotification({
        recipient: assignee._id.toString(),
        recipientEmail: assignee.email,
        type: "deadline_approaching",
        title: `Task due soon: ${task.title}`,
        message: `Your task "${task.title}" is due at ${dueStr}. Please complete it on time.`,
        relatedTask: task._id.toString(),
        channels,
      });
      sent++;
    }
  }
  return sent;
}

// ─── Job 2: Overdue alerts ────────────────────────────────────────────────────
async function runOverdueAlerts() {
  const now = new Date();
  const channels = await getChannels("task-overdue");
  const todayStart = startOfToday();

  const tasks = await Task.find({
    dueDate: { $lt: now },
    completedAt: { $exists: false },
    assignees: { $exists: true, $not: { $size: 0 } },
  })
    .populate("assignees", "email firstName lastName")
    .lean();

  let sent = 0;
  for (const task of tasks) {
    const assignees = task.assignees as unknown as { _id: { toString(): string }; email: string; firstName: string; lastName: string }[];
    for (const assignee of assignees ?? []) {
      const alreadyNotified = await Notification.exists({
        recipient: assignee._id,
        relatedTask: task._id,
        type: "task_overdue",
        createdAt: { $gte: todayStart },
      });
      if (alreadyNotified) continue;

      await deliverNotification({
        recipient: assignee._id.toString(),
        recipientEmail: assignee.email,
        type: "task_overdue",
        title: `Overdue task: ${task.title}`,
        message: `Your task "${task.title}" was due on ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "a past date"} and has not been completed.`,
        relatedTask: task._id.toString(),
        channels,
      });
      sent++;
    }
  }
  return sent;
}

// ─── Job 3: Lead stagnation ───────────────────────────────────────────────────
async function runLeadStagnation() {
  const channels = await getChannels("lead-stagnation");
  const sevenDaysAgo = daysAgo(7);
  const now = new Date();

  const leads = await Lead.find({
    status: { $nin: ["converted", "unqualified"] },
    assignedTo: { $exists: true },
    $or: [
      { followUpDate: { $lt: now } },
      { updatedAt: { $lt: sevenDaysAgo } },
    ],
  })
    .populate("assignedTo", "email firstName lastName")
    .lean();

  let sent = 0;
  for (const lead of leads) {
    const assignedTo = lead.assignedTo as unknown as { _id: { toString(): string }; email: string; firstName: string; lastName: string } | null;
    if (!assignedTo) continue;

    const alreadyNotified = await Notification.exists({
      recipient: assignedTo._id,
      type: "lead_stagnation",
      createdAt: { $gt: hoursAgo(24) },
      message: { $regex: String(lead._id) },
    });
    if (alreadyNotified) continue;

    await deliverNotification({
      recipient: assignedTo._id.toString(),
      recipientEmail: assignedTo.email,
      type: "lead_stagnation",
      title: `Lead follow-up overdue: ${lead.name}`,
      message: `Lead "${lead.name}" (ID: ${lead._id}) requires your attention. Follow-up is overdue or no activity in 7+ days.`,
      channels,
    });
    sent++;
  }
  return sent;
}

// ─── Job 4: Inactive field coordinator ───────────────────────────────────────
async function runFieldInactive() {
  const channels = await getChannels("field-inactive");
  const todayStart = startOfToday();
  const cutoff = hoursAgo(INACTIVE_HOURS);

  // Find field users (role slug contains "field")
  const allUsers = await User.find({ isActive: true }).populate("roles", "slug name").lean();
  const fieldUsers = allUsers.filter((u) => {
    const roles = u.roles as { slug: string }[];
    return roles.some((r) => r.slug.includes("field"));
  });

  // Find admins/managers to notify
  const adminUsers = allUsers.filter((u) => {
    const roles = u.roles as { slug: string }[];
    return roles.some((r) => r.slug.includes("admin") || r.slug.includes("manager"));
  });

  let sent = 0;
  for (const coordinator of fieldUsers) {
    // Check latest session today
    const latestSession = await FieldSession.findOne({
      user: coordinator._id,
      "checkIn.time": { $gte: todayStart },
    })
      .sort({ "checkIn.time": -1 })
      .lean();

    const isInactive =
      !latestSession ||
      (!latestSession.checkOut?.time && latestSession.checkIn.time < cutoff);

    if (!isInactive) continue;

    // Skip if already notified in last 23h
    const alreadyNotified = await Notification.exists({
      recipient: coordinator._id,
      type: "field_inactive",
      createdAt: { $gt: hoursAgo(23) },
    });
    if (alreadyNotified) continue;

    const name = `${coordinator.firstName} ${coordinator.lastName}`;

    // Notify the coordinator themselves
    await deliverNotification({
      recipient: coordinator._id.toString(),
      recipientEmail: coordinator.email,
      type: "field_inactive",
      title: "Reminder: Please check in",
      message: `You have not checked in today. Please start a field session when you begin your shift.`,
      channels,
    });

    // Notify admins/managers
    for (const admin of adminUsers) {
      const adminAlreadyNotified = await Notification.exists({
        recipient: admin._id,
        type: "field_inactive",
        createdAt: { $gt: hoursAgo(23) },
        message: { $regex: String(coordinator._id) },
      });
      if (adminAlreadyNotified) continue;

      await deliverNotification({
        recipient: admin._id.toString(),
        recipientEmail: admin.email,
        type: "field_inactive",
        title: `Field coordinator inactive: ${name}`,
        message: `${name} (ID: ${coordinator._id}) has not checked in today after ${INACTIVE_HOURS} hours.`,
        channels,
      });
    }
    sent++;
  }
  return sent;
}

// ─── Job 5: Weekly summary ────────────────────────────────────────────────────
async function runWeeklySummary() {
  const setting = await AppSetting.findOne({ key: "weekly_summary_last_sent" }).lean();
  if (setting?.value) {
    const lastSent = new Date(setting.value as string);
    const sixDaysAgo = daysAgo(6);
    if (lastSent > sixDaysAgo) return 0; // already sent this week
  }

  const weekStart = startOfWeek();
  const now = new Date();
  const weekLabel = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const allUsers = await User.find({ isActive: true }).populate("roles", "slug").lean();

  const isAdmin = (u: typeof allUsers[0]) =>
    (u.roles as { slug: string }[]).some(
      (r) => r.slug.includes("admin") || r.slug.includes("manager")
    );

  // Team-wide stats for admin digest
  const [teamCompleted, teamOverdue, teamNewLeads] = await Promise.all([
    Task.countDocuments({ completedAt: { $gte: weekStart, $lte: now } }),
    Task.countDocuments({ dueDate: { $lt: now }, completedAt: { $exists: false } }),
    Lead.countDocuments({ createdAt: { $gte: weekStart, $lte: now } }),
  ]);

  let sent = 0;
  for (const user of allUsers) {
    const [myCompleted, myOverdue, myLeads] = await Promise.all([
      Task.countDocuments({
        assignees: user._id,
        completedAt: { $gte: weekStart, $lte: now },
      }),
      Task.countDocuments({
        assignees: user._id,
        dueDate: { $lt: now },
        completedAt: { $exists: false },
      }),
      Lead.countDocuments({
        assignedTo: user._id,
        createdAt: { $gte: weekStart, $lte: now },
      }),
    ]);

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

    try {
      await sendEmail({
        to: user.email,
        subject: `Your Weekly Summary – Week of ${weekLabel}`,
        text: personalText,
        html: personalHtml,
      });
      sent++;
    } catch (err) {
      console.error(`[weeklySummary] Failed to send personal email to ${user.email}:`, err);
    }

    // Additional team-wide digest for admins/managers
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

      try {
        await sendEmail({
          to: user.email,
          subject: `Team Weekly Summary – Week of ${weekLabel}`,
          text: teamText,
          html: teamHtml,
        });
      } catch (err) {
        console.error(`[weeklySummary] Failed to send team email to ${user.email}:`, err);
      }
    }
  }

  await AppSetting.findOneAndUpdate(
    { key: "weekly_summary_last_sent" },
    { key: "weekly_summary_last_sent", value: now.toISOString() },
    { upsert: true }
  );

  return sent;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  // Protect with CRON_SECRET — required; no secret configured = reject all
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const results: Record<string, number | string> = {};

  try {
    results.deadline_reminders = await runDeadlineReminders();
  } catch (err) {
    results.deadline_reminders = `error: ${String(err)}`;
  }

  try {
    results.overdue_alerts = await runOverdueAlerts();
  } catch (err) {
    results.overdue_alerts = `error: ${String(err)}`;
  }

  try {
    results.lead_stagnation = await runLeadStagnation();
  } catch (err) {
    results.lead_stagnation = `error: ${String(err)}`;
  }

  try {
    results.field_inactive = await runFieldInactive();
  } catch (err) {
    results.field_inactive = `error: ${String(err)}`;
  }

  try {
    results.weekly_summary = await runWeeklySummary();
  } catch (err) {
    results.weekly_summary = `error: ${String(err)}`;
  }

  return NextResponse.json({ ok: true, ts: new Date().toISOString(), results });
}
