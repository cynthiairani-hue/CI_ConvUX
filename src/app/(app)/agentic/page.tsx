"use client";

/* ── Agentic Explorations ──
   The agentic layer of the marketing org, in two halves:
   - CHANNELS: where the brand surfaces inside third-party AI agents (Claude,
     ChatGPT, Copilot…). Readiness is the app's Ready/Limited/Blocked
     vocabulary; turning a channel on is an explicit authorization; a
     manage-for-me Operator runs only inside stated guardrails.
   - AGENTS: the roster — people and agents side by side. Every orchestration
     flow on any canvas is an agent here, with its scope, status, owner, and a
     jump back to the canvas it lives on. All integrations simulated, like
     every integration in the prototype. */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bot, Check, ShieldCheck, BookOpen, PackageSearch, ScrollText, ExternalLink, Zap } from "lucide-react";
import { approvers } from "@/data/approvers";
import { usePersona } from "@/contexts/persona-context";
import { useCampaign } from "@/contexts/campaign-context";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageChatInput } from "@/components/ai-companion/page-chat-input";
import { loadCanvasProjects, loadFlows } from "@/lib/storage";
import type { OrchestrationFlow } from "@/types/orchestration";
import { cn } from "@/lib/utils";

/* ── Local state model (persisted) ── */

type SourceState = "ready" | "limited" | "blocked";
interface AgenticState {
  channels: Record<string, "off" | "active">;
  sources: { catalog: SourceState; knowledge: SourceState; policies: SourceState };
  manageForMe: boolean;
}

const STORAGE_KEY = "fuseiq-agentic";
const DEFAULT_STATE: AgenticState = {
  channels: {},
  sources: { catalog: "ready", knowledge: "limited", policies: "blocked" },
  manageForMe: false,
};

const CHANNELS = [
  { id: "claude", name: "Claude", desc: "Product recommendations inside Claude conversations and artifacts" },
  { id: "chatgpt", name: "ChatGPT", desc: "Shopping answers and product carousels in ChatGPT" },
  { id: "copilot", name: "Microsoft Copilot", desc: "Recommendations in Copilot across Windows and Edge" },
  { id: "gemini", name: "Gemini", desc: "Google AI Mode and Gemini shopping results" },
  { id: "perplexity", name: "Perplexity", desc: "Cited product answers with buy links" },
] as const;

const READINESS_CHIP: Record<SourceState, string> = {
  ready: "bg-emerald-50 text-emerald-700",
  limited: "bg-amber-50 text-amber-700",
  blocked: "bg-red-50 text-red-600",
};

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

export default function AgenticPage() {
  const { activePersona } = usePersona();
  const { showToast } = useCampaign();
  const [tab, setTab] = useState<"channels" | "agents">("channels");
  const [state, setState] = useState<AgenticState>(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);
  const [authorizing, setAuthorizing] = useState<(typeof CHANNELS)[number] | null>(null);
  const [confirmingManage, setConfirmingManage] = useState(false);
  const [agents, setAgents] = useState<{ flow: OrchestrationFlow; projectId: string; projectName: string }[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...DEFAULT_STATE, ...(JSON.parse(raw) as AgenticState) });
    } catch { /* fresh state */ }
    // The roster: every flow on every canvas is an agent.
    const roster = loadCanvasProjects().flatMap((p) =>
      loadFlows(p.id).map((flow) => ({ flow, projectId: p.id, projectName: p.name }))
    );
    setAgents(roster);
    setLoaded(true);
  }, []);

  const update = useCallback((next: AgenticState) => {
    setState(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* n/a */ }
  }, []);

  /* Channel readiness derives from the shared sources — the same
     Ready/Limited/Blocked states the rest of the app uses. */
  const channelReadiness: SourceState =
    state.sources.policies === "blocked" ? "blocked"
    : Object.values(state.sources).every((s) => s === "ready") ? "ready"
    : "limited";

  const fixSource = (key: keyof AgenticState["sources"], toast: string) => {
    update({ ...state, sources: { ...state.sources, [key]: "ready" } });
    showToast(toast);
  };

  const sourceRows = [
    {
      key: "catalog" as const, icon: PackageSearch, label: "Product catalog",
      detail: state.sources.catalog === "ready" ? "128 products syndicated — refreshed 2h ago" : "Catalog not connected",
      action: null,
    },
    {
      key: "knowledge" as const, icon: BookOpen, label: "Brand knowledge base",
      detail: state.sources.knowledge === "ready" ? "214 facts — agents answer with current brand info" : "214 facts, 31 stale — agents may answer with outdated shipping info",
      action: state.sources.knowledge !== "ready" ? { label: "Refresh", toast: "Knowledge base refreshed — 31 facts updated from your site" } : null,
    },
    {
      key: "policies" as const, icon: ScrollText, label: "Policies",
      detail: state.sources.policies === "ready" ? "Returns, shipping, and privacy are agent-readable" : "Return policy isn't agent-readable — agents can't answer returns questions",
      action: state.sources.policies !== "ready" ? { label: "Make agent-readable", toast: "Policies published in agent-readable format" } : null,
    },
  ];

  const activeCount = Object.values(state.channels).filter((s) => s === "active").length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className="mx-auto my-auto w-full max-w-3xl px-4 sm:px-8 py-10">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Agentic</h1>
            <span className="rounded-full bg-[#F3F0FF] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#7C5CFC]">Exploration</span>
          </div>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Where your brand meets AI agents — and where your agents work for you.
          </p>

          {/* Tabs — chips, same as the list pages */}
          <div className="mt-4 flex items-center gap-1">
            {(["channels", "agents"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-[12px] font-medium capitalize transition-colors",
                  tab === t ? "bg-foreground text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {t === "channels" ? `Channels${activeCount > 0 ? ` (${activeCount} active)` : ""}` : `Agents (${agents.length})`}
              </button>
            ))}
          </div>

          {tab === "channels" ? (
            <div className="mt-4 space-y-4">
              {/* Sources — what the agents read. Readiness gates the channels. */}
              <div className="rounded-xl border border-border bg-white p-4">
                <h2 className="text-[13px] font-semibold text-foreground">Sources</h2>
                <p className="mt-0.5 text-[12px] text-muted-foreground">What AI agents read when they recommend you. Readiness gates every channel below.</p>
                <div className="mt-3 space-y-2">
                  {sourceRows.map((row) => (
                    <div key={row.key} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
                      <row.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-foreground">{row.label}</span>
                          <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide", READINESS_CHIP[state.sources[row.key]])}>
                            {state.sources[row.key]}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{row.detail}</p>
                      </div>
                      {row.action && (
                        <button
                          type="button"
                          onClick={() => fixSource(row.key, row.action!.toast)}
                          className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-[12px] font-medium text-foreground hover:bg-accent"
                        >
                          {row.action.label}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Channels — activation is an explicit authorization, never a default. */}
              <div className="rounded-xl border border-border bg-white p-4">
                <h2 className="text-[13px] font-semibold text-foreground">Agent channels</h2>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  Each channel is authorized individually. Conversions are attributed per channel and appear in media plans as the <span className="font-medium text-foreground">AI Agents</span> line.
                </p>
                <div className="mt-3 space-y-2">
                  {CHANNELS.map((ch) => {
                    const active = state.channels[ch.id] === "active";
                    return (
                      <div key={ch.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F3F0FF]">
                          <Bot className="h-4 w-4 text-[#7C5CFC]" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-medium text-foreground">{ch.name}</span>
                            {active ? (
                              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                              </span>
                            ) : (
                              <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide", READINESS_CHIP[channelReadiness])}>
                                {channelReadiness}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{ch.desc}</p>
                        </div>
                        {active ? (
                          <button
                            type="button"
                            onClick={() => { update({ ...state, channels: { ...state.channels, [ch.id]: "off" } }); showToast(`${ch.name} paused — your products no longer surface there`); }}
                            className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-[12px] font-medium text-foreground hover:bg-accent"
                          >
                            Pause
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={channelReadiness === "blocked"}
                            onClick={() => setAuthorizing(ch)}
                            title={channelReadiness === "blocked" ? "Fix the blocked source above first" : undefined}
                            className="shrink-0 rounded-lg bg-foreground px-2.5 py-1 text-[12px] font-medium text-background hover:bg-foreground/90 disabled:opacity-40"
                          >
                            Authorize
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Manage-for-me — the Operator pattern: delegation inside stated guardrails. */}
              <div className="rounded-xl border border-border bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
                      <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                      Let FuseIQ manage agentic readiness
                    </h2>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">
                      Keeps the catalog synced, knowledge fresh, and policies agent-readable — inside these guardrails:
                    </p>
                  </div>
                  {state.manageForMe ? (
                    <button
                      type="button"
                      onClick={() => { update({ ...state, manageForMe: false }); showToast("Delegation revoked — FuseIQ no longer acts on agentic readiness"); }}
                      className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-[12px] font-medium text-foreground hover:bg-accent"
                    >
                      Revoke
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingManage(true)}
                      className="shrink-0 rounded-lg bg-foreground px-2.5 py-1 text-[12px] font-medium text-background hover:bg-foreground/90"
                    >
                      Delegate
                    </button>
                  )}
                </div>
                <ul className="mt-2.5 space-y-1 text-[12px] text-muted-foreground">
                  <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-600" /> Refreshes sources only — never activates a channel, never changes pricing or policies</li>
                  <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-600" /> Syndication spend capped at the plan&apos;s AI Agents line budget</li>
                  <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-600" /> Weekly digest of every action taken, revocable anytime</li>
                </ul>
                {state.manageForMe && (
                  <p className="mt-2.5 rounded-lg bg-[#F3F0FF] px-3 py-2 text-[12px] text-[#7C5CFC]">
                    Delegation active — FuseIQ refreshed the knowledge base 2h ago and re-synced 6 catalog items yesterday.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {/* People — the human half of the roster. */}
              <div className="rounded-xl border border-border bg-white p-4">
                <h2 className="text-[13px] font-semibold text-foreground">People</h2>
                <div className="mt-3 space-y-2">
                  {[{ id: "me", name: activePersona.name, role: activePersona.verticalLabel }, ...approvers.filter((a) => a.name !== activePersona.name)].map((p) => (
                    <div key={p.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground">
                        {p.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-foreground">{p.name}{p.id === "me" ? " (you)" : ""}</span>
                        <span className="block truncate text-[12px] text-muted-foreground">{p.role}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Agents — every flow is a teammate with a scope and a paper trail. */}
              <div className="rounded-xl border border-border bg-white p-4">
                <h2 className="text-[13px] font-semibold text-foreground">Agents</h2>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  Every workflow you&apos;ve built is an agent: named, scoped, and supervised. Actions stay locked until you authorize them.
                </p>
                <div className="mt-3 space-y-2">
                  {loaded && agents.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center">
                      <Bot className="mx-auto mb-1.5 h-5 w-5 text-muted-foreground/50" />
                      <p className="text-[12px] text-muted-foreground">
                        No agents yet — describe an automation in chat (&ldquo;when CPA rises above $40, pause the worst line&rdquo;) or add a flow template from a canvas.
                      </p>
                    </div>
                  )}
                  {agents.map(({ flow, projectId, projectName }) => {
                    const trigger = flow.nodes.find((n) => n.kind === "trigger");
                    const actions = flow.nodes.filter((n) => n.kind === "action");
                    const authorized = actions.filter((a) => a.authorized).length;
                    const dot = flow.status === "active" ? "bg-emerald-500" : flow.status === "paused" ? "bg-amber-500" : "bg-muted-foreground/50";
                    return (
                      <div key={flow.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F3F0FF]">
                          <Zap className="h-4 w-4 text-[#7C5CFC]" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-[13px] font-medium text-foreground">{flow.name}</span>
                            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dot)} />
                            <span className="shrink-0 text-[11px] capitalize text-muted-foreground">{flow.status}</span>
                          </div>
                          <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                            {trigger?.title ?? "Flow"} · {authorized}/{actions.length} actions authorized · owned by {activePersona.name} · {timeAgo(flow.lastModifiedAt)}
                          </p>
                        </div>
                        <Link
                          href={`/canvas/${projectId}?focus=${flow.id}`}
                          className="flex shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[12px] font-medium text-foreground hover:bg-accent"
                          title={`Open on ${projectName} — jumps to this agent`}
                        >
                          Open canvas <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 pb-6 pt-2">
        <PageChatInput placeholder="Ask about agentic channels, readiness, or your agents..." />
      </div>

      <ConfirmDialog
        open={authorizing !== null}
        title={`Activate ${authorizing?.name ?? "this channel"}?`}
        description={`Your product catalog, brand knowledge, and policies become discoverable inside ${authorizing?.name ?? "the channel"}. Conversions it drives are attributed to the AI Agents line in your media plans. You can pause it anytime — this authorizes surfacing only, never spend changes.`}
        confirmLabel="Activate channel"
        onConfirm={() => {
          if (authorizing) {
            update({ ...state, channels: { ...state.channels, [authorizing.id]: "active" } });
            showToast(`${authorizing.name} is live — conversions will attribute to the AI Agents line`);
          }
          setAuthorizing(null);
        }}
        onCancel={() => setAuthorizing(null)}
      />
      <ConfirmDialog
        open={confirmingManage}
        title="Delegate agentic readiness to FuseIQ?"
        description="FuseIQ keeps your catalog, knowledge base, and policies agent-ready within the guardrails listed: source refreshes only, spend capped at the plan's AI Agents budget, weekly digest, revocable anytime. It never activates channels on its own."
        confirmLabel="Delegate"
        onConfirm={() => {
          update({ ...state, manageForMe: true });
          setConfirmingManage(false);
          showToast("Delegation active — FuseIQ will keep your agentic sources ready");
        }}
        onCancel={() => setConfirmingManage(false)}
      />
    </div>
  );
}
