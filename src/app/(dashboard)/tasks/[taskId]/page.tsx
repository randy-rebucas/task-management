"use client";

import { use, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
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
import { Edit, Clock, Paperclip, GitBranch, RefreshCw, Mic, CheckSquare, Plus, X } from "lucide-react";
import { format } from "date-fns";
import LogTimeForm from "@/components/LogTimeForm";
import { TASK_TYPES } from "@/config/constants";

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
  const { data: dependencies } = useSWR(`/api/tasks/${taskId}/dependencies`, fetcher);

  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [voiceUploading, setVoiceUploading] = useState(false);
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Subtask state
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [subtaskLoading, setSubtaskLoading] = useState(false);

  // Editable sidebar state
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const { data: departments } = useSWR("/api/departments", fetcher);
  const { data: users } = useSWR("/api/users?isActive=true", fetcher);

  const [selectedTransition, setSelectedTransition] = useState<string>("");
  const [statusUpdating, setStatusUpdating] = useState(false);

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
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to update status");
      }
      mutateTask();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setStatusUpdating(false);
    }
  }

  async function handleUpload(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/tasks/${taskId}/attachments`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to upload file");
      }
      setFile(null);
      mutateAttachments();
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleVoiceUpload(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!voiceFile) return;
    setVoiceUploading(true);
    setVoiceError(null);
    try {
      const formData = new FormData();
      formData.append("file", voiceFile);
      formData.append("attachmentType", "voice_note");
      const res = await fetch(`/api/tasks/${taskId}/attachments`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to upload voice note");
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
      status: task.status?._id || "",
      priority: task.priority || "",
      taskType: task.taskType || "",
      assignees: task.assignees?.map((a: any) => a._id) || [],
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : "",
      category: task.category || "",
      department: (task.department as any)?._id || "",
      tags: task.tags || [],
    });
    setEditError(null);
    setEditMode(true);
  }

  function cancelEdit() {
    setEditMode(false);
    setForm(null);
    setEditError(null);
  }

  async function saveEdit() {
    setSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: form.status,
          priority: form.priority,
          taskType: form.taskType || undefined,
          assignees: form.assignees,
          dueDate: form.dueDate || undefined,
          category: form.category,
          department: form.department || undefined,
          tags: form.tags,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to update task");
      }
      setEditMode(false);
      setForm(null);
      mutateTask();
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <LoadingSkeleton />;
  if (!task) return <div>Task not found</div>;

  const taskTypeLabel = TASK_TYPES.find((t) => t.value === task.taskType)?.label;
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
            {can("tasks:update") && (
              <Button asChild variant="outline">
                <Link href={`/tasks/${taskId}/edit`}>
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </Link>
              </Button>
            )}
            {can("tasks:update") && task.allowedTransitions?.length > 0 && (
              <form
                className="flex gap-2 items-center"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleStatusPatch();
                }}
              >
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={selectedTransition}
                  onChange={(e) => setSelectedTransition(e.target.value)}
                  required
                  style={{ minWidth: 120 }}
                >
                  <option value="" disabled>
                    Select status
                  </option>
                  {task.allowedTransitions.map((t: any) => (
                    <option key={t._id} value={t._id}>
                      {t.toStatus?.name || t._id}
                    </option>
                  ))}
                </select>
                <Button
                  type="submit"
                  disabled={statusUpdating || !selectedTransition}
                  variant="default"
                >
                  {statusUpdating ? "Updating..." : "Update Status"}
                </Button>
              </form>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none text-sm">
                {task.description || (
                  <span className="text-muted-foreground">No description</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Subtasks */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" /> Subtasks
                  {subtasks.length > 0 && (
                    <span className="text-muted-foreground font-normal">
                      ({completedSubtasks}/{subtasks.length})
                    </span>
                  )}
                </CardTitle>
                {can("tasks:update") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAddingSubtask(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {subtasks.length > 0 && (
                <div className="mb-3">
                  <Progress
                    value={subtasks.length ? (completedSubtasks / subtasks.length) * 100 : 0}
                    className="h-1.5"
                  />
                </div>
              )}
              {subtasks.map((sub: any) => (
                <div key={sub._id} className="flex items-center gap-2 group">
                  <input
                    type="checkbox"
                    checked={sub.completed}
                    onChange={(e) => toggleSubtask(sub._id, e.target.checked)}
                    className="h-4 w-4 cursor-pointer"
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
                  <input
                    autoFocus
                    type="text"
                    className="flex-1 border rounded px-2 py-1 text-sm"
                    placeholder="Subtask title..."
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addSubtask();
                      if (e.key === "Escape") {
                        setAddingSubtask(false);
                        setNewSubtaskTitle("");
                      }
                    }}
                  />
                  <Button size="sm" onClick={addSubtask} disabled={subtaskLoading}>
                    Add
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setAddingSubtask(false);
                      setNewSubtaskTitle("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <TaskComments taskId={taskId} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Properties card */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              {can("tasks:update") && !editMode && (
                <div className="flex justify-end mb-2">
                  <Button size="sm" variant="outline" onClick={startEdit}>
                    Edit
                  </Button>
                </div>
              )}
              {editMode ? (
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveEdit();
                  }}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <TaskStatusBadge status={task.status} />
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Task Type</span>
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={form.taskType}
                      onChange={(e) => setForm((f: any) => ({ ...f, taskType: e.target.value }))}
                    >
                      <option value="">— None —</option>
                      {TASK_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Priority</span>
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={form.priority}
                      onChange={(e) => setForm((f: any) => ({ ...f, priority: e.target.value }))}
                      required
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <Separator />
                  <div>
                    <span className="text-sm text-muted-foreground">Assignees</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {users?.data?.map((u: any) => (
                        <label key={u._id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={form.assignees.includes(u._id)}
                            onChange={(e) => {
                              setForm((f: any) => ({
                                ...f,
                                assignees: e.target.checked
                                  ? [...f.assignees, u._id]
                                  : f.assignees.filter((id: string) => id !== u._id),
                              }));
                            }}
                          />
                          {u.firstName} {u.lastName}
                        </label>
                      ))}
                    </div>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Due Date & Time</span>
                    <input
                      type="datetime-local"
                      className="border rounded px-2 py-1 text-sm"
                      value={form.dueDate}
                      onChange={(e) => setForm((f: any) => ({ ...f, dueDate: e.target.value }))}
                    />
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Category</span>
                    <input
                      type="text"
                      className="border rounded px-2 py-1 text-sm"
                      value={form.category}
                      onChange={(e) => setForm((f: any) => ({ ...f, category: e.target.value }))}
                    />
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Department</span>
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={form.department}
                      onChange={(e) => setForm((f: any) => ({ ...f, department: e.target.value }))}
                    >
                      <option value="">— None —</option>
                      {departments?.map((d: any) => (
                        <option key={d._id} value={d._id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Separator />
                  <div>
                    <span className="text-sm text-muted-foreground">Tags</span>
                    <input
                      type="text"
                      className="border rounded px-2 py-1 text-sm w-full mt-1"
                      value={form.tags.join(", ")}
                      onChange={(e) =>
                        setForm((f: any) => ({
                          ...f,
                          tags: e.target.value
                            .split(",")
                            .map((t: string) => t.trim())
                            .filter(Boolean),
                        }))
                      }
                      placeholder="Comma separated"
                    />
                  </div>
                  <Separator />
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={cancelEdit} disabled={saving}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                  {editError && <div className="text-xs text-red-500 mt-2">{editError}</div>}
                </form>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <TaskStatusBadge status={task.status} />
                  </div>
                  <Separator />
                  {taskTypeLabel && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Task Type</span>
                        <Badge variant="outline" className="text-xs">{taskTypeLabel}</Badge>
                      </div>
                      <Separator />
                    </>
                  )}
                  {task.isRecurring && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Recurring</span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <RefreshCw className="h-3 w-3" />
                          <span className="capitalize">
                            Every {task.recurringConfig?.interval}{" "}
                            {task.recurringConfig?.frequency}
                          </span>
                        </div>
                      </div>
                      <Separator />
                    </>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Priority</span>
                    <TaskPriorityBadge priority={task.priority} />
                  </div>
                  <Separator />
                  <div>
                    <span className="text-sm text-muted-foreground">Assignees</span>
                    <div className="mt-2 space-y-2">
                      {task.assignees?.map(
                        (a: { _id: string; firstName: string; lastName: string }) => (
                          <div key={a._id} className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-[10px]">
                                {a.firstName[0]}
                                {a.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">
                              {a.firstName} {a.lastName}
                            </span>
                          </div>
                        )
                      )}
                      {task.assignees?.length === 0 && (
                        <span className="text-sm text-muted-foreground">Unassigned</span>
                      )}
                    </div>
                  </div>
                  <Separator />
                  {task.dueDate && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Due Date</span>
                        <span className="text-sm">
                          {format(new Date(task.dueDate), "MMM d, yyyy HH:mm")}
                        </span>
                      </div>
                      <Separator />
                    </>
                  )}
                  {task.category && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Category</span>
                        <Badge variant="outline">{task.category}</Badge>
                      </div>
                      <Separator />
                    </>
                  )}
                  {task.department && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Department</span>
                        <span className="text-sm">
                          {(task.department as { name: string }).name}
                        </span>
                      </div>
                      <Separator />
                    </>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Created</span>
                    <span className="text-sm">
                      {format(new Date(task.createdAt), "MMM d, yyyy")}
                    </span>
                  </div>
                  {task.tags?.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <span className="text-sm text-muted-foreground">Tags</span>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {task.tags.map((tag: string) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Time Logged */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" /> Time Logged
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-bold">{task.actualHours?.toFixed(1) || 0}h</p>
              {task.estimatedHours && (
                <p className="text-xs text-muted-foreground">
                  of {task.estimatedHours}h estimated
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {timeLogs?.length || 0} time entries
              </p>
              {can("tasks:update") && (
                <LogTimeForm taskId={taskId} onLogged={() => mutateTask()} />
              )}
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Paperclip className="h-4 w-4" /> Attachments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {fileAttachments.length > 0 && (
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
              )}
              {fileAttachments.length === 0 && (
                <p className="text-sm text-muted-foreground">No files attached.</p>
              )}
              {can("tasks:update") && (
                <form onSubmit={handleUpload} className="flex flex-col gap-2">
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain"
                    disabled={uploading}
                  />
                  <Button type="submit" disabled={uploading || !file} size="sm">
                    {uploading ? "Uploading..." : "Upload File"}
                  </Button>
                  {uploadError && <span className="text-xs text-red-500">{uploadError}</span>}
                </form>
              )}
            </CardContent>
          </Card>

          {/* Voice Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Mic className="h-4 w-4" /> Voice Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {voiceNotes.length > 0 && (
                <div className="space-y-2">
                  {voiceNotes.map((a: any) => (
                    <div key={a._id} className="space-y-1">
                      <p className="text-xs text-muted-foreground truncate">{a.fileName}</p>
                      <audio controls src={a.fileUrl} className="w-full h-8" />
                    </div>
                  ))}
                </div>
              )}
              {voiceNotes.length === 0 && (
                <p className="text-sm text-muted-foreground">No voice notes yet.</p>
              )}
              {can("tasks:update") && (
                <form onSubmit={handleVoiceUpload} className="flex flex-col gap-2">
                  <input
                    type="file"
                    onChange={(e) => setVoiceFile(e.target.files?.[0] || null)}
                    accept="audio/*"
                    disabled={voiceUploading}
                  />
                  <Button type="submit" disabled={voiceUploading || !voiceFile} size="sm">
                    {voiceUploading ? "Uploading..." : "Upload Voice Note"}
                  </Button>
                  {voiceError && <span className="text-xs text-red-500">{voiceError}</span>}
                </form>
              )}
            </CardContent>
          </Card>

          {/* Dependencies */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <GitBranch className="h-4 w-4" /> Dependencies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {dependencies?.length || 0} dependencies
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
