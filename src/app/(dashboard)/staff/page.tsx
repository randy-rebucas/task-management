"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/use-permissions";
import { useDebounce } from "@/hooks/use-debounce";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, Upload, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function StaffPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search);

  const [deleteTarget, setDeleteTarget] = useState<{ _id: string; name: string } | null>(null);

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", "20");
  if (debouncedSearch) params.set("search", debouncedSearch);
  if (role) params.set("role", role);
  if (department) params.set("department", department);
  if (status) params.set("status", status);

  const { data, isLoading, mutate } = useSWR(`/api/users?${params}`, fetcher);
  const { data: roles } = useSWR("/api/roles", fetcher);
  const { data: departments } = useSWR("/api/departments", fetcher);

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/users/${deleteTarget._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete staff member");
      toast.success("Staff member deleted successfully");
      mutate();
    } catch {
      toast.error("Failed to delete staff member");
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Staff"
        description="Manage staff members and their roles"
        action={
          can("users:create") ? (
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href="/staff/import">
                  <Upload className="mr-2 h-4 w-4" /> Import CSV
                </Link>
              </Button>
              <Button asChild>
                <Link href="/staff/new">
                  <Plus className="mr-2 h-4 w-4" /> Add Staff
                </Link>
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search staff..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={role} onValueChange={(v) => { setRole(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {roles?.map((r: { _id: string; name: string }) => (
              <SelectItem key={r._id} value={r._id}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={department} onValueChange={(v) => { setDepartment(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments?.map((d: { _id: string; name: string }) => (
              <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : data?.data?.length === 0 ? (
        <EmptyState
          title="No staff members found"
          description="Add a new staff member to get started"
          action={
            can("users:create") ? (
              <Button asChild>
                <Link href="/staff/new">
                  <Plus className="mr-2 h-4 w-4" /> Add Staff
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data?.map(
                  (user: {
                    _id: string;
                    firstName: string;
                    lastName: string;
                    email: string;
                    department?: { name: string };
                    roles: { _id: string; name: string }[];
                    isActive: boolean;
                    jobTitle?: string;
                  }) => (
                    <TableRow key={user._id}>
                      <TableCell>
                        <Link href={`/staff/${user._id}`} className="flex items-center gap-2 hover:underline">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {user.firstName[0]}{user.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.firstName} {user.lastName}</div>
                            {user.jobTitle && (
                              <div className="text-xs text-muted-foreground">{user.jobTitle}</div>
                            )}
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">{user.email}</TableCell>
                      <TableCell className="text-sm">{user.department?.name || "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles?.map((r) => (
                            <Badge key={r._id} variant="secondary" className="text-xs">
                              {r.name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? "default" : "outline"}>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {can("users:delete") && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => router.push(`/staff/${user._id}/edit`)}>
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteTarget({ _id: user._id, name: `${user.firstName} ${user.lastName}` })}
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

          {data?.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Page {data.page} of {data.totalPages} ({data.total} staff)
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Staff Member"
        description={`Are you sure you want to delete ${deleteTarget?.name}? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        destructive
      />
    </div>
  );
}
