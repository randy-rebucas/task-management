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

const PRIORITY_ORDER = ["urgent", "high", "medium", "low"];

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

  const sorted = [...dayTasks].sort(
    (a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority)
  );

  return (
    <DroppableDay id={dateKey} className="rounded-lg border min-h-[500px] p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">
          {format(currentDate, "EEEE, MMMM d, yyyy")}
        </h2>
        <Button asChild size="sm" variant="outline">
          <Link href={`/tasks/new?dueDate=${dateKey}`}>+ New Task</Link>
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500">
          <p className="text-sm">No tasks scheduled for this day.</p>
          <Button asChild size="sm" className="mt-3" variant="outline">
            <Link href={`/tasks/new?dueDate=${dateKey}`}>Schedule a task</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((task) => (
            <CalendarEvent key={task._id} task={task} onSelect={onSelectTask} />
          ))}
        </div>
      )}
    </DroppableDay>
  );
}
