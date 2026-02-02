"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Download, AlertTriangle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function OverdueReportPage() {
  const [priority, setPriority] = useState("");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", "20");
  if (priority) params.set("priority", priority);

  const { data, isLoading } = useSWR(`/api/reports/overdue?${params}`, fetcher);

  async function handleExport() {
    try {
      const res = await fetch(`/api/reports/export?type=overdue${priority ? `&priority=${priority}` : ""}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `overdue-tasks-report.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report exported successfully");
    } catch {
      toast.error("Failed to export report");
    }
  }

  return (
    <div>
      <PageHeader
        title="Overdue Tasks Report"
        description="Track and manage overdue tasks"
        action={
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <div className="mb-6 flex gap-3">
        <Select value={priority} onValueChange={(v) => { setPriority(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Priorities" />
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
      ) : (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Overdue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">{data?.total || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Urgent/High Priority</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-orange-600">{data?.urgentHighCount || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Days Overdue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data?.avgDaysOverdue?.toFixed(1) || "0.0"}</p>
              </CardContent>
            </Card>
          </div>

          {/* Tasks Table */}
          {data?.data?.length === 0 ? (
            <EmptyState
              icon={<AlertTriangle className="h-12 w-12" />}
              title="No overdue tasks"
              description="Great job! There are no overdue tasks matching your filters."
            />
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">#</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Assignees</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Overdue By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.data?.map(
                      (task: {
                        _id: string;
                        taskNumber: string;
                        title: string;
                        priority: string;
                        assignees: { _id: string; firstName: string; lastName: string }[];
                        dueDate: string;
                      }) => (
                        <TableRow key={task._id}>
                          <TableCell className="font-mono text-xs">
                            <Link href={`/tasks/${task._id}`} className="text-primary hover:underline">
                              {task.taskNumber}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Link href={`/tasks/${task._id}`} className="font-medium hover:underline">
                              {task.title}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                task.priority === "urgent"
                                  ? "destructive"
                                  : task.priority === "high"
                                  ? "default"
                                  : "secondary"
                              }
                              className="capitalize"
                            >
                              {task.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex -space-x-2">
                              {task.assignees?.slice(0, 3).map((a) => (
                                <Avatar key={a._id} className="h-7 w-7 border-2 border-background">
                                  <AvatarFallback className="text-[10px]">
                                    {a.firstName[0]}{a.lastName[0]}
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
                          <TableCell className="text-sm">
                            {format(new Date(task.dueDate), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="destructive" className="text-xs">
                              {formatDistanceToNow(new Date(task.dueDate))} ago
                            </Badge>
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
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                      Previous
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
