"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  startOfMonth, endOfMonth,
  startOfWeek, endOfWeek,
  addMonths, addWeeks, addDays,
  subMonths, subWeeks, subDays,
  format, parseISO, differenceInDays, isToday, isPast,
} from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays, RefreshCw, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { MonthView } from "@/components/calendar/month-view";
import { WeekView } from "@/components/calendar/week-view";
import { DayView } from "@/components/calendar/day-view";
import { EventDetailSheet } from "@/components/calendar/event-detail-sheet";
import type { CalendarTask } from "@/components/calendar/calendar-event";
import Link from "next/link";

type View = "month" | "week" | "day";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function getDateRange(currentDate: Date, view: View) {
  if (view === "month") {
    const start = startOfWeek(startOfMonth(currentDate));
    const end   = endOfWeek(endOfMonth(currentDate));
    return { start, end };
  }
  if (view === "week") {
    return { start: startOfWeek(currentDate), end: endOfWeek(currentDate) };
  }
  return { start: currentDate, end: currentDate };
}

function getViewLabel(currentDate: Date, view: View): string {
  if (view === "month") return format(currentDate, "MMMM yyyy");
  if (view === "week") {
    const s = startOfWeek(currentDate);
    const e = endOfWeek(currentDate);
    return `${format(s, "MMM d")} – ${format(e, "MMM d, yyyy")}`;
  }
  return format(currentDate, "EEEE, MMMM d, yyyy");
}

const TASK_TYPES = [
  { value: "field_visit",         label: "Field Visit" },
  { value: "client_meeting",      label: "Client Meeting" },
  { value: "orientation_event",   label: "Orientation" },
  { value: "lead_follow_up",      label: "Follow-up" },
  { value: "proposal_submission", label: "Proposal" },
  { value: "collection_payment",  label: "Collection" },
  { value: "partner_onboarding",  label: "Onboarding" },
  { value: "internal_task",       label: "Internal" },
];

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>("month");
  const [selectedTask, setSelectedTask] = useState<CalendarTask | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  const { start, end } = getDateRange(currentDate, view);
  const swrKey = `/api/tasks?dueDateFrom=${format(start, "yyyy-MM-dd")}&dueDateTo=${format(end, "yyyy-MM-dd")}&limit=200`;

  const { data, mutate } = useSWR(swrKey, fetcher);
  const rawTasks: CalendarTask[] = data?.data ?? [];

  // Apply filters
  const tasks = rawTasks.filter((t) => {
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (filterType !== "all" && t.taskType !== filterType) return false;
    return true;
  });

  const activeFilters = (filterPriority !== "all" ? 1 : 0) + (filterType !== "all" ? 1 : 0);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handlePrev = () => {
    if (view === "month") setCurrentDate((d) => subMonths(d, 1));
    if (view === "week")  setCurrentDate((d) => subWeeks(d, 1));
    if (view === "day")   setCurrentDate((d) => subDays(d, 1));
  };

  const handleNext = () => {
    if (view === "month") setCurrentDate((d) => addMonths(d, 1));
    if (view === "week")  setCurrentDate((d) => addWeeks(d, 1));
    if (view === "day")   setCurrentDate((d) => addDays(d, 1));
  };

  const handleSelectDay = (date: Date) => {
    setCurrentDate(date);
    setView("day");
  };

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const taskId = active.id as string;
      const newDateStr = over.id as string;
      const task = rawTasks.find((t) => t._id === taskId);
      if (!task?.dueDate) return;

      const oldDue = parseISO(task.dueDate);
      const newDue = parseISO(newDateStr);
      const delta = differenceInDays(newDue, oldDue);

      const body: Record<string, string> = { dueDate: newDateStr };
      const taskWithStart = task as CalendarTask & { startDate?: string };
      if (taskWithStart.startDate) {
        const newStart = addDays(parseISO(taskWithStart.startDate), delta);
        body.startDate = format(newStart, "yyyy-MM-dd");
      }

      // Optimistic update
      mutate(
        (prev: { data: CalendarTask[] } | undefined) => {
          if (!prev) return prev;
          return {
            ...prev,
            data: prev.data.map((t) =>
              t._id === taskId ? { ...t, dueDate: newDateStr } : t
            ),
          };
        },
        { revalidate: false }
      );

      await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      mutate();
    },
    [rawTasks, mutate]
  );

  const overdueTasks = rawTasks.filter((t) => {
    if (!t.dueDate) return false;
    const due = parseISO(t.dueDate);
    return isPast(due) && !isToday(due) && !t.status?.isFinal;
  });

  const handleRescheduleOverdue = async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    await Promise.allSettled(
      overdueTasks.map((t) =>
        fetch(`/api/tasks/${t._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dueDate: today }),
        })
      )
    );
    mutate();
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <PageHeader
        title="Calendar"
        description="Visualize and reschedule tasks across time"
        action={
          <Button asChild size="sm">
            <Link href="/tasks/new">+ New Task</Link>
          </Button>
        }
      />

      {/* Primary toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="day">Day</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={handlePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
            className="flex items-center gap-1"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <span className="text-sm font-medium text-foreground">
          {getViewLabel(currentDate, view)}
        </span>

        {/* Task count */}
        {rawTasks.length > 0 && (
          <Badge variant="secondary" className="ml-1">
            {tasks.length}{activeFilters > 0 && rawTasks.length !== tasks.length ? ` / ${rawTasks.length}` : ""} task{tasks.length !== 1 ? "s" : ""}
          </Badge>
        )}

        {overdueTasks.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            className="ml-auto flex items-center gap-1.5"
            onClick={handleRescheduleOverdue}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reschedule {overdueTasks.length} overdue
          </Button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="All priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {TASK_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {activeFilters > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground"
            onClick={() => { setFilterPriority("all"); setFilterType("all"); }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Calendar views */}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        {view === "month" && (
          <MonthView
            currentDate={currentDate}
            tasks={tasks}
            onSelectTask={setSelectedTask}
            onSelectDay={handleSelectDay}
          />
        )}
        {view === "week" && (
          <WeekView
            currentDate={currentDate}
            tasks={tasks}
            onSelectTask={setSelectedTask}
          />
        )}
        {view === "day" && (
          <DayView
            currentDate={currentDate}
            tasks={tasks}
            onSelectTask={setSelectedTask}
          />
        )}
      </DndContext>

      {/* Task detail sheet */}
      <EventDetailSheet
        task={selectedTask as Parameters<typeof EventDetailSheet>[0]["task"]}
        onClose={() => setSelectedTask(null)}
      />
    </div>
  );
}
