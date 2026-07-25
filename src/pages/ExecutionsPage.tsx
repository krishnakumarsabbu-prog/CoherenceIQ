import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, X, Play, RotateCw, CircleCheck as CheckCircle2, Circle as XCircle, TriangleAlert as AlertTriangle, Clock, Loader as Loader2, ChevronRight, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn, relativeTime, formatDateTime } from "@/lib/utils";
import {
  SAMPLE_EXECUTIONS, NODE_TYPE_MAP, type Execution, type ExecutionStatus,
} from "@/lib/pipelineData";

const STATUS_META: Record<ExecutionStatus, { icon: typeof Activity; color: string; label: string }> = {
  queued: { icon: Clock, color: "text-muted-foreground", label: "Queued" },
  running: { icon: Loader2, color: "text-primary", label: "Running" },
  succeeded: { icon: CheckCircle2, color: "text-success", label: "Succeeded" },
  failed: { icon: XCircle, color: "text-destructive", label: "Failed" },
  cancelled: { icon: XCircle, color: "text-muted-foreground", label: "Cancelled" },
  warning: { icon: AlertTriangle, color: "text-warning", label: "Warning" },
};

const STEP_ICON: Record<ExecutionStatus, typeof Activity> = {
  queued: Clock,
  running: Loader2,
  succeeded: CheckCircle2,
  failed: XCircle,
  cancelled: XCircle,
  warning: AlertTriangle,
};

export function ExecutionsPage() {
  const [selected, setSelected] = useState<Execution | null>(SAMPLE_EXECUTIONS[0]);
  const [filter, setFilter] = useState<ExecutionStatus | "all">("all");

  const filtered = useMemo(() => {
    if (filter === "all") return SAMPLE_EXECUTIONS;
    return SAMPLE_EXECUTIONS.filter((e) => e.status === filter);
  }, [filter]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-5 pt-4 lg:px-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Executions</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{SAMPLE_EXECUTIONS.length} runs · per-step logs, metrics, and lineage</p>
        </div>
        <Button size="sm"><Play className="h-3.5 w-3.5" /> New run</Button>
      </div>

      <div className="flex items-center gap-1.5 border-b border-border px-5 py-2.5 lg:px-6">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        {(["all", "running", "succeeded", "failed", "queued"] as const).map((s) => {
          const active = filter === s;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[10.5px] font-semibold capitalize transition-all",
                active ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {s}
            </button>
          );
        })}
      </div>

      <div className="grid flex-1 grid-cols-1 gap-0 min-h-0 lg:grid-cols-[360px_1fr]">
        <div className="scrollbar-thin overflow-y-auto border-r border-border lg:max-h-full">
          {filtered.map((ex, i) => {
            const meta = STATUS_META[ex.status];
            const Icon = meta.icon;
            return (
              <motion.button
                key={ex.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setSelected(ex)}
                className={cn(
                  "flex w-full flex-col gap-1 border-b border-border px-4 py-3 text-left transition-colors hover:bg-accent/40",
                  selected?.id === ex.id && "bg-primary/8",
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-3.5 w-3.5", meta.color, ex.status === "running" && "animate-spin")} />
                    <span className="text-[12.5px] font-semibold text-foreground">{ex.pipelineName}</span>
                  </div>
                  <span className="font-mono text-[9.5px] text-muted-foreground">{ex.id}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="capitalize">{ex.trigger}</span>
                  <span>·</span>
                  <span>{ex.triggeredBy}</span>
                  <span>·</span>
                  <span>{relativeTime(ex.startedAt)}</span>
                </div>
                {ex.status === "succeeded" && (
                  <div className="mt-0.5 flex items-center gap-3 text-[10px]">
                    <span className="text-success">{ex.metrics.decisions.allow} allow</span>
                    <span className="text-warning">{ex.metrics.decisions.challenge} chal</span>
                    <span className="text-destructive">{ex.metrics.decisions.deny} deny</span>
                    <span className="text-muted-foreground">{ex.durationMs / 1000}s</span>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        <div className="scrollbar-thin overflow-y-auto">
          <AnimatePresence mode="wait">
            {selected && (
              <motion.div key={selected.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="p-5 lg:p-6">
                <ExecutionDetail ex={selected} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function ExecutionDetail({ ex }: { ex: Execution }) {
  const meta = STATUS_META[ex.status];
  const Icon = meta.icon;
  const succeeded = ex.steps.filter((s) => s.status === "succeeded").length;
  const failed = ex.steps.filter((s) => s.status === "failed").length;
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <Icon className={cn("h-5 w-5", meta.color, ex.status === "running" && "animate-spin")} />
            <h2 className="text-[16px] font-bold text-foreground">{ex.pipelineName}</h2>
            <Badge variant={ex.status === "succeeded" ? "success" : ex.status === "failed" ? "destructive" : ex.status === "running" ? "default" : "outline"}>{meta.label}</Badge>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="font-mono">{ex.id}</span>
            <span>·</span>
            <span className="capitalize">{ex.trigger}</span>
            <span>·</span>
            <span>{ex.triggeredBy}</span>
            <span>·</span>
            <span>{formatDateTime(ex.startedAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline"><RotateCw className="h-3.5 w-3.5" /> Re-run</Button>
          <Button size="sm" variant="outline"><X className="h-3.5 w-3.5" /> Cancel</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-6">
        <Stat label="Duration" value={ex.durationMs ? `${(ex.durationMs / 1000).toFixed(1)}s` : "—"} />
        <Stat label="Steps" value={`${succeeded + failed}/${ex.steps.length}`} />
        <Stat label="Throughput" value={ex.metrics.throughput ? `${ex.metrics.throughput}/s` : "—"} />
        <Stat label="Allow" value={String(ex.metrics.decisions.allow)} color="text-success" />
        <Stat label="Challenge" value={String(ex.metrics.decisions.challenge)} color="text-warning" />
        <Stat label="Deny" value={String(ex.metrics.decisions.deny)} color="text-destructive" />
      </div>

      <div>
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Step timeline</div>
        <Card className="p-0">
          <div className="relative space-y-0 p-2">
            {ex.steps.map((s, i) => {
              const def = NODE_TYPE_MAP[s.nodeType];
              const SIcon = STEP_ICON[s.status] ?? Clock;
              const color = STATUS_META[s.status]?.color ?? "text-muted-foreground";
              return (
                <motion.div
                  key={s.nodeId + i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="relative flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-accent/30"
                >
                  <div className="relative flex flex-col items-center">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border" style={{ background: def ? `${def.color}11` : undefined }}>
                      {def && <def.icon className="h-3.5 w-3.5" style={{ color: def.color }} />}
                    </div>
                    {i < ex.steps.length - 1 && <div className="my-0.5 w-px flex-1 bg-border" />}
                  </div>
                  <div className="min-w-0 flex-1 pb-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[12.5px] font-semibold text-foreground">{s.nodeLabel}</span>
                      <div className="flex items-center gap-2">
                        {s.durationMs > 0 && <span className="font-mono text-[10px] text-muted-foreground">{(s.durationMs / 1000).toFixed(1)}s</span>}
                        <SIcon className={cn("h-3.5 w-3.5", color, s.status === "running" && "animate-spin")} />
                      </div>
                    </div>
                    {(s.rowsIn != null || s.rowsOut != null) && (
                      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                        {s.rowsIn != null && <span>in: <span className="font-mono text-foreground">{s.rowsIn}</span></span>}
                        {s.rowsOut != null && <span>out: <span className="font-mono text-foreground">{s.rowsOut}</span></span>}
                      </div>
                    )}
                    {s.log.length > 0 && (
                      <div className="mt-1.5 space-y-0.5 rounded-md bg-muted/30 p-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
                        {s.log.map((l, j) => <div key={j} className="flex gap-1.5"><ChevronRight className="h-2.5 w-2.5 shrink-0 translate-y-px text-muted-foreground/50" />{l}</div>)}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="glass-card glass-card-hover p-3">
      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("mt-1 font-mono text-lg font-bold tabular-nums", color ?? "text-foreground")}>{value}</div>
    </div>
  );
}
