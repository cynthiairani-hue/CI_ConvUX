/* ── Orchestration flows ──
   A flow is a first-class artifact: a small DAG of trigger → condition →
   action nodes that the marketer lays out on the canvas, authorizes, and
   activates. The agent loop made spatial — every action node requires an
   explicit authorization before the flow can go live (Notice → Propose →
   Authorize), and the flow itself moves through Build → Approve → Activate. */

export type FlowStatus = "draft" | "active" | "paused";

export type FlowNodeKind = "trigger" | "condition" | "action";

export interface FlowNode {
  id: string;
  kind: FlowNodeKind;
  title: string;
  detail: string;
  /** Actions only: the user has explicitly authorized this action.
      A flow cannot activate until every action node is authorized. */
  authorized?: boolean;
  /** canvas-space position (unscaled) */
  x: number;
  y: number;
}

export interface FlowEdge {
  from: string;
  to: string;
}

export interface OrchestrationFlow {
  id: string;
  name: string;
  status: FlowStatus;
  nodes: FlowNode[];
  edges: FlowEdge[];
  createdAt: string;
  lastModifiedAt: string;
}

/** A chat-generated flow before it has canvas coordinates. The AI composes
    trigger/condition/actions from the flow catalog (never an action the
    system can't perform); the canvas lays it out and wires the edges. */
export interface FlowDraft {
  name: string;
  trigger: { title: string; detail: string };
  condition: { title: string; detail: string } | null;
  actions: { title: string; detail: string }[];
}

/** A user-saved flow template: any flow, curated into a reusable asset.
    Node positions are stored relative to the flow's top-left corner. */
export interface SavedFlowTemplate {
  id: string;
  name: string;
  description: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  createdAt: string;
}
