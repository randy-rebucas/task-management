"use client";


import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Bell, Settings, Zap, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/features/auth/use-permissions";
import useSWR from "@/lib/swr-compat";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

// General settings API fetcher
const generalSettingsFetcher = (url: string) => fetch(url).then((r) => r.json());

const fetcher = (url: string) => fetch(url).then((r) => r.json());


export default function SettingsPage() {
  const { can } = usePermissions();
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

        {/* Notification Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" /> Notification Rules
            </CardTitle>
            <CardDescription className="mt-1">
              Configure when and how notifications are sent
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Manage notification rules to automate alerts for system events such as task assignments, deadlines, and inactivity.
            </p>
            <Link href="/settings/notification-rules">
              <Button variant="outline">Manage Notification Rules</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
