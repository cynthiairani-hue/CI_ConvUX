import type { OrchestrationFlow, FlowNode, FlowEdge, FlowDraft, SavedFlowTemplate } from "@/types/orchestration";

/* ── Flow board templates ──
   Pre-wired trigger → condition → action programs the marketer can drop on
   the canvas, then edit, authorize, and activate. Templates only contain
   things the system can actually do (simulated here, like every integration
   in the prototype) — never an action with no behavior behind it. */

export interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  build: (origin: { x: number; y: number }) => { nodes: FlowNode[]; edges: FlowEdge[] };
}

const COL = 380; // node width 300 + gap

export const FLOW_TEMPLATES: FlowTemplate[] = [
  {
    id: "account-stage",
    name: "Account-stage flow",
    description: "Sales-ready accounts → CRM sync + notify sales",
    build: ({ x, y }) => ({
      nodes: [
        {
          id: "trigger", kind: "trigger", x, y: y + 70,
          title: "Account reaches Sales-ready",
          detail: "Fires when a target account moves into Stage 3 (Sales-ready) in the account journey.",
        },
        {
          id: "condition", kind: "condition", x: x + COL, y: y + 92,
          title: "Fit + engagement check",
          detail: "Fit score ≥ 70 and 2+ engaged contacts in the last 14 days.",
        },
        {
          id: "sync-crm", kind: "action", x: x + COL * 2, y, authorized: false,
          title: "Sync account to CRM",
          detail: "Creates or updates the account in Salesforce with journey stage and source campaign.",
        },
        {
          id: "notify-sales", kind: "action", x: x + COL * 2, y: y + 170, authorized: false,
          title: "Notify sales",
          detail: "Posts the account, stage change, and top signals to #sales in Slack.",
        },
      ],
      edges: [
        { from: "trigger", to: "condition" },
        { from: "condition", to: "sync-crm" },
        { from: "condition", to: "notify-sales" },
      ],
    }),
  },
  {
    id: "retargeting-refresh",
    name: "Retargeting refresh flow",
    description: "Audience shrinks → widen lookback + notice",
    build: ({ x, y }) => ({
      nodes: [
        {
          id: "trigger", kind: "trigger", x, y: y + 70,
          title: "Audience shrinks below 10k",
          detail: "Fires when Site Visitors — Last 30 Days drops under 10,000 matched profiles.",
        },
        {
          id: "condition", kind: "condition", x: x + COL, y: y + 92,
          title: "Always-on campaign is live",
          detail: "Only runs while the always-on retargeting campaign is active.",
        },
        {
          id: "widen-lookback", kind: "action", x: x + COL * 2, y, authorized: false,
          title: "Widen the lookback window",
          detail: "Expands the audience lookback from 30 to 60 days to restore reach.",
        },
        {
          id: "post-notice", kind: "action", x: x + COL * 2, y: y + 170, authorized: false,
          title: "Post a Notice with what changed",
          detail: "Adds a card to Priorities with the before/after audience size and the change applied.",
        },
      ],
      edges: [
        { from: "trigger", to: "condition" },
        { from: "condition", to: "widen-lookback" },
        { from: "condition", to: "post-notice" },
      ],
    }),
  },
];

export function createFlowFromTemplate(template: FlowTemplate, origin: { x: number; y: number }): OrchestrationFlow {
  const { nodes, edges } = template.build(origin);
  return assembleFlow(template.name, nodes, edges);
}

/* Namespace node ids so two instances of the same flow never collide. */
function assembleFlow(name: string, nodes: FlowNode[], edges: FlowEdge[]): OrchestrationFlow {
  const now = new Date().toISOString();
  const uid = `flow-${Date.now().toString(36)}`;
  return {
    id: uid,
    name,
    status: "draft",
    nodes: nodes.map((n) => ({ ...n, id: `${uid}-${n.id}`, ...(n.kind === "action" ? { authorized: false } : {}) })),
    edges: edges.map((e) => ({ from: `${uid}-${e.from}`, to: `${uid}-${e.to}` })),
    createdAt: now,
    lastModifiedAt: now,
  };
}

/* ── The flow catalog ──
   The complete vocabulary of triggers, conditions, and actions the system can
   actually run (simulated, like every integration here). Chat-generated flows
   are composed FROM this catalog — the AI parameterizes entries, it never
   invents a capability. Shared by the /api/flow/generate prompt and the
   client-side fallback. */

export const FLOW_CATALOG = {
  triggers: [
    { id: "cpa-above", label: "CPA rises above a threshold on a campaign or plan" },
    { id: "roas-below", label: "ROAS falls below a threshold" },
    { id: "audience-shrinks", label: "An audience shrinks below a size threshold" },
    { id: "budget-pace", label: "Spend paces above or below plan" },
    { id: "creative-fatigue", label: "CTR declines for N consecutive days (creative fatigue)" },
    { id: "account-stage", label: "A target account reaches a journey stage" },
    { id: "conversion-spike", label: "Conversions spike above the recent baseline" },
  ],
  conditions: [
    { id: "campaign-live", label: "Only while the named campaign or plan is active" },
    { id: "min-data", label: "At least N days or N conversions of data" },
    { id: "budget-remaining", label: "Remaining budget above a threshold" },
    { id: "fit-engagement", label: "Account fit score and engaged-contact minimums" },
    { id: "business-hours", label: "Only during business hours" },
  ],
  actions: [
    { id: "pause-line", label: "Pause the worst-performing (or a named) line" },
    { id: "shift-budget", label: "Shift budget between channels or lines" },
    { id: "widen-lookback", label: "Widen an audience lookback window" },
    { id: "notify-slack", label: "Notify a Slack channel" },
    { id: "notify-email", label: "Email the plan owner" },
    { id: "sync-crm", label: "Sync the account to the CRM" },
    { id: "post-notice", label: "Post a Notice card with what changed and why" },
    { id: "draft-revision", label: "Draft a revised plan for review (never auto-applies)" },
  ],
} as const;

/* ── Chat-generated flows ──
   Deterministic layout for an AI-composed draft: trigger → condition →
   actions in template columns; edges wired trigger→condition→each action
   (or trigger→each action when there's no condition). All actions land
   unauthorized — the user walks the Authorize step before activation. */

export function createFlowFromDraft(draft: FlowDraft, origin: { x: number; y: number }): OrchestrationFlow {
  const { x, y } = origin;
  const actionCol = draft.condition ? 2 : 1;
  const nodes: FlowNode[] = [
    { id: "trigger", kind: "trigger", x, y: y + 70, title: draft.trigger.title, detail: draft.trigger.detail },
  ];
  if (draft.condition) {
    nodes.push({ id: "condition", kind: "condition", x: x + COL, y: y + 92, title: draft.condition.title, detail: draft.condition.detail });
  }
  draft.actions.forEach((a, i) => {
    nodes.push({ id: `action-${i}`, kind: "action", x: x + COL * actionCol, y: y + i * 170, authorized: false, title: a.title, detail: a.detail });
  });
  const edges: FlowEdge[] = [];
  const upstream = draft.condition ? "condition" : "trigger";
  if (draft.condition) edges.push({ from: "trigger", to: "condition" });
  draft.actions.forEach((_, i) => edges.push({ from: upstream, to: `action-${i}` }));
  return assembleFlow(draft.name, nodes, edges);
}

/** Canvas footprint of a draft, for free-spot placement. */
export function draftExtent(draft: FlowDraft): { w: number; h: number } {
  const cols = draft.condition ? 3 : 2;
  return { w: 300 + COL * (cols - 1), h: Math.max(266, 70 + draft.actions.length * 170) };
}

/* ── User-saved templates ──
   Any flow can be curated into a reusable template: positions normalize to
   the flow's top-left corner, ids drop their instance namespace, and action
   authorizations reset — a template grants nothing by itself. */

export function flowToTemplate(flow: OrchestrationFlow): SavedFlowTemplate {
  const minX = Math.min(...flow.nodes.map((n) => n.x));
  const minY = Math.min(...flow.nodes.map((n) => n.y));
  const strip = (id: string) => id.replace(`${flow.id}-`, "");
  const trigger = flow.nodes.find((n) => n.kind === "trigger");
  const actions = flow.nodes.filter((n) => n.kind === "action");
  return {
    id: `ftpl-${Date.now().toString(36)}`,
    name: flow.name,
    description: `${trigger?.title ?? "Trigger"} → ${actions.length} action${actions.length === 1 ? "" : "s"}`,
    nodes: flow.nodes.map((n) => ({ ...n, id: strip(n.id), x: n.x - minX, y: n.y - minY, ...(n.kind === "action" ? { authorized: false } : {}) })),
    edges: flow.edges.map((e) => ({ from: strip(e.from), to: strip(e.to) })),
    createdAt: new Date().toISOString(),
  };
}

export function createFlowFromSavedTemplate(template: SavedFlowTemplate, origin: { x: number; y: number }): OrchestrationFlow {
  const nodes = template.nodes.map((n) => ({ ...n, x: n.x + origin.x, y: n.y + origin.y }));
  return assembleFlow(template.name, nodes, template.edges);
}

/** Footprint of a saved template, for free-spot placement. */
export function templateExtent(template: SavedFlowTemplate): { w: number; h: number } {
  const w = Math.max(...template.nodes.map((n) => n.x)) + 300;
  const h = Math.max(...template.nodes.map((n) => n.y)) + 200;
  return { w, h };
}
