import { memo } from "react";
import { Handle, Position } from "reactflow";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { NODE_TYPE_MAP } from "@/lib/pipelineData";
import type { NodeStatus } from "@/lib/pipelineData";

const STATUS_DOT: Record<NodeStatus, string> = {
  idle: "bg-muted-foreground/40",
  running: "bg-primary animate-pulse",
  success: "bg-success",
  error: "bg-destructive",
  warning: "bg-warning",
};

export interface PipelineNodeData {
  label: string;
  config: Record<string, unknown>;
  status?: NodeStatus;
  assetRef?: string;
  selected?: boolean;
  onConfig?: () => void;
}

function PipelineNodeComponent({ data, selected }: { data: PipelineNodeData; selected?: boolean }) {
  const def = NODE_TYPE_MAP[(data as any).__nodeType] ?? NODE_TYPE_MAP["session-source"];
  const Icon = def.icon;
  const status = data.status ?? "idle";
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "group relative flex w-[200px] cursor-pointer flex-col gap-1 rounded-xl border bg-card/90 px-3 py-2.5 backdrop-blur-xl transition-all",
        selected ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/40",
      )}
      style={{ boxShadow: selected ? `0 0 24px ${def.color}33` : undefined }}
    >
      {def.inputs > 0 && (
        <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !border-2 !border-background" style={{ background: def.color }} />
      )}
      {def.outputs > 0 && (
        <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !border-2 !border-background" style={{ background: def.color }} />
      )}

      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: `${def.color}22`, color: def.color }}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px] font-bold text-foreground">{data.label}</div>
          <div className="truncate text-[9px] uppercase tracking-wide text-muted-foreground">{def.category}</div>
        </div>
        <span className={cn("h-2 w-2 shrink-0 rounded-full", STATUS_DOT[status])} />
      </div>

      {data.assetRef && (
        <div className="mt-0.5 truncate rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[8.5px] text-muted-foreground" title={data.assetRef}>
          {data.assetRef}
        </div>
      )}
    </motion.div>
  );
}

export const PipelineNode = memo(PipelineNodeComponent);
