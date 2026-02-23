import { withAuth, apiError } from "@/features/auth/api-helpers";
import { NextResponse } from "next/server";
import { format, parseISO } from "date-fns";

// ── .ics generation helpers ────────────────────────────────────────────────

function icsDate(d: Date | string): string {
  const date = typeof d === "string" ? parseISO(d) : d;
  return format(date, "yyyyMMdd");
}

function icsDatetime(d: Date | string): string {
  const date = typeof d === "string" ? parseISO(d) : d;
  return format(date, "yyyyMMdd'T'HHmmss'Z'");
}

function escapeIcs(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function buildIcs(events: {
  uid: string;
  summary: string;
  description?: string;
  dtstart: Date | string;
  dtend?: Date | string;
  priority?: string;
  url?: string;
}[]): string {
  const now = icsDatetime(new Date());

  const vevents = events.map((e) => {
    const dtstart = `DTSTART;VALUE=DATE:${icsDate(e.dtstart)}`;
    const dtend = e.dtend
      ? `DTEND;VALUE=DATE:${icsDate(e.dtend)}`
      : `DTEND;VALUE=DATE:${icsDate(e.dtstart)}`;

    const priorityMap: Record<string, string> = { urgent: "1", high: "3", medium: "5", low: "9" };
    const icsPriority = e.priority ? priorityMap[e.priority] ?? "5" : "5";

    const lines = [
      "BEGIN:VEVENT",
      `UID:${e.uid}@task-management`,
      `DTSTAMP:${now}`,
      dtstart,
      dtend,
      `SUMMARY:${escapeIcs(e.summary)}`,
      ...(e.description ? [`DESCRIPTION:${escapeIcs(e.description)}`] : []),
      `PRIORITY:${icsPriority}`,
      ...(e.url ? [`URL:${e.url}`] : []),
      "END:VEVENT",
    ];
    return lines.join("\r\n");
  });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Task Management Platform//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:My Tasks`,
    ...vevents,
    "END:VCALENDAR",
  ].join("\r\n");
}

// ── Route handler ──────────────────────────────────────────────────────────

export const GET = withAuth(async (req, _ctx, session, models) => {
  const { searchParams } = new URL(req.url);
  const dueDateFrom = searchParams.get("from");
  const dueDateTo   = searchParams.get("to");
  const userId      = searchParams.get("userId") ?? session.user.id;

  const query: Record<string, unknown> = {
    assignees: userId,
    isArchived: { $ne: true },
    dueDate: { $exists: true, $ne: null },
  };
  if (dueDateFrom || dueDateTo) {
    const range: Record<string, Date> = {};
    if (dueDateFrom) range.$gte = parseISO(dueDateFrom);
    if (dueDateTo)   range.$lte = parseISO(dueDateTo);
    query.dueDate = range;
  }

  const tasks = await models.Task.find(query)
    .populate("status", "name color isFinal")
    .select("_id taskNumber title description dueDate startDate priority taskType status")
    .sort({ dueDate: 1 })
    .limit(500)
    .lean();

  if (!tasks.length) {
    return apiError("No tasks with due dates found for the selected range.", 404);
  }

  const events = tasks.map((t: any) => ({
    uid: String(t._id),
    summary: `[${t.taskNumber ?? "TASK"}] ${t.title}`,
    description: t.description,
    dtstart: t.dueDate,
    dtend: t.dueDate,
    priority: t.priority,
  }));

  const icsContent = buildIcs(events);

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="my-tasks.ics"',
      "Cache-Control": "private, no-store",
    },
  });
});
