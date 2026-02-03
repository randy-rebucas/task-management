"use client";

import useSWR from "swr";
import { StatCard } from "./stat-card";
import { Users, CheckSquare, AlertTriangle, Activity } from "lucide-react";
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

export function AdminDashboard() {
  const { data, isLoading } = useSWR("/api/dashboard/admin", fetcher);

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
          title="Task Priorities"
          value={data.tasksByPriority?.length || 0}
          description="Active priority levels"
          icon={Activity}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tasks by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.taskStatusBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="count"
                  nameKey="status.name"
                  label={(props) => props.payload?.status?.name ?? ""}
                >
                  {data.taskStatusBreakdown?.map(
                    (entry: { status: { color: string } }, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.status.color || "#8884d8"}
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
