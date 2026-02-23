"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { TaskStatusBadge } from "@/components/tasks/task-status-badge";
import { TaskPriorityBadge } from "@/components/tasks/task-priority-badge";
import { TASK_TYPES } from "@/config/constants";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface TaskPropertiesCardProps {
  task: any;
  taskId: string;
  onMutate: () => void;
  canUpdate: boolean;
}

export function TaskPropertiesCard({ task, taskId, onMutate, canUpdate }: TaskPropertiesCardProps) {
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [selectedTransition, setSelectedTransition] = useState("");
  const [statusUpdating, setStatusUpdating] = useState(false);

  const { data: departments } = useSWR(editMode ? "/api/departments" : null, fetcher);
  const { data: users } = useSWR(editMode ? "/api/users?isActive=true" : null, fetcher);

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
      onMutate();
      toast.success("Task updated");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

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
      onMutate();
      toast.success("Status updated");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setStatusUpdating(false);
    }
  }

  const taskTypeLabel = TASK_TYPES.find((t) => t.value === task.taskType)?.label;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Properties</CardTitle>
          {canUpdate && !editMode && (
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
              <Select value={form.priority} onValueChange={(v) => setForm((f: any) => ({ ...f, priority: v }))}>
                <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
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
                <SelectTrigger className="h-7 text-xs w-36"><SelectValue /></SelectTrigger>
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
                <SelectTrigger className="h-7 text-xs w-36"><SelectValue /></SelectTrigger>
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
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Status</span>
              <TaskStatusBadge status={task.status} />
            </div>
            {canUpdate && task.allowedTransitions?.length > 0 && (
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
                    {statusUpdating ? <RefreshCw className="h-3 w-3 animate-spin" /> : "Apply"}
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
                  task.assignees.map((a: any) => (
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
                  <span className="text-xs">{(task.department as any).name}</span>
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
  );
}
