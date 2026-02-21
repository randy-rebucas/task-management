"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

interface DroppableDayProps {
  id: string; // ISO date string e.g. "2026-02-20"
  children: React.ReactNode;
  className?: string;
}

export function DroppableDay({ id, children, className }: DroppableDayProps) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "transition-colors",
        isOver && "bg-blue-50 ring-1 ring-inset ring-blue-300",
        className
      )}
    >
      {children}
    </div>
  );
}
