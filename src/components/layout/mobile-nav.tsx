"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems } from "@/config/nav";
import { usePermissions } from "@/hooks/use-permissions";
import { CheckSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export function MobileNav() {
  const pathname = usePathname();
  const { can } = usePermissions();

  const filteredItems = navItems.filter(
    (item) => !item.permission || can(item.permission)
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <CheckSquare className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold">Task Manager</span>
      </div>
      <ScrollArea className="flex-1">
        <nav className="space-y-1 p-4">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
    </div>
  );
}
