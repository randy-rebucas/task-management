"use client";

import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { usePermissions } from "@/hooks/use-permissions";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Trash2, Shield } from "lucide-react";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function RolesPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const { data: roles, isLoading, mutate } = useSWR("/api/roles", fetcher);
  const [deleteTarget, setDeleteTarget] = useState<{ _id: string; name: string } | null>(null);

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/roles/${deleteTarget._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete role");
      toast.success("Role deleted successfully");
      mutate();
    } catch {
      toast.error("Failed to delete role");
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Roles"
        description="Manage roles and permissions"
        action={
          can("roles:create") ? (
            <Button asChild>
              <Link href="/roles/new">
                <Plus className="mr-2 h-4 w-4" /> New Role
              </Link>
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <LoadingSkeleton />
      ) : roles?.length === 0 ? (
        <EmptyState
          icon={<Shield className="h-12 w-12" />}
          title="No roles found"
          description="Create a role to assign permissions to staff members"
          action={
            can("roles:create") ? (
              <Button asChild>
                <Link href="/roles/new">
                  <Plus className="mr-2 h-4 w-4" /> New Role
                </Link>
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
                <TableHead>Permissions</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles?.map(
                (role: {
                  _id: string;
                  name: string;
                  description?: string;
                  permissions: string[];
                  isSystem?: boolean;
                }) => (
                  <TableRow key={role._id}>
                    <TableCell className="font-medium">
                      <Link href={`/roles/${role._id}/edit`} className="hover:underline">
                        {role.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {role.description || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{role.permissions.length} permissions</Badge>
                    </TableCell>
                    <TableCell>
                      {role.isSystem ? (
                        <Badge variant="outline">System</Badge>
                      ) : (
                        <Badge variant="default">Custom</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {can("roles:delete") && !role.isSystem && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/roles/${role._id}/edit`)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteTarget({ _id: role._id, name: role.name })}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Role"
        description={`Are you sure you want to delete the "${deleteTarget?.name}" role? Users with this role will lose its permissions.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        destructive
      />
    </div>
  );
}
