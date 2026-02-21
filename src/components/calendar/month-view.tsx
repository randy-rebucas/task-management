"use client";

import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  format,
  parseISO,
  isWithinInterval,
} from "date-fns";
import { cn } from "@/lib/utils";
import { DroppableDay } from "./droppable-day";
import { CalendarEvent, type CalendarTask } from "./calendar-event";

interface MonthViewProps {
  currentDate: Date;
  tasks: CalendarTask[];
  onSelectTask: (task: CalendarTask) => void;
  onSelectDay: (date: Date) => void;
}

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getTasksForDay(tasks: CalendarTask[], date: Date): CalendarTask[] {
  return tasks.filter((task) => {
    const due = task.dueDate ? parseISO(task.dueDate) : null;
    const start = (task as { startDate?: string }).startDate
      ? parseISO((task as { startDate?: string }).startDate!)
      : null;

    if (!due) return false;
    if (isSameDay(due, date)) return true;
    if (start && due && isWithinInterval(date, { start, end: due })) return true;
    return false;
  });
}

export function MonthView({ currentDate, tasks, onSelectTask, onSelectDay }: MonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  return (
    <div className="flex flex-col gap-px rounded-lg border bg-gray-200">
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="bg-gray-50 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div className="grid grid-cols-7 gap-px">
        {days.map((day) => {
          const dayTasks = getTasksForDay(tasks, day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const dateKey = format(day, "yyyy-MM-dd");
          const visible = dayTasks.slice(0, 3);
          const overflow = dayTasks.length - 3;

          return (
            <DroppableDay
              key={dateKey}
              id={dateKey}
              className={cn(
                "min-h-[110px] bg-white p-1.5",
                !isCurrentMonth && "bg-gray-50"
              )}
            >
              {/* Day number */}
              <button
                onClick={() => onSelectDay(day)}
                className={cn(
                  "mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors hover:bg-gray-100",
                  isToday(day) && "bg-primary text-primary-foreground hover:bg-primary/90",
                  !isCurrentMonth && "text-gray-400"
                )}
              >
                {format(day, "d")}
              </button>

              {/* Events */}
              <div className="space-y-0.5">
                {visible.map((task) => (
                  <CalendarEvent
                    key={task._id}
                    task={task}
                    onSelect={onSelectTask}
                    compact
                  />
                ))}
                {overflow > 0 && (
                  <button
                    onClick={() => onSelectDay(day)}
                    className="w-full text-left px-1.5 text-[10px] text-primary hover:underline"
                  >
                    +{overflow} more
                  </button>
                )}
              </div>
            </DroppableDay>
          );
        })}
      </div>
    </div>
  );
}
