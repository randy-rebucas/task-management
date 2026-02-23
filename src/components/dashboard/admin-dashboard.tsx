"use client";

import useSWR from "swr";
import Link from "next/link";
import { StatCard } from "./stat-card";
import { Users, CheckSquare, AlertTriangle, Activity, LineChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CardSkeleton } from "@/components/shared/loading-skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format } from "date-fns";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatPHP(n: number) {
  return (n ?? 0).toLocaleString("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });
}

export function AdminDashboard() {
  const { data, isLoading } = useSWR("/api/dashboard/admin", fetcher);
  const { data: convData }    = useSWR("/api/analytics/conversion-by-industry", fetcher);
  const { data: pipeData }    = useSWR("/api/analytics/pipeline-aging", fetcher);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={data.totalUsers}
          description={`${data.activeUsers} active`}
          icon={Users}
        />
        <StatCard
          title="Total Tasks"
          value={data.totalTasks}
          icon={CheckSquare}
        />
        <StatCard
          title="Overdue Tasks"
          value={data.overdueTasks}
          icon={AlertTriangle}
        />
        <StatCard
          title="Urgent Tasks"
          value={data.tasksByPriority?.find((p: { _id: string }) => p._id === "urgent")?.count ?? 0}
          description="priority: urgent"
          icon={Activity}
        />
      </div>

      {/* Analytics Snapshot */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <LineChart className="h-4 w-4 text-primary" /> Analytics Snapshot
          </CardTitle>
          <Link href="/analytics" className="text-xs text-primary hover:underline">View full analytics →</Link>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Conversion Rate</p>
              <p className="text-2xl font-bold text-green-600">{convData?.overallRate ?? "—"}%</p>
              <p className="text-xs text-muted-foreground">across all industries</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Open Pipeline</p>
              <p className="text-2xl font-bold text-blue-600">{formatPHP(pipeData?.totalPipelineValue ?? 0)}</p>
              <p className="text-xs text-muted-foreground">{pipeData?.totalOpenDeals ?? 0} open deals</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Stale Stages</p>
              <p className="text-2xl font-bold text-orange-500">{pipeData?.hasStaleStage ? "⚠ Yes" : "✓ None"}</p>
              <p className="text-xs text-muted-foreground">stages &gt;30 days avg</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tasks by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={(data.taskStatusBreakdown ?? []).map(
                    (e: { status: { name: string; color: string }; count: number }) => ({
                      name: e.status?.name ?? "Unknown",
                      color: e.status?.color ?? "#8884d8",
                      count: e.count,
                    })
                  )}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="count"
                  nameKey="name"
                  label={(props) => props.name ?? ""}
                >
                  {(data.taskStatusBreakdown ?? []).map(
                    (entry: { status: { color: string } }, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.status?.color || "#8884d8"}
                      />
                    )
                  )}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tasks by Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.tasksByPriority}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.recentActivity?.map(
              (log: {
                _id: string;
                actor: { firstName: string; lastName: string };
                action: string;
                resource: string;
                createdAt: string;
              }) => (
                <div
                  key={log._id}
                  className="flex items-center justify-between border-b pb-2 last:border-0"
                >
                  <div>
                    <span className="font-medium">
                      {log.actor?.firstName} {log.actor?.lastName}
                    </span>
                    <span className="text-muted-foreground"> {log.action}</span>
                    <Badge variant="outline" className="ml-2">
                      {log.resource}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(log.createdAt), "MMM d, HH:mm")}
                  </span>
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
