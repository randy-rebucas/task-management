"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { useDebounce } from "@/features/auth/use-debounce";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ClientsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (debouncedSearch) params.set("search", debouncedSearch);
  if (status) params.set("status", status);

  const { data, mutate } = useSWR(`/api/crm/clients?${params}`, fetcher);
  const clients = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  async function deleteClient(id: string) {
    if (!confirm("Delete this client?")) return;
    await fetch(`/api/crm/clients/${id}`, { method: "DELETE" });
    toast.success("Client deleted");
    mutate();
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-sm text-muted-foreground">{total} total clients</p>
        </div>
        <Button asChild size="sm">
          <Link href="/crm/clients/new">
            <Plus className="h-4 w-4 mr-1" /> New Client
          </Link>
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={status || "all"} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                  No clients found.
                </TableCell>
              </TableRow>
            )}
            {clients.map((client: any) => (
              <TableRow
                key={client._id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => router.push(`/crm/clients/${client._id}`)}
              >
                <TableCell className="font-medium">{client.name}</TableCell>
                <TableCell className="text-muted-foreground">{client.company || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{client.industry || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{client.email || "—"}</TableCell>
                <TableCell>
                  <Badge className={client.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                    {client.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {client.assignedTo
                    ? `${client.assignedTo.firstName} ${client.assignedTo.lastName}`
                    : "—"}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); deleteClient(client._id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="text-sm py-2">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
