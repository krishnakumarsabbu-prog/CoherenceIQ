import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, KeyRound, Smartphone, ShieldOff, MapPin, Circle as XCircle, CircleCheck as CheckCircle2, ArrowLeftRight, X, Activity, TrendingUp, TriangleAlert as AlertTriangle, Zap, GitBranch, ArrowDown } from "lucide-react";
import { generateSessions } from "@/lib/mockData";
import { buildTemporal, type TemporalEvent, type TemporalSignal, type EventKind, type RiskBand } from "@/lib/temporalIntelligenceData";
import { PageHeader } from "@/components/shell/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn, formatDateTime } from "@/lib/utils";
import { EChart } from "@/components/charts/EChart";
import type { EChartsOption } from "echarts";

const SESSIONS = generateSessions(200);
const SESSION = SESSIONS.find(s => s.riskScore >= 60) ?? SESSIONS[0];

const EVENT_META: Record<EventKind, { icon: typeof KeyRound; color: string; bg: string }> = {
  "Password Reset": { icon: KeyRound, color: "#f59e0b", bg: "rgba(245,158,11,0.14)" },
  "New Device": { icon: Smartphone, color: "#8b5cf6", bg: "rgba(139,92,246,0.14)" },
  "VPN": { icon: ShieldOff, color: "#ef4444", bg: "rgba(239,68,68,0.14)" },
  "Location Change": { icon: MapPin, color: "#3b82f6", bg: "rgba(59,130,246,0.14)" },
  "Failed Login": { icon: XCircle, color: "#f97316", bg: "rgba(249,115,22,0.14)" },
  "Successful Login": { icon: CheckCircle2, color: "#22c55e", bg: "rgba(34,197,94,0.14)" },
  "Transfer": { icon: ArrowLeftRight, color: "#ec4899", bg: "rgba(236,72,153,0.14)" },
};

const SIGNAL_META: Record<TemporalSignal["kind"], { icon: typeof Activity; color: string }> = {
  "Behavior Drift": { icon: Activity, color: "#06b6d4" },
  "Impossible Travel": { icon: TrendingUp, color: "#ef4444" },
  "Velocity": { icon: Zap, color: "#f59e0b" },
  "Session Progression": { icon: GitBranch, color: "#8b5cf6" },
};

const BAND_COLOR: Record<RiskBand, string> = {
  low: "#22c55e", medium: "#eab308", high: "#f97316", critical: "#ef4444",
};

export function TemporalIntelligencePage() {
  const data = useMemo(() => buildTemporal(SESSION), []);
  const [selectedEvent, setSelectedEvent] = useState<TemporalEvent | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeSignal, setActiveSignal] = useState<TemporalSignal | null>(data.signals.find(s => s.detected) ?? data.signals[0]);

  const openEvent = (e: TemporalEvent) => { setSelectedEvent(e); setDrawerOpen(true); };

  const signalChartOption = useMemo<EChartsOption | null>(() => {
    if (!activeSignal) return null;
    return {
      tooltip: { trigger: "axis", backgroundColor: "rgba(15,23,42,0.92)", borderColor: "rgba(148,163,184,0.2)", textStyle: { color: "#e2e8f0", fontSize: 11 } },
      grid: { left: 32, right: 12, top: 12, bottom: 24 },
      xAxis: { type: "category", data: activeSignal.trend.map((_, i) => i), show: false },
      yAxis: { type: "value", axisLine: { show: false }, splitLine: { lineStyle: { color: "rgba(148,163,184,0.08)" } }, axisLabel: { color: "#94a3b8", fontSize: 9 } },
      series: [
        { type: "line", smooth: true, symbol: "none", data: activeSignal.trend.map((t) => t.baseline), lineStyle: { color: "#64748b", width: 1.5, type: "dashed" } },
        { type: "line", smooth: true, symbol: "none", data: activeSignal.trend.map((t) => t.value),
          lineStyle: { color: BAND_COLOR[activeSignal.severity], width: 2.5 },
          areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: `${BAND_COLOR[activeSignal.severity]}40` }, { offset: 1, color: `${BAND_COLOR[activeSignal.severity]}00` }] } } },
      ],
    };
  }, [activeSignal]);

  const timelineOption = useMemo<EChartsOption>(() => ({
    tooltip: { trigger: "axis", backgroundColor: "rgba(15,23,42,0.92)", borderColor: "rgba(148,163,184,0.2)", textStyle: { color: "#e2e8f0", fontSize: 11 } },
    legend: { data: ["Risk", "Velocity", "Coherence"], textStyle: { color: "#94a3b8", fontSize: 10 }, top: 0, right: 0, icon: "roundRect" },
    grid: { left: 32, right: 16, top: 28, bottom: 28 },
    xAxis: { type: "category", data: data.timeline.map(t => t.t), axisLine: { lineStyle: { color: "rgba(148,163,184,0.25)" } }, axisLabel: { color: "#94a3b8", fontSize: 9, interval: 3 } },
    yAxis: { type: "value", axisLine: { show: false }, splitLine: { lineStyle: { color: "rgba(148,163,184,0.08)" } }, axisLabel: { color: "#94a3b8", fontSize: 9 } },
    series: [
      { name: "Risk", type: "line", smooth: true, symbol: "none", data: data.timeline.map(t => t.risk), lineStyle: { color: "#ef4444", width: 2 }, areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(239,68,68,0.25)" }, { offset: 1, color: "rgba(239,68,68,0)" }] } } },
      { name: "Velocity", type: "line", smooth: true, symbol: "none", data: data.timeline.map(t => t.velocity), lineStyle: { color: "#f59e0b", width: 2 } },
      { name: "Coherence", type: "line", smooth: true, symbol: "none", data: data.timeline.map(t => t.coherence), lineStyle: { color: "#22c55e", width: 2 } },
    ],
  }), [data.timeline]);

  return (
    <div className="flex h-full flex-col p-4 lg:p-5">
      <PageHeader
        title="Temporal Intelligence"
        subtitle={`Chronological event sequence & time-series anomalies · ${SESSION.customer}`}
        actions={
          <>
            <Badge variant="warning"><Clock className="h-3 w-3" /> {data.stats.windowHours}h window</Badge>
            <Badge variant={data.stats.anomalies > 0 ? "destructive" : "success"}>
              <AlertTriangle className="h-3 w-3" /> {data.stats.anomalies} anomalies
            </Badge>
            <Button size="sm"><Activity className="h-3.5 w-3.5" /> Replay</Button>
          </>
        }
      />

      {/* Stats */}
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-6">
        {[
          { label: "Events", value: data.stats.eventCount, icon: GitBranch, color: "text-primary" },
          { label: "Anomalies", value: data.stats.anomalies, icon: AlertTriangle, color: "text-destructive" },
          { label: "Behavior Drift", value: data.stats.behaviorDrift, icon: Activity, color: "text-cyan-500" },
          { label: "Impossible Travel", value: data.stats.impossibleTravel, icon: TrendingUp, color: "text-destructive" },
          { label: "Velocity", value: data.stats.velocity, icon: Zap, color: "text-warning" },
          { label: "Session Prog.", value: data.stats.sessionProgression, icon: GitBranch, color: "text-violet-500" },
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

      <div className="grid flex-1 grid-cols-1 gap-3 min-h-0 xl:grid-cols-[1.4fr_1fr]">
        {/* Event sequence */}
        <Card className="flex min-h-[520px] flex-col p-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-[13px]">Chronological Event Sequence</CardTitle>
            <CardDescription>Pre-login → login → post-login chain. Click any event to inspect.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto scrollbar-thin pt-1">
            <div className="relative">
              {/* Vertical spine */}
              <div className="absolute left-[27px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-warning/40 via-primary/40 to-destructive/40" />
              <div className="space-y-1">
                {data.events.map((e, i) => {
                  const meta = EVENT_META[e.kind];
                  const Icon = meta.icon;
                  return (
                    <motion.div key={e.id}
                      initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                      className="relative flex items-stretch gap-3">
                      {/* Node dot */}
                      <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2"
                        style={{ borderColor: meta.color, background: meta.bg, boxShadow: e.band === "critical" || e.band === "high" ? `0 0 18px ${meta.color}55` : "none" }}>
                        <Icon className="h-5 w-5" style={{ color: meta.color }} />
                      </div>
                      {/* Event body */}
                      <button onClick={() => openEvent(e)}
                        className="group flex flex-1 items-center gap-3 rounded-xl border border-border bg-card/40 p-3 text-left transition-all hover:border-primary/40 hover:bg-primary/5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[12.5px] font-semibold text-foreground">{e.label}</span>
                            <span className="rounded px-1.5 py-px text-[9px] font-bold uppercase"
                              style={{ background: `rgba(${e.band === "critical" ? "239,68,68" : e.band === "high" ? "249,115,22" : e.band === "medium" ? "234,179,8" : "34,197,94"},0.14)`,
                                color: BAND_COLOR[e.band] }}>{e.band}</span>
                          </div>
                          <div className="mt-0.5 text-[10.5px] text-muted-foreground">{formatDateTime(e.timestamp)}</div>
                          <div className="mt-0.5 truncate text-[11px] text-foreground/70">{e.detail}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-lg font-bold tabular-nums" style={{ color: BAND_COLOR[e.band] }}>{e.risk}</div>
                          <div className="text-[9px] text-muted-foreground">risk</div>
                        </div>
                      </button>
                      {/* Connector arrow */}
                      {i < data.events.length - 1 && (
                        <div className="absolute left-[62px] -bottom-1 z-0 flex h-4 w-4 items-center justify-center text-muted-foreground/40">
                          <ArrowDown className="h-3 w-3" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Signals */}
        <div className="flex min-h-0 flex-col gap-3">
          <Card className="p-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-[13px]">Temporal Signals</CardTitle>
              <CardDescription>Detected anomaly classes with confidence & contribution</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-1">
              {data.signals.map((s, i) => {
                const meta = SIGNAL_META[s.kind];
                const Icon = meta.icon;
                const active = activeSignal?.id === s.id;
                return (
                  <motion.button key={s.id}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                    onClick={() => setActiveSignal(s)}
                    className={cn("w-full rounded-lg border p-3 text-left transition-all",
                      active ? "border-primary/50 bg-primary/5 shadow-sm" : "border-border bg-card/40 hover:bg-accent/30")}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" style={{ color: meta.color }} />
                        <span className="text-[12.5px] font-semibold text-foreground">{s.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {s.detected ? <Badge variant="destructive">detected</Badge> : <Badge variant="success">nominal</Badge>}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                          <span>baseline {s.baseline} → current {s.current} {s.unit}</span>
                          <span>conf {(s.confidence * 100).toFixed(0)}%</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${s.score}%` }} transition={{ duration: 0.5 }}
                            className="h-full rounded-full" style={{ background: BAND_COLOR[s.severity] }} />
                        </div>
                      </div>
                      <div className="font-mono text-base font-bold tabular-nums" style={{ color: BAND_COLOR[s.severity] }}>{s.score}</div>
                    </div>
                  </motion.button>
                );
              })}
            </CardContent>
          </Card>

          {/* Active signal detail + chart */}
          {activeSignal && (
            <Card className="flex-1 min-h-0 p-4">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  {(() => { const M = SIGNAL_META[activeSignal.kind]; const Icon = M.icon; return <Icon className="h-4 w-4" style={{ color: M.color }} />; })()}
                  <CardTitle className="text-[13px]">{activeSignal.label}</CardTitle>
                </div>
                <CardDescription className="text-[11.5px]">{activeSignal.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 pt-1">
                <div className="h-[160px]">
                  {signalChartOption && <EChart option={signalChartOption} style={{ height: "160px" }} />}
                </div>
                <div>
                  <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Evidence</div>
                  <div className="space-y-1">
                    {activeSignal.evidence.map((ev, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-md border border-border/60 bg-card/30 px-2 py-1.5 text-[11px] text-foreground/80">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: BAND_COLOR[activeSignal.severity] }} />
                        {ev}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Timeline strip */}
      <Card className="mt-3 p-4">
        <CardHeader className="flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-[13px]">24h Risk / Velocity / Coherence Timeline</CardTitle>
            <CardDescription>Hourly time-series with anomaly peak at session login</CardDescription>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive" /> Risk</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning" /> Velocity</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" /> Coherence</span>
          </div>
        </CardHeader>
        <CardContent>
          <EChart option={timelineOption} style={{ height: "200px" }} />
        </CardContent>
      </Card>

      <EventDrawer event={selectedEvent} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}

function EventDrawer({ event, open, onClose }: { event: TemporalEvent | null; open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && event && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[180]">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className="absolute right-0 top-0 flex h-full w-full max-w-[460px] flex-col border-l border-border bg-background shadow-2xl">
            {(() => {
              const meta = EVENT_META[event.kind];
              const Icon = meta.icon;
              return (
                <>
                  <div className="shrink-0 border-b border-border px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: meta.bg, color: meta.color }}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-[15px] font-semibold text-foreground">{event.label}</h3>
                          <span className="rounded px-1.5 py-px text-[9px] font-bold uppercase" style={{ background: meta.bg, color: meta.color }}>{event.kind}</span>
                        </div>
                        <p className="truncate text-[11.5px] text-muted-foreground">{formatDateTime(event.timestamp)}</p>
                      </div>
                      <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"><X className="h-4 w-4" /></button>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div className="rounded-lg border border-border bg-card/40 p-2.5">
                        <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Risk</div>
                        <div className="font-mono text-xl font-bold tabular-nums" style={{ color: BAND_COLOR[event.band] }}>{event.risk}</div>
                      </div>
                      <div className="rounded-lg border border-border bg-card/40 p-2.5">
                        <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Band</div>
                        <div className="text-sm font-bold capitalize" style={{ color: BAND_COLOR[event.band] }}>{event.band}</div>
                      </div>
                      <div className="rounded-lg border border-border bg-card/40 p-2.5">
                        <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Channel</div>
                        <div className="text-sm font-bold text-foreground">{event.channel}</div>
                      </div>
                    </div>
                  </div>
                  <div className="min-h-0 flex-1 overflow-auto scrollbar-thin p-4">
                    <div className="mb-3">
                      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Detail</div>
                      <p className="text-[12.5px] leading-relaxed text-foreground/85">{event.detail}</p>
                    </div>
                    <div className="mb-3">
                      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Context</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-border bg-card/40 p-2.5">
                          <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Actor</div>
                          <div className="mt-0.5 truncate font-mono text-[11px] font-medium text-foreground">{event.actor}</div>
                        </div>
                        <div className="rounded-lg border border-border bg-card/40 p-2.5">
                          <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Location</div>
                          <div className="mt-0.5 truncate font-mono text-[11px] font-medium text-foreground">{event.location}</div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Metadata</div>
                      <div className="grid grid-cols-2 gap-2">
                        {event.metadata.map(m => (
                          <div key={m.key} className="rounded-lg border border-border bg-card/40 p-2.5">
                            <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{m.key}</div>
                            <div className="mt-0.5 truncate font-mono text-[11px] font-medium text-foreground" title={m.value}>{m.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
