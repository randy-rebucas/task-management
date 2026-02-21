"use client";

import { format, parseISO } from "date-fns";
import Link from "next/link";
import { ExternalLink, Calendar, User, Briefcase } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { CalendarTask } from "./calendar-event";

interface ExtendedTask extends CalendarTask {
  startDate?: string;
  description?: string;
  taskNumber?: string;
  lead?: { _id: string; name: string };
  client?: { _id: string; name: string };
  deal?: { _id: string; title: string; stage: string };
}

interface EventDetailSheetProps {
  task: ExtendedTask | null;
  onClose: () => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-800",
  high:   "bg-orange-100 text-orange-800",
  medium: "bg-blue-100 text-blue-800",
  low:    "bg-gray-100 text-gray-800",
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
      {children}
    </p>
  );
}

export function EventDetailSheet({ task, onClose }: EventDetailSheetProps) {
  if (!task) return null;

  return (
    <Sheet open={!!task} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex flex-col p-0 sm:max-w-[480px]">
        {/* Header */}
        <SheetHeader className="border-b px-6 py-4 pr-10">
          {task.taskNumber && (
            <p className="text-xs text-muted-foreground">{task.taskNumber}</p>
          )}
          <SheetTitle className="text-base font-semibold leading-snug">
            {task.title}
          </SheetTitle>
          <div className="flex flex-wrap gap-2 pt-1">
            {task.status && (
              <Badge
                style={{ backgroundColor: task.status.color + "20", color: task.status.color }}
                variant="secondary"
              >
                {task.status.name}
              </Badge>
            )}
            <Badge variant="secondary" className={PRIORITY_COLORS[task.priority]}>
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </Badge>
          </div>
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-sm">
          {/* Dates */}
          {(task.startDate || task.dueDate) && (
            <div>
              <SectionLabel>Schedule</SectionLabel>
              <div className="grid grid-cols-[16px_1fr] items-start gap-x-2 gap-y-2">
                {task.startDate && (
                  <>
                    <Calendar className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />
                    <div>
                      <span className="text-muted-foreground">Start</span>
                      <span className="ml-2 font-medium text-foreground">
                        {format(parseISO(task.startDate), "MMM d, yyyy")}
                      </span>
                    </div>
                  </>
                )}
                {task.dueDate && (
                  <>
                    <Calendar className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />
                    <div>
                      <span className="text-muted-foreground">Due</span>
                      <span className="ml-2 font-medium text-foreground">
                        {format(parseISO(task.dueDate), "MMM d, yyyy")}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Assignees */}
          {task.assignees && task.assignees.length > 0 && (
            <>
              <Separator />
              <div>
                <SectionLabel>Assignees</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {task.assignees.map((a) => (
                    <div
                      key={a._id}
                      className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1"
                    >
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-foreground">
                        {a.firstName} {a.lastName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Description */}
          {task.description && (
            <>
              <Separator />
              <div>
                <SectionLabel>Description</SectionLabel>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {task.description}
                </p>
              </div>
            </>
          )}

          {/* CRM Links */}
          {(task.lead || task.client || task.deal) && (
            <>
              <Separator />
              <div>
                <SectionLabel>CRM Links</SectionLabel>
                <div className="space-y-2">
                  {task.lead && (
                    <Link
                      href={`/crm/leads/${task.lead._id}`}
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Briefcase className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>Lead: {task.lead.name}</span>
                    </Link>
                  )}
                  {task.client && (
                    <Link
                      href={`/crm/clients/${task.client._id}`}
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Briefcase className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>Client: {task.client.name}</span>
                    </Link>
                  )}
                  {task.deal && (
                    <Link
                      href={`/crm/deals/${task.deal._id}`}
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Briefcase className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>Deal: {task.deal.title}</span>
                    </Link>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer — pinned to bottom */}
        <SheetFooter className="border-t px-6 py-4">
          <Button asChild className="w-full" size="sm">
            <Link href={`/tasks/${task._id}/edit`}>
              <ExternalLink className="mr-2 h-3.5 w-3.5" />
              Edit Task
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full" size="sm">
            <Link href={`/tasks/${task._id}`}>View Full Details</Link>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
