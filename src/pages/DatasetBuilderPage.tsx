import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Database, Plus, Search, Filter, Trash2, Play, Sparkles, Tag, Table2, ChartBar as BarChart3, Layers, X, CircleCheck as CheckCircle2, GitBranch, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { EChart } from "@/components/charts/EChart";
import { cn, formatNumber, formatPercent, relativeTime } from "@/lib/utils";
import {
  listDatasets, createDataset, deleteDataset, getDataset, seedData,
  FEATURE_CATALOG, FEATURE_CATEGORIES, SIGNAL_GENERATORS,
  type Dataset, type DatasetKind, type FeatureCategory,
} from "@/lib/datasetBuilderStore";

type View = "list" | "detail";

export function DatasetBuilderPage() {
  const [view, setView] = useState<View>("list");
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<DatasetKind | "all">("all");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    seedData();
    setDatasets(listDatasets());
  }, []);

  const refresh = () => setDatasets(listDatasets());

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const selected = useMemo(
    () => (selectedId ? getDataset(selectedId) ?? null : null),
    [selectedId, datasets],
  );

  const filtered = useMemo(() => {
    return datasets.filter((d) => {
      if (kindFilter !== "all" && d.kind !== kindFilter) return false;
      if (query && !d.name.toLowerCase().includes(query.toLowerCase()) && !d.description.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [datasets, query, kindFilter]);

  const stats = useMemo(() => ({
    total: datasets.length,
    labelled: datasets.filter((d) => d.kind === "labelled").length,
    unlabelled: datasets.filter((d) => d.kind === "unlabelled").length,
    rows: datasets.reduce((a, d) => a + d.stats.rows, 0),
  }), [datasets]);

  const handleOpen = (d: Dataset) => {
    setSelectedId(d.id);
    setView("detail");
  };

  const handleDelete = (id: string) => {
    deleteDataset(id);
    refresh();
    if (selectedId === id) { setSelectedId(null); setView("list"); }
    showToast("Dataset deleted");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-5 pt-4 lg:px-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Dataset Builder</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Transform historical login sessions into ML datasets with auto-generated signals & engineered features
          </p>
        </div>
        <div className="flex items-center gap-2">
          {view === "detail" && (
            <Button variant="outline" size="sm" onClick={() => setView("list")}>
              <Database className="h-3.5 w-3.5" /> All Datasets
            </Button>
          )}
          <Button size="sm" onClick={() => setBuilderOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Build Dataset
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 border-b border-border px-5 py-2.5 sm:grid-cols-4 lg:px-6">
        <StatTile label="Datasets" value={stats.total} icon={Database} color="text-primary" />
        <StatTile label="Labelled" value={stats.labelled} icon={Tag} color="text-success" />
        <StatTile label="Unlabelled" value={stats.unlabelled} icon={Layers} color="text-warning" />
        <StatTile label="Total Rows" value={formatNumber(stats.rows)} icon={Table2} color="text-primary" />
      </div>

      {view === "list" && (
        <>
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-2.5 lg:px-6">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search datasets…"
                className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-3 text-[12px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              {(["all", "labelled", "unlabelled"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setKindFilter(k)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[10.5px] font-semibold capitalize transition-all",
                    kindFilter === k ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          <div className="scrollbar-thin flex-1 overflow-y-auto p-5 lg:p-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filtered.map((d, i) => (
                <DatasetCard key={d.id} dataset={d} index={i} onClick={() => handleOpen(d)} onDelete={() => handleDelete(d.id)} />
              ))}
            </div>
            {filtered.length === 0 && (
              <div className="py-16 text-center text-[13px] text-muted-foreground">
                No datasets yet. Click <span className="font-semibold text-foreground">Build Dataset</span> to create one.
              </div>
            )}
          </div>
        </>
      )}

      {view === "detail" && selected && (
        <DatasetDetail dataset={selected} onDelete={() => handleDelete(selected.id)} />
      )}

      <DatasetBuilderModal
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        onCreated={(d) => {
          refresh();
          setBuilderOpen(false);
          setSelectedId(d.id);
          setView("detail");
          showToast(`Dataset "${d.name}" built`);
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

function DatasetCard({ dataset, index, onClick, onDelete }: { dataset: Dataset; index: number; onClick: () => void; onDelete: () => void }) {
  const isLabelled = dataset.kind === "labelled";
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.4) }}
      onClick={onClick}
      className="glass-card glass-card-hover relative overflow-hidden p-4 text-left"
    >
      <div className={cn("pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full blur-[40px]", isLabelled ? "bg-success/20" : "bg-warning/20")} />
      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", isLabelled ? "bg-success/15 text-success" : "bg-warning/15 text-warning")}>
            <Database className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[12.5px] font-bold text-foreground">{dataset.name}</div>
            <div className="font-mono text-[9.5px] text-muted-foreground">{dataset.id}</div>
          </div>
        </div>
        <Badge variant={isLabelled ? "success" : "warning"} className="text-[9px]">{dataset.kind}</Badge>
      </div>
      <p className="relative mt-2.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{dataset.description}</p>
      <div className="relative mt-3 grid grid-cols-3 gap-1.5">
        <MiniStat label="Rows" value={formatNumber(dataset.stats.rows)} />
        <MiniStat label="Features" value={String(dataset.stats.features)} />
        <MiniStat label="Fraud %" value={isLabelled ? formatPercent(dataset.stats.fraudRate * 100, 1) : "—"} />
      </div>
      <div className="relative mt-3 flex items-center justify-between text-[9.5px] text-muted-foreground">
        <span className="flex items-center gap-1"><GitBranch className="h-3 w-3" />{dataset.versions.length} versions</span>
        <span>updated {relativeTime(dataset.updatedAt)}</span>
      </div>
      <div
        className="relative mt-2 flex justify-end"
        onClick={(e) => { e.stopPropagation(); }}
      >
        <button
          onClick={onDelete}
          className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </button>
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
// Dataset detail view
// ---------------------------------------------------------------------------

function DatasetDetail({ dataset, onDelete }: { dataset: Dataset; onDelete: () => void }) {
  const [tab, setTab] = useState<"overview" | "features" | "preview" | "signals">("overview");

  const categoryCounts = useMemo(() => {
    const counts = new Map<FeatureCategory, number>();
    for (const key of dataset.featureKeys) {
      const spec = FEATURE_CATALOG.find((f) => f.key === key);
      if (spec) counts.set(spec.category, (counts.get(spec.category) ?? 0) + 1);
    }
    return counts;
  }, [dataset]);

  const distributionOption = useMemo(() => {
    const top = dataset.stats.featureDistributions.filter((d) => d.max > d.min).slice(0, 8);
    return {
      tooltip: { trigger: "axis" as const },
      legend: { data: top.map((d) => d.label), top: 0 },
      grid: { left: 48, right: 18, top: 40, bottom: 32, containLabel: true },
      xAxis: { type: "category" as const, data: top.map((d) => d.label), axisLabel: { rotate: 30, fontSize: 9.5 } },
      yAxis: { type: "value" as const },
      series: [
        { name: "Min", type: "bar" as const, data: top.map((d) => d.min), itemStyle: { color: "#0ea5e9" } },
        { name: "Mean", type: "bar" as const, data: top.map((d) => d.mean), itemStyle: { color: "#10b981" } },
        { name: "Max", type: "bar" as const, data: top.map((d) => d.max), itemStyle: { color: "#f97316" } },
      ],
    };
  }, [dataset]);

  const labelPieOption = useMemo(() => {
    if (dataset.kind !== "labelled") return null;
    return {
      tooltip: { trigger: "item" as const },
      legend: { bottom: 0, textStyle: { fontSize: 11 } },
      series: [{
        type: "pie" as const,
        radius: ["40%", "70%"],
        center: ["50%", "45%"],
        data: [
          { name: "Legit", value: dataset.stats.legitRows, itemStyle: { color: "#10b981" } },
          { name: "Fraud", value: dataset.stats.fraudRows, itemStyle: { color: "#ef4444" } },
        ],
        label: { fontSize: 11 },
      }],
    };
  }, [dataset]);

  return (
    <div className="scrollbar-thin flex-1 overflow-y-auto p-5 lg:p-6">
      <div className="flex flex-col gap-3 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-foreground">{dataset.name}</h2>
            <Badge variant={dataset.kind === "labelled" ? "success" : "warning"} className="text-[9px]">{dataset.kind}</Badge>
          </div>
          <p className="mt-1 text-[13px] text-muted-foreground">{dataset.description}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
      </div>

      <div className="flex items-center gap-1 border-b border-border">
        {(["overview", "features", "preview", "signals"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "border-b-2 px-3 py-2 text-[12px] font-semibold capitalize transition-colors",
              tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t === "signals" ? "Signals" : t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="glass-card p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Dataset Stats</div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <StatItem label="Total Rows" value={formatNumber(dataset.stats.rows)} />
              <StatItem label="Features" value={String(dataset.stats.features)} />
              <StatItem label="Source Sessions" value={formatNumber(dataset.sourceSessionCount)} />
              <StatItem label="Kind" value={dataset.kind} />
              {dataset.kind === "labelled" ? (
                <>
                  <StatItem label="Fraud Rows" value={formatNumber(dataset.stats.fraudRows)} tone="text-destructive" />
                  <StatItem label="Legit Rows" value={formatNumber(dataset.stats.legitRows)} tone="text-success" />
                  <StatItem label="Fraud Rate" value={formatPercent(dataset.stats.fraudRate * 100, 2)} tone="text-warning" />
                </>
              ) : (
                <StatItem label="Unlabelled" value={formatNumber(dataset.stats.unlabelledRows)} tone="text-warning" />
              )}
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Feature Categories</div>
            <div className="mt-3 space-y-2">
              {FEATURE_CATEGORIES.map((cat) => {
                const count = categoryCounts.get(cat.id) ?? 0;
                if (count === 0) return null;
                return (
                  <div key={cat.id} className="flex items-center justify-between text-[12px]">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: cat.color }} />
                      {cat.label}
                    </span>
                    <span className="font-mono font-bold tabular-nums text-foreground">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Versions</div>
            <div className="mt-3 space-y-2">
              {dataset.versions.map((v) => (
                <div key={v.version} className="flex items-center justify-between text-[12px]">
                  <div>
                    <span className="font-mono font-bold text-foreground">{v.version}</span>
                    <span className="ml-2 text-muted-foreground">{v.change}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{v.date}</span>
                </div>
              ))}
            </div>
          </div>

          {labelPieOption && (
            <div className="glass-card p-4 lg:col-span-1">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Label Distribution</div>
              <div className="mt-2 h-56">
                <EChart option={labelPieOption} />
              </div>
            </div>
          )}

          <div className="glass-card p-4 lg:col-span-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Feature Distributions</div>
            <div className="mt-2 h-56">
              <EChart option={distributionOption} />
            </div>
          </div>
        </div>
      )}

      {tab === "features" && (
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {dataset.featureKeys.map((key) => {
            const spec = FEATURE_CATALOG.find((f) => f.key === key);
            if (!spec) return null;
            const cat = FEATURE_CATEGORIES.find((c) => c.id === spec.category);
            const dist = dataset.stats.featureDistributions.find((d) => d.key === key);
            return (
              <div key={key} className="glass-card p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-foreground">{spec.label}</span>
                  <Badge variant="outline" className="text-[8.5px]" style={{ color: cat?.color, borderColor: `${cat?.color}55` }}>
                    {cat?.label}
                  </Badge>
                </div>
                <div className="mt-1 text-[10.5px] text-muted-foreground">{spec.description}</div>
                <div className="mt-2 flex items-center gap-2 text-[10px]">
                  <Badge variant="muted" className="text-[8.5px]">{spec.dtype}</Badge>
                  {dist && spec.dtype === "numeric" && (
                    <span className="font-mono text-muted-foreground">
                      μ={dist.mean} · σ={dist.std} · [{dist.min}, {dist.max}]
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "preview" && (
        <div className="mt-4 glass-card overflow-hidden p-0">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border bg-card/40">
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Session</th>
                  {dataset.featureKeys.slice(0, 10).map((key) => {
                    const spec = FEATURE_CATALOG.find((f) => f.key === key);
                    return (
                      <th key={key} className="px-3 py-2 text-right font-semibold text-muted-foreground">
                        {spec?.label ?? key}
                      </th>
                    );
                  })}
                  <th className="px-3 py-2 text-center font-semibold text-muted-foreground">Label</th>
                </tr>
              </thead>
              <tbody>
                {dataset.rows.slice(0, 25).map((row) => (
                  <tr key={row.sessionId} className="border-b border-border/40 hover:bg-accent/30">
                    <td className="px-3 py-1.5 font-mono text-foreground">{row.sessionId}</td>
                    {dataset.featureKeys.slice(0, 10).map((key) => {
                      const v = row.features[key];
                      const display = typeof v === "number" ? (Number.isInteger(v) ? v : v.toFixed(2)) : String(v);
                      return (
                        <td key={key} className="px-3 py-1.5 text-right font-mono tabular-nums text-foreground">
                          {display}
                        </td>
                      );
                    })}
                    <td className="px-3 py-1.5 text-center">
                      {row.label === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : row.label === 1 ? (
                        <Badge variant="destructive" className="text-[8.5px]">Fraud</Badge>
                      ) : (
                        <Badge variant="success" className="text-[8.5px]">Legit</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-3 py-2 text-[10px] text-muted-foreground">
            Showing 25 of {formatNumber(dataset.stats.rows)} rows · {dataset.featureKeys.length} features
          </div>
        </div>
      )}

      {tab === "signals" && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SIGNAL_GENERATORS.map((sig) => {
            const cat = FEATURE_CATEGORIES.find((c) => c.id === sig.category);
            return (
              <div key={sig.id} className="glass-card p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-foreground">{sig.name}</span>
                  <Badge variant="outline" className="text-[8.5px]" style={{ color: cat?.color, borderColor: `${cat?.color}55` }}>
                    {cat?.label}
                  </Badge>
                </div>
                <div className="mt-1 text-[10.5px] leading-relaxed text-muted-foreground">{sig.description}</div>
                <div className="mt-2 flex items-center gap-1 text-[9.5px] text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-primary" /> Auto-generated signal
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatItem({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("font-mono text-[14px] font-bold tabular-nums text-foreground", tone)}>{value}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dataset builder modal
// ---------------------------------------------------------------------------

function DatasetBuilderModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (d: Dataset) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<DatasetKind>("labelled");
  const [sessionCount, setSessionCount] = useState(400);
  const [featureKeys, setFeatureKeys] = useState<string[]>(FEATURE_CATALOG.filter((f) => f.defaultOn).map((f) => f.key));
  const [labelStrategy, setLabelStrategy] = useState<"decision" | "risk_threshold" | "manual" | "none">("decision");
  const [riskThreshold, setRiskThreshold] = useState(70);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleFeature = (key: string) => {
    setFeatureKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const toggleCategory = (cat: FeatureCategory) => {
    const catKeys = FEATURE_CATALOG.filter((f) => f.category === cat).map((f) => f.key);
    const allOn = catKeys.every((k) => featureKeys.includes(k));
    if (allOn) {
      setFeatureKeys((prev) => prev.filter((k) => !catKeys.includes(k)));
    } else {
      setFeatureKeys((prev) => [...new Set([...prev, ...catKeys])]);
    }
  };

  const handleBuild = () => {
    setError(null);
    if (!name.trim()) { setError("Name is required"); return; }
    if (featureKeys.length === 0) { setError("Select at least one feature"); return; }
    setBuilding(true);
    setTimeout(() => {
      const dataset = createDataset({
        name: name.trim(),
        description: description.trim() || "Dataset built from historical login sessions.",
        kind,
        featureKeys,
        sessionCount,
        labelStrategy: kind === "labelled" ? labelStrategy : "none",
        riskThreshold,
      });
      setBuilding(false);
      setName("");
      setDescription("");
      onCreated(dataset);
    }, 700);
  };

  return (
    <Modal open={open} onClose={onClose} className="max-w-2xl">
      <div className="border-b border-border px-5 py-4 text-[14px] font-bold text-foreground">Build Dataset</div>
      <div className="max-h-[65vh] overflow-y-auto scrollbar-thin p-5">
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q3 Fraud Training Set"
              className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-[13px] text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the dataset purpose…"
              rows={2}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-[12px] text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Dataset Type</label>
              <div className="mt-1 flex gap-1.5">
                {(["labelled", "unlabelled"] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => { setKind(k); setLabelStrategy(k === "labelled" ? "decision" : "none"); }}
                    className={cn(
                      "flex-1 rounded-md border px-3 py-2 text-[12px] font-semibold capitalize transition-all",
                      kind === k ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Source Sessions: {sessionCount}</label>
              <input
                type="range"
                min={50}
                max={400}
                step={50}
                value={sessionCount}
                onChange={(e) => setSessionCount(Number(e.target.value))}
                className="mt-3 w-full accent-primary"
              />
            </div>
          </div>

          {kind === "labelled" && (
            <div className="rounded-lg border border-border/60 bg-card/30 p-3">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Label Strategy</label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {([
                  { id: "decision", label: "Decision Outcome" },
                  { id: "risk_threshold", label: "Risk Threshold" },
                  { id: "manual", label: "Fraud Probability" },
                ] as const).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setLabelStrategy(s.id)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[10.5px] font-semibold transition-all",
                      labelStrategy === s.id ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              {labelStrategy === "risk_threshold" && (
                <div className="mt-3">
                  <label className="text-[10px] text-muted-foreground">Risk threshold: {riskThreshold}</label>
                  <input
                    type="range"
                    min={40}
                    max={90}
                    step={5}
                    value={riskThreshold}
                    onChange={(e) => setRiskThreshold(Number(e.target.value))}
                    className="mt-1 w-full accent-primary"
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Engineered Features ({featureKeys.length} selected)
              </label>
              <span className="text-[10px] text-muted-foreground">{FEATURE_CATALOG.length} available</span>
            </div>
            <div className="mt-2 space-y-2">
              {FEATURE_CATEGORIES.map((cat) => {
                const catFeatures = FEATURE_CATALOG.filter((f) => f.category === cat.id);
                const selectedCount = catFeatures.filter((f) => featureKeys.includes(f.key)).length;
                return (
                  <div key={cat.id} className="rounded-lg border border-border/60 bg-card/20 p-2">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => toggleCategory(cat.id)}
                        className="flex items-center gap-2 text-[11px] font-semibold text-foreground hover:text-primary"
                      >
                        <span className="h-2 w-2 rounded-full" style={{ background: cat.color }} />
                        {cat.label}
                        <span className="text-[9.5px] text-muted-foreground">({selectedCount}/{catFeatures.length})</span>
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {catFeatures.map((f) => {
                        const on = featureKeys.includes(f.key);
                        return (
                          <button
                            key={f.key}
                            onClick={() => toggleFeature(f.key)}
                            className={cn(
                              "rounded-md border px-2 py-1 text-[10px] font-medium transition-all",
                              on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground",
                            )}
                            title={f.description}
                          >
                            {f.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] text-destructive">{error}</div>}
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border px-5 py-3">
        <div className="text-[10.5px] text-muted-foreground">
          {featureKeys.length} features · {sessionCount} sessions · {kind}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleBuild} disabled={building}>
            {building ? <Sparkles className="h-3.5 w-3.5 animate-pulse" /> : <Play className="h-3.5 w-3.5" />}
            {building ? "Building…" : "Build Dataset"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
