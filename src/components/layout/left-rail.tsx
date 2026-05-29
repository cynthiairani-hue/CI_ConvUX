"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import { useLayout } from "@/contexts/layout-context";
import { useCampaign } from "@/contexts/campaign-context";
import { useAICompanion } from "@/contexts/ai-companion-context";
import { usePersona } from "@/contexts/persona-context";
import { navItems } from "@/data/navigation";
import { LeftRailNavItem } from "./left-rail-nav-item";
import { PersonaSwitcher } from "@/components/persona/persona-switcher";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function LeftRail() {
  const { leftRailCollapsed, toggleLeftRail } = useLayout();
  const pathname = usePathname();
  const { getPendingForPersona, savedNarratives, setActiveStrategy, setActiveNarrative, setActiveAudience, hydrated } = useCampaign();
  const { state, setState: setAIState } = useAICompanion();
  const { activePersona } = usePersona();
  const prevPathname = useRef(pathname);

  // When navigating to a new page:
  // 1. Always clear active artifacts so the destination page renders (not the artifact canvas)
  // 2. Convert split view → floating so chat follows the user
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      // Always clear artifacts on navigation — otherwise hasArtifact keeps
      // rendering the artifact canvas instead of the page content
      setActiveStrategy(null);
      setActiveNarrative(null);
      setActiveAudience(null);

      // Split mode converts to floating so chat follows the user
      if (state === "split") {
        setAIState("floating");
      }
    }
    prevPathname.current = pathname;
  }, [pathname, state, setAIState, setActiveStrategy, setActiveNarrative, setActiveAudience]);

  const pendingCount = hydrated ? getPendingForPersona(activePersona.id).length : 0;
  const narrativeCount = hydrated ? savedNarratives.length : 0;

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
            badge={item.id === "approvals" ? pendingCount : item.id === "reports" ? narrativeCount : item.badge}
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
