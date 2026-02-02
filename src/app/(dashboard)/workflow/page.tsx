"use client";

import { useState } from "react";
import useSWR from "swr";
import { usePermissions } from "@/hooks/use-permissions";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, ArrowRight, GitBranch } from "lucide-react";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function WorkflowPage() {
  const { can } = usePermissions();
  const { data: statuses, isLoading: statusLoading, mutate: mutateStatuses } = useSWR("/api/workflow/statuses", fetcher);
  const { data: transitions, isLoading: transLoading, mutate: mutateTransitions } = useSWR("/api/workflow/transitions", fetcher);

  // Status dialog
  const [statusDialog, setStatusDialog] = useState(false);
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [statusForm, setStatusForm] = useState({ name: "", color: "#3b82f6", order: 0, isClosed: false });
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [deleteStatusTarget, setDeleteStatusTarget] = useState<{ _id: string; name: string } | null>(null);

  // Transition dialog
  const [transDialog, setTransDialog] = useState(false);
  const [editingTrans, setEditingTrans] = useState<string | null>(null);
  const [transForm, setTransForm] = useState({ name: "", fromStatus: "", toStatus: "" });
  const [transSubmitting, setTransSubmitting] = useState(false);
  const [deleteTransTarget, setDeleteTransTarget] = useState<{ _id: string; name: string } | null>(null);

  // Status handlers
  function openCreateStatus() {
    setEditingStatus(null);
    setStatusForm({ name: "", color: "#3b82f6", order: statuses?.length || 0, isClosed: false });
    setStatusDialog(true);
  }

  function openEditStatus(s: { _id: string; name: string; color: string; order: number; isClosed?: boolean }) {
    setEditingStatus(s._id);
    setStatusForm({ name: s.name, color: s.color, order: s.order, isClosed: s.isClosed || false });
    setStatusDialog(true);
  }

  async function handleStatusSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatusSubmitting(true);
    try {
      const url = editingStatus ? `/api/workflow/statuses/${editingStatus}` : "/api/workflow/statuses";
      const method = editingStatus ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(statusForm),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save status");
      }
      toast.success(editingStatus ? "Status updated" : "Status created");
      setStatusDialog(false);
      mutateStatuses();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save status");
    } finally {
      setStatusSubmitting(false);
    }
  }

  async function handleDeleteStatus() {
    if (!deleteStatusTarget) return;
    try {
      const res = await fetch(`/api/workflow/statuses/${deleteStatusTarget._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete status");
      toast.success("Status deleted");
      mutateStatuses();
    } catch {
      toast.error("Failed to delete status");
    } finally {
      setDeleteStatusTarget(null);
    }
  }

  // Transition handlers
  function openCreateTransition() {
    setEditingTrans(null);
    setTransForm({ name: "", fromStatus: "", toStatus: "" });
    setTransDialog(true);
  }

  function openEditTransition(t: { _id: string; name: string; fromStatus: string | { _id: string }; toStatus: string | { _id: string } }) {
    setEditingTrans(t._id);
    setTransForm({
      name: t.name,
      fromStatus: typeof t.fromStatus === "string" ? t.fromStatus : t.fromStatus._id,
      toStatus: typeof t.toStatus === "string" ? t.toStatus : t.toStatus._id,
    });
    setTransDialog(true);
  }

  async function handleTransSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTransSubmitting(true);
    try {
      const url = editingTrans ? `/api/workflow/transitions/${editingTrans}` : "/api/workflow/transitions";
      const method = editingTrans ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transForm),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save transition");
      }
      toast.success(editingTrans ? "Transition updated" : "Transition created");
      setTransDialog(false);
      mutateTransitions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save transition");
    } finally {
      setTransSubmitting(false);
    }
  }

  async function handleDeleteTransition() {
    if (!deleteTransTarget) return;
    try {
      const res = await fetch(`/api/workflow/transitions/${deleteTransTarget._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete transition");
      toast.success("Transition deleted");
      mutateTransitions();
    } catch {
      toast.error("Failed to delete transition");
    } finally {
      setDeleteTransTarget(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Workflow Configuration"
        description="Manage task statuses and transitions"
      />

      <Tabs defaultValue="statuses">
        <TabsList>
          <TabsTrigger value="statuses">Statuses</TabsTrigger>
          <TabsTrigger value="transitions">Transitions</TabsTrigger>
        </TabsList>

        <TabsContent value="statuses" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Statuses</CardTitle>
              {can("workflow:manage") && (
                <Button size="sm" onClick={openCreateStatus}>
                  <Plus className="mr-2 h-4 w-4" /> Add Status
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {statusLoading ? (
                <LoadingSkeleton />
              ) : statuses?.length === 0 ? (
                <EmptyState
                  title="No statuses"
                  description="Create workflow statuses for tasks"
                  action={
                    can("workflow:manage") ? (
                      <Button onClick={openCreateStatus}>
                        <Plus className="mr-2 h-4 w-4" /> Add Status
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Color</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statuses?.map((s: { _id: string; name: string; color: string; order: number; isClosed?: boolean }) => (
                        <TableRow key={s._id}>
                          <TableCell className="font-mono text-sm">{s.order}</TableCell>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className="h-4 w-4 rounded-full border"
                                style={{ backgroundColor: s.color }}
                              />
                              <span className="text-sm text-muted-foreground">{s.color}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {s.isClosed ? (
                              <Badge variant="outline">Closed</Badge>
                            ) : (
                              <Badge variant="secondary">Open</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {can("workflow:manage") && (
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditStatus(s)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteStatusTarget({ _id: s._id, name: s.name })}>
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
        </TabsContent>

        <TabsContent value="transitions" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Transitions</CardTitle>
              {can("workflow:manage") && (
                <Button size="sm" onClick={openCreateTransition}>
                  <Plus className="mr-2 h-4 w-4" /> Add Transition
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {transLoading ? (
                <LoadingSkeleton />
              ) : transitions?.length === 0 ? (
                <EmptyState
                  icon={<GitBranch className="h-12 w-12" />}
                  title="No transitions"
                  description="Define how tasks can move between statuses"
                  action={
                    can("workflow:manage") ? (
                      <Button onClick={openCreateTransition}>
                        <Plus className="mr-2 h-4 w-4" /> Add Transition
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead />
                        <TableHead>To</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transitions?.map((t: { _id: string; name: string; fromStatus: { _id: string; name: string; color: string }; toStatus: { _id: string; name: string; color: string } }) => (
                        <TableRow key={t._id}>
                          <TableCell className="font-medium">{t.name}</TableCell>
                          <TableCell>
                            <Badge style={{ backgroundColor: t.fromStatus.color, color: "#fff" }}>
                              {t.fromStatus.name}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <ArrowRight className="h-4 w-4 text-muted-foreground mx-auto" />
                          </TableCell>
                          <TableCell>
                            <Badge style={{ backgroundColor: t.toStatus.color, color: "#fff" }}>
                              {t.toStatus.name}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {can("workflow:manage") && (
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditTransition(t)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTransTarget({ _id: t._id, name: t.name })}>
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
        </TabsContent>
      </Tabs>

      {/* Status Dialog */}
      <Dialog open={statusDialog} onOpenChange={setStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStatus ? "Edit Status" : "Add Status"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleStatusSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status-name">Name *</Label>
              <Input
                id="status-name"
                required
                value={statusForm.name}
                onChange={(e) => setStatusForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="status-color">Color</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    id="status-color"
                    value={statusForm.color}
                    onChange={(e) => setStatusForm((prev) => ({ ...prev, color: e.target.value }))}
                    className="h-10 w-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={statusForm.color}
                    onChange={(e) => setStatusForm((prev) => ({ ...prev, color: e.target.value }))}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status-order">Order</Label>
                <Input
                  id="status-order"
                  type="number"
                  value={statusForm.order}
                  onChange={(e) => setStatusForm((prev) => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Checkbox
                id="status-closed"
                checked={statusForm.isClosed}
                onCheckedChange={(v) => setStatusForm((prev) => ({ ...prev, isClosed: !!v }))}
              />
              <Label htmlFor="status-closed" className="cursor-pointer">
                This is a closed/completed status
              </Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStatusDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={statusSubmitting}>
                {statusSubmitting ? "Saving..." : editingStatus ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transition Dialog */}
      <Dialog open={transDialog} onOpenChange={setTransDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTrans ? "Edit Transition" : "Add Transition"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTransSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="trans-name">Name *</Label>
              <Input
                id="trans-name"
                required
                value={transForm.name}
                onChange={(e) => setTransForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Start Progress"
              />
            </div>
            <div className="space-y-2">
              <Label>From Status *</Label>
              <Select value={transForm.fromStatus} onValueChange={(v) => setTransForm((prev) => ({ ...prev, fromStatus: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses?.map((s: { _id: string; name: string }) => (
                    <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>To Status *</Label>
              <Select value={transForm.toStatus} onValueChange={(v) => setTransForm((prev) => ({ ...prev, toStatus: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses?.map((s: { _id: string; name: string }) => (
                    <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTransDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={transSubmitting}>
                {transSubmitting ? "Saving..." : editingTrans ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteStatusTarget}
        onOpenChange={(open) => !open && setDeleteStatusTarget(null)}
        title="Delete Status"
        description={`Are you sure you want to delete the "${deleteStatusTarget?.name}" status? Tasks using this status will need to be updated.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteStatus}
        destructive
      />

      <ConfirmDialog
        open={!!deleteTransTarget}
        onOpenChange={(open) => !open && setDeleteTransTarget(null)}
        title="Delete Transition"
        description={`Are you sure you want to delete the "${deleteTransTarget?.name}" transition?`}
        confirmLabel="Delete"
        onConfirm={handleDeleteTransition}
        destructive
      />
    </div>
  );
}
