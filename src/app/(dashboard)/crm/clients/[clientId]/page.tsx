"use client";

import { useState, use } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Mail, Phone, Globe, MapPin, Edit2, Save, X, Trash2,
  Phone as PhoneIcon, Mail as MailIcon, Video, FileText, MapPin as VisitIcon,
  Plus, Download, Paperclip, CalendarDays, Clock, User,
} from "lucide-react";
import { format, isPast, isToday, parseISO } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const INTERACTION_ICONS: Record<string, React.ReactNode> = {
  call:    <PhoneIcon className="h-4 w-4 text-green-600" />,
  email:   <MailIcon className="h-4 w-4 text-blue-600" />,
  meeting: <Video className="h-4 w-4 text-purple-600" />,
  note:    <FileText className="h-4 w-4 text-yellow-600" />,
  visit:   <VisitIcon className="h-4 w-4 text-orange-600" />,
};

const DOC_TYPE_COLORS: Record<string, string> = {
  proposal: "bg-blue-100 text-blue-800",
  contract: "bg-green-100 text-green-800",
  other:    "bg-gray-100 text-gray-700",
};

function formatBytes(bytes?: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ClientDetailPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params);
  const router = useRouter();
  const { data: client, mutate } = useSWR(`/api/crm/clients/${clientId}`, fetcher);
  const { data: usersData } = useSWR("/api/users?limit=100&isActive=true", fetcher);
  const { data: interactions, mutate: mutateInteractions } = useSWR(
    `/api/crm/clients/${clientId}/interactions`, fetcher
  );
  const { data: attachments, mutate: mutateAttachments } = useSWR(
    `/api/crm/clients/${clientId}/attachments`, fetcher
  );
  const users = usersData?.data ?? usersData ?? [];

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const [showLogForm, setShowLogForm] = useState(false);
  const [logForm, setLogForm] = useState({ type: "call", date: "", summary: "", outcome: "", nextAction: "" });
  const [loggingInteraction, setLoggingInteraction] = useState(false);

  const [followUpDate, setFollowUpDate] = useState("");
  const [savingFollowUp, setSavingFollowUp] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [pendingDeleteAttachmentId, setPendingDeleteAttachmentId] = useState<string | null>(null);

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
      contactPersonName: client.contactPersonName || "",
      contactPersonTitle: client.contactPersonTitle || "",
      contactPersonPhone: client.contactPersonPhone || "",
      assignedTo: client.assignedTo?._id || "",
      status: client.status || "active",
      notes: client.notes || "",
    });
    setFollowUpDate(client.followUpDate ? client.followUpDate.substring(0, 10) : "");
    setEditing(true);
  }

  async function saveEdit() {
    setSaving(true);
    const res = await fetch(`/api/crm/clients/${clientId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        assignedTo: form.assignedTo || undefined,
        followUpDate: followUpDate || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) { toast.error("Failed to update client"); return; }
    toast.success("Client updated");
    setEditing(false);
    mutate();
  }

  async function saveFollowUp() {
    setSavingFollowUp(true);
    const res = await fetch(`/api/crm/clients/${clientId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ followUpDate: followUpDate || null }),
    });
    setSavingFollowUp(false);
    if (!res.ok) { toast.error("Failed to save follow-up date"); return; }
    toast.success("Follow-up date saved");
    mutate();
  }

  async function deleteClient() {
    await fetch(`/api/crm/clients/${clientId}`, { method: "DELETE" });
    toast.success("Client deleted");
    router.push("/crm/clients");
  }

  async function logInteraction() {
    if (!logForm.date || !logForm.summary) { toast.error("Date and summary are required"); return; }
    setLoggingInteraction(true);
    const res = await fetch(`/api/crm/clients/${clientId}/interactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(logForm),
    });
    setLoggingInteraction(false);
    if (!res.ok) { toast.error("Failed to log interaction"); return; }
    toast.success("Interaction logged");
    setShowLogForm(false);
    setLogForm({ type: "call", date: "", summary: "", outcome: "", nextAction: "" });
    mutateInteractions();
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const { url } = await uploadRes.json();

      await fetch(`/api/crm/clients/${clientId}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileUrl: url,
          fileSize: file.size,
          mimeType: file.type,
          documentType: "other",
        }),
      });
      toast.success("File uploaded");
      mutateAttachments();
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function deleteAttachment(id: string) {
    await fetch(`/api/crm/clients/${clientId}/attachments?id=${id}`, { method: "DELETE" });
    toast.success("Attachment deleted");
    mutateAttachments();
  }

  if (!client) return <div className="p-6 text-muted-foreground">Loading...</div>;

  const followUpISO = client.followUpDate ? client.followUpDate.substring(0, 10) : null;
  const followUpParsed = followUpISO ? parseISO(followUpISO) : null;
  const followUpOverdue = followUpParsed && isPast(followUpParsed) && !isToday(followUpParsed);

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
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
        {/* Main content with tabs */}
        <div className="md:col-span-2">
          <Tabs defaultValue="overview">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="interactions">
                Interactions {interactions?.length ? `(${interactions.length})` : ""}
              </TabsTrigger>
              <TabsTrigger value="documents">
                Documents {attachments?.length ? `(${attachments.length})` : ""}
              </TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="space-y-4">
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
                        <Label>Contact Person Name</Label>
                        <Input value={form.contactPersonName} onChange={(e) => setForm({ ...form, contactPersonName: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Contact Person Title</Label>
                        <Input value={form.contactPersonTitle} onChange={(e) => setForm({ ...form, contactPersonTitle: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Contact Person Phone</Label>
                        <Input value={form.contactPersonPhone} onChange={(e) => setForm({ ...form, contactPersonPhone: e.target.value })} />
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
                            {users.map((u: { _id: string; firstName: string; lastName: string }) => (
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
                      {(client.contactPersonName || client.contactPersonTitle || client.contactPersonPhone) && (
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground mb-1">Contact Person</p>
                          {client.contactPersonName && <p className="text-sm font-medium">{client.contactPersonName}</p>}
                          {client.contactPersonTitle && <p className="text-xs text-muted-foreground">{client.contactPersonTitle}</p>}
                          {client.contactPersonPhone && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Phone className="h-3 w-3" /> {client.contactPersonPhone}
                            </p>
                          )}
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
            </TabsContent>

            {/* Interactions */}
            <TabsContent value="interactions" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground">Interaction History</h3>
                <Button size="sm" variant="outline" onClick={() => setShowLogForm(!showLogForm)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Log Interaction
                </Button>
              </div>

              {showLogForm && (
                <Card>
                  <CardContent className="pt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Type</Label>
                        <Select value={logForm.type} onValueChange={(v) => setLogForm({ ...logForm, type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="call">Call</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="meeting">Meeting</SelectItem>
                            <SelectItem value="note">Note</SelectItem>
                            <SelectItem value="visit">Visit</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Date *</Label>
                        <Input type="datetime-local" value={logForm.date} onChange={(e) => setLogForm({ ...logForm, date: e.target.value })} />
                      </div>
                      <div className="space-y-1.5 col-span-2">
                        <Label>Summary *</Label>
                        <Textarea value={logForm.summary} onChange={(e) => setLogForm({ ...logForm, summary: e.target.value })} rows={2} placeholder="What happened?" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Outcome</Label>
                        <Input value={logForm.outcome} onChange={(e) => setLogForm({ ...logForm, outcome: e.target.value })} placeholder="Result of this interaction" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Next Action</Label>
                        <Input value={logForm.nextAction} onChange={(e) => setLogForm({ ...logForm, nextAction: e.target.value })} placeholder="Follow-up action" />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={() => setShowLogForm(false)}>Cancel</Button>
                      <Button size="sm" onClick={logInteraction} disabled={loggingInteraction}>
                        {loggingInteraction ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {!interactions ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : interactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No interactions logged yet.</p>
              ) : (
                <div className="space-y-3">
                  {interactions.map((item: { _id: string; type: string; date: string; summary: string; outcome?: string; nextAction?: string; loggedBy?: { firstName: string; lastName: string } }) => (
                    <Card key={item._id}>
                      <CardContent className="pt-4">
                        <div className="flex gap-3">
                          <div className="mt-0.5 flex-shrink-0">
                            {INTERACTION_ICONS[item.type] ?? <FileText className="h-4 w-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold uppercase text-muted-foreground">{item.type}</span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(item.date), "MMM d, yyyy h:mm a")}
                              </span>
                              {item.loggedBy && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {item.loggedBy.firstName} {item.loggedBy.lastName}
                                </span>
                              )}
                            </div>
                            <p className="text-sm mt-1">{item.summary}</p>
                            {item.outcome && (
                              <p className="text-xs text-muted-foreground mt-1">
                                <span className="font-medium">Outcome:</span> {item.outcome}
                              </p>
                            )}
                            {item.nextAction && (
                              <Badge variant="outline" className="mt-1.5 text-xs">
                                Next: {item.nextAction}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Documents */}
            <TabsContent value="documents" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground">Attachments</h3>
                <label>
                  <Button size="sm" variant="outline" asChild disabled={uploading}>
                    <span><Paperclip className="h-3.5 w-3.5 mr-1" /> {uploading ? "Uploading..." : "Upload"}</span>
                  </Button>
                  <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                </label>
              </div>

              {!attachments ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No documents uploaded yet.</p>
              ) : (
                <div className="divide-y rounded-lg border">
                  {attachments.map((att: { _id: string; fileName: string; fileUrl: string; documentType: string; fileSize?: number; createdAt: string; uploadedBy?: { firstName: string; lastName: string } }) => (
                    <div key={att._id} className="flex items-center gap-3 px-4 py-3">
                      <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{att.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {att.uploadedBy ? `${att.uploadedBy.firstName} ${att.uploadedBy.lastName}` : ""}
                          {" · "}{format(new Date(att.createdAt), "MMM d, yyyy")}
                          {" · "}{formatBytes(att.fileSize)}
                        </p>
                      </div>
                      <Badge className={DOC_TYPE_COLORS[att.documentType] || DOC_TYPE_COLORS.other}>
                        {att.documentType}
                      </Badge>
                      <a href={att.fileUrl} target="_blank" rel="noreferrer" download>
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setPendingDeleteAttachmentId(att._id)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
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

              {/* Follow-up date */}
              <div className="pt-2 border-t">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs font-medium text-muted-foreground">Next Follow-up</p>
                  {followUpParsed && (
                    <Badge className={`text-[10px] px-1 py-0 ${followUpOverdue ? "bg-orange-100 text-orange-800" : "bg-blue-100 text-blue-800"}`}>
                      {followUpOverdue ? "Overdue" : "Scheduled"}
                    </Badge>
                  )}
                </div>
                {followUpISO && !editing && (
                  <p className="text-sm mb-2">{format(parseISO(followUpISO), "MMM d, yyyy")}</p>
                )}
                <div className="flex gap-2">
                  <Input
                    type="date"
                    className="h-8 text-xs"
                    value={editing ? followUpDate : (followUpISO || "")}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                  />
                  {!editing && (
                    <Button size="sm" className="h-8 px-2 text-xs" variant="outline" onClick={saveFollowUp} disabled={savingFollowUp}>
                      {savingFollowUp ? "..." : "Set"}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this client? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={deleteClient}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingDeleteAttachmentId} onOpenChange={(open) => { if (!open) setPendingDeleteAttachmentId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attachment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this attachment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (pendingDeleteAttachmentId) { deleteAttachment(pendingDeleteAttachmentId); setPendingDeleteAttachmentId(null); } }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
