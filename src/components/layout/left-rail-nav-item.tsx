"use client";

import Link from "next/link";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface LeftRailNavItemProps {
  icon: LucideIcon;
  label: string;
  href: string;
  badge?: number;
  isActive: boolean;
  isCollapsed: boolean;
  /** Experimental surfaces get the collaboration purple, not the default ink. */
  accent?: "purple";
}

export function LeftRailNavItem({
  icon: Icon,
  label,
  href,
  badge,
  isActive,
  isCollapsed,
  accent,
}: LeftRailNavItemProps) {
  const linkContent = (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-accent text-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
        accent === "purple" &&
          (isActive
            ? "bg-[#F3F0FF] text-[#7C5CFC]"
            : "text-[#9B85FD] hover:bg-[#F3F0FF]/60 hover:text-[#7C5CFC]"),
        isCollapsed && "justify-center px-2"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!isCollapsed && (
        <>
          <span className="flex-1">{label}</span>
          {badge !== undefined && badge > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {badge}
            </span>
          )}
        </>
      )}
    </Link>
  );

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right">
          <span>{label}</span>
          {badge !== undefined && badge > 0 && (
            <span className="ml-2 text-xs text-muted-foreground">
              {badge}
            </span>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
}
