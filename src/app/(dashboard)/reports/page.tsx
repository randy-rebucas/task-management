"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
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
import { BarChart3, Users, AlertTriangle, Download } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  {
    id: "tasks",
    title: "Task Summary",
    description: "Tasks by status, priority & trends",
    icon: BarChart3,
  },
  {
    id: "staff",
    title: "Staff Workload",
    description: "Task distribution across staff",
    icon: Users,
  },
  {
    id: "overdue",
    title: "Overdue Tasks",
    description: "Overdue tasks & delays",
    icon: AlertTriangle,
  },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Task Summary content ─────────────────────────────────────────────────────

function TaskSummaryContent() {
  const [period, setPeriod] = useState("30");
  const { data, isLoading } = useSWR(`/api/reports/task-summary?days=${period}`, fetcher);

  async function handleExport() {
    try {
      const res = await fetch(`/api/reports/export?type=task-summary&days=${period}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "task-summary-report.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report exported successfully");
    } catch {
      toast.error("Failed to export report");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Time period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data?.totalTasks || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">{data?.completedTasks || 0}</p>
                <p className="text-xs text-muted-foreground">
                  {data?.totalTasks
                    ? `${((data.completedTasks / data.totalTasks) * 100).toFixed(1)}%`
                    : "0%"}{" "}
                  completion rate
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-600">{data?.inProgressTasks || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">{data?.overdueTasks || 0}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Tasks by Status</CardTitle></CardHeader>
            <CardContent>
              {data?.byStatus?.length > 0 ? (
                <div className="space-y-3">
                  {data.byStatus.map((item: { status: string; color: string; count: number }) => (
                    <div key={item.status} className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-sm flex-1">{item.status}</span>
                      <span className="text-sm font-medium">{item.count}</span>
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${data.totalTasks ? (item.count / data.totalTasks) * 100 : 0}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No data available</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Tasks by Priority</CardTitle></CardHeader>
            <CardContent>
              {data?.byPriority?.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Priority</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                        <TableHead className="text-right">Percentage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.byPriority.map((item: { priority: string; count: number }) => (
                        <TableRow key={item.priority}>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{item.priority}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{item.count}</TableCell>
                          <TableCell className="text-right">
                            {data.totalTasks
                              ? `${((item.count / data.totalTasks) * 100).toFixed(1)}%`
                              : "0%"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No data available</p>
              )}
            </CardContent>
          </Card>

          {data?.byCategory?.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Tasks by Category</CardTitle></CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                        <TableHead className="text-right">Percentage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.byCategory.map((item: { category: string; count: number }) => (
                        <TableRow key={item.category}>
                          <TableCell>{item.category || "Uncategorized"}</TableCell>
                          <TableCell className="text-right">{item.count}</TableCell>
                          <TableCell className="text-right">
                            {data.totalTasks
                              ? `${((item.count / data.totalTasks) * 100).toFixed(1)}%`
                              : "0%"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Staff Workload content ───────────────────────────────────────────────────

function StaffWorkloadContent() {
  const [department, setDepartment] = useState("");
  const params = new URLSearchParams();
  if (department) params.set("department", department);

  const { data, isLoading } = useSWR(`/api/reports/staff-workload?${params}`, fetcher);
  const { data: departments } = useSWR("/api/departments", fetcher);

  async function handleExport() {
    try {
      const exportParams = new URLSearchParams({ type: "staff-workload" });
      if (department) exportParams.set("department", department);
      const res = await fetch(`/api/reports/export?${exportParams}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "staff-workload-report.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report exported successfully");
    } catch {
      toast.error("Failed to export report");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Select value={department} onValueChange={(v) => setDepartment(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments?.map((d: { _id: string; name: string }) => (
              <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : data?.staff?.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="No data available"
          description="No staff workload data found for the selected filters"
        />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Staff</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data?.staff?.length || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Tasks / Person</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data?.avgTasks?.toFixed(1) || "0.0"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Hours Logged</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data?.totalHours?.toFixed(1) || "0.0"}h</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Staff Workload</CardTitle></CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff Member</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">In Progress</TableHead>
                      <TableHead className="text-right">Completed</TableHead>
                      <TableHead className="text-right">Overdue</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead className="w-[120px]">Completion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.staff?.map(
                      (member: {
                        _id: string;
                        firstName: string;
                        lastName: string;
                        department?: string;
                        totalTasks: number;
                        inProgress: number;
                        completed: number;
                        overdue: number;
                        hoursLogged: number;
                      }) => {
                        const completionRate = member.totalTasks
                          ? (member.completed / member.totalTasks) * 100
                          : 0;
                        return (
                          <TableRow key={member._id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-7 w-7">
                                  <AvatarFallback className="text-[10px]">
                                    {member.firstName[0]}{member.lastName[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">
                                  {member.firstName} {member.lastName}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{member.department || "—"}</TableCell>
                            <TableCell className="text-right">{member.totalTasks}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary">{member.inProgress}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="default">{member.completed}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {member.overdue > 0
                                ? <Badge variant="destructive">{member.overdue}</Badge>
                                : <span className="text-sm">0</span>}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {member.hoursLogged.toFixed(1)}h
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={completionRate} className="h-2" />
                                <span className="text-xs text-muted-foreground w-10 text-right">
                                  {completionRate.toFixed(0)}%
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      }
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Overdue Tasks content ────────────────────────────────────────────────────

function OverdueTasksContent() {
  const [priority, setPriority] = useState("");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (priority) params.set("priority", priority);

  const { data, isLoading } = useSWR(`/api/reports/overdue?${params}`, fetcher);

  async function handleExport() {
    try {
      const res = await fetch(
        `/api/reports/export?type=overdue${priority ? `&priority=${priority}` : ""}`
      );
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "overdue-tasks-report.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report exported successfully");
    } catch {
      toast.error("Failed to export report");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Select
          value={priority}
          onValueChange={(v) => { setPriority(v === "all" ? "" : v); setPage(1); }}
        >
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
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <div className="space-y-6">
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
                <CardTitle className="text-sm font-medium text-muted-foreground">Urgent / High</CardTitle>
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
                                task.priority === "urgent" ? "destructive"
                                : task.priority === "high" ? "default"
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

// ─── Page shell ───────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("tasks");
  const active = TABS.find((t) => t.id === activeTab)!;

  return (
    <div>
      <PageHeader
        title="Reports"
        description="View reports and analytics for your task management"
      />

      <div className="mt-6 flex gap-6 items-start">
        {/* Left vertical tab list */}
        <aside className="w-56 shrink-0 space-y-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0",
                    isActive ? "text-primary-foreground" : ""
                  )}
                />
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium leading-none",
                      isActive ? "text-primary-foreground" : "text-foreground"
                    )}
                  >
                    {tab.title}
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-xs leading-snug line-clamp-2",
                      isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                    )}
                  >
                    {tab.description}
                  </p>
                </div>
              </button>
            );
          })}
        </aside>

        {/* Right content pane */}
        <div className="flex-1 min-w-0">
          <div className="mb-5 border-b pb-4">
            <h2 className="text-lg font-semibold">{active.title}</h2>
            <p className="text-sm text-muted-foreground">{active.description}</p>
          </div>

          {activeTab === "tasks"   && <TaskSummaryContent />}
          {activeTab === "staff"   && <StaffWorkloadContent />}
          {activeTab === "overdue" && <OverdueTasksContent />}
        </div>
      </div>
    </div>
  );
}
