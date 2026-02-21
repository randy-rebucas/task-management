"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems, type NavItem } from "@/config/nav";
import { usePermissions } from "@/features/auth/use-permissions";
import { CheckSquare, ChevronDown, ChevronRight, Zap, AlertTriangle, ArrowUpRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSubscription } from "@/hooks/use-subscription";

const PLAN_LABEL: Record<string, string> = {
  starter: "Starter",
  growth: "Growth",
  business: "Business",
  enterprise: "Enterprise",
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "bg-emerald-500",
  APPROVED: "bg-emerald-500",
  APPROVAL_PENDING: "bg-amber-500",
  SUSPENDED: "bg-orange-500",
  CANCELLED: "bg-red-500",
  EXPIRED: "bg-red-500",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  APPROVED: "Active",
  APPROVAL_PENDING: "Pending",
  SUSPENDED: "Suspended",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

export function Sidebar() {
  const pathname = usePathname();
  const { can, permissions } = usePermissions();
  const isSuperAdmin = permissions.has("*:*") || Array.from(permissions).length > 1000;

  const filteredItems = isSuperAdmin ? navItems : navItems.filter(
    (item) => !item.permission || can(item.permission)
  );

  return (
    <aside className="hidden w-64 border-r bg-sidebar lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-2 border-b px-6 shrink-0">
        <CheckSquare className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold">Task Manager</span>
      </div>

      <ScrollArea className="flex-1">
        <nav className="space-y-1 p-4">
          {filteredItems.map((item) =>
            item.children ? (
              <SidebarGroup
                key={item.href}
                item={item}
                pathname={pathname}
                can={can}
                isSuperAdmin={isSuperAdmin}
              />
            ) : (
              <SidebarItem
                key={item.href}
                item={item}
                isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
              />
            )
          )}
        </nav>
      </ScrollArea>

      <SubscriptionPanel />
    </aside>
  );
}

function SubscriptionPanel() {
  const { subscription, isLoading, isOwner, isActive, isTrialing, trialDaysLeft } = useSubscription();

  if (isLoading) return null;

  /* No active subscription — only show upgrade prompt to the owner */
  if (!subscription || !isActive) {
    if (!isOwner) return null;
    return (
      <div className="shrink-0 border-t p-4">
        <Link
          href="/subscribe"
          className="flex items-center gap-2.5 rounded-lg bg-primary/10 px-3 py-2.5 text-xs font-medium text-primary hover:bg-primary/15 transition-colors"
        >
          <Zap className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">Upgrade your plan</span>
          <ArrowUpRight className="h-3 w-3 opacity-60" />
        </Link>
      </div>
    );
  }

  const statusColor = STATUS_COLOR[subscription.status] ?? "bg-gray-400";
  const statusLabel = STATUS_LABEL[subscription.status] ?? subscription.status;

  /* Staff: read-only plan badge, no links */
  if (!isOwner) {
    return (
      <div className="shrink-0 border-t p-4">
        <div className="rounded-lg border bg-muted/40 px-3 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-foreground">
                {PLAN_LABEL[subscription.plan] ?? subscription.plan} Plan
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className={cn("h-1.5 w-1.5 rounded-full", statusColor)} />
              <span className="text-[11px] text-muted-foreground">{statusLabel}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* Owner: full panel with manage link */
  return (
    <div className="shrink-0 border-t p-4">
      <Link
        href="/settings/subscription"
        className="block rounded-lg border bg-muted/40 px-3 py-2.5 hover:bg-muted/70 transition-colors group"
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-foreground">
              {PLAN_LABEL[subscription.plan] ?? subscription.plan} Plan
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className={cn("h-1.5 w-1.5 rounded-full", statusColor)} />
            <span className="text-[11px] text-muted-foreground">{statusLabel}</span>
          </div>
        </div>

        {isTrialing && trialDaysLeft !== null && (
          <div className="flex items-center gap-1.5 mt-1.5 rounded-md bg-amber-500/10 px-2 py-1">
            <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
              {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} left in trial
            </span>
          </div>
        )}

        {!isTrialing && subscription.nextBillingTime && (
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Renews {new Date(subscription.nextBillingTime).toLocaleDateString()}
          </p>
        )}

        <p className="text-[10px] text-muted-foreground/60 mt-1.5 group-hover:text-muted-foreground transition-colors">
          Manage subscription →
        </p>
      </Link>
    </div>
  );
}

function SidebarGroup({
  item,
  pathname,
  can,
  isSuperAdmin,
}: {
  item: NavItem;
  pathname: string;
  can: (p: string) => boolean;
  isSuperAdmin: boolean;
}) {
  const isAnyChildActive = item.children?.some(
    (child) => pathname === child.href || pathname.startsWith(child.href + "/")
  );
  const [open, setOpen] = useState(!!isAnyChildActive);
  const Icon = item.icon;

  const visibleChildren = isSuperAdmin
    ? item.children ?? []
    : (item.children ?? []).filter((c) => !c.permission || can(c.permission));

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isAnyChildActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1 text-left">{item.title}</span>
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {open && visibleChildren.length > 0 && (
        <div className="ml-4 mt-1 space-y-1 border-l pl-3">
          {visibleChildren.map((child) => (
            <SidebarItem
              key={child.href}
              item={child}
              isActive={pathname === child.href || pathname.startsWith(child.href + "/")}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarItem({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      {item.title}
    </Link>
  );
}
