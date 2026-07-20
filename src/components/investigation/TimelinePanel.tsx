import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronDown, ArrowDown, Zap, ShieldAlert, ShieldCheck, ShieldX, CircleSlash } from "lucide-react";
import type { PipelineNode, NodeStatus } from "@/lib/investigationData";
import { NODE_ICONS, NODE_ICON_FALLBACK } from "./icons";
import { cn } from "@/lib/utils";

interface TimelinePanelProps {
  nodes: PipelineNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  decision: string;
}

const STATUS_STYLES: Record<NodeStatus, { dot: string; ring: string; text: string; label: string; Icon: typeof ShieldCheck }> = {
  completed: { dot: "bg-success", ring: "ring-success/30", text: "text-success", label: "Completed", Icon: ShieldCheck },
  warning: { dot: "bg-warning", ring: "ring-warning/30", text: "text-warning", label: "Warning", Icon: ShieldAlert },
  failed: { dot: "bg-destructive", ring: "ring-destructive/30", text: "text-destructive", label: "Failed", Icon: ShieldX },
  skipped: { dot: "bg-muted-foreground", ring: "ring-muted-foreground/30", text: "text-muted-foreground", label: "Skipped", Icon: CircleSlash },
};

function riskColor(n: number) {
  if (n >= 75) return "text-destructive";
  if (n >= 40) return "text-warning";
  if (n > 0) return "text-success";
  return "text-muted-foreground";
}

function MeterBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-muted/60">
      <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.5, ease: "easeOut" }} className={cn("h-full rounded-full", color)} />
    </div>
  );
}

function NodeRow({ node, isLast, selected, onSelect }: { node: PipelineNode; isLast: boolean; selected: boolean; onSelect: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = NODE_ICONS[node.iconKey] ?? NODE_ICON_FALLBACK;
  const s = STATUS_STYLES[node.status];
  const riskColorClass = node.riskContribution >= 75 ? "bg-destructive" : node.riskContribution >= 40 ? "bg-warning" : node.riskContribution > 0 ? "bg-success" : "bg-muted-foreground/40";

  return (
    <div className="relative">
      {/* Connector */}
      {!isLast && (
        <div className="absolute left-[15px] top-[30px] bottom-0 w-px bg-gradient-to-b from-border via-border to-border/40" />
      )}
      <motion.div
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25 }}
        className={cn(
          "relative mb-1.5 cursor-pointer rounded-lg border p-2.5 transition-all",
          selected ? "border-primary/60 bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary)/0.25)]" : "border-border bg-card/50 hover:border-primary/30 hover:bg-card/80"
        )}
        onClick={onSelect}
      >
        <div className="flex items-center gap-2.5">
          {/* Icon node */}
          <div className={cn("relative z-10 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-card ring-2", s.ring)}>
            <Icon className={cn("h-3.5 w-3.5", s.text)} />
            <span className={cn("absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-card", s.dot)} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="truncate text-[12.5px] font-semibold text-foreground">{node.label}</span>
                <span className="shrink-0 rounded bg-muted px-1 py-px font-mono text-[8.5px] font-bold text-muted-foreground">{node.abbr}</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px]">
              <span className={cn("flex items-center gap-1 font-medium", s.text)}>
                <s.Icon className="h-2.5 w-2.5" /> {s.label}
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Zap className="h-2.5 w-2.5" /> {node.latencyMs}ms
              </span>
              <span className={cn("font-semibold tabular-nums", riskColor(node.riskContribution))}>
                Risk {node.riskContribution}
              </span>
              <span className="text-muted-foreground tabular-nums">
                Conf {(node.confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* Expanded metrics */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-2.5 space-y-2 border-t border-border/60 pt-2.5 pl-[42px]">
                <p className="text-[10.5px] leading-relaxed text-muted-foreground">{node.description}</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-[9px] uppercase tracking-wide text-muted-foreground">
                      <span>Risk Contribution</span><span className={riskColor(node.riskContribution)}>{node.riskContribution}</span>
                    </div>
                    <MeterBar value={node.riskContribution} color={riskColorClass} />
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between text-[9px] uppercase tracking-wide text-muted-foreground">
                      <span>Confidence</span><span className="text-foreground">{(node.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <MeterBar value={node.confidence * 100} color="bg-primary" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-0.5 text-center">
                  <div className="rounded border border-border/60 py-1">
                    <div className="text-[8.5px] uppercase tracking-wide text-muted-foreground">Latency</div>
                    <div className="font-mono text-[11px] font-semibold text-foreground">{node.latencyMs}ms</div>
                  </div>
                  <div className="rounded border border-border/60 py-1">
                    <div className="text-[8.5px] uppercase tracking-wide text-muted-foreground">Exec</div>
                    <div className="font-mono text-[11px] font-semibold text-foreground">{node.executionMs}ms</div>
                  </div>
                  <div className="rounded border border-border/60 py-1">
                    <div className="text-[8.5px] uppercase tracking-wide text-muted-foreground">Status</div>
                    <div className={cn("font-mono text-[11px] font-semibold", s.text)}>{node.statusCode}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      {!isLast && (
        <div className="mb-1.5 flex justify-center pl-[15px]">
          <ArrowDown className="h-2.5 w-2.5 text-muted-foreground/50" />
        </div>
      )}
    </div>
  );
}

export function TimelinePanel({ nodes, selectedId, onSelect, decision }: TimelinePanelProps) {
  const totalLatency = nodes.reduce((a, n) => a + n.latencyMs, 0);
  const totalRisk = nodes.reduce((a, n) => a + n.riskContribution, 0);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-3 py-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-semibold tracking-tight text-foreground">Pipeline Timeline</h2>
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">{nodes.length} stages</span>
        </div>
        <div className="mt-1.5 flex items-center gap-3 text-[10px] text-muted-foreground">
          <span>Total <span className="font-mono font-semibold text-foreground">{totalLatency}ms</span></span>
          <span>·</span>
          <span>Agg risk <span className="font-mono font-semibold text-foreground">{Math.min(100, totalRisk)}</span></span>
          <span>·</span>
          <span>Decision <span className={cn("font-semibold", decision === "Deny" ? "text-destructive" : decision === "Challenge" ? "text-warning" : "text-success")}>{decision}</span></span>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin px-3 py-3">
        {nodes.map((n, i) => (
          <NodeRow
            key={n.id}
            node={n}
            isLast={i === nodes.length - 1}
            selected={selectedId === n.id}
            onSelect={() => onSelect(n.id)}
          />
        ))}
      </div>
    </div>
  );
}
