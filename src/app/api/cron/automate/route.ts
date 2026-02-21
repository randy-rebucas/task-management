import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Task from "@/models/Task";
import User from "@/models/User";
import Role from "@/models/Role";
import Notification from "@/models/Notification";
import FieldSession from "@/models/FieldSession";
import VisitLog from "@/models/VisitLog";
import AppSetting from "@/models/AppSetting";
import { sendEmail } from "@/lib/email";
import { deliverNotification } from "@/features/notifications/deliver";

async function isEnabled(key: string, defaultVal = true): Promise<boolean> {
  const row = await AppSetting.findOne({ key }).lean();
  return row ? Boolean(row.value) : defaultVal;
}

// ── Date helpers ────────────────────────────────────────────────────────────

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function startOfWeek() {
  const d = new Date();
  const day = d.getDay(); // 0 = Sun
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── Populated-user type ──────────────────────────────────────────────────────

type LeanUser = {
  _id: { toString(): string };
  email: string;
  firstName: string;
  lastName: string;
};

// ── Job A: Escalate overdue tasks to Operations Manager ──────────────────────

async function runEscalation(): Promise<number> {
  if (!await isEnabled("automation.escalation")) return 0;
  const escalationDaysRow = await AppSetting.findOne({ key: "automation.escalationDays" }).lean();
  const escalationDays = escalationDaysRow
    ? Number(escalationDaysRow.value)
    : parseInt(process.env.ESCALATION_DAYS ?? "3", 10);
  const cutoff = daysAgo(escalationDays);

  const overdueTasks = await Task.find({
    dueDate: { $lt: cutoff },
    completedAt: { $exists: false },
    isArchived: false,
  })
    .populate("assignees", "firstName lastName")
    .lean();

  if (!overdueTasks.length) return 0;

  // Find Operations Manager users
  const opsRole = await Role.findOne({ slug: "operations-manager" }).lean();
  if (!opsRole) return 0;

  const opsManagers = await User.find({ roles: opsRole._id, isActive: true })
    .select("email firstName lastName")
    .lean() as LeanUser[];

  if (!opsManagers.length) return 0;

  const yesterday = daysAgo(1);
  let escalated = 0;

  for (const task of overdueTasks) {
    // Deduplicate: skip if already escalated in past 24h
    const alreadySent = await Notification.exists({
      relatedTask: task._id,
      type: "system",
      title: new RegExp("escalated", "i"),
      createdAt: { $gte: yesterday },
    });
    if (alreadySent) continue;

    const assigneeNames = (task.assignees as unknown as LeanUser[])
      .map((a) => `${a.firstName} ${a.lastName}`)
      .join(", ") || "Unassigned";

    const overdueDays = Math.floor(
      (Date.now() - new Date(task.dueDate as Date).getTime()) / 86400000
    );

    const title = `Task Escalated: ${task.title}`;
    const message = `"${task.title}" is ${overdueDays} day(s) overdue. Assigned to: ${assigneeNames}.`;

    for (const mgr of opsManagers) {
      await deliverNotification({
        recipient: mgr._id.toString(),
        recipientEmail: mgr.email,
        type: "system",
        title,
        message,
        relatedTask: task._id.toString(),
        channels: ["in_app", "email"],
      });
    }

    escalated++;
  }

  return escalated;
}

// ── Job B: Weekly performance report (Saturdays only) ───────────────────────

async function runPerformanceReport(): Promise<number> {
  if (!await isEnabled("automation.performanceReport")) return 0;
  // Only send on Saturday (day 6)
  if (new Date().getDay() !== 6) return 0;

  const weekStart = startOfWeek();
  const now = new Date();

  // Completed tasks per user this week
  const completedRows = await Task.aggregate([
    { $match: { completedAt: { $gte: weekStart, $lte: now }, isArchived: false } },
    { $unwind: "$assignees" },
    { $group: { _id: "$assignees", completed: { $sum: 1 } } },
  ]);

  // Overdue tasks per user
  const overdueRows = await Task.aggregate([
    { $match: { dueDate: { $lt: now }, completedAt: { $exists: false }, isArchived: false } },
    { $unwind: "$assignees" },
    { $group: { _id: "$assignees", overdue: { $sum: 1 } } },
  ]);

  // Field session hours per user this week
  const sessionRows = await FieldSession.aggregate([
    { $match: { date: { $gte: weekStart } } },
    { $group: { _id: "$user", totalHours: { $sum: "$duration" }, sessions: { $sum: 1 } } },
  ]);

  // Build lookup maps
  const completedMap = new Map(completedRows.map((r) => [r._id.toString(), r.completed as number]));
  const overdueMap   = new Map(overdueRows.map((r)   => [r._id.toString(), r.overdue as number]));
  const sessionMap   = new Map(sessionRows.map((r)   => [r._id.toString(), { hours: (r.totalHours as number) ?? 0, sessions: r.sessions as number }]));

  // All active users
  const allUsers = await User.find({ isActive: true })
    .select("email firstName lastName")
    .lean() as LeanUser[];

  const rows = allUsers
    .map((u) => {
      const id = u._id.toString();
      const sess = sessionMap.get(id) ?? { hours: 0, sessions: 0 };
      return {
        name: `${u.firstName} ${u.lastName}`,
        completed: completedMap.get(id) ?? 0,
        overdue:   overdueMap.get(id)   ?? 0,
        sessions:  sess.sessions,
        hours:     Math.round(sess.hours * 10) / 10,
      };
    })
    .filter((r) => r.completed > 0 || r.overdue > 0 || r.sessions > 0)
    .sort((a, b) => b.completed - a.completed);

  if (!rows.length) return 0;

  const weekLabel = weekStart.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
  const subject = `Weekly Performance Report – Week of ${weekLabel}`;

  const tableRows = rows
    .map(
      (r) =>
        `<tr style="border-bottom:1px solid #e5e7eb">
          <td style="padding:8px 12px">${r.name}</td>
          <td style="padding:8px 12px;text-align:center">${r.completed}</td>
          <td style="padding:8px 12px;text-align:center;color:${r.overdue > 0 ? "#ef4444" : "inherit"}">${r.overdue}</td>
          <td style="padding:8px 12px;text-align:center">${r.sessions}</td>
          <td style="padding:8px 12px;text-align:center">${r.hours}h</td>
        </tr>`
    )
    .join("");

  const html = `
    <h2 style="font-family:sans-serif">Weekly Performance Report</h2>
    <p style="font-family:sans-serif;color:#6b7280">Week of ${weekLabel}</p>
    <table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:14px">
      <thead>
        <tr style="background:#f3f4f6">
          <th style="padding:8px 12px;text-align:left">Name</th>
          <th style="padding:8px 12px">Tasks Done</th>
          <th style="padding:8px 12px">Overdue</th>
          <th style="padding:8px 12px">Field Sessions</th>
          <th style="padding:8px 12px">Field Hours</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  `;

  const text = rows
    .map((r) => `${r.name}: ${r.completed} done, ${r.overdue} overdue, ${r.sessions} sessions (${r.hours}h)`)
    .join("\n");

  // Find admins + managers
  const recipients = await User.find({ isActive: true })
    .populate("roles", "slug")
    .lean() as (LeanUser & { roles: { slug: string }[] })[];

  const targets = recipients.filter((u) =>
    u.roles.some((r) => r.slug.includes("admin") || r.slug.includes("manager"))
  );

  for (const user of targets) {
    await sendEmail({ to: user.email, subject, text, html });
  }

  return targets.length;
}

// ── Job C: AI summary of daily field reports ─────────────────────────────────

async function runFieldSummary(): Promise<number> {
  if (!await isEnabled("automation.fieldSummary")) return 0;
  const today = startOfToday();

  const visitLogs = await VisitLog.find({ createdAt: { $gte: today } })
    .populate("user", "firstName lastName")
    .lean() as unknown as (Record<string, unknown> & { user: LeanUser })[];

  const fieldSessions = await FieldSession.find({
    date: { $gte: today },
    status: "completed",
  })
    .populate("user", "firstName lastName")
    .lean() as unknown as (Record<string, unknown> & { user: LeanUser; duration?: number; notes?: string })[];

  if (!visitLogs.length && !fieldSessions.length) return 0;

  // Build prompt
  const visitText = visitLogs
    .map(
      (v) =>
        `- Agent: ${v.user?.firstName ?? ""} ${v.user?.lastName ?? ""} | Places: ${v.placesVisited} | Met: ${v.peopleMet} | Purpose: ${v.purpose} | Outcome: ${v.outcome} | Next: ${v.nextAction}`
    )
    .join("\n");

  const sessionText = fieldSessions
    .map(
      (s) =>
        `- Agent: ${s.user?.firstName ?? ""} ${s.user?.lastName ?? ""} | Duration: ${s.duration ?? 0} hrs | Notes: ${s.notes ?? "(none)"}`
    )
    .join("\n");

  const dateLabel = new Date().toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });
  let summary: string;

  if (process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.includes("your-api-key")) {
    // Use Claude API
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const prompt = `You are a business intelligence assistant. Summarize the following field activity reports for management in 3-5 concise paragraphs. Highlight key outcomes, standout performance, common themes, and any action items or concerns.

VISIT LOGS (${visitLogs.length} entries):
${visitText || "(none)"}

FIELD SESSIONS (${fieldSessions.length} completed):
${sessionText || "(none)"}`;

    const msg = await ai.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    summary = (msg.content[0] as { text: string }).text;
  } else {
    // Fallback: plain bullet list when no API key configured
    const lines: string[] = [];
    if (visitLogs.length) {
      lines.push(`Visit Logs (${visitLogs.length}):`);
      visitLogs.forEach((v) =>
        lines.push(`  • ${v.user?.firstName} ${v.user?.lastName}: ${v.outcome}`)
      );
    }
    if (fieldSessions.length) {
      lines.push(`Field Sessions (${fieldSessions.length}):`);
      fieldSessions.forEach((s) =>
        lines.push(`  • ${s.user?.firstName} ${s.user?.lastName}: ${s.duration ?? 0} hrs`)
      );
    }
    summary = lines.join("\n");
  }

  const subject = `Daily Field Summary – ${dateLabel}`;
  const html = `
    <h2 style="font-family:sans-serif">Daily Field Summary</h2>
    <p style="font-family:sans-serif;color:#6b7280">${dateLabel}</p>
    <div style="font-family:sans-serif;font-size:14px;line-height:1.6;white-space:pre-wrap">${summary.replace(/\n/g, "<br>")}</div>
    <hr style="margin-top:24px">
    <p style="font-family:sans-serif;font-size:12px;color:#9ca3af">
      Based on ${visitLogs.length} visit log(s) and ${fieldSessions.length} completed field session(s).
    </p>
  `;

  // Find admins + ops managers
  const allUsers = await User.find({ isActive: true })
    .populate("roles", "slug")
    .select("email firstName lastName roles")
    .lean() as (LeanUser & { roles: { slug: string }[] })[];

  const targets = allUsers.filter((u) =>
    u.roles.some(
      (r) => r.slug.includes("admin") || r.slug.includes("manager") || r.slug === "operations-manager"
    )
  );

  for (const user of targets) {
    await deliverNotification({
      recipient: user._id.toString(),
      recipientEmail: user.email,
      type: "system",
      title: `Daily Field Summary – ${dateLabel}`,
      message: `Field summary for ${dateLabel} is ready. ${visitLogs.length} visit log(s), ${fieldSessions.length} session(s).`,
      channels: ["in_app", "email"],
    });
  }

  return 1;
}

// ── Main handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const ts = new Date().toISOString();

  const results: Record<string, number | string> = {
    escalation: 0,
    performance_report: 0,
    field_summary: 0,
  };

  try { results.escalation         = await runEscalation();        } catch (e) { results.escalation         = String(e); }
  try { results.performance_report = await runPerformanceReport();  } catch (e) { results.performance_report = String(e); }
  try { results.field_summary      = await runFieldSummary();       } catch (e) { results.field_summary      = String(e); }

  return NextResponse.json({ ok: true, ts, results });
}
