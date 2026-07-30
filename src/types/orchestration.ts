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
