"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { usePermissions } from "@/hooks/use-permissions";
import { useDebounce } from "@/hooks/use-debounce";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { TaskStatusBadge } from "@/components/tasks/task-status-badge";
import { TaskPriorityBadge } from "@/components/tasks/task-priority-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Search } from "lucide-react";
import { format } from "date-fns";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function TasksPage() {
  const { can } = usePermissions();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search);

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", "20");
  if (debouncedSearch) params.set("search", debouncedSearch);
  if (status) params.set("status", status);
  if (priority) params.set("priority", priority);

  const { data, isLoading } = useSWR(`/api/tasks?${params}`, fetcher);
  const { data: statuses } = useSWR("/api/workflow/statuses", fetcher);

  return (
    <div>
      <PageHeader
        title="All Tasks"
        description="View and manage all tasks"
        action={
          can("tasks:create") ? (
            <Button asChild>
              <Link href="/tasks/new">
                <Plus className="mr-2 h-4 w-4" /> New Task
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statuses?.map((s: { _id: string; name: string }) => (
              <SelectItem key={s._id} value={s._id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={(v) => { setPriority(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : data?.data?.length === 0 ? (
        <EmptyState
          title="No tasks found"
          description="Create a new task to get started"
          action={
            can("tasks:create") ? (
              <Button asChild>
                <Link href="/tasks/new">
                  <Plus className="mr-2 h-4 w-4" /> New Task
                </Link>
              </Button>
            ) : undefined
          }
        />
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
                  <TableHead>Assignees</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data?.map(
                  (task: {
                    _id: string;
                    taskNumber: string;
                    title: string;
                    status: { name: string; color: string };
                    priority: string;
                    assignees: { _id: string; firstName: string; lastName: string }[];
                    dueDate?: string;
                  }) => (
                    <TableRow key={task._id}>
                      <TableCell className="font-mono text-xs">
                        <Link
                          href={`/tasks/${task._id}`}
                          className="text-primary hover:underline"
                        >
                          {task.taskNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/tasks/${task._id}`}
                          className="font-medium hover:underline"
                        >
                          {task.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <TaskStatusBadge status={task.status} />
                      </TableCell>
                      <TableCell>
                        <TaskPriorityBadge priority={task.priority} />
                      </TableCell>
                      <TableCell>
                        <div className="flex -space-x-2">
                          {task.assignees?.slice(0, 3).map((a) => (
                            <Avatar key={a._id} className="h-7 w-7 border-2 border-background">
                              <AvatarFallback className="text-[10px]">
                                {a.firstName[0]}
                                {a.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {task.assignees?.length > 3 && (
                            <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px]">
                              +{task.assignees.length - 3}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {task.dueDate
                          ? format(new Date(task.dueDate), "MMM d, yyyy")
                          : "—"}
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </div>

          {data?.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Page {data.page} of {data.totalPages} ({data.total} tasks)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
