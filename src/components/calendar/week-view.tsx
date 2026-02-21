"use client";

import { startOfWeek, addDays, format, isToday, isSameDay, parseISO, isWithinInterval } from "date-fns";
import { cn } from "@/lib/utils";
import { DroppableDay } from "./droppable-day";
import { CalendarEvent, type CalendarTask } from "./calendar-event";

interface WeekViewProps {
  currentDate: Date;
  tasks: CalendarTask[];
  onSelectTask: (task: CalendarTask) => void;
}

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

function isMultiDay(task: CalendarTask): boolean {
  const start = (task as { startDate?: string }).startDate;
  return !!start && !!task.dueDate && start !== task.dueDate;
}

export function WeekView({ currentDate, tasks, onSelectTask }: WeekViewProps) {
  const weekStart = startOfWeek(currentDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="rounded-lg border">
      {/* Header row */}
      <div className="grid grid-cols-7 border-b">
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              "py-2 text-center text-sm font-medium border-r last:border-r-0",
              isToday(day) && "bg-primary/5"
            )}
          >
            <div className="text-xs text-gray-500 uppercase">{format(day, "EEE")}</div>
            <div
              className={cn(
                "mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
                isToday(day) && "bg-primary text-primary-foreground"
              )}
            >
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* Day columns */}
      <div className="grid grid-cols-7 divide-x">
        {days.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayTasks = getTasksForDay(tasks, day);

          return (
            <DroppableDay
              key={dateKey}
              id={dateKey}
              className={cn(
                "min-h-[400px] p-1.5 space-y-1",
                isToday(day) && "bg-primary/5"
              )}
            >
              {dayTasks.length === 0 ? (
                <p className="text-[11px] text-gray-400 mt-2 text-center">No tasks</p>
              ) : (
                dayTasks.map((task) => (
                  <div key={task._id} className="relative">
                    {isMultiDay(task) && (
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-400 rounded-full" />
                    )}
                    <CalendarEvent task={task} onSelect={onSelectTask} />
                  </div>
                ))
              )}
            </DroppableDay>
          );
        })}
      </div>
    </div>
  );
}
