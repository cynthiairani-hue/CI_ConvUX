"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { PanelLeftClose, PanelLeft, MessageSquare } from "lucide-react";
import { useLayout } from "@/contexts/layout-context";
import { useCampaign } from "@/contexts/campaign-context";
import { useAICompanion } from "@/contexts/ai-companion-context";
import { usePersona } from "@/contexts/persona-context";
import { navItems } from "@/data/navigation";
import { LeftRailNavItem } from "./left-rail-nav-item";
import { ClientSwitcher } from "./client-switcher";
import { PersonaSwitcher } from "@/components/persona/persona-switcher";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function LeftRail() {
  const { leftRailCollapsed, toggleLeftRail } = useLayout();
  const pathname = usePathname();
  const { getPendingForPersona, savedNarratives, savedMediaPlans, clearAllArtifacts, hydrated } = useCampaign();
  const { state, setState: setAIState, chatSessions, loadChatSession } = useAICompanion();
  const { activePersona } = usePersona();

  const recentChats = hydrated
    ? [...chatSessions]
        .filter((s) => s.status === "active")
        .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
        .slice(0, 4)
    : [];
  const prevPathname = useRef(pathname);

  // When navigating to a new page:
  // 1. Clear EVERY active artifact so the destination page renders (not a stale
  //    artifact canvas). brief/operator were missed before — covered now.
  // 2. Let the chat FOLLOW the user: split/fullscreen → floating, so the
  //    conversation (and any half-typed input) survives the jump instead of
  //    silently vanishing. Floating already follows; resting stays resting.
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      clearAllArtifacts();
      if (state === "split" || state === "fullscreen") {
        setAIState("floating");
      }
    }
    prevPathname.current = pathname;
  }, [pathname, state, setAIState, clearAllArtifacts]);

  const pendingCount = hydrated ? getPendingForPersona(activePersona.id).length : 0;
  const narrativeCount = hydrated ? savedNarratives.filter((n) => n.status !== "archived").length : 0;
  const isClient = activePersona.role === "client";
  // Client portal: only their performance + shared plans. No internal surfaces.
  const visibleNav = isClient ? navItems.filter((i) => i.id === "home" || i.id === "campaigns") : navItems;
  // Unread agency comments across the client's shared plans → badge on "My Plans".
  const clientUnread = hydrated && isClient
    ? savedMediaPlans.filter((p) => p.sharedWithClient).reduce((n, p) => n + (p.comments ?? []).filter((c) => c.authorRole === "agency" && !c.resolved).length, 0)
    : 0;

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

      {activePersona.vertical === "agency" && (
        <div className={cn("border-b p-2", leftRailCollapsed && "px-2")}>
          <ClientSwitcher collapsed={leftRailCollapsed} />
        </div>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {visibleNav.map((item) => (
          <LeftRailNavItem
            key={item.id}
            icon={item.icon}
            label={
              isClient && item.id === "home"
                ? "Performance"
                : isClient && item.id === "campaigns"
                ? "My Plans"
                : activePersona.vertical === "agency" && item.id === "campaigns"
                ? "Media Plans"
                : activePersona.vertical === "agency" && item.id === "reports"
                ? "Live Status"
                : item.label
            }
            href={item.href}
            badge={
              isClient
                ? item.id === "campaigns" ? clientUnread : undefined
                : item.id === "approvals" ? pendingCount : item.id === "reports" ? narrativeCount : item.badge
            }
            isActive={pathname.startsWith(item.href)}
            isCollapsed={leftRailCollapsed}
            accent={item.id === "canvas" ? "purple" : undefined}
          />
        ))}
      </nav>

      {!isClient && !leftRailCollapsed && recentChats.length > 0 && (
        <>
          <Separator />
          <div className="p-2">
            <div className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Recent</div>
            <div className="space-y-0.5">
              {recentChats.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  // Loading a session preserves the user's current layout and
                  // reopens any plan the chat built (handled in loadChatSession).
                  onClick={() => loadChatSession(s.id)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 truncate">{s.name}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <Separator />
      <div className="p-2">
        <PersonaSwitcher collapsed={leftRailCollapsed} />
      </div>
    </aside>
  );
}
