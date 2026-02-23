"use client";

import useSWR from "@/lib/swr-compat";
import Link from "next/link";
import { StatCard } from "./stat-card";
import { Users, CheckSquare, AlertTriangle, LineChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardSkeleton } from "@/components/shared/loading-skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatPHP(n: number) {
  return (n ?? 0).toLocaleString("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });
}

export function ManagerDashboard() {
  const { data, isLoading } = useSWR("/api/dashboard/manager", fetcher);
  const { data: pipeData }  = useSWR("/api/analytics/pipeline-aging", fetcher);
  const { data: convData }  = useSWR("/api/analytics/conversion-by-industry", fetcher);

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
          title="Team Members"
          value={data.teamMembers}
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
              <p className="text-xs text-muted-foreground">leads → clients</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Open Pipeline</p>
              <p className="text-2xl font-bold text-blue-600">{formatPHP(pipeData?.totalPipelineValue ?? 0)}</p>
              <p className="text-xs text-muted-foreground">{pipeData?.totalOpenDeals ?? 0} deals</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Stale Stages</p>
              <p className="text-2xl font-bold text-orange-500">{pipeData?.hasStaleStage ? "⚠ Yes" : "✓ None"}</p>
              <p className="text-xs text-muted-foreground">&gt;30 days avg</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team Workload</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.workloadByAssignee}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" name="Tasks" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
