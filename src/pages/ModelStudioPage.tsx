import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, Gauge, Target, TrendingUp, Calendar, Activity, HeartPulse, Scale, GitBranch, Layers, Clock, CircleCheck as CheckCircle2, Circle as XCircle, TriangleAlert as AlertTriangle, Sparkles, X } from "lucide-react";
import { PageHeader } from "@/components/shell/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { EChart } from "@/components/charts/EChart";
import type { EChartsOption } from "echarts";
import {
  RISK_MODELS, MODEL_HEALTH_HISTORY, DEPLOYMENT_STATUS_TONE, HEALTH_TONE,
  type RiskModel, type DeploymentStatus, type ModelHealth,
} from "@/lib/modelStudioData";

const KIND_ICON: Record<RiskModel["kind"], React.ElementType> = {
  weighted: Scale,
  gradient: Layers,
  graph: GitBranch,
  temporal: Clock,
  policy: Cpu,
  ensemble: Sparkles,
};

const HEALTH_ICON: Record<ModelHealth, React.ElementType> = {
  healthy: CheckCircle2,
  degraded: AlertTriangle,
  down: XCircle,
};

export function ModelStudioPage() {
  const defaultModel = RISK_MODELS[0] ?? {
    id: "wcm", name: "Weighted Coherence Model", kind: "weighted" as const, version: "v3.2",
    accuracy: 0.942, precision: 0.918, recall: 0.904, roc: 0.961, trainingDate: "2026-06-12",
    deploymentStatus: "production" as const, latencyMs: 12, health: "healthy" as const, description: "Default risk model",
    color: "#0ea5e9", featureImportance: []
  };
  const [selected, setSelected] = useState<RiskModel>(defaultModel);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const stats = useMemo(() => {
    const total = RISK_MODELS.length || 1;
    const production = RISK_MODELS.filter((m) => m?.deploymentStatus === "production").length;
    const avgRoc = (RISK_MODELS.reduce((a, m) => a + (m?.roc ?? 0), 0) / total).toFixed(3);
    const healthy = RISK_MODELS.filter((m) => m?.health === "healthy").length;
    const avgLatency = Math.round(RISK_MODELS.reduce((a, m) => a + (m?.latencyMs ?? 0), 0) / total);
    return { total: RISK_MODELS.length, production, avgRoc, healthy, avgLatency };
  }, []);

  const rocOption = useMemo<EChartsOption>(() => ({
    tooltip: { trigger: "axis" },
    legend: { data: RISK_MODELS.map((m) => m.name), top: 0, type: "scroll" },
    grid: { left: 48, right: 18, top: 48, bottom: 32, containLabel: true },
    xAxis: { type: "value", name: "False positive rate", min: 0, max: 1, nameTextStyle: { fontSize: 10 } },
    yAxis: { type: "value", name: "True positive rate", min: 0, max: 1, nameTextStyle: { fontSize: 10 } },
    series: RISK_MODELS.map((m) => ({
      name: m.name,
      type: "line",
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 2, color: m.color },
      areaStyle: { opacity: 0.04, color: m.color },
      data: rocCurve(m.roc),
    })),
  }), []);

  const healthOption = useMemo<EChartsOption>(() => ({
    tooltip: { trigger: "axis", axisPointer: { type: "cross" } },
    legend: { data: ["Healthy", "Degraded", "Down"], top: 0 },
    grid: { left: 48, right: 18, top: 36, bottom: 32, containLabel: true },
    xAxis: { type: "category", data: MODEL_HEALTH_HISTORY.map((h) => h.day) },
    yAxis: { type: "value", name: "models" },
    series: [
      { name: "Healthy", type: "bar", stack: "h", itemStyle: { color: "#22c55e" }, data: MODEL_HEALTH_HISTORY.map((h) => h.healthy) },
      { name: "Degraded", type: "bar", stack: "h", itemStyle: { color: "#f59e0b" }, data: MODEL_HEALTH_HISTORY.map((h) => h.degraded) },
      { name: "Down", type: "bar", stack: "h", itemStyle: { color: "#ef4444" }, data: MODEL_HEALTH_HISTORY.map((h) => h.down) },
    ],
  }), []);

  return (
    <div className="flex h-full flex-col p-4 lg:p-5">
      <PageHeader
        title="Model Studio"
        subtitle="Train, evaluate, and ship risk models — track accuracy, precision, recall, and drift"
        actions={
          <>
            <Badge variant="default"><Cpu className="h-3 w-3" /> {stats.total} models</Badge>
            <Badge variant="success">{stats.production} in production</Badge>
            <Button size="sm"><Sparkles className="h-3.5 w-3.5" /> Train new</Button>
          </>
        }
      />

      {/* Top stats */}
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <StatTile icon={Cpu} label="Models" value={stats.total} color="text-primary" />
        <StatTile icon={Activity} label="In production" value={stats.production} color="text-success" />
        <StatTile icon={TrendingUp} label="Avg ROC" value={stats.avgRoc} color="text-primary" />
        <StatTile icon={HeartPulse} label="Healthy" value={`${stats.healthy}/${stats.total}`} color="text-success" />
        <StatTile icon={Gauge} label="Avg latency" value={`${stats.avgLatency}ms`} color="text-warning" />
        <StatTile icon={Target} label="Best ROC" value="0.983" color="text-success" />
      </div>

      <div className="grid flex-1 grid-cols-1 gap-3 min-h-0 xl:grid-cols-[1fr_420px]">
        {/* Left: model grid + charts */}
        <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
          {/* Model grid */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {RISK_MODELS.map((m, i) => (
              <ModelCard key={m.id} model={m} index={i} active={selected.id === m.id} onClick={() => { setSelected(m); setDrawerOpen(true); }} />
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Card className="p-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-[13px]">ROC curves</CardTitle>
                <CardDescription>True positive vs false positive rate per model</CardDescription>
              </CardHeader>
              <CardContent className="pt-1">
                <div className="h-[240px]"><EChart option={rocOption} style={{ height: "240px" }} /></div>
              </CardContent>
            </Card>
            <Card className="p-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-[13px]">Model health (14 days)</CardTitle>
                <CardDescription>Stacked health status across all models</CardDescription>
              </CardHeader>
              <CardContent className="pt-1">
                <div className="h-[240px]"><EChart option={healthOption} style={{ height: "240px" }} /></div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right: detail panel */}
        <ModelDetail model={selected} onSelect={(m) => setSelected(m)} />
      </div>

      <ModelDrawer model={selected} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}

function StatTile({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="glass-card glass-card-hover p-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
        <Icon className={cn("h-3.5 w-3.5", color)} />
      </div>
      <div className={cn("mt-1 text-xl font-bold tabular-nums", color)}>{value}</div>
    </motion.div>
  );
}

function ModelCard({ model, index, active, onClick }: { model: RiskModel; index: number; active: boolean; onClick: () => void }) {
  const Icon = KIND_ICON[model.kind];
  const HealthIcon = HEALTH_ICON[model.health];
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className={cn(
        "glass-card glass-card-hover relative overflow-hidden p-4 text-left",
        active && "border-primary/50 ring-1 ring-primary/30",
      )}
    >
      <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full blur-[50px]" style={{ background: `${model.color}22` }} />
      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${model.color}22`, color: model.color }}>
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[12.5px] font-bold text-foreground">{model.name}</div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="font-mono">{model.version}</span>
              <span>·</span>
              <span>{model.latencyMs}ms</span>
            </div>
          </div>
        </div>
        <HealthIcon className={cn("h-3.5 w-3.5 shrink-0", model.health === "healthy" ? "text-success" : model.health === "degraded" ? "text-warning" : "text-destructive")} />
      </div>

      <div className="relative mt-3 grid grid-cols-4 gap-1.5">
        <MiniMetric label="Acc" value={(model.accuracy * 100).toFixed(1)} />
        <MiniMetric label="Prec" value={(model.precision * 100).toFixed(1)} />
        <MiniMetric label="Rec" value={(model.recall * 100).toFixed(1)} />
        <MiniMetric label="ROC" value={model.roc.toFixed(3)} highlight />
      </div>

      <div className="relative mt-3 flex items-center justify-between">
        <Badge variant={DEPLOYMENT_STATUS_TONE[model.deploymentStatus]} className="text-[9px]">{model.deploymentStatus}</Badge>
        <span className="flex items-center gap-1 text-[9.5px] text-muted-foreground">
          <Calendar className="h-2.5 w-2.5" /> {model.trainingDate}
        </span>
      </div>
    </motion.button>
  );
}

function MiniMetric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-md border border-border/60 bg-card/40 px-1.5 py-1 text-center">
      <div className="text-[8px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("font-mono text-[12px] font-bold tabular-nums", highlight ? "text-primary" : "text-foreground")}>{value}</div>
    </div>
  );
}

function ModelDetail({ model, onSelect }: { model: RiskModel; onSelect: (m: RiskModel) => void }) {
  const fiList = model?.featureImportance ?? [];
  const fiOption = useMemo<EChartsOption>(() => ({
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: 120, right: 24, top: 8, bottom: 24, containLabel: false },
    xAxis: { type: "value", max: 1, axisLabel: { fontSize: 10 } },
    yAxis: { type: "category", data: fiList.map((f) => f.feature).reverse(), axisLabel: { fontSize: 10, fontFamily: "monospace" } },
    series: [{
      type: "bar",
      barWidth: "60%",
      itemStyle: { color: model?.color ?? "#0ea5e9", borderRadius: [0, 4, 4, 0] },
      data: fiList.map((f) => f.importance).reverse(),
    }],
  }), [model, fiList]);

  return (
    <Card className="flex min-h-0 flex-col overflow-hidden p-0">
      <div className="shrink-0 border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `${model.color}22`, color: model.color }}>
            {(() => { const Icon = KIND_ICON[model.kind]; return <Icon className="h-5 w-5" />; })()}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[15px] font-bold text-foreground">{model.name}</h2>
            <p className="truncate text-[11.5px] text-muted-foreground">{model.description}</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <DetailRow icon={GitBranch} label="Version" value={model.version} />
          <DetailRow icon={Calendar} label="Training date" value={model.trainingDate} />
          <DetailRow icon={Activity} label="Deployment" value={<Badge variant={DEPLOYMENT_STATUS_TONE[model.deploymentStatus]} className="text-[9px]">{model.deploymentStatus}</Badge>} />
          <DetailRow icon={HeartPulse} label="Health" value={<Badge variant={HEALTH_TONE[model.health]} className="text-[9px]">{model.health}</Badge>} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 border-b border-border p-4">
        <MetricBig label="Accuracy" value={(model.accuracy * 100).toFixed(1) + "%"} color={model.color} />
        <MetricBig label="Precision" value={(model.precision * 100).toFixed(1) + "%"} color={model.color} />
        <MetricBig label="Recall" value={(model.recall * 100).toFixed(1) + "%"} color={model.color} />
        <MetricBig label="ROC AUC" value={model.roc.toFixed(3)} color={model.color} highlight />
      </div>

      <div className="shrink-0 border-b border-border px-4 pb-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Feature importance</div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden p-4">
        <div className="h-full min-h-[180px]"><EChart option={fiOption} style={{ height: "100%" }} /></div>
      </div>

      <div className="shrink-0 border-t border-border p-3">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">All models</div>
        <div className="flex flex-wrap gap-1.5">
          {RISK_MODELS.map((m) => (
            <button
              key={m.id}
              onClick={() => onSelect(m)}
              className={cn(
                "rounded-md border px-2 py-0.5 text-[10.5px] font-medium transition-all",
                m.id === model.id ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/40 px-2.5 py-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="truncate text-[12px] font-semibold text-foreground">{value}</div>
      </div>
    </div>
  );
}

function MetricBig({ label, value, color, highlight }: { label: string; value: string; color: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-3 text-center">
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-mono text-xl font-bold tabular-nums" style={{ color: highlight ? color : undefined }}>{value}</div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${parseFloat(value) * (highlight ? 100 : 1)}%` }} transition={{ duration: 0.6 }}
          className="h-full rounded-full" style={{ background: color }}
        />
      </div>
    </div>
  );
}

function ModelDrawer({ model, open, onClose }: { model: RiskModel; open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[180]">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className="absolute right-0 top-0 flex h-full w-full max-w-[480px] flex-col border-l border-border bg-background shadow-2xl"
          >
            <div className="shrink-0 border-b border-border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `${model.color}22`, color: model.color }}>
                  {(() => { const Icon = KIND_ICON[model.kind]; return <Icon className="h-5 w-5" />; })()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[15px] font-semibold text-foreground">{model.name}</h3>
                  <p className="truncate text-[11.5px] text-muted-foreground">{model.description}</p>
                </div>
                <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="scrollbar-thin min-h-0 flex-1 overflow-auto p-4">
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <DrawerStat label="Accuracy" value={(model.accuracy * 100).toFixed(1) + "%"} />
                  <DrawerStat label="Precision" value={(model.precision * 100).toFixed(1) + "%"} />
                  <DrawerStat label="Recall" value={(model.recall * 100).toFixed(1) + "%"} />
                  <DrawerStat label="ROC AUC" value={model.roc.toFixed(3)} />
                  <DrawerStat label="Latency" value={`${model.latencyMs}ms`} />
                  <DrawerStat label="Version" value={model.version} />
                </div>
                <div>
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Feature importance</div>
                  <div className="space-y-2">
                    {model.featureImportance.map((f, i) => (
                      <motion.div key={f.feature} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="rounded-lg border border-border bg-card/40 p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[11px] font-semibold text-foreground">{f.feature}</span>
                          <span className="font-mono text-[11px] font-bold tabular-nums" style={{ color: model.color }}>{(f.importance * 100).toFixed(0)}%</span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${f.importance * 100}%` }} transition={{ duration: 0.5 }} className="h-full rounded-full" style={{ background: model.color }} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-card/40 p-3">
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Deployment & health</div>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant={DEPLOYMENT_STATUS_TONE[model.deploymentStatus]}>{model.deploymentStatus}</Badge>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[12px]">
                    <span className="text-muted-foreground">Health</span>
                    <Badge variant={HEALTH_TONE[model.health]}>{model.health}</Badge>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[12px]">
                    <span className="text-muted-foreground">Training date</span>
                    <span className="font-mono text-foreground">{model.trainingDate}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DrawerStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-2.5 text-center">
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-mono text-[14px] font-bold tabular-nums text-foreground">{value}</div>
    </div>
  );
}

/** Generate a synthetic ROC curve point cloud for a given AUC. */
function rocCurve(auc: number): [number, number][] {
  const pts: [number, number][] = [];
  const validAuc = isNaN(auc) ? 0.5 : Math.max(0.01, Math.min(0.99, auc));
  const k = Math.max(1.2, 4 * validAuc);
  for (let i = 0; i <= 20; i++) {
    const fpr = i / 20;
    const base = Math.max(0, 1 - fpr);
    const tprVal = Math.min(1, Math.pow(base, 1 / k) * 0.98 + (1 - validAuc) * 0.4 * fpr);
    const tpr = isNaN(tprVal) ? fpr : Math.max(0, Math.min(1, tprVal));
    pts.push([+fpr.toFixed(3), +tpr.toFixed(3)]);
  }
  return pts;
}
