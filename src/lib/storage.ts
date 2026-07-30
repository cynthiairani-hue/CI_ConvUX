import type { StrategyPlan, Advertiser, CFONarrative, AudienceSegment, ApprovalRequest, CompetitiveBrief, MediaPlan } from "@/types/campaign";
import type { CanvasWorkspace } from "@/types/canvas";

const STRATEGIES_KEY = "fuseiq-strategies";
const CANVAS_KEY = "fuseiq-canvas";
const MEDIA_PLANS_KEY = "fuseiq-media-plans";
const ADVERTISERS_KEY = "fuseiq-advertisers";
const NARRATIVES_KEY = "fuseiq-narratives";
const AUDIENCES_KEY = "fuseiq-audiences";
const APPROVALS_KEY = "fuseiq-approvals";
const BRIEFS_KEY = "fuseiq-briefs";
const CHAT_SESSIONS_KEY = "fuseiq-chat-sessions";

/* ── Chat session types ── */

export type ChatSessionStatus = "active" | "archived";
export type ChatSessionGroup = "campaigns" | "performance" | "accounts" | "budgets" | "creative" | "audiences" | "general";

export interface ChatSessionMeta {
  id: string;
  name: string;
  status: ChatSessionStatus;
  group: ChatSessionGroup;
  createdAt: string;
  lastMessageAt: string;
  /** Number of user messages (for sorting/display) */
  messageCount: number;
}

/** Full session including serialized messages (stored in separate key to keep meta list small) */
export interface StoredChatSession extends ChatSessionMeta {
  /** We only persist text content + role, not heavy artifacts or images */
  messages: { role: "user" | "assistant"; content: string }[];
}

/* ── Chat session group inference ── */

const GROUP_KEYWORDS: Record<ChatSessionGroup, string[]> = {
  campaigns: ["campaign", "retargeting", "prospecting", "awareness", "launch", "build a", "media plan"],
  performance: ["performing", "performance", "metrics", "roas", "cpc", "analytics", "report", "narrative", "cfo"],
  creative: ["creative", "ad copy", "video", "image", "banner", "design", "asset", "generate creative"],
  audiences: ["audience", "segment", "lookalike", "targeting", "cohort", "customer list"],
  accounts: ["connect", "account", "platform", "google ads", "meta ads", "shopify", "ga4", "tiktok", "linkedin"],
  budgets: ["budget", "spend", "allocation", "pacing", "forecast"],
  general: [],
};

export function inferSessionGroup(firstMessage: string): ChatSessionGroup {
  const lower = firstMessage.toLowerCase();
  for (const [group, keywords] of Object.entries(GROUP_KEYWORDS) as [ChatSessionGroup, string[]][]) {
    if (group === "general") continue;
    if (keywords.some((kw) => lower.includes(kw))) return group;
  }
  return "general";
}

/** Auto-name a session based on the first user message or CTA */
export function autoNameSession(firstMessage: string): string {
  const trimmed = firstMessage.trim();
  // If it's short enough, use as-is
  if (trimmed.length <= 40) return trimmed;
  // Otherwise truncate at word boundary
  const words = trimmed.split(/\s+/);
  let name = "";
  for (const word of words) {
    if ((name + " " + word).length > 36) break;
    name = name ? name + " " + word : word;
  }
  return name + "…";
}

export const SESSION_GROUP_LABELS: Record<ChatSessionGroup, string> = {
  campaigns: "Campaigns",
  performance: "Performance & Reports",
  creative: "Creative & Assets",
  audiences: "Audiences & Targeting",
  accounts: "Data & Accounts",
  budgets: "Budget & Spend",
  general: "General",
};

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage full or unavailable — silently skip
  }
}

export function loadStrategies(): StrategyPlan[] {
  return safeGet<StrategyPlan[]>(STRATEGIES_KEY, []);
}

export function persistStrategies(strategies: StrategyPlan[]): void {
  safeSet(STRATEGIES_KEY, strategies);
}

export function loadCanvas(): CanvasWorkspace | null {
  return safeGet<CanvasWorkspace | null>(CANVAS_KEY, null);
}

export function persistCanvas(workspace: CanvasWorkspace): void {
  safeSet(CANVAS_KEY, workspace);
}

export function loadMediaPlans(): MediaPlan[] {
  return safeGet<MediaPlan[]>(MEDIA_PLANS_KEY, []);
}

export function persistMediaPlans(plans: MediaPlan[]): void {
  safeSet(MEDIA_PLANS_KEY, plans);
}

export function loadAdvertisers(): Advertiser[] {
  return safeGet<Advertiser[]>(ADVERTISERS_KEY, []);
}

export function persistAdvertisers(advertisers: Advertiser[]): void {
  safeSet(ADVERTISERS_KEY, advertisers);
}

export function loadNarratives(): CFONarrative[] {
  return safeGet<CFONarrative[]>(NARRATIVES_KEY, []);
}

export function persistNarratives(narratives: CFONarrative[]): void {
  safeSet(NARRATIVES_KEY, narratives);
}

export function loadAudiences(): AudienceSegment[] {
  return safeGet<AudienceSegment[]>(AUDIENCES_KEY, []);
}

export function persistAudiences(audiences: AudienceSegment[]): void {
  safeSet(AUDIENCES_KEY, audiences);
}

export function loadApprovals(): ApprovalRequest[] {
  return safeGet<ApprovalRequest[]>(APPROVALS_KEY, []);
}

export function persistApprovals(approvals: ApprovalRequest[]): void {
  safeSet(APPROVALS_KEY, approvals);
}

export function loadBriefs(): CompetitiveBrief[] {
  return safeGet<CompetitiveBrief[]>(BRIEFS_KEY, []);
}

export function persistBriefs(briefs: CompetitiveBrief[]): void {
  safeSet(BRIEFS_KEY, briefs);
}

/* ── Chat session persistence ── */

export function loadChatSessions(): StoredChatSession[] {
  return safeGet<StoredChatSession[]>(CHAT_SESSIONS_KEY, []);
}

/** Load only the meta fields (no messages) for display in the UI */
export function loadChatSessionMetas(): ChatSessionMeta[] {
  return loadChatSessions().map((s) => ({
    id: s.id,
    name: s.name,
    status: s.status,
    group: s.group,
    createdAt: s.createdAt,
    lastMessageAt: s.lastMessageAt,
    messageCount: s.messageCount,
  }));
}

export function persistChatSessions(sessions: StoredChatSession[]): void {
  safeSet(CHAT_SESSIONS_KEY, sessions);
}

export function saveChatSession(session: StoredChatSession): void {
  const sessions = loadChatSessions();
  const idx = sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.push(session);
  }
  persistChatSessions(sessions);
}

export function deleteChatSession(sessionId: string): void {
  const sessions = loadChatSessions().filter((s) => s.id !== sessionId);
  persistChatSessions(sessions);
}

export function archiveChatSession(sessionId: string): void {
  const sessions = loadChatSessions();
  const session = sessions.find((s) => s.id === sessionId);
  if (session) {
    session.status = "archived";
    persistChatSessions(sessions);
  }
}

export function renameChatSession(sessionId: string, name: string): void {
  const sessions = loadChatSessions();
  const session = sessions.find((s) => s.id === sessionId);
  if (session) {
    session.name = name;
    persistChatSessions(sessions);
  }
}

export function renameSessionGroup(sessions: StoredChatSession[], oldGroup: ChatSessionGroup, newLabel: string): void {
  // In prototype, group labels are display-only — we store the group key, not the label
  // This is a no-op on the stored data; the UI layer manages custom group labels
  void sessions;
  void oldGroup;
  void newLabel;
}
