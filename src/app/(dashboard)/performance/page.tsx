"use client";

import { useState } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import {
  Trophy, TrendingUp, DollarSign, Target, CheckCircle2, Users,
  Pencil, Save, X, Plus, Trash2, ChevronUp, ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatPHP(n: number | undefined | null) {
  return `₱${(n ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function AchievementBar({ label, actual, target, format: fmt = (n: number) => String(n) }: {
  label: string;
  actual: number;
  target: number | null;
  format?: (n: number) => string;
}) {
  if (!target) return null;
  const pct = Math.min(Math.round((actual / target) * 100), 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{fmt(actual)} / {fmt(target)} ({pct}%)</span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? "bg-green-100 text-green-800" :
    score >= 60 ? "bg-blue-100 text-blue-800" :
    score >= 40 ? "bg-yellow-100 text-yellow-800" :
    "bg-red-100 text-red-800";
  return <Badge className={`text-sm px-2 py-0.5 ${color}`}>{score}/100</Badge>;
}

export default function PerformancePage() {
  const { data: session } = useSession();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [userId, setUserId] = useState("");

  const { data: usersData } = useSWR("/api/users?limit=100&isActive=true", fetcher);
  const users = usersData?.data ?? usersData ?? [];

  const targetUserId = userId || session?.user?.id || "";
  const summaryKey = targetUserId
    ? `/api/performance/summary?month=${month}&year=${year}&userId=${targetUserId}`
    : null;
  const { data: summary, mutate: mutateSummary } = useSWR(summaryKey, fetcher);

  const { data: rulesData, mutate: mutateRules } = useSWR("/api/performance/rules", fetcher);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rules: any[] = Array.isArray(rulesData) ? rulesData : [];

  // Target editing
  const [editingTargets, setEditingTargets] = useState(false);
  const [targetForm, setTargetForm] = useState({
    targetRevenue: 0, targetDeals: 0, targetTasks: 0, targetLeads: 0,
  });
  const [savingTargets, setSavingTargets] = useState(false);

  function startEditTargets() {
    const t = summary?.target;
    setTargetForm({
      targetRevenue: t?.targetRevenue ?? 0,
      targetDeals: t?.targetDeals ?? 0,
      targetTasks: t?.targetTasks ?? 0,
      targetLeads: t?.targetLeads ?? 0,
    });
    setEditingTargets(true);
  }

  async function saveTargets() {
    setSavingTargets(true);
    const res = await fetch("/api/performance/targets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user: targetUserId,
        month,
        year,
        ...targetForm,
      }),
    });
    setSavingTargets(false);
    if (!res.ok) { toast.error("Failed to save targets"); return; }
    toast.success("Targets saved");
    setEditingTargets(false);
    mutateSummary();
  }

  // Commission rule form
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [ruleForm, setRuleForm] = useState({
    department: "", jobTitle: "", dealCommissionRate: 5, leadConversionBonus: 0,
    bonusThresholds: [{ minScore: 80, bonusAmount: 1000 }],
  });
  const [savingRule, setSavingRule] = useState(false);

  async function saveRule() {
    setSavingRule(true);
    const res = await fetch("/api/performance/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        department: ruleForm.department || undefined,
        jobTitle: ruleForm.jobTitle || undefined,
        dealCommissionRate: ruleForm.dealCommissionRate,
        leadConversionBonus: ruleForm.leadConversionBonus,
        bonusThresholds: ruleForm.bonusThresholds,
      }),
    });
    setSavingRule(false);
    if (!res.ok) { toast.error("Failed to save rule"); return; }
    toast.success("Commission rule saved");
    setShowRuleForm(false);
    mutateRules();
    mutateSummary();
  }

  async function deleteRule(id: string) {
    if (!confirm("Delete this commission rule?")) return;
    await fetch(`/api/performance/rules/${id}`, { method: "DELETE" });
    toast.success("Rule deleted");
    mutateRules();
    mutateSummary();
  }

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
  const trendData = summary?.monthlyTrend ?? [];

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <h1 className="text-xl font-bold">Performance & Incentives</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v))}>
            <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
            <SelectTrigger className="w-24 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={userId || "self"} onValueChange={(v) => setUserId(v === "self" ? "" : v)}>
            <SelectTrigger className="w-44 h-8 text-sm"><SelectValue placeholder="Select user" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="self">My Performance</SelectItem>
              {users.map((u: { _id: string; firstName: string; lastName: string }) => (
                <SelectItem key={u._id} value={u._id}>{u.firstName} {u.lastName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!summary ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="commission">Commission</TabsTrigger>
            <TabsTrigger value="targets">Targets</TabsTrigger>
            <TabsTrigger value="summary">Monthly Summary</TabsTrigger>
            <TabsTrigger value="rules">Commission Rules</TabsTrigger>
          </TabsList>

          {/* ── OVERVIEW ── */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <p className="text-xs text-muted-foreground">Commission Earned</p>
                  </div>
                  <p className="text-xl font-bold text-green-700">{formatPHP(summary.commissionEarned)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{summary.commissionRate}% of {formatPHP(summary.dealRevenue)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    <p className="text-xs text-muted-foreground">Score Bonus</p>
                  </div>
                  <p className="text-xl font-bold text-yellow-700">{formatPHP(summary.scoreBonus)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Score: {summary.performanceScore}/100</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <p className="text-xs text-muted-foreground">Total Incentive</p>
                  </div>
                  <p className="text-xl font-bold text-blue-700">{formatPHP(summary.totalIncentive)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Commission + Bonuses</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="h-4 w-4 text-purple-600" />
                    <p className="text-xs text-muted-foreground">KPI Score</p>
                  </div>
                  <div className="mt-1">
                    <ScoreBadge score={summary.performanceScore} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{summary.tasksCompleted} tasks completed</p>
                </CardContent>
              </Card>
            </div>

            {/* Activity summary */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">Activity Metrics</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tasks Completed</span>
                    <span className="font-medium">{summary.tasksCompleted} / {summary.tasksAssigned}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Overdue Tasks</span>
                    <span className={`font-medium ${summary.tasksOverdue > 0 ? "text-red-600" : "text-green-600"}`}>
                      {summary.tasksOverdue}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Deals Closed</span>
                    <span className="font-medium">{summary.dealsClosed}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Deal Revenue</span>
                    <span className="font-medium">{formatPHP(summary.dealRevenue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">New Leads</span>
                    <span className="font-medium">{summary.newLeads}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Completion Rate</span>
                    <span className="font-medium">{summary.completionRate}%</span>
                  </div>
                </CardContent>
              </Card>

              {summary.target && (
                <Card>
                  <CardHeader><CardTitle className="text-sm">Target vs Actual</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <AchievementBar
                      label="Revenue"
                      actual={summary.dealRevenue}
                      target={summary.target.targetRevenue}
                      format={formatPHP}
                    />
                    <AchievementBar
                      label="Deals Closed"
                      actual={summary.dealsClosed}
                      target={summary.target.targetDeals}
                    />
                    <AchievementBar
                      label="Tasks Completed"
                      actual={summary.tasksCompleted}
                      target={summary.target.targetTasks}
                    />
                    <AchievementBar
                      label="New Leads"
                      actual={summary.newLeads}
                      target={summary.target.targetLeads}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ── COMMISSION ── */}
          <TabsContent value="commission" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Commission Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Deal Revenue ({MONTHS[month - 1]} {year})</span>
                    <span className="font-semibold">{formatPHP(summary.dealRevenue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Commission Rate</span>
                    <span className="font-semibold">{summary.commissionRate}%</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="font-medium">Commission Earned</span>
                    <span className="font-bold text-green-700">{formatPHP(summary.commissionEarned)}</span>
                  </div>
                </div>

                {summary.leadBonus > 0 && (
                  <div className="flex justify-between text-sm rounded-lg bg-blue-50 p-3">
                    <span className="text-muted-foreground">Lead Conversion Bonus ({summary.newLeads} leads × ₱{summary.rule?.leadConversionBonus})</span>
                    <span className="font-semibold text-blue-700">{formatPHP(summary.leadBonus)}</span>
                  </div>
                )}

                {summary.scoreBonus > 0 && (
                  <div className="flex justify-between text-sm rounded-lg bg-yellow-50 p-3">
                    <span className="text-muted-foreground">Score Bonus (KPI {summary.performanceScore}/100)</span>
                    <span className="font-semibold text-yellow-700">{formatPHP(summary.scoreBonus)}</span>
                  </div>
                )}

                <div className="flex justify-between text-base font-bold border-t pt-3">
                  <span>Total Incentive</span>
                  <span className="text-blue-700">{formatPHP(summary.totalIncentive)}</span>
                </div>

                {summary.rule?.bonusThresholds?.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">BONUS THRESHOLDS</p>
                    <div className="space-y-1">
                      {summary.rule.bonusThresholds
                        .slice()
                        .sort((a: { minScore: number }, b: { minScore: number }) => a.minScore - b.minScore)
                        .map((t: { minScore: number; bonusAmount: number }, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <Badge
                              variant="outline"
                              className={summary.performanceScore >= t.minScore ? "border-green-500 text-green-700" : ""}
                            >
                              Score ≥ {t.minScore}
                            </Badge>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-medium">{formatPHP(t.bonusAmount)} bonus</span>
                            {summary.performanceScore >= t.minScore && (
                              <CheckCircle2 className="h-3 w-3 text-green-600" />
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {!summary.rule && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No commission rule configured for this user. Default 5% rate applied.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TARGETS ── */}
          <TabsContent value="targets" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Monthly Targets — {MONTHS[month - 1]} {year}</CardTitle>
                  {!editingTargets ? (
                    <Button size="sm" variant="outline" onClick={startEditTargets}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> {summary.target ? "Edit" : "Set Targets"}
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditingTargets(false)}>
                        <X className="h-3.5 w-3.5 mr-1" /> Cancel
                      </Button>
                      <Button size="sm" onClick={saveTargets} disabled={savingTargets}>
                        <Save className="h-3.5 w-3.5 mr-1" /> {savingTargets ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {editingTargets ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Revenue Target (₱)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={targetForm.targetRevenue}
                        onChange={(e) => setTargetForm({ ...targetForm, targetRevenue: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Deals Target (count)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={targetForm.targetDeals}
                        onChange={(e) => setTargetForm({ ...targetForm, targetDeals: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Tasks Target (count)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={targetForm.targetTasks}
                        onChange={(e) => setTargetForm({ ...targetForm, targetTasks: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Leads Target (count)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={targetForm.targetLeads}
                        onChange={(e) => setTargetForm({ ...targetForm, targetLeads: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                ) : summary.target ? (
                  <div className="space-y-4">
                    <AchievementBar
                      label="Revenue"
                      actual={summary.dealRevenue}
                      target={summary.target.targetRevenue}
                      format={formatPHP}
                    />
                    <AchievementBar
                      label="Deals Closed"
                      actual={summary.dealsClosed}
                      target={summary.target.targetDeals}
                    />
                    <AchievementBar
                      label="Tasks Completed"
                      actual={summary.tasksCompleted}
                      target={summary.target.targetTasks}
                    />
                    <AchievementBar
                      label="New Leads"
                      actual={summary.newLeads}
                      target={summary.target.targetLeads}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No targets set for this period. Click &quot;Set Targets&quot; to add them.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── MONTHLY SUMMARY ── */}
          <TabsContent value="summary" className="space-y-4 mt-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Last 6 Months — Productivity & Incentive Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={trendData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey={(d) => `${MONTHS[d.month - 1].slice(0, 3)} ${d.year}`}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: number | string | undefined, name: string | undefined) => {
                        const n = typeof value === "number" ? value : parseFloat(String(value ?? 0)) || 0;
                        if (name === "totalIncentive" || name === "commissionEarned") return [formatPHP(n), name ?? ""];
                        return [n, name ?? ""];
                      }}
                    />
                    <Legend />
                    <Bar dataKey="tasksCompleted" name="Tasks Done" fill="#6366f1" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="dealsClosed" name="Deals" fill="#22c55e" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="totalIncentive" name="totalIncentive" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Summary table */}
            <Card>
              <CardContent className="pt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground uppercase">
                        <th className="text-left py-2 pr-4">Month</th>
                        <th className="text-right py-2 px-2">Tasks</th>
                        <th className="text-right py-2 px-2">Deals</th>
                        <th className="text-right py-2 px-2">Revenue</th>
                        <th className="text-right py-2 px-2">Commission</th>
                        <th className="text-right py-2 px-2">Bonus</th>
                        <th className="text-right py-2 pl-2">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {trendData.map((row: {
                        month: number; year: number; tasksCompleted: number;
                        dealsClosed: number; dealRevenue: number; commissionEarned: number;
                        scoreBonus: number; leadBonus: number; totalIncentive: number; performanceScore: number;
                      }, i: number) => {
                        const isCurrent = row.month === month && row.year === year;
                        return (
                          <tr key={i} className={isCurrent ? "bg-blue-50 font-semibold" : ""}>
                            <td className="py-2 pr-4">{MONTHS[row.month - 1].slice(0, 3)} {row.year}</td>
                            <td className="text-right py-2 px-2">{row.tasksCompleted}</td>
                            <td className="text-right py-2 px-2">{row.dealsClosed}</td>
                            <td className="text-right py-2 px-2">{formatPHP(row.dealRevenue)}</td>
                            <td className="text-right py-2 px-2 text-green-700">{formatPHP(row.commissionEarned)}</td>
                            <td className="text-right py-2 px-2 text-yellow-700">{formatPHP(row.scoreBonus + row.leadBonus)}</td>
                            <td className="text-right py-2 pl-2 text-blue-700">{formatPHP(row.totalIncentive)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── COMMISSION RULES ── */}
          <TabsContent value="rules" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground">Commission Rules</h3>
              <Button size="sm" variant="outline" onClick={() => setShowRuleForm(!showRuleForm)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Rule
              </Button>
            </div>

            {showRuleForm && (
              <Card>
                <CardContent className="pt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Department (optional)</Label>
                      <Select value={ruleForm.department || "none"} onValueChange={(v) => setRuleForm({ ...ruleForm, department: v === "none" ? "" : v })}>
                        <SelectTrigger><SelectValue placeholder="Any department" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Any department</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Job Title (optional)</Label>
                      <Input
                        value={ruleForm.jobTitle}
                        onChange={(e) => setRuleForm({ ...ruleForm, jobTitle: e.target.value })}
                        placeholder="e.g. Sales Agent"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Deal Commission Rate (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={ruleForm.dealCommissionRate}
                        onChange={(e) => setRuleForm({ ...ruleForm, dealCommissionRate: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Lead Conversion Bonus (₱ per lead)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={ruleForm.leadConversionBonus}
                        onChange={(e) => setRuleForm({ ...ruleForm, leadConversionBonus: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Bonus Thresholds (KPI Score → Bonus)</Label>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => setRuleForm({
                          ...ruleForm,
                          bonusThresholds: [...ruleForm.bonusThresholds, { minScore: 90, bonusAmount: 2000 }],
                        })}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Add
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {ruleForm.bonusThresholds.map((t, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <span className="text-xs text-muted-foreground w-16">Score ≥</span>
                          <Input
                            type="number"
                            className="h-8 w-20"
                            value={t.minScore}
                            onChange={(e) => {
                              const updated = [...ruleForm.bonusThresholds];
                              updated[i] = { ...updated[i], minScore: parseInt(e.target.value) || 0 };
                              setRuleForm({ ...ruleForm, bonusThresholds: updated });
                            }}
                          />
                          <span className="text-xs text-muted-foreground">→ Bonus ₱</span>
                          <Input
                            type="number"
                            className="h-8 flex-1"
                            value={t.bonusAmount}
                            onChange={(e) => {
                              const updated = [...ruleForm.bonusThresholds];
                              updated[i] = { ...updated[i], bonusAmount: parseFloat(e.target.value) || 0 };
                              setRuleForm({ ...ruleForm, bonusThresholds: updated });
                            }}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setRuleForm({
                              ...ruleForm,
                              bonusThresholds: ruleForm.bonusThresholds.filter((_, j) => j !== i),
                            })}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => setShowRuleForm(false)}>Cancel</Button>
                    <Button size="sm" onClick={saveRule} disabled={savingRule}>{savingRule ? "Saving..." : "Save Rule"}</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {!rules ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : rules.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No commission rules yet. Add one above.</p>
            ) : (
              <div className="space-y-3">
                {rules.map((rule: {
                  _id: string;
                  department?: { name: string };
                  jobTitle?: string;
                  dealCommissionRate: number;
                  leadConversionBonus: number;
                  bonusThresholds: Array<{ minScore: number; bonusAmount: number }>;
                  isActive: boolean;
                  createdAt: string;
                }) => (
                  <Card key={rule._id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {rule.department && <Badge variant="outline">{rule.department.name}</Badge>}
                            {rule.jobTitle && <Badge variant="outline">{rule.jobTitle}</Badge>}
                            {!rule.department && !rule.jobTitle && <Badge variant="outline">Default (All Users)</Badge>}
                            {!rule.isActive && <Badge className="bg-gray-100 text-gray-600">Inactive</Badge>}
                          </div>
                          <div className="flex gap-4 text-sm mt-2 flex-wrap">
                            <span className="text-muted-foreground">
                              Deal Rate: <span className="font-medium text-foreground">{rule.dealCommissionRate}%</span>
                            </span>
                            {rule.leadConversionBonus > 0 && (
                              <span className="text-muted-foreground">
                                Lead Bonus: <span className="font-medium text-foreground">{formatPHP(rule.leadConversionBonus)}</span>
                              </span>
                            )}
                          </div>
                          {rule.bonusThresholds?.length > 0 && (
                            <div className="flex gap-2 flex-wrap mt-1">
                              {rule.bonusThresholds.map((t, i) => (
                                <span key={i} className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 rounded px-1.5 py-0.5">
                                  ≥{t.minScore} → {formatPHP(t.bonusAmount)}
                                </span>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">Created {format(new Date(rule.createdAt), "MMM d, yyyy")}</p>
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive flex-shrink-0"
                          onClick={() => deleteRule(rule._id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
