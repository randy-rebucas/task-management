"use client";

import { useState, use } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Phone, Globe, MapPin, Edit2, Save, X, Trash2 } from "lucide-react";
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

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ClientDetailPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params);
  const router = useRouter();
  const { data: client, mutate } = useSWR(`/api/crm/clients/${clientId}`, fetcher);
  const { data: usersData } = useSWR("/api/users?limit=100&isActive=true", fetcher);
  const users = usersData?.data ?? usersData ?? [];

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  function startEdit() {
    if (!client) return;
    setForm({
      name: client.name || "",
      company: client.company || "",
      industry: client.industry || "",
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || "",
      website: client.website || "",
      assignedTo: client.assignedTo?._id || "",
      status: client.status || "active",
      notes: client.notes || "",
    });
    setEditing(true);
  }

  async function saveEdit() {
    setSaving(true);
    const res = await fetch(`/api/crm/clients/${clientId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, assignedTo: form.assignedTo || undefined }),
    });
    setSaving(false);
    if (!res.ok) { toast.error("Failed to update client"); return; }
    toast.success("Client updated");
    setEditing(false);
    mutate();
  }

  async function deleteClient() {
    if (!confirm("Delete this client permanently?")) return;
    await fetch(`/api/crm/clients/${clientId}`, { method: "DELETE" });
    toast.success("Client deleted");
    router.push("/crm/clients");
  }

  if (!client) return <div className="p-6 text-muted-foreground">Loading...</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href="/crm/clients"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">{client.name}</h1>
            {client.company && <p className="text-sm text-muted-foreground">{client.company}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          {!editing ? (
            <>
              <Button variant="outline" size="sm" onClick={startEdit}>
                <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
              <Button variant="destructive" size="sm" onClick={deleteClient}>
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
        <div className="md:col-span-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Client Details</CardTitle></CardHeader>
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
                    <Label>Industry</Label>
                    <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
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
                    <Label>Website</Label>
                    <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label>Address</Label>
                    <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                  <div className="space-y-1.5 col-span-2">
                    <Label>Notes</Label>
                    <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
                  </div>
                </div>
              ) : (
                <dl className="space-y-3">
                  {client.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${client.email}`} className="text-sm text-blue-600 hover:underline">{client.email}</a>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{client.phone}</span>
                    </div>
                  )}
                  {client.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <a href={client.website} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">{client.website}</a>
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{client.address}</span>
                    </div>
                  )}
                  {client.notes && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
                    </div>
                  )}
                </dl>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Properties</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <Badge className={client.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                  {client.status}
                </Badge>
              </div>
              {client.industry && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Industry</p>
                  <p className="text-sm">{client.industry}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Assigned To</p>
                <p className="text-sm">
                  {client.assignedTo ? `${client.assignedTo.firstName} ${client.assignedTo.lastName}` : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Created</p>
                <p className="text-sm">{new Date(client.createdAt).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
