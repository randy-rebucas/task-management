"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import useSWR from "swr";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function NotificationBell() {
  const { data } = useSWR("/api/notifications?unreadCount=true", fetcher, {
    refreshInterval: 30000,
  });

  const count = data?.unreadCount || 0;

  return (
    <Button variant="ghost" size="icon" asChild className="relative">
      <Link href="/notifications">
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Link>
    </Button>
  );
}
