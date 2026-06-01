"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Search, Check, Plug, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  integrations as DEFAULT_INTEGRATIONS,
  CATEGORY_LABELS,
  type Integration,
  type IntegrationCategory,
  type IntegrationStatus,
} from "@/data/integrations";
import { PageChatInput } from "@/components/ai-companion/page-chat-input";

/* ──────────────────────────────────────────────
   localStorage persistence for connector state
   ────────────────────────────────────────────── */

const STORAGE_KEY = "fuseiq-connectors";

interface ConnectorState {
  [integrationId: string]: {
    connected: boolean;
    lastSyncedAt: string | null;
  };
}

function loadConnectorState(): ConnectorState {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistConnectorState(state: ConnectorState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Merge default integrations with persisted connector state */
function hydrateIntegrations(state: ConnectorState): Integration[] {
  return DEFAULT_INTEGRATIONS.map((i) => {
    if (i.status === "coming-soon") return i;
    const saved = state[i.id];
    if (saved) {
      return {
        ...i,
        status: saved.connected ? "connected" as IntegrationStatus : "available" as IntegrationStatus,
        lastSyncedAt: saved.lastSyncedAt ?? undefined,
      };
    }
    return i;
  });
}

/* ──────────────────────────────────────────────
   Time formatting
   ────────────────────────────────────────────── */

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ──────────────────────────────────────────────
   Toggle switch
   ────────────────────────────────────────────── */

function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        checked ? "bg-emerald-500" : "bg-[#D1D5DB]",
        disabled && "cursor-not-allowed opacity-40"
      )}
    >
      <span
        className={cn(
          "inline-block rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-[3px]"
        )}
        style={{ width: 18, height: 18 }}
      />
    </button>
  );
}

/* ──────────────────────────────────────────────
   Integration card — toggleable connector
   ────────────────────────────────────────────── */

function IntegrationCard({
  integration,
  onToggle,
}: {
  integration: Integration;
  onToggle: (id: string, connected: boolean) => void;
}) {
  const isComingSoon = integration.status === "coming-soon";
  const isConnected = integration.status === "connected";

  return (
    <div
      className={cn(
        "group flex items-start gap-3.5 rounded-xl border bg-card p-4 transition-all",
        isComingSoon
          ? "opacity-40"
          : "hover:shadow-sm hover:border-foreground/10"
      )}
    >
      {/* Logo */}
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: integration.logoBg }}
      >
        <span
          className="text-[11px] font-bold leading-none"
          style={{ color: integration.logoColor }}
        >
          {integration.logoEmoji}
        </span>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {integration.name}
          </span>
          {isConnected && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
              <Check className="h-2.5 w-2.5" />
              Connected
            </span>
          )}
          {isComingSoon && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              Coming soon
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground line-clamp-2">
          {integration.description}
        </p>

        {/* Connected metadata */}
        {isConnected && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            {integration.dataPoints && (
              <span className="text-[11px] text-muted-foreground">
                {integration.dataPoints.slice(0, 3).join(" · ")}
                {integration.dataPoints.length > 3 && ` +${integration.dataPoints.length - 3}`}
              </span>
            )}
            {integration.lastSyncedAt && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/70">
                <RefreshCw className="h-2.5 w-2.5" />
                Synced {timeAgo(integration.lastSyncedAt)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Toggle */}
      <div className="shrink-0 pt-0.5">
        <ToggleSwitch
          checked={isConnected}
          onChange={(v) => onToggle(integration.id, v)}
          disabled={isComingSoon}
        />
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Main Settings / Integrations Page
   ────────────────────────────────────────────── */

type Tab = "installed" | "all";

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<IntegrationCategory>("all");
  const [connectorState, setConnectorState] = useState<ConnectorState>({});
  const [hydrated, setHydrated] = useState(false);

  // Load persisted state
  useEffect(() => {
    setConnectorState(loadConnectorState());
    setHydrated(true);
  }, []);

  const allIntegrations = useMemo(
    () => hydrateIntegrations(connectorState),
    [connectorState]
  );

  const connectedCount = allIntegrations.filter((i) => i.status === "connected").length;

  const handleToggle = useCallback((id: string, connected: boolean) => {
    setConnectorState((prev) => {
      const next = {
        ...prev,
        [id]: {
          connected,
          lastSyncedAt: connected ? new Date().toISOString() : null,
        },
      };
      persistConnectorState(next);
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    let result = allIntegrations;

    // Tab filter
    if (tab === "installed") {
      result = result.filter((i) => i.status === "connected");
    }

    // Category filter (only on "all" tab)
    if (tab === "all" && category !== "all") {
      result = result.filter((i) => i.category === category);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q)
      );
    }

    // Sort: connected first, then available, then coming-soon
    const order: Record<IntegrationStatus, number> = {
      connected: 0,
      available: 1,
      "coming-soon": 2,
    };
    return [...result].sort((a, b) => order[a.status] - order[b.status]);
  }, [tab, category, search, allIntegrations]);

  // Group by category for the "all" tab when no category filter
  const grouped = useMemo(() => {
    if (tab === "installed" || category !== "all") return null;

    const groups: { category: IntegrationCategory; items: Integration[] }[] = [];
    const seen = new Set<IntegrationCategory>();

    for (const item of filtered) {
      if (!seen.has(item.category)) {
        seen.add(item.category);
        groups.push({
          category: item.category,
          items: filtered.filter((i) => i.category === item.category),
        });
      }
    }
    return groups;
  }, [filtered, tab, category]);

  const categories: IntegrationCategory[] = [
    "all",
    "ad-platforms",
    "analytics",
    "crm",
    "ecommerce",
    "attribution",
    "creative",
    "data-warehouse",
  ];

  // Don't render until hydrated to avoid flash
  if (!hydrated) return null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className="mx-auto my-auto w-full max-w-3xl px-4 sm:px-8 py-10">
          {/* Header */}
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Connectors
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect your marketing stack. Toggle connectors on to start syncing data.
          </p>

          {/* Tabs */}
          <div className="mt-6 flex items-center gap-1 border-b">
            <button
              onClick={() => { setTab("all"); setCategory("all"); }}
              className={cn(
                "relative px-3 py-2 text-sm font-medium transition-colors",
                tab === "all"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              All connectors
              {tab === "all" && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-foreground" />
              )}
            </button>
            <button
              onClick={() => setTab("installed")}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors",
                tab === "installed"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Connected
              <span className="rounded-full bg-muted px-1.5 py-0 text-xs text-muted-foreground">
                {connectedCount}
              </span>
              {tab === "installed" && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-foreground" />
              )}
            </button>
          </div>

          {/* Search + category filter */}
          <div className="mt-5 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search connectors..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Category pills — only on All tab */}
          {tab === "all" && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                    category === c
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
          )}

          {/* Results */}
          <div className="mt-6">
            {/* Grouped view (all tab, no category filter) */}
            {grouped
              ? grouped.map((group) => (
                  <div key={group.category} className="mb-8">
                    <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {CATEGORY_LABELS[group.category]}
                    </h2>
                    <div className="grid grid-cols-1 gap-2">
                      {group.items.map((integration) => (
                        <IntegrationCard
                          key={integration.id}
                          integration={integration}
                          onToggle={handleToggle}
                        />
                      ))}
                    </div>
                  </div>
                ))
              : /* Flat view (installed tab or filtered category) */
                <div className="grid grid-cols-1 gap-2">
                  {filtered.map((integration) => (
                    <IntegrationCard
                      key={integration.id}
                      integration={integration}
                      onToggle={handleToggle}
                    />
                  ))}
                </div>
            }

            {filtered.length === 0 && (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                  <Plug className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-medium text-foreground">
                  {tab === "installed"
                    ? "No connectors enabled yet"
                    : "No connectors match your search"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {tab === "installed"
                    ? "Browse all connectors to get started."
                    : "Try a different search term or category."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0 pb-6 pt-2">
        <PageChatInput placeholder="Ask about connectors, data sync, or platform setup..." />
      </div>
    </div>
  );
}
