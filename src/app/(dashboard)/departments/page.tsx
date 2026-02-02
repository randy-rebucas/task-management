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
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function DepartmentsPage() {
  const { can } = usePermissions();
  const { data: departments, isLoading, mutate } = useSWR("/api/departments", fetcher);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ _id: string; name: string } | null>(null);

  function openCreate() {
    setEditingId(null);
    setForm({ name: "", description: "" });
    setDialogOpen(true);
  }

  function openEdit(dept: { _id: string; name: string; description?: string }) {
    setEditingId(dept._id);
    setForm({ name: dept.name, description: dept.description || "" });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingId ? `/api/departments/${editingId}` : "/api/departments";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save department");
      }

      toast.success(editingId ? "Department updated" : "Department created");
      setDialogOpen(false);
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save department");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/departments/${deleteTarget._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete department");
      toast.success("Department deleted");
      mutate();
    } catch {
      toast.error("Failed to delete department");
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Departments"
        description="Manage organizational departments"
        action={
          can("departments:create") ? (
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Add Department
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <LoadingSkeleton />
      ) : departments?.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-12 w-12" />}
          title="No departments"
          description="Create departments to organize your staff"
          action={
            can("departments:create") ? (
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> Add Department
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
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments?.map(
                (dept: { _id: string; name: string; description?: string }) => (
                  <TableRow key={dept._id}>
                    <TableCell className="font-medium">{dept.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {dept.description || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {can("departments:update") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(dept)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {can("departments:delete") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteTarget({ _id: dept._id, name: dept.name })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Department" : "Add Department"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dept-name">Name *</Label>
              <Input
                id="dept-name"
                required
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept-desc">Description</Label>
              <Input
                id="dept-desc"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : editingId ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Department"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? Staff members in this department will be unassigned.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        destructive
      />
    </div>
  );
}
