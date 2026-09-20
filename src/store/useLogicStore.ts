import { create } from "zustand";
import type { Edge, Node } from "@xyflow/react";

export type LogicNodeKind = "event" | "condition" | "action";

export interface LogicNodeData extends Record<string, unknown> {
  label: string;
  detail?: string;
  kind: LogicNodeKind;
  entityId?: string;
}

export type LogicNode = Node<LogicNodeData>;
export type LogicEdge = Edge;

const initialNodes: LogicNode[] = [
  {
    id: "event-start",
    type: "event",
    position: { x: 120, y: 140 },
    data: { kind: "event", label: "On Start", detail: "Begin gameplay" },
  },
  {
    id: "condition-ready",
    type: "condition",
    position: { x: 430, y: 140 },
    data: { kind: "condition", label: "Check State", detail: "Ready == true" },
  },
  {
    id: "action-spawn",
    type: "action",
    position: { x: 760, y: 140 },
    data: { kind: "action", label: "Spawn Entity", detail: "Spawn player" },
  },
];

const initialEdges: LogicEdge[] = [
  { id: "edge-start-ready", source: "event-start", target: "condition-ready", animated: true },
  { id: "edge-ready-spawn", source: "condition-ready", target: "action-spawn", animated: true },
];

interface LogicState {
  nodes: LogicNode[];
  edges: LogicEdge[];
  logicOpen: boolean;
  selectedNodeId: string | null;
  setLogicOpen: (open: boolean) => void;
  setSelectedNodeId: (id: string | null) => void;
  setGraph: (nodes: LogicNode[], edges: LogicEdge[]) => void;
  clearGraph: () => void;
}

export const useLogicStore = create<LogicState>((set) => ({
  nodes: initialNodes,
  edges: initialEdges,
  logicOpen: false,
  selectedNodeId: null,
  setLogicOpen: (logicOpen) => set({ logicOpen }),
  setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId }),
  setGraph: (nodes, edges) => set({ nodes, edges, selectedNodeId: null }),
  clearGraph: () => set({ nodes: [], edges: [], selectedNodeId: null }),
}));
