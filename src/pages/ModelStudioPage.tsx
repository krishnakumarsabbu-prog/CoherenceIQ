import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, Plus, Play, Trash2, Sparkles, GitBranch, Layers, CircleCheck as CheckCircle2, TrendingUp, SlidersHorizontal, Target, Activity, Eye, X, Copy, Upload, Link2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { EChart } from "@/components/charts/EChart";
import { cn, formatNumber, relativeTime } from "@/lib/utils";
import {
  listModels, listDatasets, getDataset, trainModel, retrainModel,
  publishModel, archiveModel, deleteModel, attachModelToPipeline, detachModelFromPipeline,
  seedData, ALGORITHM_META, ALGORITHMS, FEATURE_CATALOG,
  type TrainedModel, type TrainConfig, type ModelAlgorithm, type ModelMetrics,
} from "@/lib/datasetBuilderStore";

type View = "list" | "detail" | "train";

export function ModelStudioPage() {
  const [view, setView] = useState<View>("list");
  const [models, setModels] = useState<TrainedModel[]>([]);
  const [datasets, setDatasets] = useState(() => listDatasets());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [trainOpen, setTrainOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    seedData();
    setModels(listModels());
    setDatasets(listDatasets());
  }, []);

  const refresh = () => {
    setModels(listModels());
    setDatasets(listDatasets());
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const selected = useMemo(
    () => (selectedId ? models.find((m) => m.id === selectedId) ?? null : null),
    [selectedId, models],
  );

  const stats = useMemo(() => ({
    total: models.length,
    published: models.filter((m) => m.status === "published").length,
    draft: models.filter((m) => m.status === "draft").length,
    bestAuc: models.reduce((best, m) => Math.max(best, m.metrics.rocAuc), 0),
  }), [models]);

  const handleDelete = (id: string) => {
    deleteModel(id);
    refresh();
    if (selectedId === id) { setSelectedId(null); setView("list"); }
    showToast("Model deleted");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-5 pt-4 lg:px-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Model Studio</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Train, evaluate, and version ML models — reusable assets attachable to any pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          {view === "detail" && selected && (
            <Button variant="outline" size="sm" onClick={() => setView("list")}>
              <Cpu className="h-3.5 w-3.5" /> All Models
            </Button>
          )}
          <Button size="sm" onClick={() => setTrainOpen(true)} disabled={datasets.length === 0}>
            <Plus className="h-3.5 w-3.5" /> Train Model
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 border-b border-border px-5 py-2.5 sm:grid-cols-4 lg:px-6">
        <StatTile label="Models" value={stats.total} icon={Cpu} color="text-primary" />
        <StatTile label="Published" value={stats.published} icon={CheckCircle2} color="text-success" />
        <StatTile label="Drafts" value={stats.draft} icon={Layers} color="text-warning" />
        <StatTile label="Best ROC-AUC" value={stats.bestAuc.toFixed(3)} icon={TrendingUp} color="text-primary" />
      </div>

      {view === "list" && (
        <div className="scrollbar-thin flex-1 overflow-y-auto p-5 lg:p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {models.map((m, i) => (
              <ModelCard key={m.id} model={m} index={i} onClick={() => { setSelectedId(m.id); setView("detail"); }} onDelete={() => handleDelete(m.id)} />
            ))}
          </div>
          {models.length === 0 && (
            <div className="py-16 text-center text-[13px] text-muted-foreground">
              No models yet. Click <span className="font-semibold text-foreground">Train Model</span> to begin.
            </div>
          )}
        </div>
      )}

      {view === "detail" && selected && (
        <ModelDetail
          model={selected}
          onBack={() => setView("list")}
          onDelete={() => handleDelete(selected.id)}
          onPublish={() => { publishModel(selected.id); refresh(); showToast("Model published"); }}
          onArchive={() => { archiveModel(selected.id); refresh(); showToast("Model archived"); }}
          onRetrain={(cfg) => { retrainModel(selected.id, cfg); refresh(); showToast("Model retrained"); }}
          onAttach={(p) => { attachModelToPipeline(selected.id, p); refresh(); showToast(`Attached to ${p}`); }}
          onDetach={(p) => { detachModelFromPipeline(selected.id, p); refresh(); showToast(`Detached from ${p}`); }}
        />
      )}

      <TrainModal
        open={trainOpen}
        onClose={() => setTrainOpen(false)}
        datasets={datasets}
        onTrained={(m) => {
          refresh();
          setTrainOpen(false);
          setSelectedId(m.id);
          setView("detail");
          showToast(`Model "${m.name}" trained`);
        }}
      />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 rounded-lg border border-border bg-background px-4 py-2.5 text-[12px] font-semibold text-foreground shadow-2xl"
          >
            <CheckCircle2 className="mr-1.5 inline h-3.5 w-3.5 text-success" />{toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/40 px-3 py-2">
      <Icon className={cn("h-4 w-4", color)} />
      <div>
        <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={cn("font-mono text-[15px] font-bold tabular-nums", color)}>{value}</div>
      </div>
    </div>
  );
}

function ModelCard({ model, index, onClick, onDelete }: { model: TrainedModel; index: number; onClick: () => void; onDelete: () => void }) {
  const meta = ALGORITHM_META[model.algorithm];
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.4) }}
      onClick={onClick}
      className="glass-card glass-card-hover relative overflow-hidden p-4 text-left"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full blur-[40px]" style={{ background: `${meta.color}22` }} />
      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${meta.color}22`, color: meta.color }}>
            <Cpu className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[12.5px] font-bold text-foreground">{model.name}</div>
            <div className="font-mono text-[9.5px] text-muted-foreground">{model.id}</div>
          </div>
        </div>
        <Badge variant={model.status === "published" ? "success" : model.status === "draft" ? "warning" : "muted"} className="text-[9px]">
          {model.status}
        </Badge>
      </div>
      <div className="relative mt-2.5 text-[10.5px] text-muted-foreground">
        {meta.label} · {model.task} · {model.datasetName}
      </div>
      <div className="relative mt-3 grid grid-cols-3 gap-1.5">
        <MiniStat label="ROC-AUC" value={model.metrics.rocAuc.toFixed(3)} />
        <MiniStat label="F1" value={model.metrics.f1.toFixed(3)} />
        <MiniStat label="Precision" value={model.metrics.precision.toFixed(3)} />
      </div>
      <div className="relative mt-3 flex items-center justify-between text-[9.5px] text-muted-foreground">
        <span className="flex items-center gap-1"><GitBranch className="h-3 w-3" />{model.versions.length} versions</span>
        <span>{model.selectedFeatures.length} features</span>
      </div>
      <div className="relative mt-2 flex items-center justify-between">
        <span className="text-[9px] text-muted-foreground">updated {relativeTime(model.updatedAt)}</span>
        <div onClick={(e) => e.stopPropagation()}>
          <button onClick={onDelete} className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </motion.button>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-card/40 px-1.5 py-1 text-center">
      <div className="text-[8px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-mono text-[11px] font-bold tabular-nums text-foreground">{value}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Model detail
// ---------------------------------------------------------------------------

function ModelDetail({
  model, onBack, onDelete, onPublish, onArchive, onRetrain, onAttach, onDetach,
}: {
  model: TrainedModel;
  onBack: () => void;
  onDelete: () => void;
  onPublish: () => void;
  onArchive: () => void;
  onRetrain: (cfg: TrainConfig) => void;
  onAttach: (pipeline: string) => void;
  onDetach: (pipeline: string) => void;
}) {
  const [tab, setTab] = useState<"overview" | "evaluation" | "features" | "config" | "versions" | "pipelines">("overview");
  const [retuneOpen, setRetuneOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const meta = ALGORITHM_META[model.algorithm];

  const rocOption = useMemo(() => ({
    tooltip: { trigger: "axis" as const },
    legend: { data: ["ROC curve"], top: 0 },
    grid: { left: 48, right: 18, top: 30, bottom: 32, containLabel: true },
    xAxis: { name: "FPR", type: "value" as const, min: 0, max: 1 },
    yAxis: { name: "TPR", type: "value" as const, min: 0, max: 1 },
    series: [{
      name: "ROC curve",
      type: "line" as const,
      smooth: true,
      showSymbol: false,
      data: model.metrics.rocCurve.map((p) => [p.fpr, p.tpr]),
      areaStyle: { opacity: 0.15 },
      lineStyle: { width: 2 },
    }],
  }), [model]);

  const prOption = useMemo(() => ({
    tooltip: { trigger: "axis" as const },
    legend: { data: ["PR curve"], top: 0 },
    grid: { left: 48, right: 18, top: 30, bottom: 32, containLabel: true },
    xAxis: { name: "Recall", type: "value" as const, min: 0, max: 1 },
    yAxis: { name: "Precision", type: "value" as const, min: 0, max: 1 },
    series: [{
      name: "PR curve",
      type: "line" as const,
      smooth: true,
      showSymbol: false,
      data: model.metrics.prCurve.map((p) => [p.recall, p.precision]),
      areaStyle: { opacity: 0.15 },
      lineStyle: { width: 2 },
    }],
  }), [model]);

  const importanceOption = useMemo(() => {
    const top = model.featureImportance.slice(0, 12);
    return {
      tooltip: { trigger: "axis" as const },
      grid: { left: 120, right: 18, top: 20, bottom: 24, containLabel: false },
      xAxis: { type: "value" as const, max: Math.max(...top.map((f) => f.importance)) * 1.1 },
      yAxis: { type: "category" as const, data: top.map((f) => f.feature).reverse(), axisLabel: { fontSize: 10 } },
      series: [{
        type: "bar" as const,
        data: top.map((f) => f.importance).reverse(),
        itemStyle: { color: meta.color },
      }],
    };
  }, [model, meta.color]);

  return (
    <div className="scrollbar-thin flex-1 overflow-y-auto p-5 lg:p-6">
      <div className="flex flex-col gap-3 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-foreground">{model.name}</h2>
            <Badge variant={model.status === "published" ? "success" : model.status === "draft" ? "warning" : "muted"} className="text-[9px]">
              {model.status}
            </Badge>
          </div>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {meta.label} · {model.task} · trained on {model.datasetName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setRetuneOpen(true)}>
            <SlidersHorizontal className="h-3.5 w-3.5" /> Retrain
          </Button>
          {model.status === "draft" ? (
            <Button size="sm" onClick={onPublish}><Upload className="h-3.5 w-3.5" /> Publish</Button>
          ) : model.status === "published" ? (
            <Button variant="outline" size="sm" onClick={onArchive}><ArchiveIcon /> Archive</Button>
          ) : (
            <Button size="sm" onClick={onPublish}><Upload className="h-3.5 w-3.5" /> Republish</Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto border-b border-border">
        {(["overview", "evaluation", "features", "config", "versions", "pipelines"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2 text-[12px] font-semibold capitalize transition-colors",
              tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="glass-card p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Key Metrics</div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <MetricItem label="Accuracy" value={model.metrics.accuracy.toFixed(4)} />
              <MetricItem label="Precision" value={model.metrics.precision.toFixed(4)} />
              <MetricItem label="Recall" value={model.metrics.recall.toFixed(4)} />
              <MetricItem label="F1 Score" value={model.metrics.f1.toFixed(4)} />
              <MetricItem label="ROC-AUC" value={model.metrics.rocAuc.toFixed(4)} tone="text-primary" />
              <MetricItem label="PR-AUC" value={model.metrics.prAuc.toFixed(4)} tone="text-primary" />
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Confusion Matrix</div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-md border border-success/30 bg-success/10 p-3">
                <div className="text-[9px] uppercase text-muted-foreground">True Neg</div>
                <div className="font-mono text-[18px] font-bold text-success">{model.metrics.confusion.tn}</div>
              </div>
              <div className="rounded-md border border-warning/30 bg-warning/10 p-3">
                <div className="text-[9px] uppercase text-muted-foreground">False Pos</div>
                <div className="font-mono text-[18px] font-bold text-warning">{model.metrics.confusion.fp}</div>
              </div>
              <div className="rounded-md border border-warning/30 bg-warning/10 p-3">
                <div className="text-[9px] uppercase text-muted-foreground">False Neg</div>
                <div className="font-mono text-[18px] font-bold text-warning">{model.metrics.confusion.fn}</div>
              </div>
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3">
                <div className="text-[9px] uppercase text-muted-foreground">True Pos</div>
                <div className="font-mono text-[18px] font-bold text-destructive">{model.metrics.confusion.tp}</div>
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Training Config</div>
            <div className="mt-3 space-y-1.5 text-[12px]">
              <Row label="Algorithm" value={meta.label} />
              <Row label="Task" value={model.task} />
              <Row label="Test Split" value={`${(model.config.testSplit * 100).toFixed(0)}%`} />
              <Row label="CV Folds" value={String(model.config.cvFolds)} />
              <Row label="Features" value={String(model.config.featureKeys.length)} />
              <Row label="Tuning" value={model.config.tuning ? `${model.config.tuningTrials} trials` : "off"} />
              <Row label="Seed" value={String(model.config.randomSeed)} />
            </div>
          </div>
        </div>
      )}

      {tab === "evaluation" && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">ROC Curve</div>
              <Badge variant="default" className="text-[9px]">AUC {model.metrics.rocAuc.toFixed(3)}</Badge>
            </div>
            <div className="mt-2 h-64"><EChart option={rocOption} /></div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Precision-Recall Curve</div>
              <Badge variant="default" className="text-[9px]">AUC {model.metrics.prAuc.toFixed(3)}</Badge>
            </div>
            <div className="mt-2 h-64"><EChart option={prOption} /></div>
          </div>
          <div className="glass-card p-4 lg:col-span-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Metrics Summary</div>
            <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
              <MetricItem label="Accuracy" value={model.metrics.accuracy.toFixed(4)} />
              <MetricItem label="Precision" value={model.metrics.precision.toFixed(4)} />
              <MetricItem label="Recall" value={model.metrics.recall.toFixed(4)} />
              <MetricItem label="F1" value={model.metrics.f1.toFixed(4)} />
              <MetricItem label="ROC-AUC" value={model.metrics.rocAuc.toFixed(4)} tone="text-primary" />
              <MetricItem label="PR-AUC" value={model.metrics.prAuc.toFixed(4)} tone="text-primary" />
            </div>
          </div>
        </div>
      )}

      {tab === "features" && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="glass-card p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Feature Importance</div>
            <div className="mt-2 h-80"><EChart option={importanceOption} /></div>
          </div>
          <div className="glass-card p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Selected Features ({model.selectedFeatures.length})</div>
            <div className="mt-3 max-h-80 space-y-1.5 overflow-y-auto scrollbar-thin">
              {model.featureImportance.map((f, i) => {
                const spec = FEATURE_CATALOG.find((s) => s.key === model.selectedFeatures[i] || s.label === f.feature);
                return (
                  <div key={f.feature} className="flex items-center justify-between text-[11.5px]">
                    <span className="text-foreground">{f.feature}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 rounded-full bg-muted">
                        <div className="h-full rounded-full" style={{ width: `${f.importance * 100}%`, background: meta.color }} />
                      </div>
                      <span className="w-12 text-right font-mono text-[10px] text-muted-foreground">{(f.importance * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === "config" && (
        <div className="mt-4 glass-card p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Hyperparameters</div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {meta.hyperparameters.map((hp) => (
              <div key={hp.key} className="rounded-md border border-border/60 bg-card/30 px-3 py-2">
                <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{hp.label}</div>
                <div className="font-mono text-[13px] font-bold text-foreground">{String(model.config.hyperparameters[hp.key] ?? hp.default)}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Train/Test Split & CV</div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-md border border-border/60 bg-card/30 px-3 py-2">
              <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Test Split</div>
              <div className="font-mono text-[13px] font-bold text-foreground">{(model.config.testSplit * 100).toFixed(0)}%</div>
            </div>
            <div className="rounded-md border border-border/60 bg-card/30 px-3 py-2">
              <div className="text-[9px] uppercase tracking-wide text-muted-foreground">CV Folds</div>
              <div className="font-mono text-[13px] font-bold text-foreground">{model.config.cvFolds}</div>
            </div>
            <div className="rounded-md border border-border/60 bg-card/30 px-3 py-2">
              <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Tuning</div>
              <div className="font-mono text-[13px] font-bold text-foreground">{model.config.tuning ? "On" : "Off"}</div>
            </div>
            <div className="rounded-md border border-border/60 bg-card/30 px-3 py-2">
              <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Seed</div>
              <div className="font-mono text-[13px] font-bold text-foreground">{model.config.randomSeed}</div>
            </div>
          </div>
        </div>
      )}

      {tab === "versions" && (
        <div className="mt-4 glass-card p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Version History</div>
          <div className="mt-3 space-y-2">
            {model.versions.map((v, i) => (
              <div key={v.version} className="flex items-start gap-3 rounded-md border border-border/60 bg-card/30 p-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                  {model.versions.length - i}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[12px] font-bold text-foreground">{v.version}</span>
                    <span className="text-[10px] text-muted-foreground">{v.date}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">{v.change}</div>
                  <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                    <span>AUC <b className="font-mono text-foreground">{v.metrics.rocAuc.toFixed(3)}</b></span>
                    <span>F1 <b className="font-mono text-foreground">{v.metrics.f1.toFixed(3)}</b></span>
                    <span>Precision <b className="font-mono text-foreground">{v.metrics.precision.toFixed(3)}</b></span>
                    <span>Recall <b className="font-mono text-foreground">{v.metrics.recall.toFixed(3)}</b></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "pipelines" && (
        <div className="mt-4 glass-card p-5">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Attached Pipelines</div>
            <Button size="sm" variant="outline" onClick={() => setAttachOpen(true)}>
              <Link2 className="h-3.5 w-3.5" /> Attach
            </Button>
          </div>
          <div className="mt-3 space-y-2">
            {model.attachedPipelines.length === 0 ? (
              <div className="py-8 text-center text-[12px] text-muted-foreground">
                This model is not attached to any pipeline yet. Attach it to make it a reusable asset.
              </div>
            ) : (
              model.attachedPipelines.map((p) => (
                <div key={p} className="flex items-center justify-between rounded-md border border-border/60 bg-card/30 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[12px] font-medium text-foreground">{p}</span>
                  </div>
                  <button
                    onClick={() => onDetach(p)}
                    className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Unlink className="h-3 w-3" /> Detach
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <RetrainModal
        open={retuneOpen}
        onClose={() => setRetuneOpen(false)}
        model={model}
        onConfirm={(cfg) => { onRetrain(cfg); setRetuneOpen(false); }}
      />

      <AttachPipelineModal
        open={attachOpen}
        onClose={() => setAttachOpen(false)}
        existing={model.attachedPipelines}
        onAttach={(p) => { onAttach(p); setAttachOpen(false); }}
      />
    </div>
  );
}

function ArchiveIcon() {
  return <Layers className="h-3.5 w-3.5" />;
}

function MetricItem({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("font-mono text-[16px] font-bold tabular-nums text-foreground", tone)}>{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-semibold text-foreground">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Train modal
// ---------------------------------------------------------------------------

function TrainModal({ open, onClose, datasets, onTrained }: {
  open: boolean;
  onClose: () => void;
  datasets: ReturnType<typeof listDatasets>;
  onTrained: (m: TrainedModel) => void;
}) {
  const [datasetId, setDatasetId] = useState(datasets[0]?.id ?? "");
  const [algorithm, setAlgorithm] = useState<ModelAlgorithm>("xgboost");
  const [testSplit, setTestSplit] = useState(0.2);
  const [cvFolds, setCvFolds] = useState(5);
  const [featureKeys, setFeatureKeys] = useState<string[]>([]);
  const [hyperparameters, setHyperparameters] = useState<Record<string, number | string>>({});
  const [tuning, setTuning] = useState(false);
  const [tuningTrials, setTuningTrials] = useState(20);
  const [randomSeed, setRandomSeed] = useState(42);
  const [training, setTraining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dataset = useMemo(() => datasets.find((d) => d.id === datasetId), [datasets, datasetId]);
  const meta = ALGORITHM_META[algorithm];

  useEffect(() => {
    if (dataset) setFeatureKeys(dataset.featureKeys);
  }, [dataset]);

  useEffect(() => {
    const hp: Record<string, number | string> = {};
    for (const spec of meta.hyperparameters) hp[spec.key] = spec.default;
    setHyperparameters(hp);
  }, [algorithm]);

  const toggleFeature = (key: string) => {
    setFeatureKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const handleTrain = () => {
    setError(null);
    if (!dataset) { setError("Select a dataset"); return; }
    if (featureKeys.length === 0) { setError("Select at least one feature"); return; }
    if (meta.task === "classification" && dataset.kind === "unlabelled") {
      setError("Classification algorithms require a labelled dataset");
      return;
    }
    setTraining(true);
    setTimeout(() => {
      const cfg: TrainConfig = {
        algorithm, testSplit, cvFolds, featureKeys, hyperparameters,
        tuning, tuningTrials, randomSeed,
      };
      const { model } = trainModel(dataset, cfg);
      setTraining(false);
      onTrained(model);
    }, 900);
  };

  return (
    <Modal open={open} onClose={onClose} className="max-w-2xl">
      <div className="border-b border-border px-5 py-4 text-[14px] font-bold text-foreground">Train New Model</div>
      <div className="max-h-[65vh] overflow-y-auto scrollbar-thin p-5">
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Dataset</label>
            <select
              value={datasetId}
              onChange={(e) => setDatasetId(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-[13px] text-foreground focus:border-primary focus:outline-none"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.kind}, {formatNumber(d.stats.rows)} rows)</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Algorithm</label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ALGORITHMS.map((algo) => {
                const m = ALGORITHM_META[algo];
                const disabled = m.task === "classification" && dataset?.kind === "unlabelled";
                return (
                  <button
                    key={algo}
                    onClick={() => !disabled && setAlgorithm(algo)}
                    disabled={disabled}
                    className={cn(
                      "rounded-lg border p-2.5 text-left transition-all",
                      algorithm === algo ? "border-primary bg-primary/10" : "border-border hover:bg-accent",
                      disabled && "cursor-not-allowed opacity-40",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />
                      <span className="text-[12px] font-semibold text-foreground">{m.label}</span>
                    </div>
                    <div className="mt-0.5 text-[9.5px] text-muted-foreground">{m.task}</div>
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[10.5px] text-muted-foreground">{meta.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="text-[10px] text-muted-foreground">Test Split: {(testSplit * 100).toFixed(0)}%</label>
              <input type="range" min={0.1} max={0.4} step={0.05} value={testSplit} onChange={(e) => setTestSplit(Number(e.target.value))} className="mt-1 w-full accent-primary" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">CV Folds: {cvFolds}</label>
              <input type="range" min={2} max={10} step={1} value={cvFolds} onChange={(e) => setCvFolds(Number(e.target.value))} className="mt-1 w-full accent-primary" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Seed: {randomSeed}</label>
              <input type="range" min={1} max={100} step={1} value={randomSeed} onChange={(e) => setRandomSeed(Number(e.target.value))} className="mt-1 w-full accent-primary" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-[11px] text-foreground">
                <input type="checkbox" checked={tuning} onChange={(e) => setTuning(e.target.checked)} className="accent-primary" />
                Hyperparam tuning
              </label>
            </div>
          </div>

          {tuning && (
            <div>
              <label className="text-[10px] text-muted-foreground">Tuning Trials: {tuningTrials}</label>
              <input type="range" min={5} max={100} step={5} value={tuningTrials} onChange={(e) => setTuningTrials(Number(e.target.value))} className="mt-1 w-full accent-primary" />
            </div>
          )}

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Hyperparameters</label>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {meta.hyperparameters.map((hp) => (
                <div key={hp.key}>
                  <label className="text-[10px] text-muted-foreground">{hp.label}</label>
                  {hp.type === "number" ? (
                    <input
                      type="number"
                      min={hp.min}
                      max={hp.max}
                      step={hp.step}
                      value={Number(hyperparameters[hp.key] ?? hp.default)}
                      onChange={(e) => setHyperparameters((p) => ({ ...p, [hp.key]: Number(e.target.value) }))}
                      className="mt-0.5 h-8 w-full rounded-md border border-border bg-background px-2 text-[12px] text-foreground focus:border-primary focus:outline-none"
                    />
                  ) : (
                    <select
                      value={String(hyperparameters[hp.key] ?? hp.default)}
                      onChange={(e) => setHyperparameters((p) => ({ ...p, [hp.key]: e.target.value }))}
                      className="mt-0.5 h-8 w-full rounded-md border border-border bg-background px-2 text-[12px] text-foreground focus:border-primary focus:outline-none"
                    >
                      {hp.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Feature Selection ({featureKeys.length} selected)
              </label>
              {dataset && (
                <button onClick={() => setFeatureKeys(dataset.featureKeys)} className="text-[10px] text-primary hover:underline">
                  Select all
                </button>
              )}
            </div>
            <div className="mt-2 max-h-40 flex flex-wrap gap-1.5 overflow-y-auto scrollbar-thin">
              {FEATURE_CATALOG.map((f) => {
                const on = featureKeys.includes(f.key);
                const available = dataset?.featureKeys.includes(f.key);
                return (
                  <button
                    key={f.key}
                    onClick={() => toggleFeature(f.key)}
                    disabled={!available}
                    className={cn(
                      "rounded-md border px-2 py-1 text-[10px] font-medium transition-all",
                      on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground",
                      !available && "cursor-not-allowed opacity-30",
                    )}
                    title={f.description}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] text-destructive">{error}</div>}
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border px-5 py-3">
        <div className="text-[10.5px] text-muted-foreground">
          {featureKeys.length} features · {meta.label} · {cvFolds}-fold CV
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleTrain} disabled={training}>
            {training ? <Sparkles className="h-3.5 w-3.5 animate-pulse" /> : <Play className="h-3.5 w-3.5" />}
            {training ? "Training…" : "Train Model"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Retrain modal (reuses train config editing)
// ---------------------------------------------------------------------------

function RetrainModal({ open, onClose, model, onConfirm }: {
  open: boolean;
  onClose: () => void;
  model: TrainedModel;
  onConfirm: (cfg: TrainConfig) => void;
}) {
  const [cfg, setCfg] = useState<TrainConfig>(model.config);
  const meta = ALGORITHM_META[cfg.algorithm];

  useEffect(() => { setCfg(model.config); }, [model]);

  return (
    <Modal open={open} onClose={onClose} className="max-w-md">
      <div className="border-b border-border px-5 py-4 text-[14px] font-bold text-foreground">Retrain Model</div>
      <div className="space-y-4 p-5">
        <p className="text-[12px] text-muted-foreground">
          Retrain <b className="text-foreground">{model.name}</b> with a new configuration. A new version will be added to the version history.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-muted-foreground">Test Split: {(cfg.testSplit * 100).toFixed(0)}%</label>
            <input type="range" min={0.1} max={0.4} step={0.05} value={cfg.testSplit} onChange={(e) => setCfg({ ...cfg, testSplit: Number(e.target.value) })} className="mt-1 w-full accent-primary" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">CV Folds: {cfg.cvFolds}</label>
            <input type="range" min={2} max={10} step={1} value={cfg.cvFolds} onChange={(e) => setCfg({ ...cfg, cvFolds: Number(e.target.value) })} className="mt-1 w-full accent-primary" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {meta.hyperparameters.map((hp) => (
            <div key={hp.key}>
              <label className="text-[10px] text-muted-foreground">{hp.label}</label>
              <input
                type="number"
                min={hp.min}
                max={hp.max}
                step={hp.step}
                value={Number(cfg.hyperparameters[hp.key] ?? hp.default)}
                onChange={(e) => setCfg({ ...cfg, hyperparameters: { ...cfg.hyperparameters, [hp.key]: Number(e.target.value) } })}
                className="mt-0.5 h-8 w-full rounded-md border border-border bg-background px-2 text-[12px] text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          ))}
        </div>
        <label className="flex items-center gap-2 text-[11px] text-foreground">
          <input type="checkbox" checked={cfg.tuning} onChange={(e) => setCfg({ ...cfg, tuning: e.target.checked })} className="accent-primary" />
          Hyperparameter tuning ({cfg.tuningTrials} trials)
        </label>
      </div>
      <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={() => onConfirm(cfg)}><Play className="h-3.5 w-3.5" /> Retrain</Button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Attach pipeline modal
// ---------------------------------------------------------------------------

function AttachPipelineModal({ open, onClose, existing, onAttach }: {
  open: boolean;
  onClose: () => void;
  existing: string[];
  onAttach: (pipeline: string) => void;
}) {
  const [name, setName] = useState("");
  const suggestions = [
    "Realtime Session Scoring",
    "Batch Fraud Screening",
    "Model Training & Evaluation",
    "Shadow Mode Evaluation",
    "Anomaly Detection Pipeline",
  ].filter((s) => !existing.includes(s));

  return (
    <Modal open={open} onClose={onClose} className="max-w-md">
      <div className="border-b border-border px-5 py-4 text-[14px] font-bold text-foreground">Attach to Pipeline</div>
      <div className="space-y-3 p-5">
        <p className="text-[12px] text-muted-foreground">Attach this model as a reusable asset to any pipeline.</p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Pipeline name…"
          className="h-9 w-full rounded-md border border-border bg-background px-3 text-[13px] text-foreground focus:border-primary focus:outline-none"
        />
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Suggestions</div>
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => onAttach(s)}
              className="flex w-full items-center justify-between rounded-md border border-border/60 px-3 py-2 text-left text-[12px] text-foreground hover:bg-accent"
            >
              <span className="flex items-center gap-2"><Link2 className="h-3.5 w-3.5 text-primary" />{s}</span>
              <Plus className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={() => { if (name.trim()) onAttach(name.trim()); }} disabled={!name.trim()}>
          <Link2 className="h-3.5 w-3.5" /> Attach
        </Button>
      </div>
    </Modal>
  );
}
