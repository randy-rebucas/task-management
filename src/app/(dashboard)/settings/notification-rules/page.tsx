"use client";

import { useState } from "react";
import useSWR from "@/lib/swr-compat";
import { usePermissions } from "@/features/auth/use-permissions";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, BellRing } from "lucide-react";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Role {
  _id: string;
  name: string;
  slug: string;
}

interface NotificationRule {
  _id: string;
  event: string;
  channels: ("in_app" | "email")[];
  recipientStrategy: "assignees" | "creator" | "department_head" | "specific_roles";
  recipientRoles?: { _id: string; name: string; slug: string }[];
  deadlineThresholdHours?: number;
  isActive: boolean;
  createdAt: string;
}

const RECIPIENT_STRATEGY_LABELS: Record<string, string> = {
  assignees: "Assignees",
  creator: "Creator",
  department_head: "Department Head",
  specific_roles: "Specific Roles",
};

const COMMON_EVENTS = [
  "task.created",
  "task.assigned",
  "task.status_changed",
  "task.deadline_approaching",
  "task.overdue",
  "task.completed",
  "task.comment_added",
  "user.invite",
  "user.created",
  "deal.stage_changed",
  "deal.closed",
  "lead.assigned",
  "field.check_in",
  "field.check_out",
];

const EMPTY_FORM = {
  event: "",
  customEvent: "",
  channels: [] as ("in_app" | "email")[],
  recipientStrategy: "assignees" as NotificationRule["recipientStrategy"],
  recipientRoles: [] as string[],
  deadlineThresholdHours: "" as string | number,
  isActive: true,
};

export default function NotificationRulesPage() {
  const { can } = usePermissions();
  const { data: rulesRaw, isLoading, mutate } = useSWR("/api/notifications/rules", fetcher);
  const { data: rolesRaw } = useSWR("/api/roles", fetcher);

  const rules: NotificationRule[] = Array.isArray(rulesRaw)
    ? rulesRaw
    : rulesRaw?.data ?? [];
  const roles: Role[] = Array.isArray(rolesRaw)
    ? rolesRaw
    : rolesRaw?.data ?? [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<NotificationRule | null>(null);

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  }

  function openEdit(rule: NotificationRule) {
    setEditingId(rule._id);
    setForm({
      event: COMMON_EVENTS.includes(rule.event) ? rule.event : "custom",
      customEvent: COMMON_EVENTS.includes(rule.event) ? "" : rule.event,
      channels: [...rule.channels],
      recipientStrategy: rule.recipientStrategy,
      recipientRoles: rule.recipientRoles?.map((r) => r._id) ?? [],
      deadlineThresholdHours: rule.deadlineThresholdHours ?? "",
      isActive: rule.isActive,
    });
    setDialogOpen(true);
  }

  function toggleChannel(ch: "in_app" | "email") {
    setForm((prev) => ({
      ...prev,
      channels: prev.channels.includes(ch)
        ? prev.channels.filter((c) => c !== ch)
        : [...prev.channels, ch],
    }));
  }

  function toggleRole(id: string) {
    setForm((prev) => ({
      ...prev,
      recipientRoles: prev.recipientRoles.includes(id)
        ? prev.recipientRoles.filter((r) => r !== id)
        : [...prev.recipientRoles, id],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const resolvedEvent = form.event === "custom" ? form.customEvent.trim() : form.event;

    if (!resolvedEvent) {
      toast.error("Event is required");
      return;
    }
    if (form.channels.length === 0) {
      toast.error("Select at least one channel");
      return;
    }

    const payload: Record<string, unknown> = {
      event: resolvedEvent,
      channels: form.channels,
      recipientStrategy: form.recipientStrategy,
      isActive: form.isActive,
    };

    if (form.recipientStrategy === "specific_roles") {
      payload.recipientRoles = form.recipientRoles;
    }
    if (form.deadlineThresholdHours !== "" && form.deadlineThresholdHours !== undefined) {
      payload.deadlineThresholdHours = Number(form.deadlineThresholdHours);
    }

    if (editingId) payload.id = editingId;

    setSubmitting(true);
    try {
      const res = await fetch("/api/notifications/rules", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save rule");
      toast.success(editingId ? "Rule updated" : "Rule created");
      setDialogOpen(false);
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save rule");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/notifications/rules?id=${deleteTarget._id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete rule");
      toast.success("Rule deleted");
      setDeleteTarget(null);
      mutate();
    } catch {
      toast.error("Failed to delete rule");
    }
  }

  async function toggleActive(rule: NotificationRule) {
    try {
      const res = await fetch("/api/notifications/rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rule._id, isActive: !rule.isActive }),
      });
      if (!res.ok) throw new Error();
      mutate();
    } catch {
      toast.error("Failed to update rule");
    }
  }

  return (
    <div>
      <PageHeader
        title="Notification Rules"
        description="Configure when and how notifications are sent"
        action={
          can("notifications:manage_rules") ? (
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Rule
            </Button>
          ) : null
        }
      />

      {isLoading ? (
        <LoadingSkeleton />
      ) : rules.length === 0 ? (
        <EmptyState
          icon={<BellRing className="h-12 w-12" />}
          title="No notification rules"
          description="Create a rule to automate notifications for system events"
          action={
            can("notifications:manage_rules") ? (
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add Rule
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Channels</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Threshold (hrs)</TableHead>
                <TableHead>Active</TableHead>
                {can("notifications:manage_rules") && (
                  <TableHead className="text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule._id}>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                      {rule.event}
                    </code>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {rule.channels.map((ch) => (
                        <Badge key={ch} variant="secondary" className="capitalize text-xs">
                          {ch === "in_app" ? "In-App" : "Email"}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {RECIPIENT_STRATEGY_LABELS[rule.recipientStrategy] ?? rule.recipientStrategy}
                      {rule.recipientRoles && rule.recipientRoles.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-1">
                          {rule.recipientRoles.map((r) => (
                            <Badge key={r._id} variant="outline" className="text-xs">
                              {r.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {rule.deadlineThresholdHours != null ? rule.deadlineThresholdHours : "—"}
                  </TableCell>
                  <TableCell>
                    {can("notifications:manage_rules") ? (
                      <Switch
                        checked={rule.isActive}
                        onCheckedChange={() => toggleActive(rule)}
                      />
                    ) : (
                      <Badge variant={rule.isActive ? "default" : "secondary"}>
                        {rule.isActive ? "Active" : "Inactive"}
                      </Badge>
                    )}
                  </TableCell>
                  {can("notifications:manage_rules") && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(rule)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(rule)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Rule" : "New Notification Rule"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Event */}
            <div className="space-y-1.5">
              <Label>Event</Label>
              <Select
                value={form.event}
                onValueChange={(v) => setForm((p) => ({ ...p, event: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select or enter custom event" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_EVENTS.map((ev) => (
                    <SelectItem key={ev} value={ev}>
                      {ev}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom event…</SelectItem>
                </SelectContent>
              </Select>
              {form.event === "custom" && (
                <Input
                  placeholder="e.g. invoice.paid"
                  value={form.customEvent}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, customEvent: e.target.value }))
                  }
                  className="mt-1.5"
                />
              )}
            </div>

            {/* Channels */}
            <div className="space-y-1.5">
              <Label>Channels</Label>
              <div className="flex gap-4">
                {(["in_app", "email"] as const).map((ch) => (
                  <label
                    key={ch}
                    className="flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <Checkbox
                      checked={form.channels.includes(ch)}
                      onCheckedChange={() => toggleChannel(ch)}
                    />
                    {ch === "in_app" ? "In-App" : "Email"}
                  </label>
                ))}
              </div>
            </div>

            {/* Recipient Strategy */}
            <div className="space-y-1.5">
              <Label>Recipient Strategy</Label>
              <Select
                value={form.recipientStrategy}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    recipientStrategy: v as NotificationRule["recipientStrategy"],
                    recipientRoles: [],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assignees">Assignees</SelectItem>
                  <SelectItem value="creator">Creator</SelectItem>
                  <SelectItem value="department_head">Department Head</SelectItem>
                  <SelectItem value="specific_roles">Specific Roles</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Specific Roles */}
            {form.recipientStrategy === "specific_roles" && (
              <div className="space-y-1.5">
                <Label>Roles</Label>
                <div className="max-h-40 overflow-y-auto rounded border p-2 space-y-1">
                  {roles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Loading roles…</p>
                  ) : (
                    roles.map((role) => (
                      <label
                        key={role._id}
                        className="flex items-center gap-2 cursor-pointer text-sm"
                      >
                        <Checkbox
                          checked={form.recipientRoles.includes(role._id)}
                          onCheckedChange={() => toggleRole(role._id)}
                        />
                        {role.name}
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Deadline Threshold */}
            <div className="space-y-1.5">
              <Label>Deadline Threshold (hours)</Label>
              <Input
                type="number"
                min={1}
                placeholder="e.g. 24 (optional)"
                value={form.deadlineThresholdHours}
                onChange={(e) =>
                  setForm((p) => ({ ...p, deadlineThresholdHours: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Used for deadline_approaching events. Leave blank for other events.
              </p>
            </div>

            {/* Active */}
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v }))}
              />
              <Label className="cursor-pointer">Active</Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : editingId ? "Save Changes" : "Create Rule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Notification Rule"
        description={`Are you sure you want to delete the rule for "${deleteTarget?.event}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
