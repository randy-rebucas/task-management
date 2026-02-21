"use client";


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
import { Plus, Pencil, Trash2, Bell, Settings, Zap, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/features/auth/use-permissions";
import useSWR from "swr";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

// General settings API fetcher
const generalSettingsFetcher = (url: string) => fetch(url).then((r) => r.json());

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
  const { data: rulesRaw, isLoading, mutate } = useSWR("/api/notifications/rules", fetcher);
  // Ensure rules is always an array
  const rules: NotificationRule[] = Array.isArray(rulesRaw) ? rulesRaw : rulesRaw?.data || [];
  const { data: generalSettings, isLoading: loadingSettings, mutate: mutateSettings } = useSWR("/api/settings/general", generalSettingsFetcher);
  const { data: automationRaw, isLoading: loadingAutomation, mutate: mutateAutomation } = useSWR("/api/settings/automation", fetcher);

  const [automationForm, setAutomationForm] = useState({
    "automation.followUpTask":      true as boolean,
    "automation.escalation":        true as boolean,
    "automation.escalationDays":    3    as number,
    "automation.performanceReport": true as boolean,
    "automation.fieldSummary":      true as boolean,
  });
  useEffect(() => {
    if (automationRaw) {
      setAutomationForm({
        "automation.followUpTask":      automationRaw["automation.followUpTask"]      ?? true,
        "automation.escalation":        automationRaw["automation.escalation"]        ?? true,
        "automation.escalationDays":    automationRaw["automation.escalationDays"]    ?? 3,
        "automation.performanceReport": automationRaw["automation.performanceReport"] ?? true,
        "automation.fieldSummary":      automationRaw["automation.fieldSummary"]      ?? true,
      });
    }
  }, [automationRaw]);

  const [automationSubmitting, setAutomationSubmitting] = useState(false);

  async function handleAutomationSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAutomationSubmitting(true);
    try {
      const res = await fetch("/api/settings/automation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(automationForm),
      });
      if (!res.ok) throw new Error("Failed to update automation settings");
      toast.success("Automation settings updated");
      mutateAutomation();
    } catch {
      toast.error("Failed to update automation settings");
    } finally {
      setAutomationSubmitting(false);
    }
  }

  // General settings form state
  const [settingsForm, setSettingsForm] = useState({
    theme: generalSettings?.theme || "light",
    paginationLimit: generalSettings?.paginationLimit || 20,
    fileUploadMaxSize: generalSettings?.fileUploadMaxSize || 10485760,
  });
  useEffect(() => {
    if (generalSettings) {
      setSettingsForm({
        theme: generalSettings.theme || "light",
        paginationLimit: generalSettings.paginationLimit || 20,
        fileUploadMaxSize: generalSettings.fileUploadMaxSize || 10485760,
      });
    }
  }, [generalSettings]);

  const [settingsSubmitting, setSettingsSubmitting] = useState(false);

  const [syncingPermissions, setSyncingPermissions] = useState(false);

  async function handleSyncPermissions() {
    setSyncingPermissions(true);
    try {
      const res = await fetch("/api/admin/sync-permissions", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Sync failed");
      const { permissions: p, roles: r } = json.data.results;
      toast.success(
        `Sync complete — ${p.added} permissions added, ${p.updated} updated; ${r.created} roles created, ${r.updated} updated`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to sync permissions");
    } finally {
      setSyncingPermissions(false);
    }
  }

  async function handleSettingsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSettingsSubmitting(true);
    try {
      const res = await fetch("/api/settings/general", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsForm),
      });
      if (!res.ok) throw new Error("Failed to update settings");
      toast.success("Settings updated");
      mutateSettings();
    } catch {
      toast.error("Failed to update settings");
    } finally {
      setSettingsSubmitting(false);
    }
  }

  // Notification rule management (existing code)
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
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" /> General Settings
            </CardTitle>
            <CardDescription className="mt-1">
              Configure system-wide settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingSettings ? (
              <LoadingSkeleton />
            ) : (
              <form onSubmit={handleSettingsSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Select
                    value={settingsForm.theme}
                    onValueChange={(v) => setSettingsForm((prev) => ({ ...prev, theme: v }))}
                    disabled={!can("settings:manage")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paginationLimit">Default Pagination Limit</Label>
                  <Input
                    id="paginationLimit"
                    type="number"
                    min={1}
                    max={100}
                    value={settingsForm.paginationLimit}
                    onChange={(e) => setSettingsForm((prev) => ({ ...prev, paginationLimit: Number(e.target.value) }))}
                    disabled={!can("settings:manage")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fileUploadMaxSize">File Upload Max Size (MB)</Label>
                  <Input
                    id="fileUploadMaxSize"
                    type="number"
                    min={1}
                    max={100}
                    value={settingsForm.fileUploadMaxSize / 1024 / 1024}
                    onChange={(e) => setSettingsForm((prev) => ({ ...prev, fileUploadMaxSize: Number(e.target.value) * 1024 * 1024 }))}
                    disabled={!can("settings:manage")}
                  />
                </div>
                {can("settings:manage") && (
                  <Button type="submit" disabled={settingsSubmitting}>
                    {settingsSubmitting ? "Saving..." : "Save Settings"}
                  </Button>
                )}
              </form>
            )}
          </CardContent>
        </Card>

        {/* Automation Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" /> Automation
            </CardTitle>
            <CardDescription className="mt-1">
              Enable or disable automated actions and scheduled jobs
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAutomation ? (
              <LoadingSkeleton />
            ) : (
              <form onSubmit={handleAutomationSubmit} className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Auto follow-up task after meeting</p>
                    <p className="text-xs text-muted-foreground">Creates a lead_follow_up task 3 days out when a client_meeting is completed</p>
                  </div>
                  <Switch
                    checked={automationForm["automation.followUpTask"]}
                    onCheckedChange={(v) => setAutomationForm((p) => ({ ...p, "automation.followUpTask": v }))}
                    disabled={!can("settings:manage")}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Auto escalate overdue tasks</p>
                    <p className="text-xs text-muted-foreground">Notifies Operations Managers when tasks are overdue beyond the threshold</p>
                  </div>
                  <Switch
                    checked={automationForm["automation.escalation"]}
                    onCheckedChange={(v) => setAutomationForm((p) => ({ ...p, "automation.escalation": v }))}
                    disabled={!can("settings:manage")}
                  />
                </div>
                {automationForm["automation.escalation"] && (
                  <div className="ml-4 space-y-1">
                    <Label htmlFor="escalationDays">Escalation threshold (days overdue)</Label>
                    <Input
                      id="escalationDays"
                      type="number"
                      min={1}
                      max={30}
                      className="w-24"
                      value={automationForm["automation.escalationDays"]}
                      onChange={(e) => setAutomationForm((p) => ({ ...p, "automation.escalationDays": Number(e.target.value) }))}
                      disabled={!can("settings:manage")}
                    />
                  </div>
                )}
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Weekly performance report</p>
                    <p className="text-xs text-muted-foreground">Emails a team performance summary to admins and managers every Saturday</p>
                  </div>
                  <Switch
                    checked={automationForm["automation.performanceReport"]}
                    onCheckedChange={(v) => setAutomationForm((p) => ({ ...p, "automation.performanceReport": v }))}
                    disabled={!can("settings:manage")}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Daily AI field summary</p>
                    <p className="text-xs text-muted-foreground">Generates an AI summary of daily visit logs and field sessions for management</p>
                  </div>
                  <Switch
                    checked={automationForm["automation.fieldSummary"]}
                    onCheckedChange={(v) => setAutomationForm((p) => ({ ...p, "automation.fieldSummary": v }))}
                    disabled={!can("settings:manage")}
                  />
                </div>
                {can("settings:manage") && (
                  <Button type="submit" disabled={automationSubmitting}>
                    {automationSubmitting ? "Saving..." : "Save Automation Settings"}
                  </Button>
                )}
              </form>
            )}
          </CardContent>
        </Card>

        {/* System Maintenance */}
        {can("settings:manage") && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" /> System Maintenance
              </CardTitle>
              <CardDescription className="mt-1">
                Sync permission definitions and system roles from config to the database.
                Run this after deploying updates that add or modify permissions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleSyncPermissions}
                disabled={syncingPermissions}
                variant="outline"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${syncingPermissions ? "animate-spin" : ""}`} />
                {syncingPermissions ? "Syncing..." : "Sync Permissions & Roles"}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Safe to run at any time — never deletes custom roles or user data.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Notification Rules (existing code) */}
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
              <Button onClick={openCreateRule}>
                <Plus className="mr-2 h-4 w-4" /> Add Rule
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingSkeleton />
            ) : rules.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center gap-4">
                <Bell className="h-12 w-12 text-muted-foreground mb-2" />
                <div>
                  <p className="text-lg font-semibold text-muted-foreground mb-1">No notification rules configured</p>
                  <p className="text-sm text-muted-foreground mb-2">Notification rules let you automate alerts for important events, such as task assignments, deadlines, or inactivity. Get notified via email or in-app.</p>
                </div>
                {can("settings:manage") && (
                  <Button className="mt-2 px-4 py-2 text-base font-medium border rounded hover:bg-primary/90" onClick={openCreateRule}>
                    <Plus className="mr-2 h-5 w-5" /> Create your first rule
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
                    {rules.map((rule: NotificationRule) => (
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
                  <SelectItem value="lead-stagnation">Lead Stagnation</SelectItem>
                  <SelectItem value="field-inactive">Field Coordinator Inactive</SelectItem>
                  <SelectItem value="weekly-summary">Weekly Summary</SelectItem>
                  <SelectItem value="task-escalated">Task Escalated</SelectItem>
                  <SelectItem value="weekly-performance-report">Weekly Performance Report</SelectItem>
                  <SelectItem value="daily-field-summary">Daily Field Summary</SelectItem>
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
