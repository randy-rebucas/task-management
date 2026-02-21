"use client";

import { use, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { toast } from "sonner";
import { usePermissions } from "@/features/auth/use-permissions";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { TaskStatusBadge } from "@/components/tasks/task-status-badge";
import { TaskPriorityBadge } from "@/components/tasks/task-priority-badge";
import { TaskComments } from "@/components/tasks/task-comments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Edit, Clock, Paperclip, RefreshCw, Mic, CheckSquare,
  Plus, X, Briefcase, ShieldCheck, CheckCircle2, XCircle,
} from "lucide-react";
import { format } from "date-fns";
import LogTimeForm from "@/components/LogTimeForm";
import { TASK_TYPES, DEAL_STAGES, FIELD_TASK_TYPES } from "@/config/constants";
import SubmitProofModal from "@/components/proof/submit-proof-modal";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = use(params);
  const { can } = usePermissions();

  const { data: task, isLoading, mutate: mutateTask } = useSWR(`/api/tasks/${taskId}`, fetcher);
  const { data: timeLogs } = useSWR(`/api/tasks/${taskId}/time-logs`, fetcher);
  const { data: attachments, mutate: mutateAttachments } = useSWR(`/api/tasks/${taskId}/attachments`, fetcher);

  // Only load when edit mode is open
  const [editMode, setEditMode] = useState(false);
  const { data: departments } = useSWR(editMode ? "/api/departments" : null, fetcher);
  const { data: users } = useSWR(editMode ? "/api/users?isActive=true" : null, fetcher);

  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [voiceUploading, setVoiceUploading] = useState(false);
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [subtaskLoading, setSubtaskLoading] = useState(false);

  const [selectedTransition, setSelectedTransition] = useState("");
  const [statusUpdating, setStatusUpdating] = useState(false);

  const [proofModalOpen, setProofModalOpen] = useState(false);
  const { data: proofSubmissions, mutate: mutateProofs } = useSWR(
    `/api/proof-of-work/submissions?taskId=${taskId}`,
    fetcher
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleStatusPatch() {
    if (!selectedTransition) return;
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toStatusId: selectedTransition }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || "Failed to update status");
      }
      setSelectedTransition("");
      mutateTask();
      toast.success("Status updated");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setStatusUpdating(false);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/tasks/${taskId}/attachments`, { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || "Failed to upload file");
      }
      setFile(null);
      mutateAttachments();
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleVoiceUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!voiceFile) return;
    setVoiceUploading(true);
    setVoiceError(null);
    try {
      const fd = new FormData();
      fd.append("file", voiceFile);
      fd.append("attachmentType", "voice_note");
      const res = await fetch(`/api/tasks/${taskId}/attachments`, { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || "Failed to upload voice note");
      }
      setVoiceFile(null);
      mutateAttachments();
    } catch (err: any) {
      setVoiceError(err.message);
    } finally {
      setVoiceUploading(false);
    }
  }

  async function addSubtask() {
    if (!newSubtaskTitle.trim()) return;
    setSubtaskLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newSubtaskTitle.trim() }),
      });
      if (!res.ok) throw new Error("Failed to add subtask");
      setNewSubtaskTitle("");
      setAddingSubtask(false);
      mutateTask();
    } catch {
      // silently ignore
    } finally {
      setSubtaskLoading(false);
    }
  }

  async function toggleSubtask(subtaskId: string, completed: boolean) {
    await fetch(`/api/tasks/${taskId}/subtasks/${subtaskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    });
    mutateTask();
  }

  async function deleteSubtask(subtaskId: string) {
    await fetch(`/api/tasks/${taskId}/subtasks/${subtaskId}`, { method: "DELETE" });
    mutateTask();
  }

  function startEdit() {
    setForm({
      priority: task.priority || "medium",
      taskType: task.taskType || "",
      assignees: task.assignees?.map((a: any) => a._id) || [],
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : "",
      category: task.category || "",
      department: (task.department as any)?._id || "",
      tags: task.tags || [],
    });
    setEditMode(true);
  }

  function cancelEdit() {
    setEditMode(false);
    setForm(null);
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priority: form.priority,
          taskType: form.taskType || undefined,
          assignees: form.assignees,
          dueDate: form.dueDate || undefined,
          category: form.category || undefined,
          department: form.department || undefined,
          tags: form.tags,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || "Failed to update task");
      }
      setEditMode(false);
      setForm(null);
      mutateTask();
      toast.success("Task updated");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) return <LoadingSkeleton />;
  if (!task) return <div className="p-6 text-muted-foreground">Task not found.</div>;

  const taskTypeLabel = TASK_TYPES.find((t) => t.value === task.taskType)?.label;
  const isFieldTask = FIELD_TASK_TYPES.includes(task.taskType as typeof FIELD_TASK_TYPES[number]);
  const subtasks: any[] = task.subtasks || [];
  const completedSubtasks = subtasks.filter((s: any) => s.completed).length;
  const voiceNotes = (attachments || []).filter((a: any) => a.attachmentType === "voice_note");
  const fileAttachments = (attachments || []).filter((a: any) => a.attachmentType !== "voice_note");

  return (
    <div>
      <PageHeader
        title={`${task.taskNumber}: ${task.title}`}
        action={
          <div className="flex gap-2">
            {isFieldTask && (
              <Button
                variant="outline"
                onClick={() => setProofModalOpen(true)}
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                <ShieldCheck className="mr-2 h-4 w-4" /> Submit Proof
              </Button>
            )}
            {can("tasks:update") && (
              <Button asChild variant="outline">
                <Link href={`/tasks/${taskId}/edit`}>
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </Link>
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Main column ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              {task.description ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                  {task.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No description provided.</p>
              )}
            </CardContent>
          </Card>

          {/* Subtasks */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" /> Subtasks
                  {subtasks.length > 0 && (
                    <span className="text-muted-foreground font-normal text-xs">
                      {completedSubtasks}/{subtasks.length}
                    </span>
                  )}
                </CardTitle>
                {can("tasks:update") && (
                  <Button variant="ghost" size="sm" onClick={() => setAddingSubtask(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {subtasks.length > 0 && (
                <Progress
                  value={(completedSubtasks / subtasks.length) * 100}
                  className="h-1.5 mb-3"
                />
              )}
              {subtasks.map((sub: any) => (
                <div key={sub._id} className="flex items-center gap-2 group">
                  <input
                    type="checkbox"
                    checked={sub.completed}
                    onChange={(e) => toggleSubtask(sub._id, e.target.checked)}
                    className="h-4 w-4 cursor-pointer accent-primary"
                    disabled={!can("tasks:update")}
                  />
                  <span
                    className={`flex-1 text-sm ${
                      sub.completed ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    {sub.title}
                  </span>
                  {can("tasks:update") && (
                    <button
                      onClick={() => deleteSubtask(sub._id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {subtasks.length === 0 && !addingSubtask && (
                <p className="text-sm text-muted-foreground">No subtasks yet.</p>
              )}
              {addingSubtask && (
                <div className="flex gap-2 mt-2">
                  <Input
                    autoFocus
                    className="h-8 text-sm"
                    placeholder="Subtask title…"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addSubtask();
                      if (e.key === "Escape") { setAddingSubtask(false); setNewSubtaskTitle(""); }
                    }}
                  />
                  <Button size="sm" onClick={addSubtask} disabled={subtaskLoading}>Add</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setAddingSubtask(false); setNewSubtaskTitle(""); }}>
                    Cancel
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <TaskComments taskId={taskId} />
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-4">
          {/* Properties */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Properties</CardTitle>
                {can("tasks:update") && !editMode && (
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={startEdit}>
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {editMode && form ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground shrink-0">Priority</span>
                    <Select
                      value={form.priority}
                      onValueChange={(v) => setForm((f: any) => ({ ...f, priority: v }))}
                    >
                      <SelectTrigger className="h-7 text-xs w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground shrink-0">Type</span>
                    <Select
                      value={form.taskType || "__none__"}
                      onValueChange={(v) => setForm((f: any) => ({ ...f, taskType: v === "__none__" ? "" : v }))}
                    >
                      <SelectTrigger className="h-7 text-xs w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— None —</SelectItem>
                        {TASK_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground shrink-0">Department</span>
                    <Select
                      value={form.department || "__none__"}
                      onValueChange={(v) => setForm((f: any) => ({ ...f, department: v === "__none__" ? "" : v }))}
                    >
                      <SelectTrigger className="h-7 text-xs w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— None —</SelectItem>
                        {departments?.map((d: any) => (
                          <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground shrink-0">Due Date</span>
                    <input
                      type="datetime-local"
                      className="h-7 rounded-md border px-2 text-xs"
                      value={form.dueDate}
                      onChange={(e) => setForm((f: any) => ({ ...f, dueDate: e.target.value }))}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground shrink-0">Category</span>
                    <Input
                      className="h-7 text-xs w-36"
                      value={form.category}
                      onChange={(e) => setForm((f: any) => ({ ...f, category: e.target.value }))}
                      placeholder="e.g. Admin"
                    />
                  </div>
                  <Separator />
                  <div>
                    <span className="text-xs text-muted-foreground">Tags</span>
                    <Input
                      className="h-7 text-xs mt-1"
                      value={form.tags.join(", ")}
                      onChange={(e) =>
                        setForm((f: any) => ({
                          ...f,
                          tags: e.target.value.split(",").map((t: string) => t.trim()).filter(Boolean),
                        }))
                      }
                      placeholder="Comma separated"
                    />
                  </div>
                  <Separator />
                  <div>
                    <span className="text-xs text-muted-foreground">Assignees</span>
                    <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                      {users?.data?.map((u: any) => (
                        <label key={u._id} className="flex items-center gap-2 text-xs cursor-pointer py-0.5">
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 accent-primary"
                            checked={form.assignees.includes(u._id)}
                            onChange={(e) =>
                              setForm((f: any) => ({
                                ...f,
                                assignees: e.target.checked
                                  ? [...f.assignees, u._id]
                                  : f.assignees.filter((id: string) => id !== u._id),
                              }))
                            }
                          />
                          {u.firstName} {u.lastName}
                        </label>
                      ))}
                    </div>
                  </div>
                  <Separator />
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={saveEdit} disabled={saving} className="flex-1">
                      {saving ? "Saving…" : "Save"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving}>
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {/* Status + inline transition */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Status</span>
                    <TaskStatusBadge status={task.status} />
                  </div>
                  {can("tasks:update") && task.allowedTransitions?.length > 0 && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground shrink-0">Change to</span>
                      <div className="flex items-center gap-1">
                        <Select value={selectedTransition} onValueChange={setSelectedTransition}>
                          <SelectTrigger className="h-7 text-xs w-32">
                            <SelectValue placeholder="Select…" />
                          </SelectTrigger>
                          <SelectContent>
                            {task.allowedTransitions.map((t: any) => (
                              <SelectItem key={t._id} value={t._id}>
                                {t.toStatus?.name || t._id}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          className="h-7 px-2 text-xs"
                          disabled={statusUpdating || !selectedTransition}
                          onClick={handleStatusPatch}
                        >
                          {statusUpdating
                            ? <RefreshCw className="h-3 w-3 animate-spin" />
                            : "Apply"
                          }
                        </Button>
                      </div>
                    </div>
                  )}
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Priority</span>
                    <TaskPriorityBadge priority={task.priority} />
                  </div>
                  {taskTypeLabel && (
                    <>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Type</span>
                        <Badge variant="outline" className="text-xs">{taskTypeLabel}</Badge>
                      </div>
                    </>
                  )}
                  {task.isRecurring && (
                    <>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Recurring</span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <RefreshCw className="h-3 w-3" />
                          <span className="capitalize">
                            Every {task.recurringConfig?.interval} {task.recurringConfig?.frequency}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                  <Separator />
                  <div>
                    <span className="text-xs text-muted-foreground">Assignees</span>
                    <div className="mt-2 space-y-1.5">
                      {task.assignees?.length > 0 ? (
                        task.assignees.map((a: { _id: string; firstName: string; lastName: string }) => (
                          <div key={a._id} className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[9px]">
                                {a.firstName[0]}{a.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs">{a.firstName} {a.lastName}</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">Unassigned</span>
                      )}
                    </div>
                  </div>
                  {task.dueDate && (
                    <>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Due</span>
                        <span className="text-xs">{format(new Date(task.dueDate), "MMM d, yyyy HH:mm")}</span>
                      </div>
                    </>
                  )}
                  {task.department && (
                    <>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Department</span>
                        <span className="text-xs">{(task.department as { name: string }).name}</span>
                      </div>
                    </>
                  )}
                  {task.category && (
                    <>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Category</span>
                        <Badge variant="outline" className="text-xs">{task.category}</Badge>
                      </div>
                    </>
                  )}
                  {task.tags?.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <span className="text-xs text-muted-foreground">Tags</span>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {task.tags.map((tag: string) => (
                            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Created</span>
                    <span className="text-xs">{format(new Date(task.createdAt), "MMM d, yyyy")}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Time Logged */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" /> Time Logged
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-1.5 mb-1">
                <p className="text-xl font-bold">{task.actualHours?.toFixed(1) ?? 0}h</p>
                {task.estimatedHours > 0 && (
                  <p className="text-xs text-muted-foreground">of {task.estimatedHours}h estimated</p>
                )}
              </div>
              {task.estimatedHours > 0 && (
                <Progress
                  value={Math.min((task.actualHours / task.estimatedHours) * 100, 100)}
                  className="h-1.5 mb-2"
                />
              )}
              <p className="text-xs text-muted-foreground mb-3">
                {timeLogs?.length ?? 0} entr{timeLogs?.length === 1 ? "y" : "ies"}
              </p>
              {can("tasks:update") && (
                <LogTimeForm taskId={taskId} onLogged={() => mutateTask()} />
              )}
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Paperclip className="h-4 w-4" /> Attachments
                {fileAttachments.length > 0 && (
                  <span className="text-xs font-normal text-muted-foreground">({fileAttachments.length})</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {fileAttachments.length > 0 ? (
                <div className="space-y-1">
                  {fileAttachments.map((a: any) => (
                    <a
                      key={a._id}
                      href={a.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-primary hover:underline truncate"
                    >
                      <Paperclip className="h-3 w-3 shrink-0" />
                      {a.fileName}
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No files attached.</p>
              )}
              {can("tasks:update") && (
                <form onSubmit={handleUpload} className="flex flex-col gap-2 pt-1">
                  <input
                    type="file"
                    className="text-xs"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                    disabled={uploading}
                  />
                  <Button type="submit" disabled={uploading || !file} size="sm" className="h-7 text-xs">
                    {uploading ? "Uploading…" : "Upload File"}
                  </Button>
                  {uploadError && <span className="text-xs text-destructive">{uploadError}</span>}
                </form>
              )}
            </CardContent>
          </Card>

          {/* Voice Notes */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Mic className="h-4 w-4" /> Voice Notes
                {voiceNotes.length > 0 && (
                  <span className="text-xs font-normal text-muted-foreground">({voiceNotes.length})</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {voiceNotes.length > 0 ? (
                <div className="space-y-2">
                  {voiceNotes.map((a: any) => (
                    <div key={a._id} className="space-y-1">
                      <p className="text-xs text-muted-foreground truncate">{a.fileName}</p>
                      <audio controls src={a.fileUrl} className="w-full h-8" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No voice notes yet.</p>
              )}
              {can("tasks:update") && (
                <form onSubmit={handleVoiceUpload} className="flex flex-col gap-2 pt-1">
                  <input
                    type="file"
                    className="text-xs"
                    onChange={(e) => setVoiceFile(e.target.files?.[0] || null)}
                    accept="audio/*"
                    disabled={voiceUploading}
                  />
                  <Button type="submit" disabled={voiceUploading || !voiceFile} size="sm" className="h-7 text-xs">
                    {voiceUploading ? "Uploading…" : "Upload Voice Note"}
                  </Button>
                  {voiceError && <span className="text-xs text-destructive">{voiceError}</span>}
                </form>
              )}
            </CardContent>
          </Card>

          {/* Proof of Work — field tasks only */}
          {isFieldTask && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" /> Proof of Work
                    {Array.isArray(proofSubmissions) && proofSubmissions.length > 0 && (
                      <span className="text-xs font-normal text-muted-foreground">
                        ({proofSubmissions.length})
                      </span>
                    )}
                  </CardTitle>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setProofModalOpen(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Submit
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {(!Array.isArray(proofSubmissions) || proofSubmissions.length === 0) ? (
                  <p className="text-xs text-muted-foreground">No submissions yet.</p>
                ) : (
                  proofSubmissions.map((p: any) => {
                    const statusMap: Record<string, { label: string; icon: typeof CheckCircle2; cls: string }> = {
                      pending:  { label: "Pending",  icon: Clock,        cls: "text-yellow-600" },
                      verified: { label: "Verified", icon: CheckCircle2, cls: "text-green-600"  },
                      rejected: { label: "Rejected", icon: XCircle,      cls: "text-red-600"    },
                    };
                    const st = statusMap[p.verificationStatus] ?? statusMap.pending;
                    const Icon = st.icon;
                    return (
                      <div key={p._id} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(p.createdAt), "MMM d, HH:mm")}
                          {" · "}{p.photos?.length ?? 0} photo{p.photos?.length !== 1 ? "s" : ""}
                          {p.signatureUrl ? " · Signed" : ""}
                          {p.qrCheckIn ? (p.qrCheckIn.isWithinRadius ? " · QR ✓" : " · QR ✗") : ""}
                        </span>
                        <span className={`flex items-center gap-1 text-xs font-medium ${st.cls}`}>
                          <Icon className="h-3.5 w-3.5" />
                          {st.label}
                        </span>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          )}

          {/* CRM Links */}
          {(task?.lead || task?.client || task?.deal) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Briefcase className="h-4 w-4" /> CRM Links
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {task.lead && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Lead</p>
                    <Link
                      href={`/crm/leads/${task.lead._id || task.lead}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {task.lead.name || "View Lead"}
                    </Link>
                    {task.lead.status && (
                      <span className="ml-2 text-xs text-muted-foreground">({task.lead.status})</span>
                    )}
                  </div>
                )}
                {task.client && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Client</p>
                    <Link
                      href={`/crm/clients/${task.client._id || task.client}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {task.client.name || "View Client"}
                    </Link>
                    {task.client.company && (
                      <span className="ml-2 text-xs text-muted-foreground">{task.client.company}</span>
                    )}
                  </div>
                )}
                {task.deal && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Deal</p>
                    <Link
                      href={`/crm/deals/${task.deal._id || task.deal}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {task.deal.title || "View Deal"}
                    </Link>
                    {task.deal.stage && (() => {
                      const stageCfg = DEAL_STAGES.find((s) => s.value === task.deal.stage);
                      return stageCfg ? (
                        <Badge className={`ml-2 text-xs ${stageCfg.color}`}>{stageCfg.label}</Badge>
                      ) : null;
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <SubmitProofModal
        taskId={taskId}
        open={proofModalOpen}
        onClose={() => setProofModalOpen(false)}
        onSubmitted={() => mutateProofs()}
      />
    </div>
  );
}
