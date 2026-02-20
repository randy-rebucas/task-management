"use client";

import { use } from "react";
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
import { Edit, Clock, Paperclip, GitBranch, Play } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import LogTimeForm from "@/components/LogTimeForm";


const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = use(params);
  const { can } = usePermissions();
  const { data: task, isLoading } = useSWR(`/api/tasks/${taskId}`, fetcher);
  const { data: timeLogs } = useSWR(`/api/tasks/${taskId}/time-logs`, fetcher);
  const { data: attachments } = useSWR(`/api/tasks/${taskId}/attachments`, fetcher);
  const { data: dependencies } = useSWR(`/api/tasks/${taskId}/dependencies`, fetcher);

  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Editable sidebar state
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Fetch departments and users for selects
  const { data: departments } = useSWR("/api/departments", fetcher);
  const { data: users } = useSWR("/api/users?isActive=true", fetcher);

  // Direct status patch UI state
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
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
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
      window.location.reload();
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  }


  // Initialize form state on entering edit mode
  function startEdit() {
    setForm({
      status: task.status?._id || "",
      priority: task.priority || "",
      assignees: task.assignees?.map((a: any) => a._id) || [],
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "",
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
      window.location.reload();
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <LoadingSkeleton />;
  if (!task) return <div>Task not found</div>;


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
                onSubmit={e => {
                  e.preventDefault();
                  handleStatusPatch();
                }}
              >
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={selectedTransition}
                  onChange={e => setSelectedTransition(e.target.value)}
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
                <Button type="submit" disabled={statusUpdating || !selectedTransition} variant="default">
                  {statusUpdating ? "Updating..." : "Update Status"}
                </Button>
              </form>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
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

          <TaskComments taskId={taskId} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {can("tasks:update") && !editMode && (
                <div className="flex justify-end mb-2">
                  <Button size="sm" variant="outline" onClick={startEdit}>
                    Edit Sidebar
                  </Button>
                </div>
              )}
              {editMode ? (
                <form
                  className="space-y-4"
                  onSubmit={e => {
                    e.preventDefault();
                    saveEdit();
                  }}
                >
                  {/* Status (read-only) */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <TaskStatusBadge status={task.status} />
                  </div>
                  <Separator />
                  {/* Priority */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Priority</span>
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={form.priority}
                      onChange={e => setForm((f: any) => ({ ...f, priority: e.target.value }))}
                      required
                    >
                      <option value="">Select</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <Separator />
                  {/* Assignees */}
                  <div>
                    <span className="text-sm text-muted-foreground">Assignees</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {users?.data?.map((u: any) => (
                        <label key={u._id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={form.assignees.includes(u._id)}
                            onChange={e => {
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
                  {/* Due Date */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Due Date</span>
                    <input
                      type="date"
                      className="border rounded px-2 py-1 text-sm"
                      value={form.dueDate}
                      onChange={e => setForm((f: any) => ({ ...f, dueDate: e.target.value }))}
                    />
                  </div>
                  <Separator />
                  {/* Category */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Category</span>
                    <input
                      type="text"
                      className="border rounded px-2 py-1 text-sm"
                      value={form.category}
                      onChange={e => setForm((f: any) => ({ ...f, category: e.target.value }))}
                    />
                  </div>
                  <Separator />
                  {/* Department */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Department</span>
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={form.department}
                      onChange={e => setForm((f: any) => ({ ...f, department: e.target.value }))}
                    >
                      <option value="">Select</option>
                      {departments?.map((d: any) => (
                        <option key={d._id} value={d._id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <Separator />
                  {/* Tags */}
                  <div>
                    <span className="text-sm text-muted-foreground">Tags</span>
                    <input
                      type="text"
                      className="border rounded px-2 py-1 text-sm w-full"
                      value={form.tags.join(", ")}
                      onChange={e => setForm((f: any) => ({ ...f, tags: e.target.value.split(",").map((t: string) => t.trim()).filter(Boolean) }))}
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
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Priority</span>
                    <TaskPriorityBadge priority={task.priority} />
                  </div>
                  <Separator />
                  <div>
                    <span className="text-sm text-muted-foreground">Assignees</span>
                    <div className="mt-2 space-y-2">
                      {task.assignees?.map(
                        (a: { _id: string; firstName: string; lastName: string; email: string }) => (
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
                          {format(new Date(task.dueDate), "MMM d, yyyy")}
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
                        <span className="text-sm">{(task.department as { name: string }).name}</span>
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

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" /> Time Logged
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-bold">
                {task.actualHours?.toFixed(1) || 0}h
              </p>
              {task.estimatedHours && (
                <p className="text-xs text-muted-foreground">
                  of {task.estimatedHours}h estimated
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {timeLogs?.length || 0} time entries
              </p>
              {/* Log Time UI */}
              {/* {can("tasks:update") && (
                <LogTimeForm taskId={taskId} onLogged={() => window.location.reload()} />
              )} */}
            </CardContent>
          </Card>


          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Paperclip className="h-4 w-4" /> Attachments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {attachments?.length || 0} files
              </p>
              <form onSubmit={handleUpload} className="mt-2 flex flex-col gap-2">
                <input
                  type="file"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain"
                  disabled={uploading}
                />
                <Button type="submit" disabled={uploading || !file} size="sm">
                  {uploading ? "Uploading..." : "Upload Attachment"}
                </Button>
                {uploadError && <span className="text-xs text-red-500">{uploadError}</span>}
              </form>
            </CardContent>
          </Card>

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
