"use client";

import { useState, use } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Phone, Building2, Edit2, Save, X, Trash2 } from "lucide-react";
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
import { LEAD_SOURCES, LEAD_STATUSES } from "@/config/constants";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function LeadDetailPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = use(params);
  const router = useRouter();
  const { data: lead, mutate } = useSWR(`/api/crm/leads/${leadId}`, fetcher);
  const { data: usersData } = useSWR("/api/users?limit=100&isActive=true", fetcher);
  const users = usersData?.data ?? usersData ?? [];

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  function startEdit() {
    if (!lead) return;
    setForm({
      name: lead.name || "",
      company: lead.company || "",
      email: lead.email || "",
      phone: lead.phone || "",
      source: lead.source || "referral",
      status: lead.status || "new",
      assignedTo: lead.assignedTo?._id || "",
      notes: lead.notes || "",
    });
    setEditing(true);
  }

  async function saveEdit() {
    setSaving(true);
    const res = await fetch(`/api/crm/leads/${leadId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, assignedTo: form.assignedTo || undefined }),
    });
    setSaving(false);
    if (!res.ok) { toast.error("Failed to update lead"); return; }
    toast.success("Lead updated");
    setEditing(false);
    mutate();
  }

  async function deleteLead() {
    if (!confirm("Delete this lead permanently?")) return;
    await fetch(`/api/crm/leads/${leadId}`, { method: "DELETE" });
    toast.success("Lead deleted");
    router.push("/crm/leads");
  }

  if (!lead) return <div className="p-6 text-muted-foreground">Loading...</div>;

  const statusCfg = LEAD_STATUSES.find((s) => s.value === lead.status);
  const sourceCfg = LEAD_SOURCES.find((s) => s.value === lead.source);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href="/crm/leads"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">{lead.name}</h1>
            {lead.company && <p className="text-sm text-muted-foreground">{lead.company}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          {!editing ? (
            <>
              <Button variant="outline" size="sm" onClick={startEdit}>
                <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
              <Button variant="destructive" size="sm" onClick={deleteLead}>
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
        {/* Details card */}
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Lead Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Name *</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Company</Label>
                    <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Source</Label>
                    <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LEAD_SOURCES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LEAD_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label>Notes</Label>
                    <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
                  </div>
                </div>
              ) : (
                <dl className="space-y-3">
                  {lead.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <a href={`mailto:${lead.email}`} className="text-sm text-blue-600 hover:underline">{lead.email}</a>
                    </div>
                  )}
                  {lead.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm">{lead.phone}</span>
                    </div>
                  )}
                  {lead.company && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm">{lead.company}</span>
                    </div>
                  )}
                  {lead.notes && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
                    </div>
                  )}
                </dl>
              )}
            </CardContent>
          </Card>

          {/* Converted client */}
          {lead.convertedToClient && (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardContent className="pt-4">
                <p className="text-sm text-emerald-800 font-medium">
                  Converted to client:{" "}
                  <Link href={`/crm/clients/${lead.convertedToClient._id}`} className="underline">
                    {lead.convertedToClient.name}
                  </Link>
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Properties</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <Badge className={statusCfg?.color || "bg-gray-100 text-gray-800"}>
                  {statusCfg?.label || lead.status}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Source</p>
                <p className="text-sm">{sourceCfg?.label || lead.source}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Assigned To</p>
                <p className="text-sm">
                  {lead.assignedTo
                    ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}`
                    : "—"}
                </p>
              </div>
              {editing && (
                <div className="space-y-1.5">
                  <Label>Assigned To</Label>
                  <Select value={form.assignedTo || "none"} onValueChange={(v) => setForm({ ...form, assignedTo: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {users.map((u: any) => (
                        <SelectItem key={u._id} value={u._id}>{u.firstName} {u.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Created</p>
                <p className="text-sm">{new Date(lead.createdAt).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
