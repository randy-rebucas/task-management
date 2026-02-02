"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { usePermissions } from "@/hooks/use-permissions";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Separator } from "@/components/ui/separator";
import { Plus, Pencil, Trash2, Bell, Settings } from "lucide-react";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface NotificationRule {
  _id: string;
  name: string;
  event: string;
  channel: string;
  enabled: boolean;
  recipients: string;
}

export default function SettingsPage() {
  const { can } = usePermissions();
  const { data: rules, isLoading, mutate } = useSWR("/api/notifications/rules", fetcher);

  const [ruleDialog, setRuleDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [ruleForm, setRuleForm] = useState({
    name: "",
    event: "",
    channel: "email",
    enabled: true,
    recipients: "assignees",
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ _id: string; name: string } | null>(null);

  function openCreateRule() {
    setEditingRule(null);
    setRuleForm({ name: "", event: "", channel: "email", enabled: true, recipients: "assignees" });
    setRuleDialog(true);
  }

  function openEditRule(rule: NotificationRule) {
    setEditingRule(rule._id);
    setRuleForm({
      name: rule.name,
      event: rule.event,
      channel: rule.channel,
      enabled: rule.enabled,
      recipients: rule.recipients,
    });
    setRuleDialog(true);
  }

  async function handleRuleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingRule
        ? `/api/notifications/rules/${editingRule}`
        : "/api/notifications/rules";
      const method = editingRule ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ruleForm),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save rule");
      }

      toast.success(editingRule ? "Rule updated" : "Rule created");
      setRuleDialog(false);
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save rule");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteRule() {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/notifications/rules/${deleteTarget._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete rule");
      toast.success("Rule deleted");
      mutate();
    } catch {
      toast.error("Failed to delete rule");
    } finally {
      setDeleteTarget(null);
    }
  }

  async function toggleRuleEnabled(ruleId: string, enabled: boolean) {
    try {
      const res = await fetch(`/api/notifications/rules/${ruleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error("Failed to update rule");
      mutate();
    } catch {
      toast.error("Failed to update rule");
    }
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Configure system settings and notification rules"
      />

      <div className="max-w-4xl space-y-6">
        {/* Notification Rules */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" /> Notification Rules
              </CardTitle>
              <CardDescription className="mt-1">
                Configure when and how notifications are sent
              </CardDescription>
            </div>
            {can("settings:manage") && (
              <Button size="sm" onClick={openCreateRule}>
                <Plus className="mr-2 h-4 w-4" /> Add Rule
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingSkeleton />
            ) : rules?.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No notification rules configured</p>
                {can("settings:manage") && (
                  <Button size="sm" variant="outline" className="mt-3" onClick={openCreateRule}>
                    <Plus className="mr-2 h-4 w-4" /> Add Rule
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Enabled</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Recipients</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules?.map((rule: NotificationRule) => (
                      <TableRow key={rule._id}>
                        <TableCell>
                          <Switch
                            checked={rule.enabled}
                            onCheckedChange={(v) => toggleRuleEnabled(rule._id, v)}
                            disabled={!can("settings:manage")}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{rule.name}</TableCell>
                        <TableCell className="text-sm capitalize">
                          {rule.event.replace(/-/g, " ")}
                        </TableCell>
                        <TableCell className="text-sm capitalize">{rule.channel}</TableCell>
                        <TableCell className="text-sm capitalize">{rule.recipients}</TableCell>
                        <TableCell>
                          {can("settings:manage") && (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditRule(rule)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => setDeleteTarget({ _id: rule._id, name: rule.name })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rule Dialog */}
      <Dialog open={ruleDialog} onOpenChange={setRuleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit Notification Rule" : "Add Notification Rule"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRuleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rule-name">Name *</Label>
              <Input
                id="rule-name"
                required
                value={ruleForm.name}
                onChange={(e) => setRuleForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Task Assignment Alert"
              />
            </div>
            <div className="space-y-2">
              <Label>Event *</Label>
              <Select value={ruleForm.event} onValueChange={(v) => setRuleForm((prev) => ({ ...prev, event: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="task-created">Task Created</SelectItem>
                  <SelectItem value="task-assigned">Task Assigned</SelectItem>
                  <SelectItem value="task-status-changed">Task Status Changed</SelectItem>
                  <SelectItem value="task-commented">Task Commented</SelectItem>
                  <SelectItem value="task-due-soon">Task Due Soon</SelectItem>
                  <SelectItem value="task-overdue">Task Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select value={ruleForm.channel} onValueChange={(v) => setRuleForm((prev) => ({ ...prev, channel: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="in-app">In-App</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Recipients</Label>
              <Select value={ruleForm.recipients} onValueChange={(v) => setRuleForm((prev) => ({ ...prev, recipients: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assignees">Assignees</SelectItem>
                  <SelectItem value="creator">Task Creator</SelectItem>
                  <SelectItem value="department">Department Members</SelectItem>
                  <SelectItem value="admins">Admins</SelectItem>
                  <SelectItem value="all">All Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="rule-enabled">Enabled</Label>
              <Switch
                id="rule-enabled"
                checked={ruleForm.enabled}
                onCheckedChange={(v) => setRuleForm((prev) => ({ ...prev, enabled: v }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRuleDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : editingRule ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Notification Rule"
        description={`Are you sure you want to delete the "${deleteTarget?.name}" rule?`}
        confirmLabel="Delete"
        onConfirm={handleDeleteRule}
        destructive
      />
    </div>
  );
}
