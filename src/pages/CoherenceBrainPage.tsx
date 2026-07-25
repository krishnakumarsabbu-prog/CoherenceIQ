import { useMemo, useState, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Cpu, Smartphone, MapPin, Network, Activity, Gavel, Share2,
  Clock, ShieldAlert, X, Zap, Gauge, Sparkles, ArrowRight, TrendingUp,
  Plus, Copy, Trash2, Check, Play, Settings2, ChevronDown, AlertTriangle,
  Scale, Vote, Sliders, ListTree,
} from "lucide-react";
import {
  coherenceBrainStore, evaluateStrategy, getSessions, getSession,
  DOMAIN_KINDS, DOMAIN_META,
  type BrainStrategy, type BrainEvaluation, type DomainResult, type DomainKind,
  type RiskBand, type FusionMethod, type StrategyConfig, type DecisionOutcome,
} from "@/lib/coherenceBrainStore";
import { PageHeader } from "@/components/shell/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { EChart } from "@/components/charts/EChart";
import type { EChartsOption } from "echarts";

const SESSIONS = getSessions();

const KIND_ICON: Record<DomainKind, typeof Cpu> = {
  "Rule Scores": Gavel,
  "Signal Scores": Activity,
  "Engineered Features": Sliders,
  "Predictive Models": Cpu,
  "Graph Intelligence": Share2,
  "Temporal Intelligence": Clock,
  "Decision Policies": Scale,
};

const BAND_COLOR: Record<RiskBand, string> = {
  low: "#22c55e", medium: "#eab308", high: "#f97316", critical: "#ef4444",
};

const DECISION_COLOR: Record<DecisionOutcome, string> = {
  ALLOW: "#22c55e", CHALLENGE: "#f59e0b", DENY: "#ef4444",
};

const FUSION_LABEL: Record<FusionMethod, string> = {
  "weighted-average": "Weighted Average",
  "ensemble-voting": "Ensemble Voting",
  "threshold-policy": "Threshold Policy",
};

function useStrategies() {
  return useSyncExternalStore(
    (cb) => coherenceBrainStore.subscribe(cb),
    () => coherenceBrainStore.list(),
  );
}

export function CoherenceBrainPage() {
  const strategies = useStrategies();
  const [activeId, setActiveId] = useState<string>(strategies[0]?.id ?? "");
  const [sessionSelectorOpen, setSessionSelectorOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string>(
    SESSIONS.find((s) => s.riskScore >= 60)?.sessionId ?? SESSIONS[0].sessionId,
  );
  const [configOpen, setConfigOpen] = useState(false);
  const [drawerDomain, setDrawerDomain] = useState<DomainResult | null>(null);

  const activeStrategy = useMemo(
    () => coherenceBrainStore.get(activeId) ?? strategies[0],
    [activeId, strategies],
  );

  const session = useMemo(() => getSession(sessionId) ?? SESSIONS[0], [sessionId]);
  const evaluation = useMemo(
    () => activeStrategy ? evaluateStrategy(activeStrategy, session) : null,
    [activeStrategy, session],
  );

  if (!activeStrategy || !evaluation) {
    return (
      <div className="flex h-full flex-col p-5">
        <PageHeader title="Coherence Brain" subtitle="Enterprise decision orchestration engine" />
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          No strategies available. Create one to begin.
        </div>
      </div>
    );
  }

  const decisionColor = DECISION_COLOR[evaluation.decision];

  return (
    <div className="flex h-full flex-col p-4 lg:p-5">
      <PageHeader
        title="Coherence Brain"
        subtitle="Enterprise decision orchestration — fuse evidence from all domains into ALLOW, CHALLENGE, or DENY with full explainability"
        actions={
          <>
            <Badge variant="default"><Brain className="h-3 w-3" /> {activeStrategy.version}</Badge>
            <Badge variant={activeStrategy.status === "published" ? "success" : "default"}>
              {activeStrategy.status}
            </Badge>
            <Button size="sm" variant="outline" onClick={() => setSessionSelectorOpen(true)}>
              <Network className="h-3.5 w-3.5" /> {session.sessionId}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfigOpen(true)}>
              <Settings2 className="h-3.5 w-3.5" /> Configure
            </Button>
            <Button size="sm" onClick={() => coherenceBrainStore.recordEvaluation(activeStrategy.id)}>
              <Play className="h-3.5 w-3.5" /> Re-evaluate
            </Button>
          </>
        }
      />

      {/* Strategy selector tabs */}
      <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1">
        {strategies.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveId(s.id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-left transition-all",
              s.id === activeStrategy.id
                ? "border-primary/50 bg-primary/10"
                : "border-border bg-card/40 hover:border-primary/30 hover:bg-primary/5",
            )}
          >
            <div className="flex flex-col">
              <span className="text-[12px] font-semibold text-foreground">{s.label}</span>
              <span className="text-[9px] text-muted-foreground">
                {FUSION_LABEL[s.config.fusionMethod]} · {s.evaluationCount} evals
              </span>
            </div>
          </button>
        ))}
        <button
          onClick={() => {
            const id = coherenceBrainStore.create("New Strategy", "Custom decision strategy");
            setActiveId(id);
          }}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-dashed border-border px-3 py-2 text-[12px] text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> New
        </button>
      </div>

      {/* Stats */}
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-6">
        {[
          { label: "Domains", value: String(DOMAIN_KINDS.length), icon: Cpu, color: "text-primary" },
          { label: "Confidence", value: `${(evaluation.avgConfidence * 100).toFixed(0)}%`, icon: Gauge, color: "text-success" },
          { label: "Latency", value: `${evaluation.totalLatency}ms`, icon: Zap, color: "text-warning" },
          { label: "Fired", value: `${evaluation.domainsFired}/${DOMAIN_KINDS.length}`, icon: ShieldAlert, color: "text-destructive" },
          { label: "Features", value: String(evaluation.featureCount), icon: Activity, color: "text-primary" },
          { label: "Evaluations", value: String(activeStrategy.evaluationCount), icon: TrendingUp, color: "text-success" },
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

      {/* Center fusion panel */}
      <Card className="relative mb-3 overflow-hidden p-0">
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[80px]" />
        </div>
        <div className="relative grid grid-cols-1 gap-4 p-5 lg:grid-cols-[1fr_340px_1fr]">
          {/* Left domains */}
          <div className="flex flex-col gap-1.5">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Evidence Domains</div>
            {evaluation.domains.slice(0, 4).map((d, i) => (
              <DomainFeed key={d.id} domain={d} index={i} onClick={() => setDrawerDomain(d)} side="left" />
            ))}
          </div>

          {/* Center coherence score */}
          <div className="flex flex-col items-center justify-center">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="relative flex h-44 w-44 items-center justify-center"
            >
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
              <div className="relative flex h-36 w-36 flex-col items-center justify-center rounded-full border-2 bg-card/80 backdrop-blur-md"
                style={{ borderColor: decisionColor, boxShadow: `0 0 40px ${decisionColor}44` }}>
                <Brain className="absolute -top-3 h-6 w-6 rounded-full p-0.5" style={{ background: decisionColor, color: "white" }} />
                <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Coherence</div>
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                  className="font-mono text-4xl font-bold tabular-nums"
                  style={{ color: decisionColor }}>
                  {evaluation.coherenceScore}
                </motion.div>
                <div className="text-[9px] uppercase tracking-wide text-muted-foreground">/ 100</div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-3 text-center">
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg font-bold" style={{ color: decisionColor }}>{evaluation.decision}</span>
                <span className="rounded-md px-2 py-px text-[10px] font-bold uppercase" style={{ background: `${decisionColor}22`, color: decisionColor }}>
                  Fraud {evaluation.fraudProbability}%
                </span>
              </div>
              <div className="mt-0.5 text-[10.5px] text-muted-foreground">
                Session {session.sessionId} · {FUSION_LABEL[activeStrategy.config.fusionMethod]}
              </div>
              {evaluation.vetoTriggered && (
                <div className="mt-1 flex items-center justify-center gap-1 text-[10px] font-semibold text-destructive">
                  <AlertTriangle className="h-3 w-3" /> Veto by {evaluation.vetoDomain}
                </div>
              )}
            </motion.div>
          </div>

          {/* Right domains */}
          <div className="flex flex-col gap-1.5">
            <div className="mb-1 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Evidence Domains</div>
            {evaluation.domains.slice(4, 7).map((d, i) => (
              <DomainFeed key={d.id} domain={d} index={i + 4} onClick={() => setDrawerDomain(d)} side="right" />
            ))}
          </div>
        </div>

        {/* Contribution bars */}
        <div className="relative flex items-center justify-center gap-2 border-t border-border/40 px-5 py-2">
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Domain Contributions →</span>
          <div className="flex flex-1 items-center gap-1.5 overflow-hidden">
            {evaluation.domainContributions.map((c, i) => {
              const color = DOMAIN_META[DOMAIN_KINDS[i]].color;
              return (
                <motion.div
                  key={c.domain}
                  initial={{ width: 0 }} animate={{ width: `${c.contribution * 100}%` }}
                  transition={{ delay: 0.6 + i * 0.08, duration: 0.5 }}
                  className="h-2 rounded-full"
                  style={{ background: color, maxWidth: "120px" }}
                  title={`${c.domain}: ${(c.contribution * 100).toFixed(0)}%`}
                />
              );
            })}
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">→ Coherence Brain</span>
        </div>
      </Card>

      {/* Lower grid */}
      <div className="grid flex-1 grid-cols-1 gap-3 min-h-0 xl:grid-cols-3">
        <ContributionChart evaluation={evaluation} />
        <ReasonCodesCard evaluation={evaluation} />
        <ExplainabilityCard evaluation={evaluation} />
      </div>

      <DomainDrawer domain={drawerDomain} onClose={() => setDrawerDomain(null)} />

      <AnimatePresence>
        {configOpen && activeStrategy && (
          <ConfigDrawer
            strategy={activeStrategy}
            onClose={() => setConfigOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sessionSelectorOpen && (
          <SessionSelector
            currentId={sessionId}
            onSelect={(id) => { setSessionId(id); setSessionSelectorOpen(false); }}
            onClose={() => setSessionSelectorOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function DomainFeed({ domain, index, onClick, side }: { domain: DomainResult; index: number; onClick: () => void; side: "left" | "right" }) {
  const meta = DOMAIN_META[domain.kind];
  const Icon = KIND_ICON[domain.kind];
  return (
    <motion.button
      initial={{ opacity: 0, x: side === "left" ? -16 : 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      onClick={onClick}
      className="group relative flex items-center gap-2 rounded-lg border border-border bg-card/40 p-2 text-left transition-all hover:border-primary/40 hover:bg-primary/5"
    >
      {side === "left" && (
        <motion.div animate={{ x: [0, 6, 0], opacity: [0, 1, 0] }} transition={{ duration: 1.8, repeat: Infinity, delay: index * 0.2 }} className="absolute right-1 top-1/2 -translate-y-1/2">
          <ArrowRight className="h-3 w-3 text-primary/60" />
        </motion.div>
      )}
      {side === "right" && (
        <motion.div animate={{ x: [0, -6, 0], opacity: [0, 1, 0] }} transition={{ duration: 1.8, repeat: Infinity, delay: index * 0.2 }} className="absolute left-1 top-1/2 -translate-y-1/2">
          <ArrowRight className="h-3 w-3 rotate-180 text-primary/60" />
        </motion.div>
      )}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: `${meta.color}24`, color: meta.color }}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[11.5px] font-semibold text-foreground">{domain.label}</span>
          {!domain.fired && <span className="text-[8px] font-bold uppercase text-muted-foreground/60">idle</span>}
          {domain.band !== "low" && <span className="h-1.5 w-1.5 rounded-full" style={{ background: BAND_COLOR[domain.band] }} />}
        </div>
        <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
          <span>conf {(domain.confidence * 100).toFixed(0)}%</span>
          <span>·</span>
          <span>{domain.latency}ms</span>
          <span>·</span>
          <span className="font-mono font-semibold" style={{ color: BAND_COLOR[domain.band] }}>{domain.risk}</span>
          {domain.vote && (
            <>
              <span>·</span>
              <span className="font-bold" style={{ color: DECISION_COLOR[domain.vote] }}>{domain.vote[0]}</span>
            </>
          )}
        </div>
      </div>
    </motion.button>
  );
}

function ContributionChart({ evaluation }: { evaluation: BrainEvaluation }) {
  const option = useMemo<EChartsOption>(() => ({
    tooltip: { trigger: "item", backgroundColor: "rgba(15,23,42,0.92)", borderColor: "rgba(148,163,184,0.2)", textStyle: { color: "#e2e8f0", fontSize: 11 } },
    legend: { show: false },
    series: [{
      type: "pie", radius: ["52%", "78%"], center: ["50%", "50%"],
      avoidLabelOverlap: true, padAngle: 2,
      itemStyle: { borderRadius: 4, borderColor: "transparent", borderWidth: 0 },
      label: { show: false },
      data: evaluation.domainContributions.map((c, i) => ({
        name: c.domain, value: c.contribution * 100,
        itemStyle: { color: DOMAIN_META[DOMAIN_KINDS[i]].color },
      })),
    }],
  }), [evaluation]);

  return (
    <Card className="p-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-[13px]">Domain Contributions</CardTitle>
        <CardDescription>Relative weight of each evidence domain in the final score</CardDescription>
      </CardHeader>
      <CardContent className="pt-1">
        <div className="h-[180px]">
          <EChart option={option} style={{ height: "180px" }} />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1">
          {evaluation.domainContributions.map((c, i) => {
            const color = DOMAIN_META[DOMAIN_KINDS[i]].color;
            return (
              <div key={c.domain} className="flex items-center gap-1.5 text-[10px]">
                <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                <span className="truncate text-muted-foreground">{c.domain}</span>
                <span className="ml-auto font-mono font-semibold text-foreground">{(c.contribution * 100).toFixed(0)}%</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function ReasonCodesCard({ evaluation }: { evaluation: BrainEvaluation }) {
  return (
    <Card className="p-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-[13px]">Reason Codes</CardTitle>
        <CardDescription>Top contributing reasons for the {evaluation.decision} decision</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1.5 pt-1">
        {evaluation.reasonCodes.map((r, i) => (
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
  );
}

function ExplainabilityCard({ evaluation }: { evaluation: BrainEvaluation }) {
  return (
    <Card className="p-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-[13px] flex items-center gap-1.5"><ListTree className="h-3.5 w-3.5" /> Decision Explainability</CardTitle>
        <CardDescription>Full decision path and domain rationale</CardDescription>
      </CardHeader>
      <CardContent className="pt-1 space-y-3">
        <div>
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Summary</div>
          <p className="text-[11.5px] leading-relaxed text-foreground/85">{evaluation.explainability.summary}</p>
        </div>
        <div>
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Decision Path</div>
          <div className="space-y-1">
            {evaluation.explainability.decisionPath.map((step, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="flex items-start gap-2 text-[11px]">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-[8px] font-bold text-primary">{i + 1}</span>
                <span className="text-foreground/80">{step}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DomainDrawer({ domain, onClose }: { domain: DomainResult | null; onClose: () => void }) {
  const [tab, setTab] = useState<"overview" | "features" | "reasons">("overview");
  return (
    <AnimatePresence>
      {domain && (() => {
        const meta = DOMAIN_META[domain.kind];
        const Icon = KIND_ICON[domain.kind];
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[180]">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              className="absolute right-0 top-0 flex h-full w-full max-w-[480px] flex-col border-l border-border bg-background shadow-2xl">
              <div className="shrink-0 border-b border-border px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `${meta.color}24`, color: meta.color }}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-[15px] font-semibold text-foreground">{domain.label}</h3>
                      <span className="rounded px-1.5 py-px text-[9px] font-bold uppercase" style={{ background: `${meta.color}24`, color: meta.color }}>{domain.version}</span>
                    </div>
                    <p className="truncate text-[11.5px] text-muted-foreground">{domain.description}</p>
                  </div>
                  <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"><X className="h-4 w-4" /></button>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-2">
                  <Stat label="Risk" value={String(domain.risk)} color={BAND_COLOR[domain.band]} />
                  <Stat label="Confidence" value={`${(domain.confidence * 100).toFixed(0)}%`} color="#3b82f6" />
                  <Stat label="Contrib" value={`${(domain.contribution * 100).toFixed(0)}%`} color="#e2e8f0" />
                  <Stat label="Latency" value={`${domain.latency}ms`} color="#f59e0b" />
                </div>

                <div className="mt-3 flex items-center gap-1">
                  {(["overview", "features", "reasons"] as const).map((t) => (
                    <button key={t} onClick={() => setTab(t)}
                      className={cn("relative -mb-px px-3 py-1.5 text-[12px] font-medium capitalize transition-colors",
                        tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
                      {t}
                      {tab === t && <motion.span layoutId="brain-domain-tab" className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto scrollbar-thin p-4">
                {tab === "overview" && (
                  <div className="space-y-4">
                    <div>
                      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Description</div>
                      <p className="text-[12.5px] leading-relaxed text-foreground/85">{domain.description}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-border bg-card/40 p-3">
                        <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Risk Contribution</div>
                        <div className="mt-0.5 h-2 w-full overflow-hidden rounded-full bg-muted/60">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${domain.risk}%` }} transition={{ duration: 0.5 }} className="h-full rounded-full" style={{ background: BAND_COLOR[domain.band] }} />
                        </div>
                        <div className="mt-1 font-mono text-[11px] font-bold" style={{ color: BAND_COLOR[domain.band] }}>{domain.risk}/100</div>
                      </div>
                      <div className="rounded-lg border border-border bg-card/40 p-3">
                        <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Confidence</div>
                        <div className="mt-0.5 h-2 w-full overflow-hidden rounded-full bg-muted/60">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${domain.confidence * 100}%` }} transition={{ duration: 0.5 }} className="h-full rounded-full bg-primary" />
                        </div>
                        <div className="mt-1 font-mono text-[11px] font-bold text-primary">{(domain.confidence * 100).toFixed(0)}%</div>
                      </div>
                    </div>
                    {domain.vote && (
                      <div className="rounded-lg border border-border bg-card/40 p-3">
                        <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Ensemble Vote</div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="rounded-md px-2 py-1 text-[11px] font-bold" style={{ background: `${DECISION_COLOR[domain.vote]}22`, color: DECISION_COLOR[domain.vote] }}>{domain.vote}</span>
                          <span className="text-[10px] text-muted-foreground">This domain votes {domain.vote} based on its risk threshold</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {tab === "features" && (
                  <div className="space-y-2">
                    {domain.evidence.map((f, i) => (
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
                    {domain.reasonCodes.map((r, i) => (
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

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-2.5">
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-mono text-lg font-bold tabular-nums" style={{ color }}>{value}</div>
    </div>
  );
}

function ConfigDrawer({ strategy, onClose }: { strategy: BrainStrategy; onClose: () => void }) {
  const [config, setConfig] = useState<StrategyConfig>(JSON.parse(JSON.stringify(strategy.config)));
  const [label, setLabel] = useState(strategy.label);
  const [description, setDescription] = useState(strategy.description);

  const updateWeight = (kind: DomainKind, value: number) => {
    setConfig((c) => ({ ...c, domainWeights: { ...c.domainWeights, [kind]: value } }));
  };

  const save = () => {
    coherenceBrainStore.update(strategy.id, { label, description, config });
    onClose();
  };

  const clone = () => {
    const id = coherenceBrainStore.clone(strategy.id);
    if (id) onClose();
  };

  const remove = () => {
    coherenceBrainStore.remove(strategy.id);
    onClose();
  };

  const publish = () => {
    coherenceBrainStore.update(strategy.id, { label, description, config });
    coherenceBrainStore.publish(strategy.id);
    onClose();
  };

  const totalWeight = DOMAIN_KINDS.reduce((a, k) => a + (config.domainWeights[k] || 0), 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[180]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 320 }}
        className="absolute right-0 top-0 flex h-full w-full max-w-[560px] flex-col border-l border-border bg-background shadow-2xl">
        <div className="shrink-0 border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              <h3 className="text-[15px] font-semibold text-foreground">Strategy Configuration</h3>
            </div>
            <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto scrollbar-thin p-4 space-y-5">
          {/* Identity */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Identity</div>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded-lg border border-border bg-card/40 px-3 py-2 text-[13px] text-foreground outline-none focus:border-primary/50"
              placeholder="Strategy name"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border bg-card/40 px-3 py-2 text-[12px] text-foreground outline-none focus:border-primary/50"
              placeholder="Description"
            />
          </div>

          {/* Fusion method */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Fusion Method</div>
            <div className="grid grid-cols-3 gap-2">
              {(["weighted-average", "ensemble-voting", "threshold-policy"] as FusionMethod[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setConfig((c) => ({ ...c, fusionMethod: m }))}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-center transition-all",
                    config.fusionMethod === m ? "border-primary/50 bg-primary/10" : "border-border bg-card/40 hover:border-primary/30",
                  )}
                >
                  {m === "weighted-average" && <Scale className="h-4 w-4 text-primary" />}
                  {m === "ensemble-voting" && <Vote className="h-4 w-4 text-primary" />}
                  {m === "threshold-policy" && <Sliders className="h-4 w-4 text-primary" />}
                  <span className="text-[9px] font-semibold text-foreground">{FUSION_LABEL[m]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Domain weights */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Domain Weights</div>
              <span className={cn("font-mono text-[10px] font-bold", Math.abs(totalWeight - 1) < 0.01 ? "text-success" : "text-warning")}>
                Σ {totalWeight.toFixed(2)}
              </span>
            </div>
            <div className="space-y-2">
              {DOMAIN_KINDS.map((k) => {
                const meta = DOMAIN_META[k];
                const Icon = KIND_ICON[k];
                return (
                  <div key={k} className="flex items-center gap-3 rounded-lg border border-border bg-card/40 px-3 py-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: `${meta.color}24`, color: meta.color }}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-semibold text-foreground">{k}</div>
                      <input
                        type="range"
                        min={0}
                        max={0.5}
                        step={0.01}
                        value={config.domainWeights[k]}
                        onChange={(e) => updateWeight(k, parseFloat(e.target.value))}
                        className="mt-1 w-full accent-primary"
                      />
                    </div>
                    <span className="w-10 text-right font-mono text-[11px] font-bold text-foreground">{config.domainWeights[k].toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Thresholds */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Threshold Policy</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border bg-card/40 p-3">
                <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Allow Below</div>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={config.thresholdPolicy.allowBelow}
                  onChange={(e) => setConfig((c) => ({ ...c, thresholdPolicy: { ...c.thresholdPolicy, allowBelow: parseFloat(e.target.value) || 0 } }))}
                  className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-[12px] text-foreground outline-none focus:border-primary/50"
                />
              </div>
              <div className="rounded-lg border border-border bg-card/40 p-3">
                <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Challenge Below (Deny ≥)</div>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={config.thresholdPolicy.challengeBelow}
                  onChange={(e) => setConfig((c) => ({ ...c, thresholdPolicy: { ...c.thresholdPolicy, challengeBelow: parseFloat(e.target.value) || 0 } }))}
                  className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-[12px] text-foreground outline-none focus:border-primary/50"
                />
              </div>
            </div>
          </div>

          {/* Advanced */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Advanced</div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-border bg-card/40 p-3">
                <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Confidence Floor</div>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={config.confidenceFloor}
                  onChange={(e) => setConfig((c) => ({ ...c, confidenceFloor: parseFloat(e.target.value) || 0 }))}
                  className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-[12px] text-foreground outline-none focus:border-primary/50"
                />
              </div>
              <div className="rounded-lg border border-border bg-card/40 p-3">
                <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Vote Threshold</div>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={config.ensembleVotingThreshold}
                  onChange={(e) => setConfig((c) => ({ ...c, ensembleVotingThreshold: parseFloat(e.target.value) || 0 }))}
                  className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-[12px] text-foreground outline-none focus:border-primary/50"
                />
              </div>
              <div className="rounded-lg border border-border bg-card/40 p-3">
                <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Min Domains</div>
                <input
                  type="number"
                  min={1}
                  max={7}
                  value={config.minDomainsFired}
                  onChange={(e) => setConfig((c) => ({ ...c, minDomainsFired: parseInt(e.target.value) || 1 }))}
                  className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-[12px] text-foreground outline-none focus:border-primary/50"
                />
              </div>
            </div>
          </div>

          {/* Veto domains */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Veto Domains (force DENY)</div>
            <div className="flex flex-wrap gap-1.5">
              {DOMAIN_KINDS.map((k) => {
                const active = config.vetoDomains.includes(k);
                return (
                  <button
                    key={k}
                    onClick={() => setConfig((c) => ({
                      ...c,
                      vetoDomains: active ? c.vetoDomains.filter((x) => x !== k) : [...c.vetoDomains, k],
                    }))}
                    className={cn(
                      "rounded-lg border px-2.5 py-1.5 text-[10px] font-medium transition-all",
                      active ? "border-destructive/50 bg-destructive/10 text-destructive" : "border-border bg-card/40 text-muted-foreground hover:border-primary/30",
                    )}
                  >
                    {active && <Check className="mr-1 inline h-2.5 w-2.5" />}
                    {k}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-border px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" onClick={clone}><Copy className="h-3.5 w-3.5" /> Clone</Button>
              <Button size="sm" variant="outline" onClick={remove}><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
            </div>
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" onClick={publish}><Check className="h-3.5 w-3.5" /> Publish</Button>
              <Button size="sm" onClick={save}><Check className="h-3.5 w-3.5" /> Save</Button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SessionSelector({ currentId, onSelect, onClose }: { currentId: string; onSelect: (id: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return SESSIONS.filter((s) =>
      !q || s.sessionId.toLowerCase().includes(q) || s.customer.toLowerCase().includes(q) || s.username.toLowerCase().includes(q),
    ).slice(0, 50);
  }, [query]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[180]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
        className="absolute left-1/2 top-20 w-full max-w-[640px] -translate-x-1/2 rounded-2xl border border-border bg-background shadow-2xl">
        <div className="border-b border-border p-4">
          <div className="mb-2 text-[13px] font-semibold text-foreground">Select Session to Evaluate</div>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by session ID, customer, or username…"
            className="w-full rounded-lg border border-border bg-card/40 px-3 py-2 text-[13px] text-foreground outline-none focus:border-primary/50"
          />
        </div>
        <div className="max-h-[420px] overflow-auto scrollbar-thin p-2">
          {filtered.map((s) => (
            <button
              key={s.sessionId}
              onClick={() => onSelect(s.sessionId)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-primary/5",
                s.sessionId === currentId && "bg-primary/10",
              )}
            >
              <span className={cn("h-2 w-2 rounded-full",
                s.decision === "Deny" ? "bg-destructive" : s.decision === "Challenge" ? "bg-warning" : "bg-success",
              )} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12px] font-semibold text-foreground">{s.sessionId}</span>
                  <span className="text-[10px] text-muted-foreground">{s.customer}</span>
                </div>
                <div className="text-[10px] text-muted-foreground">{s.username} · {s.ip} · {s.city}, {s.country}</div>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="font-mono font-bold" style={{ color: s.riskScore >= 75 ? "#ef4444" : s.riskScore >= 50 ? "#f97316" : "#22c55e" }}>
                  risk {s.riskScore}
                </span>
                <span className="font-mono text-muted-foreground">fraud {s.fraudProbability}%</span>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="py-8 text-center text-[12px] text-muted-foreground">No sessions match "{query}"</div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
