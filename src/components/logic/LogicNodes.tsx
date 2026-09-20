import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { LogicNodeData } from "../../store/useLogicStore";

const styles = {
  event: {
    ring: "border-primary/45 bg-primary/10",
    dot: "bg-primary",
    label: "text-primary",
  },
  condition: {
    ring: "border-sky-400/40 bg-sky-400/10",
    dot: "bg-sky-300",
    label: "text-sky-200",
  },
  action: {
    ring: "border-amber-400/40 bg-amber-400/10",
    dot: "bg-amber-300",
    label: "text-amber-200",
  },
};

function BaseNode({
  data,
  side,
}: NodeProps<LogicNodeData> & { side: "left" | "right" }) {
  const style = styles[data.kind];
  return (
    <div className={`min-w-56 rounded-xl border px-3 py-2 shadow-2xl backdrop-blur-xl ${style.ring}`}>
      <Handle
        type="target"
        position={Position.Left}
        className={`!h-2.5 !w-2.5 !border-0 ${style.dot}`}
        style={side === "left" ? { opacity: 0 } : undefined}
      />
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${style.dot}`} />
        <span className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${style.label}`}>
          {data.kind}
        </span>
      </div>
      <p className="mt-1 text-sm font-medium text-foreground">{data.label}</p>
      {data.detail && <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{data.detail}</p>}
      <Handle
        type="source"
        position={Position.Right}
        className={`!h-2.5 !w-2.5 !border-0 ${style.dot}`}
      />
    </div>
  );
}

export function EventNode(props: NodeProps<LogicNodeData>) {
  return <BaseNode {...props} side="left" />;
}

export function ConditionNode(props: NodeProps<LogicNodeData>) {
  return <BaseNode {...props} side="left" />;
}

export function ActionNode(props: NodeProps<LogicNodeData>) {
  return <BaseNode {...props} side="left" />;
}

export const LOGIC_NODE_TYPES = {
  event: EventNode,
  condition: ConditionNode,
  action: ActionNode,
};
