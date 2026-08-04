import type { StrategyPlan, Advertiser, CFONarrative, AudienceSegment, ApprovalRequest, CompetitiveBrief, MediaPlan } from "@/types/campaign";
import type { CanvasWorkspace } from "@/types/canvas";
import type { OrchestrationFlow, SavedFlowTemplate } from "@/types/orchestration";
import type { AdTile } from "@/types/creative";

const STRATEGIES_KEY = "fuseiq-strategies";
const CANVAS_KEY = "fuseiq-canvas";
const FLOWS_KEY = "fuseiq-flows";
const FLOW_TEMPLATES_KEY = "fuseiq-flow-templates";
const CREATIVES_KEY = "fuseiq-creatives";
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

/* ── Canvas projects (à la Miro) ──
   The canvas is multi-project: a registry of project metadata plus per-project
   keys ("fuseiq-canvas--<id>", same for flows/creatives). The landing page at
   /canvas lists the registry; each project opens its own workspace. A legacy
   single-workspace install migrates into the first project on first read. */

export interface CanvasProjectMeta {
  id: string;
  name: string;
  status: "active" | "archived";
  createdAt: string;
  lastModifiedAt: string;
}

const CANVAS_PROJECTS_KEY = "fuseiq-canvas-projects";
const projectKey = (base: string, projectId: string) => `${base}--${projectId}`;

function migrateLegacyCanvas(): void {
  try {
    if (localStorage.getItem(CANVAS_PROJECTS_KEY)) return;
    const legacy = localStorage.getItem(CANVAS_KEY);
    if (!legacy) return;
    const id = `cnv-${Date.now().toString(36)}`;
    const now = new Date().toISOString();
    localStorage.setItem(projectKey(CANVAS_KEY, id), legacy);
    for (const base of [FLOWS_KEY, CREATIVES_KEY]) {
      const v = localStorage.getItem(base);
      if (v) localStorage.setItem(projectKey(base, id), v);
      localStorage.removeItem(base);
    }
    localStorage.removeItem(CANVAS_KEY);
    safeSet(CANVAS_PROJECTS_KEY, [{ id, name: "My canvas", status: "active", createdAt: now, lastModifiedAt: now } satisfies CanvasProjectMeta]);
  } catch {
    // localStorage unavailable — nothing to migrate
  }
}

export function loadCanvasProjects(): CanvasProjectMeta[] {
  migrateLegacyCanvas();
  return safeGet<CanvasProjectMeta[]>(CANVAS_PROJECTS_KEY, []);
}

export function persistCanvasProjects(projects: CanvasProjectMeta[]): void {
  safeSet(CANVAS_PROJECTS_KEY, projects);
}

/** Stamp a project's lastModifiedAt — called by the per-project persists. */
export function touchCanvasProject(projectId: string): void {
  const projects = safeGet<CanvasProjectMeta[]>(CANVAS_PROJECTS_KEY, []);
  const i = projects.findIndex((p) => p.id === projectId);
  if (i < 0) return;
  projects[i] = { ...projects[i], lastModifiedAt: new Date().toISOString() };
  safeSet(CANVAS_PROJECTS_KEY, projects);
}

/** Copy one project's workspace/flows/creatives under a new project id. */
export function copyCanvasProjectData(sourceId: string, targetId: string): void {
  try {
    for (const base of [CANVAS_KEY, FLOWS_KEY, CREATIVES_KEY]) {
      const v = localStorage.getItem(projectKey(base, sourceId));
      if (v) localStorage.setItem(projectKey(base, targetId), v);
    }
  } catch {
    // localStorage unavailable
  }
}

/** Remove a project's stored data (registry entry is the caller's job). */
export function deleteCanvasProjectData(projectId: string): void {
  try {
    for (const base of [CANVAS_KEY, FLOWS_KEY, CREATIVES_KEY]) {
      localStorage.removeItem(projectKey(base, projectId));
    }
  } catch {
    // localStorage unavailable
  }
}

/** Light stats for the landing-page cards. */
export function canvasProjectStats(projectId: string): { frames: number; flows: number; notes: number } {
  const ws = safeGet<CanvasWorkspace | null>(projectKey(CANVAS_KEY, projectId), null);
  const flows = safeGet<OrchestrationFlow[]>(projectKey(FLOWS_KEY, projectId), []);
  return { frames: ws?.frames?.length ?? 0, flows: flows.length, notes: ws?.notes?.length ?? 0 };
}

export function loadCanvas(projectId: string): CanvasWorkspace | null {
  return safeGet<CanvasWorkspace | null>(projectKey(CANVAS_KEY, projectId), null);
}

export function persistCanvas(projectId: string, workspace: CanvasWorkspace): void {
  safeSet(projectKey(CANVAS_KEY, projectId), workspace);
  touchCanvasProject(projectId);
}

export function loadFlows(projectId: string): OrchestrationFlow[] {
  return safeGet<OrchestrationFlow[]>(projectKey(FLOWS_KEY, projectId), []);
}

export function persistFlows(projectId: string, flows: OrchestrationFlow[]): void {
  safeSet(projectKey(FLOWS_KEY, projectId), flows);
  touchCanvasProject(projectId);
}

export function loadFlowTemplates(): SavedFlowTemplate[] {
  return safeGet<SavedFlowTemplate[]>(FLOW_TEMPLATES_KEY, []);
}

export function persistFlowTemplates(templates: SavedFlowTemplate[]): void {
  safeSet(FLOW_TEMPLATES_KEY, templates);
}

export function loadCreatives(projectId: string): AdTile[] {
  return safeGet<AdTile[]>(projectKey(CREATIVES_KEY, projectId), []);
}

export function persistCreatives(projectId: string, creatives: AdTile[]): void {
  safeSet(projectKey(CREATIVES_KEY, projectId), creatives);
  touchCanvasProject(projectId);
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
