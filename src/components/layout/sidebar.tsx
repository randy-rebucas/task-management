"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems, type NavItem } from "@/config/nav";
import { usePermissions } from "@/features/auth/use-permissions";
import { CheckSquare, ChevronDown, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export function Sidebar() {
  const pathname = usePathname();
  const { can, permissions } = usePermissions();
  const isSuperAdmin = permissions.has("*:*") || Array.from(permissions).length > 1000;

  const filteredItems = isSuperAdmin ? navItems : navItems.filter(
    (item) => !item.permission || can(item.permission)
  );

  return (
    <aside className="hidden w-64 border-r bg-sidebar lg:block">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <CheckSquare className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold">Task Manager</span>
      </div>
      <ScrollArea className="h-[calc(100vh-4rem)]">
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
    </aside>
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
