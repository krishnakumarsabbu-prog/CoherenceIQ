import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, X, Play, RotateCw, CircleCheck as CheckCircle2, Circle as XCircle, TriangleAlert as AlertTriangle, Clock, Loader as Loader2, ChevronRight, Filter, RefreshCw, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn, relativeTime, formatDateTime } from "@/lib/utils";
import { NODE_TYPE_MAP, type ExecutionStatus } from "@/lib/pipelineData";
import {
  listExecutions, getExecution, cancelExecution, replayExecution,
  type Execution, type ExecutionStep,
} from "@/lib/executionApi";

type StatusFilter = ExecutionStatus | "all";

const STATUS_META: Record<ExecutionStatus, { icon: typeof Activity; color: string; label: string }> = {
  queued: { icon: Clock, color: "text-muted-foreground", label: "Queued" },
  running: { icon: Loader2, color: "text-primary", label: "Running" },
  succeeded: { icon: CheckCircle2, color: "text-success", label: "Succeeded" },
  failed: { icon: XCircle, color: "text-destructive", label: "Failed" },
  cancelled: { icon: Ban, color: "text-muted-foreground", label: "Cancelled" },
  warning: { icon: AlertTriangle, color: "text-warning", label: "Warning" },
  skipped: { icon: Ban, color: "text-muted-foreground", label: "Skipped" },
};

const STEP_ICON: Record<ExecutionStatus, typeof Activity> = {
  queued: Clock,
  running: Loader2,
  succeeded: CheckCircle2,
  failed: XCircle,
  cancelled: Ban,
  warning: AlertTriangle,
  skipped: Ban,
};

export function ExecutionsPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Execution | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const list = await listExecutions();
      setExecutions(list);
      if (list.length && !selectedId) setSelectedId(list[0].id);
    } catch {
      // server may be briefly unavailable
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Poll for updates while any execution is running, or while list is empty/loading
  useEffect(() => {
    const anyRunning = executions.some((e) => e.status === "running" || e.status === "queued");
    if (!anyRunning && !loading) return;
    const t = setInterval(refresh, 1000);
    return () => clearInterval(t);
  }, [executions, loading, refresh]);

  // Keep selected execution fresh
  useEffect(() => {
    if (!selectedId) { setSelected(null); return; }
    let active = true;
    (async () => {
      try {
        const ex = await getExecution(selectedId);
        if (active) setSelected(ex);
      } catch { /* ignore */ }
    })();
    const anyRunning = selected?.status === "running" || selected?.status === "queued";
    if (!anyRunning) return;
    const t = setInterval(async () => {
      try {
        const ex = await getExecution(selectedId);
        if (active) setSelected(ex);
      } catch { /* ignore */ }
    }, 800);
    return () => { active = false; clearInterval(t); };
  }, [selectedId, selected?.status]);

  const filtered = useMemo(() => {
    if (filter === "all") return executions;
    return executions.filter((e) => e.status === filter);
  }, [executions, filter]);

  const handleCancel = useCallback(async () => {
    if (!selected) return;
    setBusy(true);
    try { await cancelExecution(selected.id); await refresh(); } finally { setBusy(false); }
  }, [selected, refresh]);

  const handleReplay = useCallback(async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const newEx = await replayExecution(selected.id, "ui");
      setSelectedId(newEx.id);
      await refresh();
    } finally { setBusy(false); }
  }, [selected, refresh]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-5 pt-4 lg:px-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Executions</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{executions.length} runs · per-step logs, metrics, and lineage</p>
        </div>
        <Button size="sm" variant="outline" onClick={refresh} disabled={loading}>
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
        </Button>
      </div>

      <div className="flex items-center gap-1.5 border-b border-border px-5 py-2.5 lg:px-6">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        {(["all", "running", "succeeded", "failed", "cancelled", "queued"] as const).map((s) => {
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
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">
              {loading ? "Loading executions…" : "No executions yet. Run a pipeline to see it here."}
            </div>
          )}
          {filtered.map((ex, i) => {
            const meta = STATUS_META[ex.status];
            const Icon = meta.icon;
            return (
              <motion.button
                key={ex.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setSelectedId(ex.id)}
                className={cn(
                  "flex w-full flex-col gap-1 border-b border-border px-4 py-3 text-left transition-colors hover:bg-accent/40",
                  selectedId === ex.id && "bg-primary/8",
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
                  <span>{ex.startedAt ? relativeTime(ex.startedAt) : "—"}</span>
                  {ex.replayOf && <><span>·</span><span className="text-primary">replay</span></>}
                </div>
                {ex.status === "succeeded" && (
                  <div className="mt-0.5 flex items-center gap-3 text-[10px]">
                    <span className="text-success">{ex.metrics.decisions.allow} allow</span>
                    <span className="text-warning">{ex.metrics.decisions.challenge} chal</span>
                    <span className="text-destructive">{ex.metrics.decisions.deny} deny</span>
                    <span className="text-muted-foreground">{(ex.durationMs / 1000).toFixed(1)}s</span>
                  </div>
                )}
                {ex.status === "running" && (
                  <div className="mt-0.5 text-[10px] text-primary">
                    {ex.steps.filter((s) => s.status === "succeeded" || s.status === "failed").length}/{ex.steps.length} steps
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
                <ExecutionDetail
                  ex={selected}
                  busy={busy}
                  onCancel={handleCancel}
                  onReplay={handleReplay}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function ExecutionDetail({
  ex, busy, onCancel, onReplay,
}: {
  ex: Execution;
  busy: boolean;
  onCancel: () => void;
  onReplay: () => void;
}) {
  const meta = STATUS_META[ex.status];
  const Icon = meta.icon;
  const succeeded = ex.steps.filter((s) => s.status === "succeeded").length;
  const failed = ex.steps.filter((s) => s.status === "failed").length;
  const skipped = ex.steps.filter((s) => s.status === "skipped").length;
  const isRunning = ex.status === "running" || ex.status === "queued";
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <Icon className={cn("h-5 w-5", meta.color, ex.status === "running" && "animate-spin")} />
            <h2 className="text-[16px] font-bold text-foreground">{ex.pipelineName}</h2>
            <Badge variant={ex.status === "succeeded" ? "success" : ex.status === "failed" ? "destructive" : ex.status === "running" ? "default" : "outline"}>{meta.label}</Badge>
            {ex.replayOf && <Badge variant="outline">replay of {ex.replayOf}</Badge>}
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="font-mono">{ex.id}</span>
            <span>·</span>
            <span className="capitalize">{ex.trigger}</span>
            <span>·</span>
            <span>{ex.triggeredBy}</span>
            <span>·</span>
            <span>{ex.startedAt ? formatDateTime(ex.startedAt) : "—"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onReplay} disabled={busy || isRunning}>
            <RotateCw className="h-3.5 w-3.5" /> Re-run
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel} disabled={busy || !isRunning}>
            <X className="h-3.5 w-3.5" /> Cancel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-6">
        <Stat label="Duration" value={ex.durationMs ? `${(ex.durationMs / 1000).toFixed(1)}s` : "—"} />
        <Stat label="Steps" value={`${succeeded + failed}/${ex.steps.length}${skipped ? ` (${skipped} skipped)` : ""}`} />
        <Stat label="Throughput" value={ex.metrics.throughput ? `${ex.metrics.throughput}/s` : "—"} />
        <Stat label="Allow" value={String(ex.metrics.decisions.allow)} color="text-success" />
        <Stat label="Challenge" value={String(ex.metrics.decisions.challenge)} color="text-warning" />
        <Stat label="Deny" value={String(ex.metrics.decisions.deny)} color="text-destructive" />
      </div>

      <div>
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Step timeline</div>
        <Card className="p-0">
          <div className="relative space-y-0 p-2">
            {ex.steps.map((s, i) => (
              <StepRow key={s.nodeId + i} step={s} isLast={i === ex.steps.length - 1} />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function StepRow({ step, isLast }: { step: ExecutionStep; isLast: boolean }) {
  const def = NODE_TYPE_MAP[step.nodeType];
  const SIcon = STEP_ICON[step.status] ?? Clock;
  const color = STATUS_META[step.status]?.color ?? "text-muted-foreground";
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-accent/30"
    >
      <div className="relative flex flex-col items-center">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border" style={{ background: def ? `${def.color}11` : undefined }}>
          {def && <def.icon className="h-3.5 w-3.5" style={{ color: def.color }} />}
        </div>
        {!isLast && <div className="my-0.5 w-px flex-1 bg-border" />}
      </div>
      <div className="min-w-0 flex-1 pb-1">
        <div className="flex items-center justify-between">
          <span className="text-[12.5px] font-semibold text-foreground">{step.nodeLabel}</span>
          <div className="flex items-center gap-2">
            {step.durationMs > 0 && <span className="font-mono text-[10px] text-muted-foreground">{(step.durationMs / 1000).toFixed(1)}s</span>}
            <SIcon className={cn("h-3.5 w-3.5", color, step.status === "running" && "animate-spin")} />
          </div>
        </div>
        {(step.rowsIn != null || step.rowsOut != null) && (
          <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
            {step.rowsIn != null && <span>in: <span className="font-mono text-foreground">{step.rowsIn}</span></span>}
            {step.rowsOut != null && <span>out: <span className="font-mono text-foreground">{step.rowsOut}</span></span>}
          </div>
        )}
        {step.log.length > 0 && (
          <div className="mt-1.5 space-y-0.5 rounded-md bg-muted/30 p-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
            {step.log.map((l, j) => <div key={j} className="flex gap-1.5"><ChevronRight className="h-2.5 w-2.5 shrink-0 translate-y-px text-muted-foreground/50" />{l}</div>)}
          </div>
        )}
      </div>
    </motion.div>
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
