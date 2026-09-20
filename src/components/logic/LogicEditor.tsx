import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect } from "react";
import { useGameConfigStore } from "../../store/useGameConfigStore";
import { useLogicStore } from "../../store/useLogicStore";
import { LOGIC_NODE_TYPES } from "./LogicNodes";

export function LogicEditor() {
  const open = useLogicStore((state) => state.logicOpen);
  const storedNodes = useLogicStore((state) => state.nodes);
  const storedEdges = useLogicStore((state) => state.edges);
  const setGraph = useLogicStore((state) => state.setGraph);
  const setSelectedNodeId = useLogicStore((state) => state.setSelectedNodeId);
  const setLogicOpen = useLogicStore((state) => state.setLogicOpen);
  const primaryGenre = useGameConfigStore((state) => state.primaryGenre);
  const activeTab = useGameConfigStore((state) => state.activeTab);

  const [nodes, setNodes, onNodesChange] = useNodesState(storedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storedEdges);

  useEffect(() => setNodes(storedNodes), [setNodes, storedNodes]);
  useEffect(() => setEdges(storedEdges), [setEdges, storedEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((current) => {
        const next = addEdge({ ...params, animated: true }, current);
        setGraph(nodes, next);
        return next;
      });
    },
    [nodes, setEdges, setGraph],
  );

  if (!open) return null;

  const stageLabel =
    activeTab === "mechanics" ? "Mechanics Planner output" : "Visual scripting workspace";

  return (
    <div className="fixed inset-0 z-40 bg-background/96 backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-4">
        <div className="pointer-events-auto rounded-2xl border border-primary/15 bg-card/75 px-4 py-3 shadow-xl">
          <p className="text-[10px] uppercase tracking-[0.22em] text-primary">Logic Editor</p>
          <p className="mt-1 text-xs text-muted-foreground">{stageLabel} · {primaryGenre}</p>
        </div>
        <button
          type="button"
          className="pointer-events-auto rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-primary hover:bg-primary/20"
          onClick={() => setLogicOpen(false)}
        >
          Return to Scene View
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={LOGIC_NODE_TYPES}
        onNodesChange={(changes) => {
          onNodesChange(changes);
          setNodes((current) => {
            setGraph(current, edges);
            return current;
          });
        }}
        onEdgesChange={(changes) => {
          onEdgesChange(changes);
          setEdges((current) => {
            setGraph(nodes, current);
            return current;
          });
        }}
        onConnect={onConnect}
        onNodeClick={(_, node) => setSelectedNodeId(node.id)}
        fitView
        colorMode="dark"
      >
        <Background gap={24} size={1} />
        <MiniMap />
        <Controls />
      </ReactFlow>

      <div className="pointer-events-none absolute bottom-5 left-5 rounded-xl border border-border/60 bg-card/75 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground backdrop-blur-xl">
        Drag nodes · connect handles · Scroll to zoom · {storedNodes.length} nodes
      </div>
    </div>
  );
}
