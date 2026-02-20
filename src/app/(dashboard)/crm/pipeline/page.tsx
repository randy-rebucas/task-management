"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Plus, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEAL_STAGES } from "@/config/constants";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatCurrency(value: number) {
  if (value >= 1_000_000) return `₱${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `₱${(value / 1_000).toFixed(0)}k`;
  return `₱${value}`;
}

export default function PipelinePage() {
  const { data: pipeline, mutate } = useSWR("/api/crm/pipeline", fetcher);
  const { data: leadsData } = useSWR("/api/crm/leads?limit=100", fetcher);
  const { data: clientsData } = useSWR("/api/crm/clients?limit=100", fetcher);
  const { data: usersData } = useSWR("/api/users?limit=100&isActive=true", fetcher);
  const stages = pipeline ?? [];
  const leads = leadsData?.data ?? [];
  const clients = clientsData?.data ?? [];
  const users = usersData?.data ?? usersData ?? [];

  const [createOpen, setCreateOpen] = useState(false);
  const [stageFilter, setStageFilter] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    stage: "prospect",
    value: "",
    probability: "",
    lead: "",
    client: "",
    assignedTo: "",
    expectedCloseDate: "",
    notes: "",
  });

  // For quick stage update on a deal
  async function updateDealStage(dealId: string, stage: string) {
    const res = await fetch(`/api/crm/deals/${dealId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    if (!res.ok) { toast.error("Failed to update stage"); return; }
    mutate();
  }

  async function createDeal() {
    if (!form.title) { toast.error("Title is required"); return; }
    setSaving(true);
    const res = await fetch("/api/crm/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        stage: form.stage,
        value: form.value ? Number(form.value) : 0,
        probability: form.probability ? Number(form.probability) : 0,
        lead: form.lead || undefined,
        client: form.client || undefined,
        assignedTo: form.assignedTo || undefined,
        expectedCloseDate: form.expectedCloseDate || undefined,
        notes: form.notes || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) { toast.error("Failed to create deal"); return; }
    toast.success("Deal created");
    setCreateOpen(false);
    setForm({ title: "", stage: "prospect", value: "", probability: "", lead: "", client: "", assignedTo: "", expectedCloseDate: "", notes: "" });
    mutate();
  }

  return (
    <div className="p-6 space-y-4 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sales Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            {stages.reduce((s: number, st: any) => s + st.count, 0)} deals ·{" "}
            ₱{(stages.reduce((s: number, st: any) => s + st.totalValue, 0) / 1_000_000).toFixed(1)}M total value
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Deal
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: "calc(100vh - 200px)" }}>
        {DEAL_STAGES.map((stageCfg) => {
          const stageData = stages.find((s: any) => s.stage === stageCfg.value);
          const deals = stageData?.deals ?? [];
          return (
            <div
              key={stageCfg.value}
              className="flex-shrink-0 w-64 flex flex-col"
            >
              {/* Column header */}
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <Badge className={stageCfg.color}>{stageCfg.label}</Badge>
                  <span className="text-xs text-muted-foreground font-medium">{deals.length}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(stageData?.totalValue ?? 0)}
                </p>
              </div>

              {/* Deal cards */}
              <div className="flex-1 space-y-2">
                {deals.map((deal: any) => (
                  <Card key={deal._id} className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="p-3 pb-1">
                      <Link href={`/crm/deals/${deal._id}`} className="hover:underline">
                        <CardTitle className="text-sm font-medium leading-tight">{deal.title}</CardTitle>
                      </Link>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 space-y-2">
                      {(deal.lead || deal.client) && (
                        <p className="text-xs text-muted-foreground truncate">
                          {deal.client?.name || deal.lead?.name}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-green-700 flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {formatCurrency(deal.value || 0)}
                        </span>
                        <span className="text-xs text-muted-foreground">{deal.probability ?? 0}%</span>
                      </div>
                      {deal.assignedTo && (
                        <p className="text-xs text-muted-foreground">
                          {deal.assignedTo.firstName} {deal.assignedTo.lastName}
                        </p>
                      )}
                      {/* Quick stage change */}
                      <Select
                        value={deal.stage}
                        onValueChange={(v) => updateDealStage(deal._id, v)}
                      >
                        <SelectTrigger className="h-6 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DEAL_STAGES.map((s) => (
                            <SelectItem key={s.value} value={s.value} className="text-xs">
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>
                ))}
                {deals.length === 0 && (
                  <div className="border-2 border-dashed rounded-lg p-4 text-center text-xs text-muted-foreground">
                    No deals
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Deal Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Deal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Deal title" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Stage</Label>
                <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEAL_STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Value (₱)</Label>
                <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Probability (%)</Label>
                <Input type="number" min="0" max="100" value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Expected Close</Label>
                <Input type="date" value={form.expectedCloseDate} onChange={(e) => setForm({ ...form, expectedCloseDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Lead</Label>
                <Select value={form.lead || "none"} onValueChange={(v) => setForm({ ...form, lead: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {leads.map((l: any) => <SelectItem key={l._id} value={l._id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Client</Label>
                <Select value={form.client || "none"} onValueChange={(v) => setForm({ ...form, client: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {clients.map((c: any) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Assigned To</Label>
                <Select value={form.assignedTo || "none"} onValueChange={(v) => setForm({ ...form, assignedTo: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {users.map((u: any) => <SelectItem key={u._id} value={u._id}>{u.firstName} {u.lastName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createDeal} disabled={saving}>{saving ? "Saving..." : "Create Deal"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
