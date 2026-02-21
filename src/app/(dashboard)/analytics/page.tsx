"use client";

import { useState } from "react";
import useSWR from "swr";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  MapPin,
  Users,
  AlertTriangle,
  Eye,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Tab =
  | "conversion"
  | "revenue"
  | "visit-to-close"
  | "efficiency"
  | "pipeline";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "conversion", label: "Conversion by Industry", icon: <TrendingUp className="h-4 w-4" /> },
  { id: "revenue", label: "Revenue by Territory", icon: <DollarSign className="h-4 w-4" /> },
  { id: "visit-to-close", label: "Visit-to-Close", icon: <Eye className="h-4 w-4" /> },
  { id: "efficiency", label: "Coordinator Efficiency", icon: <Users className="h-4 w-4" /> },
  { id: "pipeline", label: "Pipeline Aging", icon: <MapPin className="h-4 w-4" /> },
];

function formatPHP(n: number) {
  return (n ?? 0).toLocaleString("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? "bg-green-100 text-green-700" :
    score >= 60 ? "bg-yellow-100 text-yellow-700" :
    "bg-red-100 text-red-700";
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>{score}</span>;
}

// ─── Tab: Conversion by Industry ─────────────────────────────────────────────
function ConversionTab() {
  const { data, isLoading } = useSWR("/api/analytics/conversion-by-industry", fetcher);
  if (isLoading) return <LoadingSkeleton />;
  const rows: { industry: string; total: number; converted: number; rate: number }[] = data?.rows ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Overall Conversion Rate</p>
            <p className="text-3xl font-bold text-green-600">{data?.overallRate ?? 0}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Leads</p>
            <p className="text-3xl font-bold">{data?.grandTotal ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Converted</p>
            <p className="text-3xl font-bold text-blue-600">{data?.grandConverted ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {rows.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Leads by Industry</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={rows} margin={{ top: 0, right: 16, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="industry" angle={-30} textAnchor="end" interval={0} tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" name="Total Leads" fill="#94a3b8" radius={[3, 3, 0, 0]} />
                <Bar dataKey="converted" name="Converted" fill="#22c55e" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Breakdown</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Industry</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Converted</TableHead>
                <TableHead className="text-right">Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No data</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.industry}>
                  <TableCell className="font-medium">{r.industry}</TableCell>
                  <TableCell className="text-right">{r.total}</TableCell>
                  <TableCell className="text-right">{r.converted}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={r.rate >= 50 ? "default" : "outline"} className={r.rate >= 50 ? "bg-green-600" : ""}>
                      {r.rate}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Revenue by Territory ────────────────────────────────────────────────
function RevenueTab() {
  const { data, isLoading } = useSWR("/api/analytics/revenue-by-territory", fetcher);
  if (isLoading) return <LoadingSkeleton />;
  const rows: { territory: string; revenue: number; deals: number; avgDeal: number }[] = data?.rows ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Revenue (Closed Won)</p>
            <p className="text-2xl font-bold text-green-600">{formatPHP(data?.totalRevenue ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Top Territory</p>
            <p className="text-xl font-bold truncate">{data?.topTerritory ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Overall Avg Deal</p>
            <p className="text-2xl font-bold">{formatPHP(data?.overallAvgDeal ?? 0)}</p>
          </CardContent>
        </Card>
      </div>

      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue by Territory (Department)</CardTitle>
            <p className="text-xs text-muted-foreground">Territory = department of the deal owner</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(200, rows.length * 48)}>
              <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 80, left: 80, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="territory" width={120} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => formatPHP(v as number)} />
                <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Breakdown</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Territory</TableHead>
                <TableHead className="text-right">Deals Closed</TableHead>
                <TableHead className="text-right">Total Revenue</TableHead>
                <TableHead className="text-right">Avg Deal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No closed-won deals yet</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.territory}>
                  <TableCell className="font-medium">{r.territory}</TableCell>
                  <TableCell className="text-right">{r.deals}</TableCell>
                  <TableCell className="text-right">{formatPHP(r.revenue)}</TableCell>
                  <TableCell className="text-right">{formatPHP(r.avgDeal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Visit-to-Close Ratio ────────────────────────────────────────────────
function VisitToCloseTab() {
  const { data, isLoading } = useSWR("/api/analytics/visit-to-close", fetcher);
  if (isLoading) return <LoadingSkeleton />;

  const bySource: { source: string; avg: number; count: number }[] = data?.bySource ?? [];
  const distribution: { visits: string; count: number }[] = data?.distribution ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">Avg Visits to Close</p>
            <p className="text-5xl font-extrabold text-blue-600">{data?.avgVisitsToClose ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">CRM interactions of type "visit" before conversion</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">Converted Leads Analysed</p>
            <p className="text-5xl font-extrabold">{data?.totalConverted ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {bySource.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Avg Visits to Close by Lead Source</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={bySource} margin={{ top: 0, right: 16, left: 0, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="source" angle={-20} textAnchor="end" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="avg" name="Avg Visits" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Close Distribution by Visit Count</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Visits to Close</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead>Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {distribution.map((d) => {
                const total = data?.totalConverted ?? 1;
                const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
                return (
                  <TableRow key={d.visits}>
                    <TableCell className="font-medium">{d.visits} visit{d.visits === "1" ? "" : "s"}</TableCell>
                    <TableCell className="text-right">{d.count}</TableCell>
                    <TableCell className="w-40">
                      <div className="flex items-center gap-2">
                        <Progress value={pct} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground w-8">{pct}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Coordinator Efficiency ──────────────────────────────────────────────
function EfficiencyTab() {
  const { data, isLoading } = useSWR("/api/analytics/coordinator-efficiency", fetcher);
  if (isLoading) return <LoadingSkeleton />;
  const rows: {
    user: { _id: string; firstName: string; lastName: string; avatar?: string };
    sessions: number;
    totalHours: number;
    avgSessionHours: number;
    tasksCompleted: number;
    efficiencyScore: number;
  }[] = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Field coordinators ranked by efficiency score (last 30 days).
        Score = sessions (40%) + tasks (40%) + avg session duration (20%), relative to team.
      </p>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No field coordinators found. Ensure users have roles with &quot;field&quot; in the slug.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Coordinator</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead className="text-right">Total Hours</TableHead>
                  <TableHead className="text-right">Avg h/session</TableHead>
                  <TableHead className="text-right">Tasks Done</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="w-32">Efficiency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={r.user._id}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">
                      {r.user.firstName} {r.user.lastName}
                    </TableCell>
                    <TableCell className="text-right">{r.sessions}</TableCell>
                    <TableCell className="text-right">{r.totalHours}h</TableCell>
                    <TableCell className="text-right">{r.avgSessionHours}h</TableCell>
                    <TableCell className="text-right">{r.tasksCompleted}</TableCell>
                    <TableCell className="text-right">
                      <ScoreBadge score={r.efficiencyScore} />
                    </TableCell>
                    <TableCell>
                      <Progress value={r.efficiencyScore} className="h-2" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Tab: Pipeline Aging ──────────────────────────────────────────────────────
const STAGE_COLORS: Record<string, string> = {
  prospect: "#94a3b8",
  contacted: "#60a5fa",
  meeting: "#a78bfa",
  proposal: "#f59e0b",
  negotiation: "#f97316",
};

function PipelineTab() {
  const { data, isLoading } = useSWR("/api/analytics/pipeline-aging", fetcher);
  if (isLoading) return <LoadingSkeleton />;
  const rows: { stage: string; count: number; totalValue: number; avgAgeDays: number; maxAgeDays: number }[] = data?.rows ?? [];

  return (
    <div className="space-y-6">
      {data?.hasStaleStage && (
        <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          One or more pipeline stages have deals ageing beyond 30 days. Review and follow up.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Open Pipeline Value</p>
            <p className="text-2xl font-bold">{formatPHP(data?.totalPipelineValue ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Open Deals</p>
            <p className="text-2xl font-bold">{data?.totalOpenDeals ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {rows.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Avg Days per Stage</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={rows} margin={{ top: 0, right: 16, left: 0, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" angle={-20} textAnchor="end" tick={{ fontSize: 12 }} />
                <YAxis unit="d" />
                <Tooltip formatter={(v) => [`${v} days`, "Avg Age"]} />
                <Bar dataKey="avgAgeDays" name="Avg Age (days)" radius={[3, 3, 0, 0]}>
                  {rows.map((r) => (
                    <Cell
                      key={r.stage}
                      fill={r.avgAgeDays > 30 ? "#ef4444" : (STAGE_COLORS[r.stage] ?? "#94a3b8")}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Stage Breakdown</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">Deals</TableHead>
                <TableHead className="text-right">Avg Age</TableHead>
                <TableHead className="text-right">Max Age</TableHead>
                <TableHead className="text-right">Pipeline Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No open deals</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.stage}>
                  <TableCell className="font-medium capitalize">{r.stage}</TableCell>
                  <TableCell className="text-right">{r.count}</TableCell>
                  <TableCell className="text-right">
                    <span className={r.avgAgeDays > 30 ? "text-red-600 font-semibold" : ""}>
                      {r.avgAgeDays}d
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={r.maxAgeDays > 30 ? "text-orange-600" : ""}>
                      {r.maxAgeDays}d
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{formatPHP(r.totalValue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>("conversion");

  return (
    <div>
      <PageHeader
        title="Advanced Analytics"
        description="Scaling-phase business intelligence across CRM, field, and pipeline data"
      />

      {/* Tab bar */}
      <div className="mb-6 flex flex-wrap gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === "conversion"     && <ConversionTab />}
      {tab === "revenue"        && <RevenueTab />}
      {tab === "visit-to-close" && <VisitToCloseTab />}
      {tab === "efficiency"     && <EfficiencyTab />}
      {tab === "pipeline"       && <PipelineTab />}
    </div>
  );
}
