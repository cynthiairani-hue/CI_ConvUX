import type { OrchestrationFlow, FlowNode, FlowEdge } from "@/types/orchestration";

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
  const now = new Date().toISOString();
  const uid = `flow-${Date.now().toString(36)}`;
  return {
    id: uid,
    name: template.name,
    status: "draft",
    // Namespace node ids so two instances of the same template never collide.
    nodes: nodes.map((n) => ({ ...n, id: `${uid}-${n.id}` })),
    edges: edges.map((e) => ({ from: `${uid}-${e.from}`, to: `${uid}-${e.to}` })),
    createdAt: now,
    lastModifiedAt: now,
  };
}
