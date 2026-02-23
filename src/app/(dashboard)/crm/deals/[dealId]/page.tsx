"use client";

import { useState, use } from "react";
import useSWR from "@/lib/swr-compat";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit2, Save, X, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEAL_STAGES } from "@/config/constants";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function DealDetailPage({ params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = use(params);
  const router = useRouter();
  const { data, mutate } = useSWR(`/api/crm/deals/${dealId}`, fetcher);
  const { data: leadsData } = useSWR("/api/crm/leads?limit=100", fetcher);
  const { data: clientsData } = useSWR("/api/crm/clients?limit=100", fetcher);
  const { data: usersData } = useSWR("/api/users?limit=100&isActive=true", fetcher);
  const leads = leadsData?.data ?? [];
  const clients = clientsData?.data ?? [];
  const users = usersData?.data ?? usersData ?? [];

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const deal = data ? (({ tasks: _, ...rest }) => rest)(data) : null;
  const tasks = data?.tasks ?? [];

  function startEdit() {
    if (!deal) return;
    setForm({
      title: deal.title || "",
      stage: deal.stage || "prospect",
      value: String(deal.value || 0),
      probability: String(deal.probability || 0),
      lead: deal.lead?._id || "",
      client: deal.client?._id || "",
      assignedTo: deal.assignedTo?._id || "",
      expectedCloseDate: deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toISOString().slice(0, 10) : "",
      notes: deal.notes || "",
    });
    setEditing(true);
  }

  async function saveEdit() {
    setSaving(true);
    const res = await fetch(`/api/crm/deals/${dealId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        value: Number(form.value),
        probability: Number(form.probability),
        lead: form.lead || undefined,
        client: form.client || undefined,
        assignedTo: form.assignedTo || undefined,
        expectedCloseDate: form.expectedCloseDate || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) { toast.error("Failed to update deal"); return; }
    toast.success("Deal updated");
    setEditing(false);
    mutate();
  }

  async function deleteDeal() {
    await fetch(`/api/crm/deals/${dealId}`, { method: "DELETE" });
    toast.success("Deal deleted");
    router.push("/crm/pipeline");
  }

  if (!data) return <div className="p-6 text-muted-foreground">Loading...</div>;

  const stageCfg = DEAL_STAGES.find((s) => s.value === deal?.stage);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href="/crm/pipeline"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">{deal?.title}</h1>
            <Badge className={stageCfg?.color || "bg-gray-100 text-gray-800"}>
              {stageCfg?.label || deal?.stage}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {!editing ? (
            <>
              <Button variant="outline" size="sm" onClick={startEdit}>
                <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                <X className="h-3.5 w-3.5 mr-1" /> Cancel
              </Button>
              <Button size="sm" onClick={saveEdit} disabled={saving}>
                <Save className="h-3.5 w-3.5 mr-1" /> {saving ? "Saving..." : "Save"}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-4">
          {editing ? (
            <Card>
              <CardHeader><CardTitle className="text-base">Edit Deal</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2">
                    <Label>Title *</Label>
                    <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  </div>
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
                    <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Probability (%)</Label>
                    <Input type="number" min="0" max="100" value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} />
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
                    <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : deal?.notes ? (
            <Card>
              <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{deal.notes}</p>
              </CardContent>
            </Card>
          ) : null}

          {/* Associated tasks */}
          {tasks.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Related Tasks ({tasks.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {tasks.map((task: any) => (
                  <Link
                    key={task._id}
                    href={`/tasks/${task._id}`}
                    className="flex items-center justify-between p-2 rounded hover:bg-muted/50"
                  >
                    <div>
                      <span className="text-xs font-mono text-muted-foreground mr-2">{task.taskNumber}</span>
                      <span className="text-sm">{task.title}</span>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Deal Info</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Value</p>
                <p className="text-lg font-bold text-green-700">₱{(deal?.value || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Probability</p>
                <p className="text-sm">{deal?.probability ?? 0}%</p>
              </div>
              {deal?.expectedCloseDate && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Expected Close</p>
                  <p className="text-sm">{new Date(deal.expectedCloseDate).toLocaleDateString()}</p>
                </div>
              )}
              {deal?.lead && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Lead</p>
                  <Link href={`/crm/leads/${deal.lead._id}`} className="text-sm text-blue-600 hover:underline">
                    {deal.lead.name}
                  </Link>
                </div>
              )}
              {deal?.client && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Client</p>
                  <Link href={`/crm/clients/${deal.client._id}`} className="text-sm text-blue-600 hover:underline">
                    {deal.client.name}
                  </Link>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Assigned To</p>
                <p className="text-sm">
                  {deal?.assignedTo ? `${deal.assignedTo.firstName} ${deal.assignedTo.lastName}` : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Created</p>
                <p className="text-sm">{deal?.createdAt ? new Date(deal.createdAt).toLocaleDateString() : "—"}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this deal? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={deleteDeal}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
