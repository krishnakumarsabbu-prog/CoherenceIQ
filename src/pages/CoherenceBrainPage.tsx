import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Cpu, Smartphone, MapPin, Network, Activity, Gavel, Share2,
  Clock, ShieldAlert, X, Zap, Gauge, Sparkles, ArrowRight, TrendingUp,
} from "lucide-react";
import { generateSessions } from "@/lib/mockData";
import { buildBrain, type DomainModel, type DomainKind, type RiskBand } from "@/lib/coherenceBrainData";
import { PageHeader } from "@/components/shell/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn, formatDateTime } from "@/lib/utils";
import { EChart } from "@/components/charts/EChart";
import type { EChartsOption } from "echarts";

const SESSIONS = generateSessions(200);
const SESSION = SESSIONS.find(s => s.riskScore >= 60) ?? SESSIONS[0];

const KIND_META: Record<DomainKind, { icon: typeof Cpu; color: string; bg: string }> = {
  "Device DNA": { icon: Smartphone, color: "#8b5cf6", bg: "rgba(139,92,246,0.14)" },
  "Location": { icon: MapPin, color: "#3b82f6", bg: "rgba(59,130,246,0.14)" },
  "IP": { icon: Network, color: "#ef4444", bg: "rgba(239,68,68,0.14)" },
  "Behavior": { icon: Activity, color: "#06b6d4", bg: "rgba(6,182,212,0.14)" },
  "Policy": { icon: Gavel, color: "#f59e0b", bg: "rgba(245,158,11,0.14)" },
  "Graph": { icon: Share2, color: "#ec4899", bg: "rgba(236,72,153,0.14)" },
  "Temporal": { icon: Clock, color: "#14b8a6", bg: "rgba(20,184,166,0.14)" },
  "Fraud Model": { icon: Cpu, color: "#f97316", bg: "rgba(249,115,22,0.14)" },
};

const BAND_COLOR: Record<RiskBand, string> = {
  low: "#22c55e", medium: "#eab308", high: "#f97316", critical: "#ef4444",
};

const MODEL_ORDER: DomainKind[] = ["Device DNA", "Location", "IP", "Behavior", "Policy", "Graph", "Temporal", "Fraud Model"];

export function CoherenceBrainPage() {
  const data = useMemo(() => buildBrain(SESSION), []);
  const [selected, setSelected] = useState<DomainModel | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const orderedModels = useMemo(() =>
    MODEL_ORDER.map(k => data.models.find(m => m.kind === k)!).filter(Boolean), [data.models]);

  const openModel = (m: DomainModel) => { setSelected(m); setDrawerOpen(true); };

  const decisionColor = data.decision === "Deny" ? "#ef4444" : data.decision === "Challenge" ? "#f59e0b" : "#22c55e";

  const contributionOption = useMemo<EChartsOption>(() => ({
    tooltip: { trigger: "item", backgroundColor: "rgba(15,23,42,0.92)", borderColor: "rgba(148,163,184,0.2)", textStyle: { color: "#e2e8f0", fontSize: 11 } },
    legend: { show: false },
    series: [{
      type: "pie", radius: ["52%", "78%"], center: ["50%", "50%"],
      avoidLabelOverlap: true, padAngle: 2,
      itemStyle: { borderRadius: 4, borderColor: "transparent", borderWidth: 0 },
      label: { show: false },
      data: data.modelContributions.map((c, i) => ({
        name: c.model, value: c.contribution * 100,
        itemStyle: { color: Object.values(KIND_META)[i].color },
      })),
    }],
  }), [data.modelContributions]);

  const timelineOption = useMemo<EChartsOption>(() => ({
    tooltip: { trigger: "axis", backgroundColor: "rgba(15,23,42,0.92)", borderColor: "rgba(148,163,184,0.2)", textStyle: { color: "#e2e8f0", fontSize: 11 } },
    grid: { left: 40, right: 16, top: 16, bottom: 28 },
    xAxis: { type: "category", data: data.decisionTimeline.map(d => d.label), axisLine: { lineStyle: { color: "rgba(148,163,184,0.25)" } }, axisLabel: { color: "#94a3b8", fontSize: 9, rotate: 18, interval: 0 } },
    yAxis: { type: "value", name: "latency (ms)", nameTextStyle: { color: "#94a3b8", fontSize: 9 }, axisLine: { show: false }, splitLine: { lineStyle: { color: "rgba(148,163,184,0.08)" } }, axisLabel: { color: "#94a3b8", fontSize: 9 } },
    series: [{
      type: "bar", barWidth: "55%",
      data: data.decisionTimeline.map(d => ({
        value: d.latency, itemStyle: { color: BAND_COLOR[d.kind], borderRadius: [4, 4, 0, 0] },
      })),
    }],
  }), [data.decisionTimeline]);

  return (
    <div className="flex h-full flex-col p-4 lg:p-5">
      <PageHeader
        title="Coherence Brain"
        subtitle="Core ML inference engine — domain models fused into a single coherence score"
        actions={
          <>
            <Badge variant="default"><Brain className="h-3 w-3" /> {data.stats.version}</Badge>
            <Badge variant="success">AUC {data.stats.auc}</Badge>
            <Button size="sm"><Sparkles className="h-3.5 w-3.5" /> Re-score</Button>
          </>
        }
      />

      {/* Stats */}
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-6">
        {[
          { label: "Models", value: data.models.length, icon: Cpu, color: "text-primary" },
          { label: "Avg Confidence", value: `${(data.stats.avgConfidence * 100).toFixed(0)}%`, icon: Gauge, color: "text-success" },
          { label: "Total Latency", value: `${data.stats.totalLatency}ms`, icon: Zap, color: "text-warning" },
          { label: "Models Fired", value: data.stats.modelsFired, icon: ShieldAlert, color: "text-destructive" },
          { label: "Features", value: data.stats.featureCount, icon: Activity, color: "text-primary" },
          { label: "AUC", value: data.stats.auc, icon: TrendingUp, color: "text-success" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="glass-card glass-card-hover p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{s.label}</span>
              <s.icon className={cn("h-3.5 w-3.5", s.color)} />
            </div>
            <div className={cn("mt-1 text-xl font-bold tabular-nums", s.color)}>{s.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Center fusion panel — the brain */}
      <Card className="relative mb-3 overflow-hidden p-0">
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[80px]" />
        </div>
        <div className="relative grid grid-cols-1 gap-4 p-5 lg:grid-cols-[1fr_340px_1fr]">
          {/* Left: domain models feeding in */}
          <div className="flex flex-col gap-1.5">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Domain Models</div>
            {orderedModels.slice(0, 4).map((m, i) => (
              <ModelFeed key={m.id} model={m} index={i} onClick={() => openModel(m)} side="left" />
            ))}
          </div>

          {/* Center: coherence score */}
          <div className="flex flex-col items-center justify-center">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="relative flex h-44 w-44 items-center justify-center"
            >
              {/* Pulsing rings */}
              <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.15, 0.5] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full border-2"
                style={{ borderColor: decisionColor }}
              />
              <motion.div
                animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute inset-0 rounded-full border"
                style={{ borderColor: decisionColor }}
              />
              {/* Inner gauge */}
              <div className="relative flex h-36 w-36 flex-col items-center justify-center rounded-full border-2 bg-card/80 backdrop-blur-md"
                style={{ borderColor: decisionColor, boxShadow: `0 0 40px ${decisionColor}44` }}>
                <Brain className="absolute -top-3 h-6 w-6 rounded-full p-0.5" style={{ background: decisionColor, color: "white" }} />
                <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Coherence</div>
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                  className="font-mono text-4xl font-bold tabular-nums"
                  style={{ color: decisionColor }}>
                  {data.coherenceScore}
                </motion.div>
                <div className="text-[9px] uppercase tracking-wide text-muted-foreground">/ 100</div>
              </div>
            </motion.div>

            {/* Decision */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-3 text-center">
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg font-bold" style={{ color: decisionColor }}>{data.decision}</span>
                <span className="rounded-md px-2 py-px text-[10px] font-bold uppercase" style={{ background: `${decisionColor}22`, color: decisionColor }}>
                  Fraud {data.fraudProbability}%
                </span>
              </div>
              <div className="mt-0.5 text-[10.5px] text-muted-foreground">Session {SESSION.sessionId} · {data.stats.totalLatency}ms total</div>
            </motion.div>
          </div>

          {/* Right: more domain models feeding in */}
          <div className="flex flex-col gap-1.5">
            <div className="mb-1 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Domain Models</div>
            {orderedModels.slice(4, 8).map((m, i) => (
              <ModelFeed key={m.id} model={m} index={i + 4} onClick={() => openModel(m)} side="right" />
            ))}
          </div>
        </div>

        {/* Animated arrows row (decorative) */}
        <div className="relative flex items-center justify-center gap-2 border-t border-border/40 px-5 py-2">
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Model Contributions →</span>
          <div className="flex flex-1 items-center gap-1.5 overflow-hidden">
            {data.modelContributions.slice(0, 8).map((c, i) => {
              const color = Object.values(KIND_META)[i].color;
              return (
                <motion.div
                  key={c.model}
                  initial={{ width: 0 }} animate={{ width: `${c.contribution * 100}%` }}
                  transition={{ delay: 0.6 + i * 0.08, duration: 0.5 }}
                  className="h-2 rounded-full"
                  style={{ background: color, maxWidth: "120px" }}
                  title={`${c.model}: ${(c.contribution * 100).toFixed(0)}%`}
                />
              );
            })}
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">→ Coherence Brain</span>
        </div>
      </Card>

      {/* Lower grid */}
      <div className="grid flex-1 grid-cols-1 gap-3 min-h-0 xl:grid-cols-3">
        {/* Model contributions chart */}
        <Card className="p-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-[13px]">Model Contributions</CardTitle>
            <CardDescription>Relative weight of each domain model in the final score</CardDescription>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="h-[200px]">
              <EChart option={contributionOption} style={{ height: "200px" }} />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1">
              {data.modelContributions.map((c, i) => {
                const color = Object.values(KIND_META)[i].color;
                return (
                  <div key={c.model} className="flex items-center gap-1.5 text-[10px]">
                    <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                    <span className="truncate text-muted-foreground">{c.model}</span>
                    <span className="ml-auto font-mono font-semibold text-foreground">{(c.contribution * 100).toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Reason codes */}
        <Card className="p-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-[13px]">Reason Codes</CardTitle>
            <CardDescription>Top contributing reasons for the decision</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5 pt-1">
            {data.reasonCodes.map((r, i) => (
              <motion.div key={`${r.code}-${i}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="flex items-center gap-2 rounded-lg border border-border bg-card/40 px-2.5 py-2">
                <span className="font-mono text-[10px] font-bold text-primary">{r.code}</span>
                <span className="flex-1 truncate text-[12px] text-foreground/85" title={r.label}>{r.label}</span>
                <div className="flex items-center gap-1.5">
                  <span className="rounded px-1.5 py-px text-[9px] font-bold uppercase" style={{ background: `${BAND_COLOR[r.severity]}22`, color: BAND_COLOR[r.severity] }}>{r.severity}</span>
                  <span className="font-mono text-[10px] font-bold tabular-nums text-muted-foreground">{(r.weight * 100).toFixed(0)}%</span>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>

        {/* Decision timeline */}
        <Card className="p-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-[13px]">Decision Timeline</CardTitle>
            <CardDescription>Inference pipeline stages with latency</CardDescription>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="h-[160px]">
              <EChart option={timelineOption} style={{ height: "160px" }} />
            </div>
            <div className="mt-2 space-y-1">
              {data.decisionTimeline.map((d, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-2 text-[11px]">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: BAND_COLOR[d.kind] }} />
                  <span className="font-medium text-foreground">{d.label}</span>
                  <span className="ml-auto font-mono text-muted-foreground">{d.latency}ms</span>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <ModelDrawer model={selected} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}

function ModelFeed({ model, index, onClick, side }: { model: DomainModel; index: number; onClick: () => void; side: "left" | "right" }) {
  const meta = KIND_META[model.kind];
  const Icon = meta.icon;
  return (
    <motion.button
      initial={{ opacity: 0, x: side === "left" ? -16 : 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      onClick={onClick}
      className="group relative flex items-center gap-2 rounded-lg border border-border bg-card/40 p-2 text-left transition-all hover:border-primary/40 hover:bg-primary/5"
    >
      {side === "left" && (
        <motion.div
          animate={{ x: [0, 6, 0], opacity: [0, 1, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: index * 0.2 }}
          className="absolute right-1 top-1/2 -translate-y-1/2"
        >
          <ArrowRight className="h-3 w-3 text-primary/60" />
        </motion.div>
      )}
      {side === "right" && (
        <motion.div
          animate={{ x: [0, -6, 0], opacity: [0, 1, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: index * 0.2 }}
          className="absolute left-1 top-1/2 -translate-y-1/2"
        >
          <ArrowRight className="h-3 w-3 rotate-180 text-primary/60" />
        </motion.div>
      )}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: meta.bg, color: meta.color }}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[11.5px] font-semibold text-foreground">{model.label}</span>
          {model.band !== "low" && <span className="h-1.5 w-1.5 rounded-full" style={{ background: BAND_COLOR[model.band] }} />}
        </div>
        <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
          <span>conf {(model.confidence * 100).toFixed(0)}%</span>
          <span>·</span>
          <span>{model.latency}ms</span>
          <span>·</span>
          <span className="font-mono font-semibold" style={{ color: BAND_COLOR[model.band] }}>{model.risk}</span>
        </div>
      </div>
    </motion.button>
  );
}

function ModelDrawer({ model, open, onClose }: { model: DomainModel | null; open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<"overview" | "features" | "reasons">("overview");
  return (
    <AnimatePresence>
      {open && model && (() => {
        const meta = KIND_META[model.kind];
        const Icon = meta.icon;
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[180]">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              className="absolute right-0 top-0 flex h-full w-full max-w-[480px] flex-col border-l border-border bg-background shadow-2xl">
              <div className="shrink-0 border-b border-border px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: meta.bg, color: meta.color }}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-[15px] font-semibold text-foreground">{model.label}</h3>
                      <span className="rounded px-1.5 py-px text-[9px] font-bold uppercase" style={{ background: meta.bg, color: meta.color }}>{model.version}</span>
                    </div>
                    <p className="truncate text-[11.5px] text-muted-foreground">{model.description}</p>
                  </div>
                  <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"><X className="h-4 w-4" /></button>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-2">
                  <div className="rounded-lg border border-border bg-card/40 p-2.5">
                    <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Risk</div>
                    <div className="font-mono text-lg font-bold tabular-nums" style={{ color: BAND_COLOR[model.band] }}>{model.risk}</div>
                  </div>
                  <div className="rounded-lg border border-border bg-card/40 p-2.5">
                    <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Confidence</div>
                    <div className="font-mono text-lg font-bold tabular-nums text-primary">{(model.confidence * 100).toFixed(0)}%</div>
                  </div>
                  <div className="rounded-lg border border-border bg-card/40 p-2.5">
                    <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Contrib</div>
                    <div className="font-mono text-lg font-bold tabular-nums text-foreground">{(model.contribution * 100).toFixed(0)}%</div>
                  </div>
                  <div className="rounded-lg border border-border bg-card/40 p-2.5">
                    <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Latency</div>
                    <div className="font-mono text-lg font-bold tabular-nums text-warning">{model.latency}ms</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-1">
                  {(["overview", "features", "reasons"] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                      className={cn("relative -mb-px px-3 py-1.5 text-[12px] font-medium capitalize transition-colors",
                        tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
                      {t}
                      {tab === t && <motion.span layoutId="brain-tab" className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto scrollbar-thin p-4">
                {tab === "overview" && (
                  <div className="space-y-4">
                    <div>
                      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Description</div>
                      <p className="text-[12.5px] leading-relaxed text-foreground/85">{model.description}</p>
                    </div>
                    <div>
                      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Evidence</div>
                      <div className="space-y-1">
                        {model.evidence.map((e, i) => (
                          <div key={i} className="flex items-center gap-2 rounded-md border border-border/60 bg-card/30 px-2 py-1.5 text-[11.5px] text-foreground/80">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: BAND_COLOR[model.band] }} />
                            {e}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-border bg-card/40 p-3">
                        <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Risk Contribution</div>
                        <div className="mt-0.5 h-2 w-full overflow-hidden rounded-full bg-muted/60">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${model.risk}%` }} transition={{ duration: 0.5 }} className="h-full rounded-full" style={{ background: BAND_COLOR[model.band] }} />
                        </div>
                        <div className="mt-1 font-mono text-[11px] font-bold" style={{ color: BAND_COLOR[model.band] }}>{model.risk}/100</div>
                      </div>
                      <div className="rounded-lg border border-border bg-card/40 p-3">
                        <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Confidence</div>
                        <div className="mt-0.5 h-2 w-full overflow-hidden rounded-full bg-muted/60">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${model.confidence * 100}%` }} transition={{ duration: 0.5 }} className="h-full rounded-full bg-primary" />
                        </div>
                        <div className="mt-1 font-mono text-[11px] font-bold text-primary">{(model.confidence * 100).toFixed(0)}%</div>
                      </div>
                    </div>
                  </div>
                )}
                {tab === "features" && (
                  <div className="space-y-2">
                    {model.featureImportance.map((f, i) => (
                      <motion.div key={f.feature} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className="rounded-lg border border-border bg-card/40 p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[11px] font-semibold text-foreground">{f.feature}</span>
                          <span className={cn("text-[10px] font-bold", f.direction === "increases" ? "text-destructive" : "text-success")}>
                            {f.direction === "increases" ? "↑ risk" : "↓ risk"}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>value: <span className="font-mono text-foreground/80">{f.value}</span></span>
                          <span>weight: <span className="font-mono text-foreground/80">{f.weight.toFixed(2)}</span></span>
                        </div>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${f.weight * 100}%` }} transition={{ duration: 0.5 }}
                            className={cn("h-full rounded-full", f.direction === "increases" ? "bg-destructive" : "bg-success")} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
                {tab === "reasons" && (
                  <div className="space-y-2">
                    {model.reasonCodes.map((r, i) => (
                      <motion.div key={`${r.code}-${i}`} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                        className="rounded-lg border border-border bg-card/40 px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-primary">{r.code}</span>
                          <span className="flex-1 text-[12px] text-foreground/85">{r.label}</span>
                          <span className="rounded px-1.5 py-px text-[9px] font-bold uppercase" style={{ background: `${BAND_COLOR[r.severity]}22`, color: BAND_COLOR[r.severity] }}>{r.severity}</span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted/60">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${r.weight * 100}%` }} transition={{ duration: 0.5 }} className="h-full rounded-full" style={{ background: BAND_COLOR[r.severity] }} />
                          </div>
                          <span className="font-mono text-[10px] font-bold tabular-nums text-muted-foreground">{(r.weight * 100).toFixed(0)}%</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        );
      })()}
    </AnimatePresence>
  );
}
