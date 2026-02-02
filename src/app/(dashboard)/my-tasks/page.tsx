"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { TaskStatusBadge } from "@/components/tasks/task-status-badge";
import { TaskPriorityBadge } from "@/components/tasks/task-priority-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function MyTasksPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", "20");
  if (status) params.set("status", status);

  const { data, isLoading } = useSWR(`/api/tasks/my?${params}`, fetcher);
  const { data: statusesResponse } = useSWR("/api/workflow/statuses", fetcher);
  const statuses = Array.isArray(statusesResponse) ? statusesResponse : statusesResponse?.data;

  return (
    <div>
      <PageHeader title="My Tasks" description="Tasks assigned to you" />

      <div className="mb-4">
        <Select value={status} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statuses?.map((s: { _id: string; name: string }) => (
              <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : data?.data?.length === 0 ? (
        <EmptyState title="No tasks assigned" description="You have no tasks assigned to you." />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">#</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data?.map((task: { _id: string; taskNumber: string; title: string; status: { name: string; color: string }; priority: string; dueDate?: string }) => (
                  <TableRow key={task._id}>
                    <TableCell className="font-mono text-xs">
                      <Link href={`/tasks/${task._id}`} className="text-primary hover:underline">{task.taskNumber}</Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/tasks/${task._id}`} className="font-medium hover:underline">{task.title}</Link>
                    </TableCell>
                    <TableCell><TaskStatusBadge status={task.status} /></TableCell>
                    <TableCell><TaskPriorityBadge priority={task.priority} /></TableCell>
                    <TableCell>{task.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {data?.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Page {data.page} of {data.totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
