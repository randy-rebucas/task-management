"use client";

import { useState } from "react";
import useSWR from "swr";
import { useDebounce } from "@/hooks/use-debounce";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Activity, FileText } from "lucide-react";
import { format } from "date-fns";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const actionColors: Record<string, string> = {
  created: "bg-green-100 text-green-800",
  updated: "bg-blue-100 text-blue-800",
  deleted: "bg-red-100 text-red-800",
  assigned: "bg-purple-100 text-purple-800",
  commented: "bg-yellow-100 text-yellow-800",
  "status-changed": "bg-indigo-100 text-indigo-800",
};

export default function ActivityLogPage() {
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search);

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", "30");
  if (debouncedSearch) params.set("search", debouncedSearch);
  if (action) params.set("action", action);
  if (entity) params.set("entity", entity);

  const { data, isLoading } = useSWR(`/api/activity-logs?${params}`, fetcher);

  return (
    <div>
      <PageHeader
        title="Activity Log"
        description="Track all actions and changes in the system"
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search activity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={action} onValueChange={(v) => { setAction(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="created">Created</SelectItem>
            <SelectItem value="updated">Updated</SelectItem>
            <SelectItem value="deleted">Deleted</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="commented">Commented</SelectItem>
            <SelectItem value="status-changed">Status Changed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={entity} onValueChange={(v) => { setEntity(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Entity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            <SelectItem value="task">Tasks</SelectItem>
            <SelectItem value="user">Users</SelectItem>
            <SelectItem value="role">Roles</SelectItem>
            <SelectItem value="department">Departments</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : data?.data?.length === 0 ? (
        <EmptyState
          icon={<Activity className="h-12 w-12" />}
          title="No activity found"
          description="Activity will appear here as actions are performed in the system"
        />
      ) : (
        <div className="space-y-2">
          {data?.data?.map(
            (log: {
              _id: string;
              user: { _id: string; firstName: string; lastName: string };
              action: string;
              entity: string;
              entityId?: string;
              description: string;
              metadata?: Record<string, unknown>;
              createdAt: string;
            }) => (
              <Card key={log._id}>
                <CardContent className="flex items-start gap-4 py-3">
                  <Avatar className="h-8 w-8 mt-0.5">
                    <AvatarFallback className="text-[10px]">
                      {log.user?.firstName?.[0]}{log.user?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">
                        {log.user?.firstName} {log.user?.lastName}
                      </span>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${actionColors[log.action] || ""}`}
                      >
                        {log.action}
                      </Badge>
                      <Badge variant="outline" className="text-xs capitalize">
                        {log.entity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{log.description}</p>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(log.createdAt), "MMM d, yyyy h:mm a")}
                    </span>
                  </div>
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                </CardContent>
              </Card>
            )
          )}

          {data?.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Page {data.page} of {data.totalPages} ({data.total} entries)
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
        </div>
      )}
    </div>
  );
}
