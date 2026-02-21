"use client";

import useSWR from "swr";
import { StatCard } from "./stat-card";
import { CheckSquare, AlertTriangle, Clock, Trophy, TrendingUp, Target, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CardSkeleton } from "@/components/shared/loading-skeleton";
import Link from "next/link";
import { format } from "date-fns";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function StaffDashboard() {
  const { data, isLoading } = useSWR("/api/dashboard/staff", fetcher);
  const now = new Date();
  const { data: perfData } = useSWR(
    `/api/performance/summary?month=${now.getMonth() + 1}&year=${now.getFullYear()}`,
    fetcher
  );

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="My Tasks"
          value={data.totalAssigned}
          icon={CheckSquare}
        />
        <StatCard
          title="Overdue"
          value={data.overdue}
          icon={AlertTriangle}
        />
        <StatCard
          title="Status Groups"
          value={data.taskStatusBreakdown?.length || 0}
          icon={Clock}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Due This Week</CardTitle>
        </CardHeader>
        <CardContent>
          {data.dueSoon?.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks due this week.</p>
          ) : (
            <div className="space-y-3">
              {data.dueSoon?.map(
                (task: {
                  _id: string;
                  taskNumber: string;
                  title: string;
                  dueDate: string;
                  status: { name: string; color: string };
                }) => (
                  <Link
                    key={task._id}
                    href={`/tasks/${task._id}`}
                    className="flex items-center justify-between rounded-md border p-3 hover:bg-accent"
                  >
                    <div>
                      <span className="text-xs text-muted-foreground">
                        {task.taskNumber}
                      </span>
                      <p className="font-medium">{task.title}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        style={{ borderColor: task.status?.color }}
                      >
                        {task.status?.name}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(task.dueDate), "MMM d")}
                      </span>
                    </div>
                  </Link>
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance snapshot */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-yellow-500" />
              My Performance · {format(now, "MMMM yyyy")}
            </CardTitle>
            <Link
              href="/performance"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Full report <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {!perfData ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-muted/50 p-3 text-center space-y-1">
                <TrendingUp className="mx-auto h-4 w-4 text-muted-foreground" />
                <p className="text-xl font-bold">{perfData.performanceScore}</p>
                <p className="text-[11px] text-muted-foreground">KPI Score</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center space-y-1">
                <Target className="mx-auto h-4 w-4 text-muted-foreground" />
                <p className="text-xl font-bold">{perfData.tasksCompleted}</p>
                <p className="text-[11px] text-muted-foreground">Tasks Done</p>
              </div>
              <div className="rounded-lg bg-yellow-50 p-3 text-center space-y-1">
                <Trophy className="mx-auto h-4 w-4 text-yellow-500" />
                <p className="text-xl font-bold text-yellow-700">
                  ₱{(perfData.totalIncentive ?? 0).toLocaleString("en-PH")}
                </p>
                <p className="text-[11px] text-yellow-600">Total Incentive</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
