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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { TASK_TYPES, PREDEFINED_TAGS, FIELD_TASK_TYPES } from "@/config/constants";
import { AlertTriangle } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface TaskFormProps {
  taskId?: string;
  initialData?: {
    title: string;
    description: string;
    priority: string;
    taskType: string;
    category: string;
    assignees: string[];
    dueDate: string;
    startDate: string;
    estimatedHours: number | null;
    tags: string[];
    department: string;
    isRecurring: boolean;
    recurringConfig?: {
      frequency: string;
      interval: number;
      endDate?: string;
      daysOfWeek?: number[];
    };
    lead?: string;
    client?: string;
    deal?: string;
  };
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function TaskForm({ taskId, initialData }: TaskFormProps) {
  const router = useRouter();
  const isEdit = !!taskId;
  const [loading, setLoading] = useState(false);

  // Core fields
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [priority, setPriority] = useState(initialData?.priority || "medium");
  const [taskType, setTaskType] = useState(initialData?.taskType || "");
  const [category, setCategory] = useState(initialData?.category || "");
  const [assignees, setAssignees] = useState<string[]>(initialData?.assignees || []);
  const [dueDate, setDueDate] = useState(initialData?.dueDate || "");
  const [startDate, setStartDate] = useState(initialData?.startDate || "");
  const [estimatedHours, setEstimatedHours] = useState(initialData?.estimatedHours?.toString() || "");
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [customTag, setCustomTag] = useState("");
  const [department, setDepartment] = useState(initialData?.department || "");

  // CRM links
  const [lead, setLead] = useState(initialData?.lead || "");
  const [client, setClient] = useState(initialData?.client || "");
  const [deal, setDeal] = useState(initialData?.deal || "");

  // Recurring
  const [isRecurring, setIsRecurring] = useState(initialData?.isRecurring || false);
  const [recurringFrequency, setRecurringFrequency] = useState(
    initialData?.recurringConfig?.frequency || "weekly"
  );
  const [recurringInterval, setRecurringInterval] = useState(
    initialData?.recurringConfig?.interval?.toString() || "1"
  );
  const [recurringEndDate, setRecurringEndDate] = useState(
    initialData?.recurringConfig?.endDate || ""
  );
  const [recurringDaysOfWeek, setRecurringDaysOfWeek] = useState<number[]>(
    initialData?.recurringConfig?.daysOfWeek || []
  );

  const { data: users } = useSWR("/api/users?limit=100", fetcher);
  const { data: departments } = useSWR("/api/departments", fetcher);
  const { data: leadsData } = useSWR("/api/crm/leads?limit=100", fetcher);
  const { data: clientsData } = useSWR("/api/crm/clients?limit=100", fetcher);
  const { data: dealsData } = useSWR("/api/crm/deals?limit=100", fetcher);
  const crmLeads = leadsData?.data ?? [];
  const crmClients = clientsData?.data ?? [];
  const crmDeals = dealsData?.data ?? [];

  const isFieldType = FIELD_TASK_TYPES.includes(taskType as (typeof FIELD_TASK_TYPES)[number]);
  const hasCrmLink = !!(lead || client || deal);

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function addCustomTag() {
    const t = customTag.trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setCustomTag("");
  }

  function toggleDayOfWeek(day: number) {
    setRecurringDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload: Record<string, unknown> = {
      title,
      description,
      priority,
      taskType: taskType || undefined,
      category: category || undefined,
      assignees: assignees.length ? assignees : undefined,
      dueDate: dueDate || undefined,
      startDate: startDate || undefined,
      estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
      tags: tags.length ? tags : undefined,
      department: department || undefined,
      isRecurring,
      lead: lead || undefined,
      client: client || undefined,
      deal: deal || undefined,
    };

    if (isRecurring) {
      payload.recurringConfig = {
        frequency: recurringFrequency,
        interval: parseInt(recurringInterval, 10) || 1,
        endDate: recurringEndDate || undefined,
        daysOfWeek: recurringFrequency === "weekly" ? recurringDaysOfWeek : undefined,
      };
    }

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
          // non-JSON response
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
        <CardContent className="space-y-5">
          {/* Title */}
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

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          {/* Task Type + Priority */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Task Type</Label>
              <Select value={taskType} onValueChange={setTaskType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
          </div>

          {/* CRM Links */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">CRM Links</Label>
              {isFieldType && !hasCrmLink && (
                <span className="flex items-center gap-1 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-2 py-0.5">
                  <AlertTriangle className="h-3 w-3" />
                  Required for field-type tasks
                </span>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Lead</Label>
                <Select value={lead || "none"} onValueChange={(v) => setLead(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {crmLeads.map((l: any) => (
                      <SelectItem key={l._id} value={l._id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Client</Label>
                <Select value={client || "none"} onValueChange={(v) => setClient(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {crmClients.map((c: any) => (
                      <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Deal</Label>
                <Select value={deal || "none"} onValueChange={(v) => setDeal(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {crmDeals.map((d: any) => (
                      <SelectItem key={d._id} value={d._id}>{d.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Bug Fix, Feature"
            />
          </div>

          {/* Dates — datetime-local for due date/time */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date &amp; Time</Label>
              <Input
                id="dueDate"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* Department + Estimated Hours */}
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

          {/* Assignees */}
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
                {users?.data?.map(
                  (u: { _id: string; firstName: string; lastName: string; email: string }) => (
                    <SelectItem key={u._id} value={u._id}>
                      {u.firstName} {u.lastName} ({u.email})
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            {assignees.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {assignees.map((id) => {
                  const user = users?.data?.find((u: { _id: string }) => u._id === id);
                  return (
                    <span
                      key={id}
                      className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs"
                    >
                      {user ? `${user.firstName} ${user.lastName}` : id}
                      <button
                        type="button"
                        onClick={() => setAssignees(assignees.filter((a) => a !== id))}
                        className="ml-1 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2">
              {PREDEFINED_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    tags.includes(tag)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Custom tag..."
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomTag();
                  }
                }}
                className="max-w-xs"
              />
              <Button type="button" variant="outline" size="sm" onClick={addCustomTag}>
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs gap-1">
                    {tag}
                    <button type="button" onClick={() => toggleTag(tag)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Recurring */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Recurring Task</Label>
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="h-4 w-4 cursor-pointer"
              />
            </div>

            {isRecurring && (
              <div className="rounded-md border p-4 space-y-4 bg-muted/30">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select value={recurringFrequency} onValueChange={setRecurringFrequency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Repeat every</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={recurringInterval}
                        onChange={(e) => setRecurringInterval(e.target.value)}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">
                        {recurringFrequency === "daily"
                          ? "day(s)"
                          : recurringFrequency === "weekly"
                          ? "week(s)"
                          : recurringFrequency === "monthly"
                          ? "month(s)"
                          : "year(s)"}
                      </span>
                    </div>
                  </div>
                </div>

                {recurringFrequency === "weekly" && (
                  <div className="space-y-2">
                    <Label>Days of week</Label>
                    <div className="flex gap-2">
                      {DAYS_OF_WEEK.map((day, i) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDayOfWeek(i)}
                          className={`h-8 w-9 rounded text-xs font-medium transition-colors ${
                            recurringDaysOfWeek.includes(i)
                              ? "bg-primary text-primary-foreground"
                              : "border border-border text-muted-foreground hover:border-primary"
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="recurringEndDate">End Date (optional)</Label>
                  <Input
                    id="recurringEndDate"
                    type="date"
                    value={recurringEndDate}
                    onChange={(e) => setRecurringEndDate(e.target.value)}
                    className="max-w-xs"
                  />
                </div>
              </div>
            )}
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
