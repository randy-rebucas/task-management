"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface TaskFormProps {
  taskId?: string;
  initialData?: {
    title: string;
    description: string;
    priority: string;
    category: string;
    assignees: string[];
    dueDate: string;
    startDate: string;
    estimatedHours: number | null;
    tags: string[];
    department: string;
  };
}

export function TaskForm({ taskId, initialData }: TaskFormProps) {
  const router = useRouter();
  const isEdit = !!taskId;
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [priority, setPriority] = useState(initialData?.priority || "medium");
  const [category, setCategory] = useState(initialData?.category || "");
  const [assignees, setAssignees] = useState<string[]>(initialData?.assignees || []);
  const [dueDate, setDueDate] = useState(initialData?.dueDate || "");
  const [startDate, setStartDate] = useState(initialData?.startDate || "");
  const [estimatedHours, setEstimatedHours] = useState(initialData?.estimatedHours?.toString() || "");
  const [tags, setTags] = useState(initialData?.tags?.join(", ") || "");
  const [department, setDepartment] = useState(initialData?.department || "");

  const { data: users } = useSWR("/api/users?limit=100", fetcher);
  const { data: departments } = useSWR("/api/departments", fetcher);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      title,
      description,
      priority,
      category: category || undefined,
      assignees: assignees.length ? assignees : undefined,
      dueDate: dueDate || undefined,
      startDate: startDate || undefined,
      estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
      tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
      department: department || undefined,
    };

    try {
      const url = isEdit ? `/api/tasks/${taskId}` : "/api/tasks";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errorMsg = "Failed to save task";
        try {
          const data = await res.json();
          errorMsg = data?.error || errorMsg;
        } catch {
          // Response was not JSON or empty
        }
        toast.error(errorMsg);
        return;
      }

      const data = await res.json();
      toast.success(isEdit ? "Task updated" : "Task created");
      router.push(`/tasks/${data._id || taskId}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? "Edit Task" : "Create New Task"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
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

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Bug Fix, Feature"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments?.map((d: { _id: string; name: string }) => (
                    <SelectItem key={d._id} value={d._id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedHours">Estimated Hours</Label>
              <Input
                id="estimatedHours"
                type="number"
                min="0"
                step="0.5"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assignees</Label>
            <Select
              value=""
              onValueChange={(v) => {
                if (!assignees.includes(v)) setAssignees([...assignees, v]);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Add assignee" />
              </SelectTrigger>
              <SelectContent>
                {users?.data?.map((u: { _id: string; firstName: string; lastName: string; email: string }) => (
                  <SelectItem key={u._id} value={u._id}>
                    {u.firstName} {u.lastName} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {assignees.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {assignees.map((id) => {
                  const user = users?.data?.find(
                    (u: { _id: string }) => u._id === id
                  );
                  return (
                    <span
                      key={id}
                      className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs"
                    >
                      {user ? `${user.firstName} ${user.lastName}` : id}
                      <button
                        type="button"
                        onClick={() =>
                          setAssignees(assignees.filter((a) => a !== id))
                        }
                        className="ml-1 text-muted-foreground hover:text-foreground"
                      >
                        x
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., frontend, critical, sprint-1"
            />
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Update Task" : "Create Task"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
