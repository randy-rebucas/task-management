"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, BellOff, Check, CheckCheck, Mail } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function NotificationsPage() {
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", "20");
  if (filter) params.set("read", filter);

  const { data, isLoading, mutate } = useSWR(`/api/notifications?${params}`, fetcher);

  async function markAsRead(id: string) {
    try {
      await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: [id] }),
      });
      mutate();
    } catch {
      toast.error("Failed to mark notification as read");
    }
  }

  async function markAllAsRead() {
    try {
      const unreadIds = data?.data
        ?.filter((n: { isRead: boolean }) => !n.isRead)
        .map((n: { _id: string }) => n._id);

      if (!unreadIds?.length) return;

      await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: unreadIds }),
      });
      toast.success("All notifications marked as read");
      mutate();
    } catch {
      toast.error("Failed to mark notifications as read");
    }
  }

  const unreadCount = data?.data?.filter((n: { isRead: boolean }) => !n.isRead).length || 0;

  return (
    <div>
      <PageHeader
        title="Notifications"
        description={unreadCount > 0 ? `${unreadCount} unread notification(s)` : "You're all caught up"}
        action={
          unreadCount > 0 ? (
            <Button variant="outline" onClick={markAllAsRead}>
              <CheckCheck className="mr-2 h-4 w-4" /> Mark All Read
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4">
        <Select value={filter} onValueChange={(v) => { setFilter(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="false">Unread</SelectItem>
            <SelectItem value="true">Read</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : data?.data?.length === 0 ? (
        <EmptyState
          icon={<BellOff className="h-12 w-12" />}
          title="No notifications"
          description="You'll see notifications here when something important happens"
        />
      ) : (
        <div className="space-y-2">
          {data?.data?.map(
            (notification: {
              _id: string;
              title: string;
              message: string;
              type: string;
              isRead: boolean;
              link?: string;
              createdAt: string;
            }) => (
              <Card
                key={notification._id}
                className={cn(
                  "transition-colors",
                  !notification.isRead && "border-primary/30 bg-primary/5"
                )}
              >
                <CardContent className="flex items-start gap-4 py-4">
                  <div className="mt-0.5">
                    {notification.isRead ? (
                      <Mail className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Bell className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn("text-sm font-medium", !notification.isRead && "font-semibold")}>
                        {notification.title}
                      </p>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {notification.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(notification.createdAt), "MMM d, yyyy h:mm a")}
                      </span>
                      {notification.link && (
                        <Link href={notification.link} className="text-xs text-primary hover:underline">
                          View details
                        </Link>
                      )}
                    </div>
                  </div>
                  {!notification.isRead && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => markAsRead(notification._id)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          )}

          {data?.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Page {data.page} of {data.totalPages}
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
