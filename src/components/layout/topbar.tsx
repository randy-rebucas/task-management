"use client";

import { useSession, signOut } from "next-auth/react";
import { LogOut, Menu, User, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { MobileNav } from "./mobile-nav";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { GlobalSearch } from "@/components/shared/global-search";
import { useSubscription } from "@/hooks/use-subscription";
import Link from "next/link";
import { cn } from "@/lib/utils";

const PLAN_LABEL: Record<string, string> = {
  starter: "Starter",
  growth: "Growth",
  business: "Business",
  enterprise: "Enterprise",
};

export function Topbar() {
  const { data: session } = useSession();
  const { subscription, isLoading, isActive, isTrialing, trialDaysLeft } = useSubscription();

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U";

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-4 lg:px-6">
      <div className="flex items-center gap-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <VisuallyHidden>
              <SheetTitle>Navigation</SheetTitle>
            </VisuallyHidden>
            <MobileNav />
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex items-center gap-3">
        {/* Subscription badge */}
        {!isLoading && (
          <>
            {subscription && isActive ? (
              <Link
                href="/settings/subscription"
                className={cn(
                  "hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-opacity hover:opacity-80",
                  isTrialing
                    ? "bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/30"
                    : "bg-primary/10 text-primary ring-1 ring-primary/20"
                )}
              >
                <Zap className="h-3 w-3" />
                {PLAN_LABEL[subscription.plan] ?? subscription.plan}
                {isTrialing && trialDaysLeft !== null && (
                  <span className="ml-1 opacity-70">· {trialDaysLeft}d trial</span>
                )}
              </Link>
            ) : !subscription ? (
              <Link
                href="/#pricing"
                className="hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-muted text-muted-foreground ring-1 ring-border hover:bg-accent transition-colors"
              >
                <Zap className="h-3 w-3" />
                No plan
              </Link>
            ) : null}
          </>
        )}

        <GlobalSearch />

        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex flex-col space-y-1 leading-none">
                <p className="font-medium">{session?.user?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {session?.user?.email}
                </p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/settings/profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
              className="flex items-center gap-2 text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
