"use client";

import { useState } from "react";
import useSWR from "swr";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  CheckSquare, Clock, AlertTriangle, MapPin, Users, TrendingUp, TrendingDown,
  Minus, Trophy, Target, Star,
} from "lucide-react";
import { usePermissions } from "@/features/auth/use-permissions";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Tab = "my" | "leaderboard" | "team";

const PERIOD_OPTIONS = [
  { value: "week",  label: "This Week"  },
  { value: "month", label: "This Month" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Trend({ value }: { value: number }) {
  if (value > 0) return <span className="text-green-600 text-xs flex items-center gap-0.5"><TrendingUp className="h-3 w-3" />+{value}</span>;
  if (value < 0) return <span className="text-red-500 text-xs flex items-center gap-0.5"><TrendingDown className="h-3 w-3" />{value}</span>;
  return <span className="text-muted-foreground text-xs flex items-center gap-0.5"><Minus className="h-3 w-3" />—</span>;
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? "bg-green-500" :
    score >= 60 ? "bg-blue-500"  :
    score >= 40 ? "bg-yellow-500" :
    "bg-red-500";
  return (
    <span className={`inline-flex items-center justify-center rounded-full text-white text-xs font-bold h-8 w-8 ${color}`}>
      {score}
    </span>
  );
}

function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-500" />;
  if (rank === 2) return <Trophy className="h-4 w-4 text-gray-400" />;
  if (rank === 3) return <Trophy className="h-4 w-4 text-amber-600" />;
  return <span className="text-sm text-muted-foreground w-4 text-center">{rank}</span>;
}

function KPICard({
  icon: Icon,
  label,
  value,
  trend,
  color = "text-foreground",
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  trend?: number;
  color?: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className="flex flex-col items-end gap-1">
            <Icon className={`h-4 w-4 ${color || "text-muted-foreground"}`} />
            {trend !== undefined && <Trend value={trend} />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KPIDashboardPage() {
  const { can } = usePermissions();
  const isAdmin = can("visit_logs:view_all");

  const [period, setPeriod] = useState("week");
  const [tab, setTab] = useState<Tab>("my");

  const { data: myKpi, isLoading: myLoading } = useSWR(`/api/kpi/my?period=${period}`, fetcher);
  const { data: leaderboard, isLoading: lbLoading } = useSWR(
    tab === "leaderboard" ? `/api/kpi/leaderboard?period=${period}` : null,
    fetcher
  );
  const { data: teamData, isLoading: teamLoading } = useSWR(
    tab === "team" ? `/api/kpi/team?period=${period}` : null,
    fetcher
  );

  const TABS: { id: Tab; label: string; adminOnly?: boolean }[] = [
    { id: "my", label: "My Performance" },
    { id: "leaderboard", label: "Leaderboard", adminOnly: true },
    { id: "team", label: "Team Comparison", adminOnly: true },
  ];

  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin);

  return (
    <div>
      <PageHeader
        title="KPI Dashboard"
        description="Track productivity, field activity, and team performance"
        action={
          <div className="flex gap-2">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors border ${
                  period === opt.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        }
      />

      {/* Tab bar */}
      <div className="mt-6 flex gap-1 border-b">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {/* ── MY PERFORMANCE ── */}
        {tab === "my" && (
          myLoading ? <LoadingSkeleton /> : myKpi ? <MyPerformanceTab data={myKpi} period={period} /> : null
        )}

        {/* ── LEADERBOARD ── */}
        {tab === "leaderboard" && (
          lbLoading ? <LoadingSkeleton /> :
          leaderboard ? <LeaderboardTab data={leaderboard} /> : null
        )}

        {/* ── TEAM COMPARISON ── */}
        {tab === "team" && (
          teamLoading ? <LoadingSkeleton /> :
          teamData ? <TeamTab data={teamData} /> : null
        )}
      </div>
    </div>
  );
}

// ─── My Performance Tab ───────────────────────────────────────────────────────

function MyPerformanceTab({ data, period }: { data: any; period: string }) {
  const score = data.performanceScore || 0;
  const scoreColor =
    score >= 80 ? "text-green-600" :
    score >= 60 ? "text-blue-600"  :
    score >= 40 ? "text-yellow-600" :
    "text-red-600";
  const scoreLabel =
    score >= 80 ? "Excellent" :
    score >= 60 ? "Good" :
    score >= 40 ? "Needs Improvement" :
    "Critical";

  return (
    <div className="space-y-6">
      {/* Performance score card */}
      <Card className="overflow-hidden">
        <CardContent className="pt-5">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="text-center min-w-[100px]">
              <p className="text-xs text-muted-foreground mb-1">{data.periodLabel} Score</p>
              <p className={`text-5xl font-black ${scoreColor}`}>{score}</p>
              <p className="text-xs text-muted-foreground mt-1">/ 100</p>
              <Badge
                variant="secondary"
                className={`mt-2 text-[10px] ${
                  score >= 80 ? "bg-green-100 text-green-700" :
                  score >= 60 ? "bg-blue-100 text-blue-700" :
                  score >= 40 ? "bg-yellow-100 text-yellow-700" :
                  "bg-red-100 text-red-700"
                }`}
              >
                {scoreLabel}
              </Badge>
            </div>
            <div className="flex-1 min-w-[200px] space-y-2">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Task Completion</span>
                  <span>{data.tasksAssigned > 0 ? Math.round((data.tasksCompleted / data.tasksAssigned) * 100) : 100}%</span>
                </div>
                <Progress value={data.tasksAssigned > 0 ? (data.tasksCompleted / data.tasksAssigned) * 100 : 100} className="h-1.5" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Field Visits</span>
                  <span>{Math.min(Math.round((data.visitCount / (period === "month" ? 20 : 5)) * 100), 100)}%</span>
                </div>
                <Progress value={Math.min((data.visitCount / (period === "month" ? 20 : 5)) * 100, 100)} className="h-1.5 [&>div]:bg-blue-500" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Lead Activity</span>
                  <span>{Math.min(Math.round((data.newLeads / (period === "month" ? 10 : 3)) * 100), 100)}%</span>
                </div>
                <Progress value={Math.min((data.newLeads / (period === "month" ? 10 : 3)) * 100, 100)} className="h-1.5 [&>div]:bg-purple-500" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Overdue penalty</span>
                  <span className="text-red-500">-{Math.min(data.tasksOverdue * 5, 30)} pts</span>
                </div>
                <Progress value={Math.min((data.tasksOverdue / 6) * 100, 100)} className="h-1.5 [&>div]:bg-red-500" />
              </div>
            </div>
            <div className="flex gap-2 text-sm text-muted-foreground">
              vs. last period:
              <Trend value={data.trend?.performanceScore || 0} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KPICard
          icon={Target}
          label="Tasks Assigned"
          value={data.tasksAssigned}
          color="text-foreground"
        />
        <KPICard
          icon={CheckSquare}
          label="Tasks Completed"
          value={data.tasksCompleted}
          trend={data.trend?.tasksCompleted}
          color="text-green-600"
          sub={`${data.tasksAssigned > 0 ? Math.round((data.tasksCompleted / data.tasksAssigned) * 100) : 0}% rate`}
        />
        <KPICard
          icon={AlertTriangle}
          label="Overdue Tasks"
          value={data.tasksOverdue}
          color={data.tasksOverdue > 0 ? "text-red-600" : "text-green-600"}
        />
        <KPICard
          icon={MapPin}
          label="Field Visits"
          value={data.visitCount}
          trend={data.trend?.visitCount}
          color="text-blue-600"
        />
        <KPICard
          icon={Star}
          label="New Leads"
          value={data.newLeads}
          trend={data.trend?.newLeads}
          color="text-purple-600"
          sub={`${data.closingRate}% close rate`}
        />
        <KPICard
          icon={TrendingUp}
          label="Closing Rate"
          value={`${data.closingRate}%`}
          color={data.closingRate >= 60 ? "text-green-600" : data.closingRate >= 30 ? "text-yellow-600" : "text-red-600"}
          sub={`${data.totalLeads} total leads`}
        />
      </div>

      {/* Daily activity chart */}
      {data.dailyActivity?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Daily Activity — {data.periodLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.dailyActivity} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Legend iconSize={10} />
                <Bar dataKey="completed" name="Tasks Completed" fill="#22c55e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="visits"    name="Field Visits"    fill="#3b82f6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Leaderboard Tab ──────────────────────────────────────────────────────────

function LeaderboardTab({ data }: { data: any }) {
  const rankings = data?.rankings || [];

  if (rankings.length === 0) {
    return <p className="text-muted-foreground text-sm">No data available.</p>;
  }

  // Top 3 podium
  const top3 = rankings.slice(0, 3);
  const rest = rankings.slice(3);

  return (
    <div className="space-y-6">
      {/* Top 3 podium */}
      <div className="grid gap-4 sm:grid-cols-3">
        {top3.map((entry: any) => (
          <Card
            key={entry.user._id}
            className={`text-center ${
              entry.rank === 1 ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20" :
              entry.rank === 2 ? "border-gray-300 bg-gray-50 dark:bg-gray-900/20" :
              "border-amber-300 bg-amber-50 dark:bg-amber-950/20"
            }`}
          >
            <CardContent className="pt-5 pb-4">
              <div className="flex justify-center mb-2">
                <Trophy className={`h-6 w-6 ${
                  entry.rank === 1 ? "text-yellow-500" :
                  entry.rank === 2 ? "text-gray-400" :
                  "text-amber-600"
                }`} />
              </div>
              <Avatar className="h-12 w-12 mx-auto mb-2">
                <AvatarFallback>
                  {entry.user.firstName[0]}{entry.user.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <p className="font-semibold text-sm">{entry.user.firstName} {entry.user.lastName}</p>
              <p className="text-2xl font-black mt-1">{entry.performanceScore}</p>
              <p className="text-xs text-muted-foreground">/ 100</p>
              <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                <div>{entry.tasksCompleted} tasks done · {entry.visitCount} visits</div>
                <div>{entry.newLeads} leads · {entry.closingRate}% close</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Full table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">Rank</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead className="text-right">Assigned</TableHead>
              <TableHead className="text-right">Completed</TableHead>
              <TableHead className="text-right">Overdue</TableHead>
              <TableHead className="text-right">Visits</TableHead>
              <TableHead className="text-right">Leads</TableHead>
              <TableHead className="text-right">Close Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rankings.map((entry: any) => (
              <TableRow key={entry.user._id}>
                <TableCell>
                  <div className="flex justify-center">
                    <RankMedal rank={entry.rank} />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-[10px]">
                        {entry.user.firstName[0]}{entry.user.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {entry.user.firstName} {entry.user.lastName}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Progress value={entry.performanceScore} className="w-16 h-1.5" />
                    <ScoreBadge score={entry.performanceScore} />
                  </div>
                </TableCell>
                <TableCell className="text-right text-sm">{entry.tasksAssigned}</TableCell>
                <TableCell className="text-right">
                  <Badge variant="default" className="bg-green-500">{entry.tasksCompleted}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {entry.tasksOverdue > 0
                    ? <Badge variant="destructive">{entry.tasksOverdue}</Badge>
                    : <span className="text-sm text-muted-foreground">0</span>}
                </TableCell>
                <TableCell className="text-right text-sm">{entry.visitCount}</TableCell>
                <TableCell className="text-right text-sm">{entry.newLeads}</TableCell>
                <TableCell className="text-right">
                  <span className={`text-sm font-medium ${
                    entry.closingRate >= 60 ? "text-green-600" :
                    entry.closingRate >= 30 ? "text-yellow-600" :
                    entry.closingRate > 0  ? "text-red-600" : "text-muted-foreground"
                  }`}>
                    {entry.closingRate}%
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── Team Comparison Tab ──────────────────────────────────────────────────────

function TeamTab({ data }: { data: any }) {
  const departments = data?.departments || [];

  if (departments.length === 0) {
    return <p className="text-muted-foreground text-sm">No department data available.</p>;
  }

  const chartData = departments.map((d: any) => ({
    name: d.department.name,
    "Avg Score":   d.avgPerformanceScore,
    "Completed":   d.totalTasksCompleted,
    "Visits":      d.totalVisits,
  }));

  return (
    <div className="space-y-6">
      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Department Performance Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend iconSize={10} />
              <Bar dataKey="Avg Score" fill="#6366f1" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Completed" fill="#22c55e" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Visits"    fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Department</TableHead>
              <TableHead className="text-right">Members</TableHead>
              <TableHead className="text-right">Tasks Done</TableHead>
              <TableHead className="text-right">Overdue</TableHead>
              <TableHead className="text-right">Visits</TableHead>
              <TableHead className="text-right">Leads</TableHead>
              <TableHead className="w-[140px]">Avg Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments.map((d: any) => (
              <TableRow key={d.department._id}>
                <TableCell className="font-medium">{d.department.name}</TableCell>
                <TableCell className="text-right text-sm">{d.memberCount}</TableCell>
                <TableCell className="text-right">
                  <Badge variant="default" className="bg-green-500">{d.totalTasksCompleted}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {d.totalOverdue > 0
                    ? <Badge variant="destructive">{d.totalOverdue}</Badge>
                    : <span className="text-sm text-muted-foreground">0</span>}
                </TableCell>
                <TableCell className="text-right text-sm">{d.totalVisits}</TableCell>
                <TableCell className="text-right text-sm">{d.totalLeads}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={d.avgPerformanceScore} className="flex-1 h-2" />
                    <ScoreBadge score={d.avgPerformanceScore} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
