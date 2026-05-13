"use client";

import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import { useLayout } from "@/contexts/layout-context";
import { navItems } from "@/data/navigation";
import { LeftRailNavItem } from "./left-rail-nav-item";
import { PersonaSwitcher } from "@/components/persona/persona-switcher";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function LeftRail() {
  const { leftRailCollapsed, toggleLeftRail } = useLayout();
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r bg-background transition-all duration-200",
        leftRailCollapsed ? "w-16" : "w-60"
      )}
    >
      <div
        className={cn(
          "flex h-14 items-center border-b px-4",
          leftRailCollapsed ? "justify-center px-2" : "justify-between"
        )}
      >
        {!leftRailCollapsed && (
          <span className="text-sm font-semibold tracking-tight">
            FuseIQ
          </span>
        )}
        <button
          onClick={toggleLeftRail}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {leftRailCollapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {navItems.map((item) => (
          <LeftRailNavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            href={item.href}
            badge={item.badge}
            isActive={pathname.startsWith(item.href)}
            isCollapsed={leftRailCollapsed}
          />
        ))}
      </nav>

      <Separator />
      <div className="p-2">
        <PersonaSwitcher collapsed={leftRailCollapsed} />
      </div>
    </aside>
  );
}
