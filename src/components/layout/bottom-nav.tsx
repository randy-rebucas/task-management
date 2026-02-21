"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  CheckSquare,
  MapPin,
  Camera,
  Briefcase,
  Smartphone,
} from "lucide-react";

const TABS = [
  { label: "Tasks", href: "/my-tasks", icon: CheckSquare },
  { label: "Visit", href: "/visit-logs/new", icon: MapPin },
  { label: "Field", href: "/field", icon: Smartphone, primary: true },
  { label: "Proof", href: "/proof-of-work", icon: Camera },
  { label: "CRM", href: "/crm", icon: Briefcase },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background lg:hidden">
      <div className="flex h-16 items-stretch">
        {TABS.map(({ label, href, icon: Icon, primary }) => {
          const isActive =
            pathname === href || (href !== "/field" && pathname.startsWith(href));

          if (primary) {
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-1 flex-col items-center justify-center gap-0.5"
              >
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-primary/10 text-primary hover:bg-primary/20"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-[10px] font-medium text-primary">{label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
      {/* iOS safe area */}
      <div className="h-safe-bottom bg-background" />
    </nav>
  );
}
