"use client";

import { format, isSameDay, parseISO, isWithinInterval } from "date-fns";
import { DroppableDay } from "./droppable-day";
import { CalendarEvent, type CalendarTask } from "./calendar-event";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface DayViewProps {
  currentDate: Date;
  tasks: CalendarTask[];
  onSelectTask: (task: CalendarTask) => void;
}

const PRIORITY_ORDER = ["urgent", "high", "medium", "low"] as const;

const PRIORITY_LABEL: Record<string, string> = {
  urgent: "Urgent",
  high:   "High",
  medium: "Medium",
  low:    "Low",
};

const PRIORITY_BADGE: Record<string, string> = {
  urgent: "bg-red-100 text-red-700",
  high:   "bg-orange-100 text-orange-700",
  medium: "bg-blue-100 text-blue-700",
  low:    "bg-gray-100 text-gray-500",
};

function getTasksForDay(tasks: CalendarTask[], date: Date): CalendarTask[] {
  return tasks.filter((task) => {
    const due = task.dueDate ? parseISO(task.dueDate) : null;
    const start = (task as { startDate?: string }).startDate
      ? parseISO((task as { startDate?: string }).startDate!)
      : null;
    if (!due) return false;
    if (isSameDay(due, date)) return true;
    if (start && isWithinInterval(date, { start, end: due })) return true;
    return false;
  });
}

export function DayView({ currentDate, tasks, onSelectTask }: DayViewProps) {
  const dateKey = format(currentDate, "yyyy-MM-dd");
  const dayTasks = getTasksForDay(tasks, currentDate);

  // Group by priority
  const grouped = PRIORITY_ORDER.reduce<Record<string, CalendarTask[]>>((acc, p) => {
    const group = dayTasks.filter((t) => t.priority === p);
    if (group.length) acc[p] = group;
    return acc;
  }, {});

  const hasGroups = Object.keys(grouped).length > 0;

  return (
    <DroppableDay id={dateKey} className="rounded-lg border min-h-[500px] p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">
            {format(currentDate, "EEEE, MMMM d, yyyy")}
          </h2>
          {dayTasks.length > 0 && (
            <span className="text-sm text-muted-foreground">
              · {dayTasks.length} task{dayTasks.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href={`/tasks/new?dueDate=${dateKey}`}>+ New Task</Link>
        </Button>
      </div>

      {!hasGroups ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500">
          <p className="text-sm">No tasks scheduled for this day.</p>
          <Button asChild size="sm" className="mt-3" variant="outline">
            <Link href={`/tasks/new?dueDate=${dateKey}`}>Schedule a task</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {PRIORITY_ORDER.filter((p) => grouped[p]).map((priority) => (
            <div key={priority}>
              <div className="mb-2 flex items-center gap-2">
                <span className={`rounded px-2 py-0.5 text-xs font-semibold ${PRIORITY_BADGE[priority]}`}>
                  {PRIORITY_LABEL[priority]}
                </span>
                <span className="text-xs text-muted-foreground">{grouped[priority].length}</span>
              </div>
              <div className="space-y-2">
                {grouped[priority].map((task) => (
                  <CalendarEvent key={task._id} task={task} onSelect={onSelectTask} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </DroppableDay>
  );
}
