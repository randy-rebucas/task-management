"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { isToday, isPast, parseISO } from "date-fns";

interface CalendarTask {
  _id: string;
  title: string;
  priority: string;
  dueDate?: string;
  status?: { name: string; color: string; isFinal?: boolean };
  assignees?: { _id: string; firstName: string; lastName: string; avatar?: string }[];
}

interface CalendarEventProps {
  task: CalendarTask;
  onSelect: (task: CalendarTask) => void;
  compact?: boolean;
}

const PRIORITY_BORDER: Record<string, string> = {
  urgent: "border-l-red-500",
  high:   "border-l-orange-400",
  medium: "border-l-blue-400",
  low:    "border-l-gray-300",
};

export function CalendarEvent({ task, onSelect, compact = false }: CalendarEventProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task._id,
    data: { task },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const dueDate = task.dueDate ? parseISO(task.dueDate) : null;
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate) && !task.status?.isFinal;
  const isDueToday = dueDate && isToday(dueDate);

  const borderColor = PRIORITY_BORDER[task.priority] ?? "border-l-gray-300";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(task);
      }}
      className={cn(
        "group cursor-pointer select-none rounded border-l-2 bg-white px-1.5 py-0.5 text-xs shadow-sm transition-all hover:shadow-md",
        borderColor,
        isDragging && "opacity-50 shadow-lg scale-95",
        isOverdue && "ring-1 ring-red-400",
        isDueToday && "ring-1 ring-orange-400",
        compact ? "truncate" : "space-y-0.5"
      )}
    >
      <div className="flex items-center gap-1">
        {task.status?.color && (
          <span
            className="inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full"
            style={{ backgroundColor: task.status.color }}
          />
        )}
        <span className={cn("font-medium text-gray-800 leading-tight", compact ? "truncate" : "line-clamp-2")}>
          {task.title}
        </span>
      </div>

      {!compact && (
        <div className="flex items-center gap-1">
          {isOverdue && (
            <span className="rounded bg-red-100 px-1 py-0.5 text-[10px] font-medium text-red-700">
              Overdue
            </span>
          )}
          {isDueToday && !isOverdue && (
            <span className="rounded bg-orange-100 px-1 py-0.5 text-[10px] font-medium text-orange-700">
              Today
            </span>
          )}
          {task.assignees?.slice(0, 2).map((a) => (
            <span
              key={a._id}
              className="inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-[9px] font-bold text-gray-600"
              title={`${a.firstName} ${a.lastName}`}
            >
              {a.firstName[0]}{a.lastName[0]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export type { CalendarTask };
