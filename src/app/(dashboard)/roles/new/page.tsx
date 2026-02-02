"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function NewRolePage() {
  const router = useRouter();
  const { data: permissions, isLoading } = useSWR("/api/permissions", fetcher);

  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
  });

  function togglePermission(permissionKey: string) {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permissionKey)
        ? prev.permissions.filter((p) => p !== permissionKey)
        : [...prev.permissions, permissionKey],
    }));
  }

  function toggleGroup(groupPermissions: { key: string }[]) {
    const keys = groupPermissions.map((p) => p.key);
    const allSelected = keys.every((k) => form.permissions.includes(k));
    setForm((prev) => ({
      ...prev,
      permissions: allSelected
        ? prev.permissions.filter((p) => !keys.includes(p))
        : [...new Set([...prev.permissions, ...keys])],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create role");
      }

      toast.success("Role created successfully");
      router.push("/roles");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create role");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) return <LoadingSkeleton />;

  const grouped: Record<string, { key: string; label: string; description?: string }[]> =
    permissions?.reduce(
      (acc: Record<string, { key: string; label: string; description?: string }[]>, p: { key: string; label: string; group: string; description?: string }) => {
        if (!acc[p.group]) acc[p.group] = [];
        acc[p.group].push({ key: p.key, label: p.label, description: p.description });
        return acc;
      },
      {} as Record<string, { key: string; label: string; description?: string }[]>
    ) || {};

  return (
    <div>
      <PageHeader title="Create Role" description="Define a new role with specific permissions" />

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Role Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Role Name *</Label>
              <Input
                id="name"
                required
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Project Manager"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this role is for..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Permissions</CardTitle>
            <p className="text-sm text-muted-foreground">
              Select the permissions this role should have. {form.permissions.length} selected.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(grouped).map(([group, perms]) => {
              const allSelected = perms.every((p) => form.permissions.includes(p.key));
              const someSelected = perms.some((p) => form.permissions.includes(p.key));

              return (
                <div key={group}>
                  <div className="flex items-center space-x-3 mb-3">
                    <Checkbox
                      id={`group-${group}`}
                      checked={allSelected}
                      ref={(el) => {
                        if (el) {
                          (el as unknown as HTMLInputElement).indeterminate = someSelected && !allSelected;
                        }
                      }}
                      onCheckedChange={() => toggleGroup(perms)}
                    />
                    <Label htmlFor={`group-${group}`} className="font-semibold text-base cursor-pointer capitalize">
                      {group}
                    </Label>
                  </div>
                  <div className="ml-7 grid gap-2 sm:grid-cols-2">
                    {perms.map((p) => (
                      <div key={p.key} className="flex items-start space-x-3">
                        <Checkbox
                          id={`perm-${p.key}`}
                          checked={form.permissions.includes(p.key)}
                          onCheckedChange={() => togglePermission(p.key)}
                        />
                        <div className="space-y-0.5">
                          <Label htmlFor={`perm-${p.key}`} className="cursor-pointer text-sm">
                            {p.label}
                          </Label>
                          {p.description && (
                            <p className="text-xs text-muted-foreground">{p.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Separator className="mt-4" />
                </div>
              );
            })}
            {Object.keys(grouped).length === 0 && (
              <p className="text-sm text-muted-foreground">No permissions available</p>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Create Role"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/roles")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
