"use client";

import useSWR from "swr";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import {
  CheckSquare,
  MapPin,
  Camera,
  Briefcase,
  FileText,
  Clock,
  AlertTriangle,
  ChevronRight,
  Smartphone,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TaskStatusBadge } from "@/components/tasks/task-status-badge";
import { TaskPriorityBadge } from "@/components/tasks/task-priority-badge";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Task {
  _id: string;
  taskNumber: string;
  title: string;
  priority: string;
  status: { name: string; color: string };
  dueDate?: string;
}

const ACTIONS = [
  {
    label: "My Tasks",
    description: "View & update assigned tasks",
    href: "/my-tasks",
    icon: CheckSquare,
    color: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
    accent: "border-blue-200 dark:border-blue-800",
  },
  {
    label: "Log Visit",
    description: "Record a new site visit",
    href: "/visit-logs/new",
    icon: MapPin,
    color: "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400",
    accent: "border-green-200 dark:border-green-800",
  },
  {
    label: "Upload Proof",
    description: "Submit photo or document proof",
    href: "/proof-of-work",
    icon: Camera,
    color: "bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400",
    accent: "border-purple-200 dark:border-purple-800",
  },
  {
    label: "Update CRM",
    description: "Leads, clients & pipeline",
    href: "/crm",
    icon: Briefcase,
    color: "bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400",
    accent: "border-orange-200 dark:border-orange-800",
  },
  {
    label: "Submit Report",
    description: "Daily & performance reports",
    href: "/reports",
    icon: FileText,
    color: "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400",
    accent: "border-rose-200 dark:border-rose-800",
  },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function FieldHubPage() {
  const { data: session } = useSession();
  const { data: taskData } = useSWR("/api/tasks/my?limit=5", fetcher);

  const tasks: Task[] = taskData?.data ?? [];
  const today = new Date();

  const dueToday = tasks.filter((t) => {
    if (!t.dueDate) return false;
    const d = new Date(t.dueDate);
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  });

  const overdue = tasks.filter((t) => {
    if (!t.dueDate) return false;
    return new Date(t.dueDate) < today;
  });

  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="mx-auto max-w-lg space-y-5 pb-24">
      {/* Header */}
      <div className="rounded-xl bg-primary p-5 text-primary-foreground">
        <div className="flex items-center gap-2 text-primary-foreground/70">
          <Smartphone className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wider">Field Hub</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold">
          {getGreeting()}, {firstName}
        </h1>
        <p className="mt-0.5 text-sm text-primary-foreground/70">
          {format(today, "EEEE, d MMMM yyyy")}
        </p>

        {/* Quick stats */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-white/10 px-3 py-2">
            <div className="flex items-center gap-1.5 text-primary-foreground/70">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-xs">Due today</span>
            </div>
            <p className="mt-0.5 text-xl font-bold">{dueToday.length}</p>
          </div>
          <div className="rounded-lg bg-white/10 px-3 py-2">
            <div className="flex items-center gap-1.5 text-primary-foreground/70">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="text-xs">Overdue</span>
            </div>
            <p
              className={cn(
                "mt-0.5 text-xl font-bold",
                overdue.length > 0 && "text-red-300"
              )}
            >
              {overdue.length}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <section>
        <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {ACTIONS.map(({ label, description, href, icon: Icon, color, accent }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex flex-col rounded-xl border p-4 transition-all active:scale-95",
                accent,
                "hover:shadow-sm"
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  color
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="mt-3 text-sm font-semibold leading-tight">{label}</span>
              <span className="mt-0.5 text-xs text-muted-foreground leading-tight">
                {description}
              </span>
            </Link>
          ))}
          {/* 5th card fills odd spot gracefully */}
        </div>
      </section>

      {/* Recent Tasks */}
      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            My Tasks
          </h2>
          <Link
            href="/my-tasks"
            className="flex items-center gap-0.5 text-xs text-primary hover:underline"
          >
            View all <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {tasks.length === 0 ? (
          <div className="rounded-xl border border-dashed py-8 text-center">
            <CheckSquare className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">No tasks assigned</p>
          </div>
        ) : (
          <div className="divide-y rounded-xl border overflow-hidden">
            {tasks.map((task) => (
              <Link
                key={task._id}
                href={`/tasks/${task._id}`}
                className="flex items-start gap-3 bg-background px-4 py-3 transition-colors hover:bg-accent active:bg-accent"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{task.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground">
                      {task.taskNumber}
                    </span>
                    <TaskStatusBadge status={task.status} />
                    <TaskPriorityBadge priority={task.priority} />
                    {task.dueDate && (
                      <span
                        className={cn(
                          "text-[10px]",
                          new Date(task.dueDate) < today
                            ? "text-red-500 font-medium"
                            : "text-muted-foreground"
                        )}
                      >
                        {format(new Date(task.dueDate), "d MMM")}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Tip */}
      <p className="text-center text-xs text-muted-foreground pb-2">
        All 5 actions reachable from the bar below
      </p>
    </div>
  );
}
