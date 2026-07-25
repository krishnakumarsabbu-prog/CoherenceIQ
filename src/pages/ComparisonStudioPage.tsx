import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitCompareArrows, Play, RefreshCw, Trash2, Download, ChevronRight,
  CircleCheck as CheckCircle2, Circle as XCircle, TriangleAlert as AlertTriangle,
  Clock, Loader as Loader2, Ban, X, FileUp, LogIn, Database, Zap,
  TrendingUp, Award, Target, Gauge, Shield, Brain, Layers, Share2, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { cn, relativeTime, formatDateTime } from "@/lib/utils";
import { NODE_TYPE_MAP } from "@/lib/pipelineData";
import {
  listPipelines, createComparison, getComparison, listComparisons, deleteComparison,
  type PipelineSummary, type ComparisonRun, type ComparisonResult,
  type ComparisonInputType, type BenchmarkSummary,
} from "@/lib/executionApi";

type View = "setup" | "dashboard";
type DrillStage = "overview" | "steps" | "artifacts";

const PIPELINE_COLORS = [
  "#0ea5e9", "#f59e0b", "#10b981", "#f97316",
  "#8b5cf6", "#ec4899", "#14b8a6", "#ef4444",
];

export function ComparisonStudioPage() {
  const [view, setView] = useState<View>("setup");
  const [pipelines, setPipelines] = useState<PipelineSummary[]>([]);
  const [selectedPipelines, setSelectedPipelines] = useState<Set<string>>(new Set());
  const [inputType, setInputType] = useState<ComparisonInputType>("dataset");
  const [inputPayload, setInputPayload] = useState("");
  const [running, setRunning] = useState(false);
  const [activeRun, setActiveRun] = useState<ComparisonRun | null>(null);
  const [pastRuns, setPastRuns] = useState<ComparisonRun[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadPipelines = useCallback(async () => {
    try {
      const list = await listPipelines();
      setPipelines(list);
    } catch { /* server may be briefly unavailable */ }
  }, []);

  const loadPastRuns = useCallback(async () => {
    try {
      const list = await listComparisons();
      setPastRuns(list);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadPipelines();
    loadPastRuns();
  }, [loadPipelines, loadPastRuns]);

  // Poll active run while it's running
  useEffect(() => {
    if (!activeRun || activeRun.status !== "running") return;
    const t = setInterval(async () => {
      try {
        const updated = await getComparison(activeRun.id);
        setActiveRun(updated);
        if (updated.status !== "running") {
          loadPastRuns();
        }
      } catch { /* ignore */ }
    }, 800);
    return () => clearInterval(t);
  }, [activeRun, loadPastRuns]);

  const togglePipeline = (id: string) => {
    setSelectedPipelines((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRun = useCallback(async () => {
    if (selectedPipelines.size < 2) {
      setError("Select at least 2 pipelines to compare");
      return;
    }
    setRunning(true);
    setError(null);
    try {
      const run = await createComparison(
        Array.from(selectedPipelines),
        inputType,
        inputPayload || undefined,
      );
      setActiveRun(run);
      setView("dashboard");
      loadPastRuns();
    } catch (e) {
      setError("Failed to start comparison. Is the server running?");
    } finally {
      setRunning(false);
    }
  }, [selectedPipelines, inputType, inputPayload, loadPastRuns]);

  const handleSelectPastRun = useCallback(async (id: string) => {
    try {
      const run = await getComparison(id);
      setActiveRun(run);
      setView("dashboard");
    } catch { /* ignore */ }
  }, []);

  const handleDeleteRun = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteComparison(id);
    setPastRuns((prev) => prev.filter((r) => r.id !== id));
    if (activeRun?.id === id) {
      setActiveRun(null);
      setView("setup");
    }
  }, [activeRun]);

  const handleNewComparison = () => {
    setActiveRun(null);
    setView("setup");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-5 pt-4 lg:px-6">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-foreground">
            <GitCompareArrows className="h-5 w-5 text-primary" />
            Comparison Studio
          </h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Execute multiple pipelines in parallel and benchmark results side-by-side
          </p>
        </div>
        <div className="flex items-center gap-2">
          {view === "dashboard" && (
            <Button size="sm" variant="outline" onClick={handleNewComparison}>
              <GitCompareArrows className="h-3.5 w-3.5" /> New Comparison
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => { loadPipelines(); loadPastRuns(); }}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto">
        {view === "setup" && (
          <SetupView
            pipelines={pipelines}
            selectedPipelines={selectedPipelines}
            togglePipeline={togglePipeline}
            inputType={inputType}
            setInputType={setInputType}
            inputPayload={inputPayload}
            setInputPayload={setInputPayload}
            onRun={handleRun}
            running={running}
            error={error}
            pastRuns={pastRuns}
            onSelectPastRun={handleSelectPastRun}
            onDeleteRun={handleDeleteRun}
          />
        )}
        {view === "dashboard" && activeRun && (
          <DashboardView run={activeRun} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Setup View — pipeline selection + input source + past runs
// ---------------------------------------------------------------------------

const INPUT_META: Record<ComparisonInputType, { icon: typeof Database; label: string; desc: string; placeholder: string }> = {
  login: { icon: LogIn, label: "Login Request", desc: "A single login session JSON payload", placeholder: '{"username":"john.doe","ip":"203.0.113.50","device":"iPhone 15",...}' },
  file: { icon: FileUp, label: "Uploaded File", desc: "A file (CSV, JSON, or markdown) to process", placeholder: "rules-policy-v3.md" },
  dataset: { icon: Database, label: "Entire Dataset", desc: "Run against the full dataset configured in each pipeline's source node", placeholder: "" },
};

function SetupView({
  pipelines, selectedPipelines, togglePipeline,
  inputType, setInputType, inputPayload, setInputPayload,
  onRun, running, error, pastRuns, onSelectPastRun, onDeleteRun,
}: {
  pipelines: PipelineSummary[];
  selectedPipelines: Set<string>;
  togglePipeline: (id: string) => void;
  inputType: ComparisonInputType;
  setInputType: (t: ComparisonInputType) => void;
  inputPayload: string;
  setInputPayload: (s: string) => void;
  onRun: () => void;
  running: boolean;
  error: string | null;
  pastRuns: ComparisonRun[];
  onSelectPastRun: (id: string) => void;
  onDeleteRun: (id: string, e: React.MouseEvent) => void;
}) {
  const inputMeta = INPUT_META[inputType];
  const InputIcon = inputMeta.icon;

  return (
    <div className="space-y-6 p-5 lg:p-6">
      {/* Pipeline Selection */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[14px] font-bold text-foreground">Select Pipelines</h2>
          <span className="text-[11px] text-muted-foreground">
            {selectedPipelines.size} selected · {pipelines.length} available
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {pipelines.map((p, i) => {
            const selected = selectedPipelines.has(p.id);
            const color = PIPELINE_COLORS[i % PIPELINE_COLORS.length];
            return (
              <motion.button
                key={p.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => togglePipeline(p.id)}
                className={cn(
                  "relative flex flex-col gap-2 rounded-xl border p-4 text-left transition-all",
                  selected
                    ? "border-primary bg-primary/8 shadow-sm"
                    : "border-border bg-transparent hover:border-primary/40 hover:bg-accent/30",
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                    <span className="text-[13px] font-semibold text-foreground">{p.name}</span>
                  </div>
                  <div className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full border transition-all",
                    selected ? "border-primary bg-primary text-primary-foreground" : "border-border",
                  )}>
                    {selected && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </div>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-2">{p.description}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[9.5px]">{p.version}</Badge>
                  <span className="text-[10px] text-muted-foreground">{p.nodes.length} nodes</span>
                  <span className="text-[10px] text-muted-foreground">· {p.owner}</span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Input Source */}
      <div>
        <h2 className="mb-3 text-[14px] font-bold text-foreground">Input Source</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(Object.keys(INPUT_META) as ComparisonInputType[]).map((t) => {
            const meta = INPUT_META[t];
            const Icon = meta.icon;
            const active = inputType === t;
            return (
              <button
                key={t}
                onClick={() => setInputType(t)}
                className={cn(
                  "flex flex-col gap-1.5 rounded-xl border p-3 text-left transition-all",
                  active ? "border-primary bg-primary/8" : "border-border hover:bg-accent/30",
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")} />
                  <span className="text-[12px] font-semibold text-foreground">{meta.label}</span>
                </div>
                <span className="text-[10.5px] leading-relaxed text-muted-foreground">{meta.desc}</span>
              </button>
            );
          })}
        </div>
        {inputType !== "dataset" && (
          <div className="mt-3">
            <textarea
              value={inputPayload}
              onChange={(e) => setInputPayload(e.target.value)}
              placeholder={inputMeta.placeholder}
              rows={4}
              className="w-full rounded-lg border border-border bg-muted/20 p-3 font-mono text-[11px] text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Run Button */}
      <div className="flex items-center gap-3">
        <Button onClick={onRun} disabled={running || selectedPipelines.size < 2} size="lg">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {running ? "Starting…" : `Run Comparison (${selectedPipelines.size} pipelines)`}
        </Button>
        {selectedPipelines.size < 2 && (
          <span className="text-[11px] text-muted-foreground">Select at least 2 pipelines to compare</span>
        )}
        {error && (
          <span className="text-[11px] text-destructive">{error}</span>
        )}
      </div>

      {/* Past Runs */}
      {pastRuns.length > 0 && (
        <div>
          <h2 className="mb-3 text-[14px] font-bold text-foreground">Past Comparisons</h2>
          <div className="space-y-2">
            {pastRuns.map((run, i) => (
              <motion.div
                key={run.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <button
                  onClick={() => onSelectPastRun(run.id)}
                  className="flex w-full items-center justify-between rounded-lg border border-border px-4 py-3 text-left transition-colors hover:bg-accent/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-1.5">
                      {run.pipelineIds.slice(0, 4).map((pid, j) => (
                        <span
                          key={pid}
                          className="h-5 w-5 rounded-full border-2 border-background"
                          style={{ background: PIPELINE_COLORS[j % PIPELINE_COLORS.length] }}
                        />
                      ))}
                    </div>
                    <div>
                      <div className="text-[12px] font-semibold text-foreground">
                        {run.pipelineIds.length} pipelines · {run.inputType}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {relativeTime(run.createdAt)} · {run.id}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={run.status === "succeeded" ? "success" : run.status === "running" ? "default" : "outline"}>
                      {run.status}
                    </Badge>
                    <button
                      onClick={(e) => onDeleteRun(run.id, e)}
                      className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard View — comparison results
// ---------------------------------------------------------------------------

function DashboardView({ run }: { run: ComparisonRun }) {
  const [drillStage, setDrillStage] = useState<DrillStage>("overview");
  const [drillPipeline, setDrillPipeline] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);

  const results = run.results;
  const summary = run.summary;
  const isRunning = run.status === "running";

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(run, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comparison-${run.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 p-5 lg:p-6">
      {/* Run Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-1.5">
            {run.pipelineIds.map((pid, j) => (
              <span
                key={pid}
                className="h-6 w-6 rounded-full border-2 border-background"
                style={{ background: PIPELINE_COLORS[j % PIPELINE_COLORS.length] }}
              />
            ))}
          </div>
          <div>
            <div className="text-[14px] font-bold text-foreground">
              {run.pipelineIds.length} pipelines compared
            </div>
            <div className="flex items-center gap-2 text-[10.5px] text-muted-foreground">
              <span className="font-mono">{run.id}</span>
              <span>·</span>
              <span className="capitalize">{run.inputType}</span>
              <span>·</span>
              <span>{formatDateTime(run.createdAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isRunning ? "default" : "success"}>
            {isRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
            {run.status}
          </Badge>
          <Button size="sm" variant="outline" onClick={() => setShowReport(true)}>
            <Download className="h-3.5 w-3.5" /> Report
          </Button>
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" /> Export JSON
          </Button>
        </div>
      </div>

      {isRunning && (
        <div className="glass-card flex items-center gap-3 p-4">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-[12px] text-muted-foreground">
            Executing {run.pipelineIds.length} pipelines in parallel… {results.filter((r) => r.status === "succeeded").length}/{results.length} complete
          </span>
        </div>
      )}

      {/* Tab selector for drill-down stage */}
      <div className="flex items-center gap-1.5">
        {(["overview", "steps", "artifacts"] as DrillStage[]).map((s) => (
          <button
            key={s}
            onClick={() => { setDrillStage(s); setDrillPipeline(null); }}
            className={cn(
              "rounded-full border px-3 py-1 text-[10.5px] font-semibold capitalize transition-all",
              drillStage === s ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {s === "overview" ? "Overview Dashboard" : s === "steps" ? "Step-by-Step" : "Artifacts Drill-Down"}
          </button>
        ))}
      </div>

      {drillStage === "overview" && <OverviewDashboard results={results} summary={run.summary} />}
      {drillStage === "steps" && (
        <StepByStepView results={results} drillPipeline={drillPipeline} setDrillPipeline={setDrillPipeline} />
      )}
      {drillStage === "artifacts" && (
        <ArtifactsDrillDown results={results} drillPipeline={drillPipeline} setDrillPipeline={setDrillPipeline} />
      )}

      {showReport && (
        <ReportModal run={run} onClose={() => setShowReport(false)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview Dashboard — comparison metrics with visual highlighting
// ---------------------------------------------------------------------------

function OverviewDashboard({ results, summary }: { results: ComparisonResult[]; summary: Partial<BenchmarkSummary> }) {
  const rankings = summary.rankings || [];
  const hasSummary = rankings.length > 0;

  return (
    <div className="space-y-5">
      {/* Rankings */}
      {hasSummary && rankings.length > 0 && (
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" />
            <h3 className="text-[13px] font-bold text-foreground">Benchmark Rankings</h3>
          </div>
          <div className="space-y-2">
            {rankings.map((r) => (
              <div key={r.pipeline} className="flex items-center gap-3">
                <span className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold",
                  r.rank === 1 ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
                )}>
                  {r.rank}
                </span>
                <span className="flex-1 text-[12px] font-semibold text-foreground">{r.pipeline}</span>
                <span className="font-mono text-[12px] text-muted-foreground">{r.score}</span>
                {r.rank === 1 && <Badge variant="success" className="text-[9px]">Best</Badge>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Core Metrics Comparison */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <MetricComparisonCard
          title="Decision Distribution"
          icon={GitCompareArrows}
          results={results}
          getValue={(r) => r.decisions}
          render={(decisions) => (
            <div className="flex items-center gap-2">
              <span className="text-success">{decisions.allow}</span>
              <span className="text-[10px] text-muted-foreground">allow</span>
              <span className="text-warning">{decisions.challenge}</span>
              <span className="text-[10px] text-muted-foreground">chal</span>
              <span className="text-destructive">{decisions.deny}</span>
              <span className="text-[10px] text-muted-foreground">deny</span>
            </div>
          )}
        />
        <MetricComparisonCard
          title="Dominant Decision"
          icon={Target}
          results={results}
          getValue={(r) => r.decision}
          render={(d) => (
            <Badge variant={d === "Allow" ? "success" : d === "Deny" ? "destructive" : "warning"}>
              {d}
            </Badge>
          )}
        />
        <MetricComparisonCard
          title="Fraud Probability"
          icon={TrendingUp}
          results={results}
          getValue={(r) => r.fraudProbability}
          render={(v) => <span className="font-mono">{v != null ? `${(v * 100).toFixed(1)}%` : "—"}</span>}
          highlight="min"
        />
        <MetricComparisonCard
          title="Coherence Score"
          icon={Brain}
          results={results}
          getValue={(r) => r.coherenceScore}
          render={(v) => <span className="font-mono">{v != null ? v.toFixed(3) : "—"}</span>}
          highlight="max"
        />
        <MetricComparisonCard
          title="Risk Score"
          icon={Shield}
          results={results}
          getValue={(r) => r.riskScore}
          render={(v) => <span className="font-mono">{v != null ? v : "—"}</span>}
          highlight="min"
        />
        <MetricComparisonCard
          title="Execution Time"
          icon={Clock}
          results={results}
          getValue={(r) => r.durationMs}
          render={(v) => <span className="font-mono">{v ? `${(v / 1000).toFixed(1)}s` : "—"}</span>}
          highlight="min"
        />
        <MetricComparisonCard
          title="Triggered Rules"
          icon={Layers}
          results={results}
          getValue={(r) => r.triggeredRules}
          render={(v) => <span className="font-mono">{v ?? "—"}</span>}
          highlight="max"
        />
        <MetricComparisonCard
          title="Generated Signals"
          icon={Zap}
          results={results}
          getValue={(r) => r.signals}
          render={(v) => <span className="font-mono">{v ?? "—"}</span>}
          highlight="max"
        />
        <MetricComparisonCard
          title="Engineered Features"
          icon={Layers}
          results={results}
          getValue={(r) => r.engineeredFeatures}
          render={(v) => <span className="font-mono">{v ?? "—"}</span>}
          highlight="max"
        />
        <MetricComparisonCard
          title="Model AUC"
          icon={Gauge}
          results={results}
          getValue={(r) => r.modelAuc}
          render={(v) => <span className="font-mono">{v != null ? v.toFixed(3) : "—"}</span>}
          highlight="max"
        />
        <MetricComparisonCard
          title="Reason Codes"
          icon={Sparkles}
          results={results}
          getValue={(r) => r.reasonCodes}
          render={(v) => <span className="font-mono">{v ?? "—"}</span>}
          highlight="max"
        />
        <MetricComparisonCard
          title="Explainability"
          icon={Sparkles}
          results={results}
          getValue={(r) => r.explainability}
          render={(v) => <span className="font-mono">{v != null ? v.toFixed(3) : "—"}</span>}
          highlight="max"
        />
      </div>

      {/* Domain Scores */}
      <DomainScoresCard results={results} />

      {/* Model Outputs Detail */}
      <ModelOutputsCard results={results} />

      {/* Benchmark Summary */}
      {hasSummary && <BenchmarkSummaryCard summary={summary} />}
    </div>
  );
}

function MetricComparisonCard<T>({
  title, icon: Icon, results, getValue, render, highlight,
}: {
  title: string;
  icon: typeof TrendingUp;
  results: ComparisonResult[];
  getValue: (r: ComparisonResult) => T;
  render: (v: T) => React.ReactNode;
  highlight?: "min" | "max";
}) {
  const validResults = results.filter((r) => {
    const v = getValue(r);
    return v != null && v !== "" && !(typeof v === "object" && v !== null);
  });

  let bestIdx = -1;
  if (highlight && validResults.length > 0) {
    const numericVals = validResults.map((r, i) => {
      const v = getValue(r);
      return typeof v === "number" ? v : -Infinity;
    });
    if (highlight === "max") {
      bestIdx = numericVals.indexOf(Math.max(...numericVals));
    } else {
      const finite = numericVals.filter((v) => v !== -Infinity);
      if (finite.length > 0) bestIdx = numericVals.indexOf(Math.min(...finite));
    }
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-[13px] font-bold text-foreground">{title}</h3>
      </div>
      <div className="space-y-2">
        {results.map((r, i) => {
          const v = getValue(r);
          const isBest = i === bestIdx;
          const color = PIPELINE_COLORS[i % PIPELINE_COLORS.length];
          return (
            <div
              key={r.executionId}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2 transition-all",
                isBest ? "bg-success/10 ring-1 ring-success/30" : "bg-muted/20",
              )}
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                <span className="text-[11.5px] font-medium text-foreground">{r.pipelineName}</span>
                {isBest && <Badge variant="success" className="text-[8.5px]">BEST</Badge>}
              </div>
              <div className="text-[12px]">
                {typeof v === "object" && v !== null ? render(v) : render(v)}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function DomainScoresCard({ results }: { results: ComparisonResult[] }) {
  const domains = useMemo(() => {
    const all = new Set<string>();
    results.forEach((r) => {
      if (r.domainScores) Object.keys(r.domainScores).forEach((d) => all.add(d));
    });
    return Array.from(all).sort();
  }, [results]);

  if (domains.length === 0) return null;

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        <h3 className="text-[13px] font-bold text-foreground">Domain Scores</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-border">
              <th className="py-2 pr-4 text-left font-semibold text-muted-foreground">Pipeline</th>
              {domains.map((d) => (
                <th key={d} className="px-3 py-2 text-right font-semibold capitalize text-muted-foreground">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => {
              const color = PIPELINE_COLORS[i % PIPELINE_COLORS.length];
              return (
                <tr key={r.executionId} className="border-b border-border/50 hover:bg-accent/20">
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                      <span className="font-medium text-foreground">{r.pipelineName}</span>
                    </div>
                  </td>
                  {domains.map((d) => {
                    const val = r.domainScores?.[d];
                    const isBest = val != null && highlightMax(results, (r2) => r2.domainScores?.[d] ?? null) === val;
                    return (
                      <td key={d} className={cn("px-3 py-2 text-right font-mono", isBest && "text-success font-bold")}>
                        {val != null ? val.toFixed(3) : "—"}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ModelOutputsCard({ results }: { results: ComparisonResult[] }) {
  const hasModelData = results.some((r) => r.modelAuc != null || r.modelPrecision != null || r.modelRecall != null);
  if (!hasModelData) return null;

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <Gauge className="h-4 w-4 text-primary" />
        <h3 className="text-[13px] font-bold text-foreground">Model Outputs</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-border">
              <th className="py-2 pr-4 text-left font-semibold text-muted-foreground">Pipeline</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">AUC</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Precision</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Recall</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => {
              const color = PIPELINE_COLORS[i % PIPELINE_COLORS.length];
              return (
                <tr key={r.executionId} className="border-b border-border/50 hover:bg-accent/20">
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                      <span className="font-medium text-foreground">{r.pipelineName}</span>
                    </div>
                  </td>
                  <td className={cn("px-3 py-2 text-right font-mono", highlightMax(results, (r2) => r2.modelAuc) === r.modelAuc && "text-success font-bold")}>
                    {r.modelAuc != null ? r.modelAuc.toFixed(3) : "—"}
                  </td>
                  <td className={cn("px-3 py-2 text-right font-mono", highlightMax(results, (r2) => r2.modelPrecision) === r.modelPrecision && "text-success font-bold")}>
                    {r.modelPrecision != null ? r.modelPrecision.toFixed(3) : "—"}
                  </td>
                  <td className={cn("px-3 py-2 text-right font-mono", highlightMax(results, (r2) => r2.modelRecall) === r.modelRecall && "text-success font-bold")}>
                    {r.modelRecall != null ? r.modelRecall.toFixed(3) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function BenchmarkSummaryCard({ summary }: { summary: Partial<BenchmarkSummary> }) {
  const avgEntries = Object.entries(summary.averages || {});
  if (avgEntries.length === 0) return null;

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="text-[13px] font-bold text-foreground">Benchmarking Summary</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {avgEntries.map(([field, avg]) => {
          const best = summary.best?.[field];
          const worst = summary.worst?.[field];
          return (
            <div key={field} className="rounded-lg bg-muted/20 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{formatFieldLabel(field)}</div>
              <div className="mt-1 font-mono text-[14px] font-bold text-foreground">{formatValue(field, avg)}</div>
              {best && (
                <div className="mt-1 text-[9.5px] text-success">
                  Best: {best.pipeline} ({formatValue(field, best.value)})
                </div>
              )}
              {worst && (
                <div className="text-[9.5px] text-muted-foreground">
                  Worst: {worst.pipeline} ({formatValue(field, worst.value)})
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Step-by-Step View — side-by-side step timeline
// ---------------------------------------------------------------------------

function StepByStepView({
  results, drillPipeline, setDrillPipeline,
}: {
  results: ComparisonResult[];
  drillPipeline: string | null;
  setDrillPipeline: (id: string | null) => void;
}) {
  if (drillPipeline) {
    const r = results.find((res) => res.executionId === drillPipeline);
    if (r) {
      return (
        <div>
          <button
            onClick={() => setDrillPipeline(null)}
            className="mb-3 flex items-center gap-1 text-[11px] text-primary hover:underline"
          >
            <ChevronRight className="h-3 w-3 rotate-180" /> Back to side-by-side
          </button>
          <StepTimeline result={r} />
        </div>
      );
    }
  }

  // Side-by-side: align steps by index
  const maxSteps = Math.max(...results.map((r) => r.steps.length), 0);

  return (
    <div className="space-y-3">
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${results.length}, minmax(0, 1fr))` }}>
        {results.map((r, i) => {
          const color = PIPELINE_COLORS[i % PIPELINE_COLORS.length];
          return (
            <div key={r.executionId} className="space-y-2">
              <button
                onClick={() => setDrillPipeline(r.executionId)}
                className="flex w-full items-center gap-2 rounded-lg border border-border p-3 text-left transition-colors hover:bg-accent/30"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-semibold text-foreground">{r.pipelineName}</div>
                  <div className="text-[10px] text-muted-foreground">{r.steps.length} steps · {r.durationMs ? `${(r.durationMs / 1000).toFixed(1)}s` : "—"}</div>
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Aligned step rows */}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${results.length}, minmax(0, 1fr))` }}>
        {Array.from({ length: maxSteps }).map((_, stepIdx) => (
          <div key={stepIdx} className="contents">
            {results.map((r) => {
              const step = r.steps[stepIdx];
              if (!step) return <div key={r.executionId} />;
              return (
                <div key={r.executionId} className="rounded-lg border border-border p-2.5">
                  <StepMiniRow step={step} />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function StepMiniRow({ step }: { step: ComparisonResult["steps"][number] }) {
  const def = NODE_TYPE_MAP[step.nodeType];
  const SIcon = STEP_ICON[step.status] ?? Clock;
  const color = STATUS_COLOR[step.status] ?? "text-muted-foreground";
  return (
    <div className="flex items-start gap-2">
      <div className="flex h-6 w-6 items-center justify-center rounded-md border border-border" style={{ background: def ? `${def.color}11` : undefined }}>
        {def && <def.icon className="h-3 w-3" style={{ color: def.color }} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="truncate text-[11px] font-semibold text-foreground">{step.nodeLabel}</span>
          <SIcon className={cn("h-3 w-3 shrink-0", color, step.status === "running" && "animate-spin")} />
        </div>
        {step.durationMs > 0 && (
          <span className="font-mono text-[9.5px] text-muted-foreground">{(step.durationMs / 1000).toFixed(1)}s</span>
        )}
        {step.rowsOut != null && (
          <span className="ml-2 font-mono text-[9.5px] text-muted-foreground">out: {step.rowsOut}</span>
        )}
      </div>
    </div>
  );
}

function StepTimeline({ result }: { result: ComparisonResult }) {
  return (
    <Card className="p-2">
      <div className="space-y-0 p-2">
        {result.steps.map((step, i) => (
          <StepFullRow key={step.nodeId + i} step={step} isLast={i === result.steps.length - 1} />
        ))}
      </div>
    </Card>
  );
}

function StepFullRow({ step, isLast }: { step: ComparisonResult["steps"][number]; isLast: boolean }) {
  const def = NODE_TYPE_MAP[step.nodeType];
  const SIcon = STEP_ICON[step.status] ?? Clock;
  const color = STATUS_COLOR[step.status] ?? "text-muted-foreground";
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
            {step.log.map((l, j) => (
              <div key={j} className="flex gap-1.5">
                <ChevronRight className="h-2.5 w-2.5 shrink-0 translate-y-px text-muted-foreground/50" />
                {l}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Artifacts Drill-Down — side-by-side artifact comparison
// ---------------------------------------------------------------------------

function ArtifactsDrillDown({
  results, drillPipeline, setDrillPipeline,
}: {
  results: ComparisonResult[];
  drillPipeline: string | null;
  setDrillPipeline: (id: string | null) => void;
}) {
  const [selectedStep, setSelectedStep] = useState<string | null>(null);

  if (drillPipeline) {
    const r = results.find((res) => res.executionId === drillPipeline);
    if (r) {
      return (
        <div>
          <button
            onClick={() => setDrillPipeline(null)}
            className="mb-3 flex items-center gap-1 text-[11px] text-primary hover:underline"
          >
            <ChevronRight className="h-3 w-3 rotate-180" /> Back to side-by-side
          </button>
          <div className="space-y-2">
            {r.steps.map((step) => {
              const def = NODE_TYPE_MAP[step.nodeType];
              const artifactKeys = Object.keys(step.artifacts || {});
              if (artifactKeys.length === 0) return null;
              return (
                <Card key={step.nodeId} className="p-3">
                  <div className="mb-2 flex items-center gap-2">
                    {def && <def.icon className="h-3.5 w-3.5" style={{ color: def.color }} />}
                    <span className="text-[12px] font-semibold text-foreground">{step.nodeLabel}</span>
                    <Badge variant="outline" className="text-[9px]">{step.nodeType}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                    {artifactKeys.map((k) => (
                      <div key={k} className="rounded-md bg-muted/20 p-2">
                        <div className="text-[9.5px] font-bold uppercase tracking-wide text-muted-foreground">{k}</div>
                        <div className="mt-0.5 font-mono text-[12px] text-foreground">
                          {formatArtifact(step.artifacts[k])}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      );
    }
  }

  // Side-by-side artifact comparison for a selected step type
  const allStepTypes = useMemo(() => {
    const types = new Set<string>();
    results.forEach((r) => r.steps.forEach((s) => types.add(s.nodeType)));
    return Array.from(types).sort();
  }, [results]);

  const currentStep = selectedStep || allStepTypes[0] || null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {allStepTypes.map((t) => {
          const def = NODE_TYPE_MAP[t];
          return (
            <button
              key={t}
              onClick={() => setSelectedStep(t)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10.5px] font-semibold transition-all",
                currentStep === t ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {def && <def.icon className="h-3 w-3" style={{ color: def.color }} />}
              {def?.label ?? t}
            </button>
          );
        })}
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${results.length}, minmax(0, 1fr))` }}>
        {results.map((r, i) => {
          const color = PIPELINE_COLORS[i % PIPELINE_COLORS.length];
          const step = r.steps.find((s) => s.nodeType === currentStep);
          return (
            <div key={r.executionId} className="space-y-2">
              <button
                onClick={() => setDrillPipeline(r.executionId)}
                className="flex w-full items-center gap-2 rounded-lg border border-border p-3 text-left transition-colors hover:bg-accent/30"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                <span className="text-[12px] font-semibold text-foreground">{r.pipelineName}</span>
              </button>
              {step ? (
                <Card className="p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-foreground">{step.nodeLabel}</span>
                    <Badge variant={step.status === "succeeded" ? "success" : "outline"} className="text-[9px]">{step.status}</Badge>
                  </div>
                  {Object.keys(step.artifacts || {}).length > 0 ? (
                    <div className="space-y-1.5">
                      {Object.entries(step.artifacts).map(([k, v]) => (
                        <div key={k} className="rounded-md bg-muted/20 p-2">
                          <div className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">{k}</div>
                          <div className="mt-0.5 font-mono text-[11.5px] text-foreground">{formatArtifact(v)}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10.5px] text-muted-foreground">No artifacts</span>
                  )}
                  {step.log.length > 0 && (
                    <div className="mt-2 space-y-0.5 rounded-md bg-muted/30 p-2 font-mono text-[9.5px] leading-relaxed text-muted-foreground">
                      {step.log.map((l, j) => (
                        <div key={j} className="flex gap-1.5">
                          <ChevronRight className="h-2 w-2 shrink-0 translate-y-px text-muted-foreground/50" />
                          {l}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ) : (
                <div className="rounded-lg border border-dashed border-border p-4 text-center text-[10.5px] text-muted-foreground">
                  No {currentStep} node
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Report Modal — comparison report & benchmarking summary
// ---------------------------------------------------------------------------

function ReportModal({ run, onClose }: { run: ComparisonRun; onClose: () => void }) {
  const summary = run.summary;
  const rankings = summary.rankings || [];
  const hasSummary = rankings.length > 0;

  const handleDownloadReport = () => {
    const report = generateReport(run);
    const blob = new Blob([report], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comparison-report-${run.id}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal open onClose={onClose} className="max-w-3xl">
      <div className="max-h-[75vh] overflow-y-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[16px] font-bold text-foreground">
            <Download className="h-4 w-4 text-primary" />
            Comparison Report
          </h2>
          <Button size="sm" variant="outline" onClick={handleDownloadReport}>
            <Download className="h-3.5 w-3.5" /> Download HTML
          </Button>
        </div>

        <div className="space-y-4 text-[12px]">
          <div className="glass-card p-4">
            <h3 className="mb-2 text-[13px] font-bold text-foreground">Run Details</h3>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div><span className="text-muted-foreground">Run ID:</span> <span className="font-mono">{run.id}</span></div>
              <div><span className="text-muted-foreground">Created:</span> {formatDateTime(run.createdAt)}</div>
              <div><span className="text-muted-foreground">Input Type:</span> <span className="capitalize">{run.inputType}</span></div>
              <div><span className="text-muted-foreground">Pipelines:</span> {run.pipelineIds.length}</div>
              <div><span className="text-muted-foreground">Status:</span> <span className="capitalize">{run.status}</span></div>
              <div><span className="text-muted-foreground">Triggered By:</span> {run.triggeredBy}</div>
            </div>
          </div>

          {hasSummary && rankings.length > 0 && (
            <div className="glass-card p-4">
              <h3 className="mb-2 text-[13px] font-bold text-foreground">Rankings</h3>
              <div className="space-y-1.5">
                {rankings.map((r) => (
                  <div key={r.pipeline} className="flex items-center justify-between">
                    <span className="text-[11.5px]">
                      <span className={cn("mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold", r.rank === 1 ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
                        {r.rank}
                      </span>
                      {r.pipeline}
                    </span>
                    <span className="font-mono text-[11.5px] text-muted-foreground">{r.score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="glass-card p-4">
            <h3 className="mb-2 text-[13px] font-bold text-foreground">Per-Pipeline Results</h3>
            <div className="space-y-3">
              {run.results.map((r, i) => {
                const color = PIPELINE_COLORS[i % PIPELINE_COLORS.length];
                return (
                  <div key={r.executionId} className="rounded-lg border border-border p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                      <span className="text-[12px] font-bold text-foreground">{r.pipelineName}</span>
                      <Badge variant={r.status === "succeeded" ? "success" : "outline"} className="text-[9px]">{r.status}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-[10.5px] md:grid-cols-3">
                      <ReportField label="Decision" value={r.decision} />
                      <ReportField label="Duration" value={r.durationMs ? `${(r.durationMs / 1000).toFixed(1)}s` : "—"} />
                      <ReportField label="Throughput" value={r.throughput ? `${r.throughput}/s` : "—"} />
                      <ReportField label="Fraud Prob" value={r.fraudProbability != null ? `${(r.fraudProbability * 100).toFixed(1)}%` : "—"} />
                      <ReportField label="Coherence" value={r.coherenceScore != null ? r.coherenceScore.toFixed(3) : "—"} />
                      <ReportField label="Risk Score" value={r.riskScore ?? "—"} />
                      <ReportField label="Triggered Rules" value={r.triggeredRules ?? "—"} />
                      <ReportField label="Signals" value={r.signals ?? "—"} />
                      <ReportField label="Features" value={r.engineeredFeatures ?? "—"} />
                      <ReportField label="Model AUC" value={r.modelAuc != null ? r.modelAuc.toFixed(3) : "—"} />
                      <ReportField label="Reason Codes" value={r.reasonCodes ?? "—"} />
                      <ReportField label="Explainability" value={r.explainability != null ? r.explainability.toFixed(3) : "—"} />
                    </div>
                    {r.domainScores && (
                      <div className="mt-2">
                        <div className="text-[9.5px] font-bold uppercase text-muted-foreground">Domain Scores</div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {Object.entries(r.domainScores).map(([d, v]) => (
                            <Badge key={d} variant="muted" className="text-[9px] capitalize">{d}: {v.toFixed(2)}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {hasSummary && summary.averages && Object.keys(summary.averages).length > 0 && (
            <div className="glass-card p-4">
              <h3 className="mb-2 text-[13px] font-bold text-foreground">Averages</h3>
              <div className="grid grid-cols-2 gap-1.5 text-[10.5px] md:grid-cols-3">
                {Object.entries(summary.averages).map(([k, v]) => (
                  <div key={k}>
                    <span className="text-muted-foreground">{formatFieldLabel(k)}:</span>{" "}
                    <span className="font-mono text-foreground">{formatValue(k, v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function ReportField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}:</span> <span className="font-mono text-foreground">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STEP_ICON: Record<string, typeof Clock> = {
  queued: Clock,
  running: Loader2,
  succeeded: CheckCircle2,
  failed: XCircle,
  cancelled: Ban,
  warning: AlertTriangle,
  skipped: Ban,
};

const STATUS_COLOR: Record<string, string> = {
  queued: "text-muted-foreground",
  running: "text-primary",
  succeeded: "text-success",
  failed: "text-destructive",
  cancelled: "text-muted-foreground",
  warning: "text-warning",
  skipped: "text-muted-foreground",
};

function highlightMax(results: ComparisonResult[], getter: (r: ComparisonResult) => number | null): number | null {
  const vals = results.map(getter).filter((v): v is number => v != null);
  if (vals.length === 0) return null;
  return Math.max(...vals);
}

function formatFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    durationMs: "Duration",
    avgLatencyMs: "Avg Latency",
    fraudProbability: "Fraud Prob",
    coherenceScore: "Coherence",
    riskScore: "Risk Score",
    triggeredRules: "Triggered Rules",
    signals: "Signals",
    engineeredFeatures: "Features",
    modelAuc: "Model AUC",
    modelPrecision: "Precision",
    modelRecall: "Recall",
    reasonCodes: "Reason Codes",
    explainability: "Explainability",
    graphRings: "Graph Rings",
    temporalAnomalies: "Anomalies",
    throughput: "Throughput",
  };
  return labels[field] ?? field;
}

function formatValue(field: string, value: number): string {
  if (field === "durationMs" || field === "avgLatencyMs") {
    return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${value.toFixed(0)}ms`;
  }
  if (field === "fraudProbability" || field === "coherenceScore" || field === "modelAuc" || field === "modelPrecision" || field === "modelRecall" || field === "explainability") {
    return value.toFixed(3);
  }
  return String(Math.round(value));
}

function formatArtifact(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v;
  if (typeof v === "boolean") return String(v);
  if (typeof v === "object") {
    try { return JSON.stringify(v); } catch { return String(v); }
  }
  return String(v);
}

function generateReport(run: ComparisonRun): string {
  const summary = run.summary;
  const rankings = summary.rankings || [];
  const hasSummary = rankings.length > 0;

  const rows = run.results.map((r, i) => {
    const color = PIPELINE_COLORS[i % PIPELINE_COLORS.length];
    return `
      <tr>
        <td><span style="color:${color}">●</span> ${r.pipelineName}</td>
        <td>${r.decision}</td>
        <td>${r.durationMs ? (r.durationMs / 1000).toFixed(1) + 's' : '—'}</td>
        <td>${r.fraudProbability != null ? (r.fraudProbability * 100).toFixed(1) + '%' : '—'}</td>
        <td>${r.coherenceScore != null ? r.coherenceScore.toFixed(3) : '—'}</td>
        <td>${r.riskScore ?? '—'}</td>
        <td>${r.triggeredRules ?? '—'}</td>
        <td>${r.signals ?? '—'}</td>
        <td>${r.modelAuc != null ? r.modelAuc.toFixed(3) : '—'}</td>
        <td>${r.reasonCodes ?? '—'}</td>
        <td>${r.explainability != null ? r.explainability.toFixed(3) : '—'}</td>
      </tr>`;
  }).join('');

  const rankingItems = hasSummary && rankings.length > 0
    ? rankings.map((r) => `<li>#${r.rank}: ${r.pipeline} (${r.score})</li>`).join('')
    : '<li>No rankings available</li>';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Comparison Report ${run.id}</title>
<style>
  body { font-family: -apple-system, sans-serif; max-width: 1100px; margin: 40px auto; padding: 0 20px; color: #1e293b; }
  h1 { color: #0ea5e9; }
  h2 { color: #334155; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 32px; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 13px; }
  th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }
  th { background: #f8fafc; font-weight: 600; }
  tr:nth-child(even) { background: #f8fafc; }
  .meta { color: #64748b; font-size: 13px; margin-bottom: 24px; }
  ol { font-size: 14px; }
</style></head><body>
<h1>Multi-Pipeline Comparison Report</h1>
<div class="meta">
  Run ID: <code>${run.id}</code> · Created: ${formatDateTime(run.createdAt)} ·
  Input: ${run.inputType} · Pipelines: ${run.pipelineIds.length} · Status: ${run.status}
</div>
<h2>Rankings</h2>
<ol>${rankingItems}</ol>
<h2>Per-Pipeline Results</h2>
<table>
  <thead><tr>
    <th>Pipeline</th><th>Decision</th><th>Duration</th><th>Fraud Prob</th>
    <th>Coherence</th><th>Risk Score</th><th>Triggered Rules</th>
    <th>Signals</th><th>Model AUC</th><th>Reason Codes</th><th>Explainability</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<h2>Decision Distribution</h2>
<table>
  <thead><tr><th>Pipeline</th><th>Allow</th><th>Challenge</th><th>Deny</th></tr></thead>
  <tbody>
    ${run.results.map((r) => `<tr><td>${r.pipelineName}</td><td>${r.decisions.allow}</td><td>${r.decisions.challenge}</td><td>${r.decisions.deny}</td></tr>`).join('')}
  </tbody>
</table>
</body></html>`;
}
