import { motion } from "framer-motion";
import { Sparkles, TriangleAlert as AlertTriangle, Lightbulb, Info, ShieldCheck, ChevronRight, TrendingUp, Cpu, Brain } from "lucide-react";
import type { InvestigationCase, AiInsight, RiskLevel } from "@/lib/investigationData";
import { cn, relativeTime } from "@/lib/utils";

interface AISummaryPanelProps {
  case: InvestigationCase;
}

const SEVERITY_STYLES: Record<RiskLevel, { text: string; bg: string; border: string; label: string }> = {
  low: { text: "text-success", bg: "bg-success/10", border: "border-success/30", label: "Low" },
  medium: { text: "text-warning", bg: "bg-warning/10", border: "border-warning/30", label: "Medium" },
  high: { text: "text-orange-500 dark:text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", label: "High" },
  critical: { text: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30", label: "Critical" },
};

const KIND_ICONS = { signal: TrendingUp, anomaly: AlertTriangle, recommendation: ShieldCheck, context: Info };
const KIND_LABELS = { signal: "Signal", anomaly: "Anomaly", recommendation: "Recommendation", context: "Context" };

function InsightCard({ insight, index }: { insight: AiInsight; index: number }) {
  const s = SEVERITY_STYLES[insight.severity];
  const Icon = KIND_ICONS[insight.kind];
  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
      className={cn("rounded-lg border p-2.5", s.border, s.bg)}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn("h-3.5 w-3.5 shrink-0", s.text)} />
        <span className="text-[12px] font-semibold text-foreground">{insight.title}</span>
        <span className={cn("ml-auto rounded px-1.5 py-px text-[8.5px] font-bold uppercase", s.bg, s.text)}>{KIND_LABELS[insight.kind]}</span>
      </div>
      <p className="mt-1.5 text-[11px] leading-relaxed text-foreground/75">{insight.body}</p>
      <div className="mt-1.5 flex items-center gap-2">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted/50">
          <motion.div initial={{ width: 0 }} animate={{ width: `${insight.weight * 100}%` }} transition={{ duration: 0.5 }} className={cn("h-full rounded-full", s.text.replace("text-", "bg-"))} />
        </div>
        <span className="font-mono text-[9px] tabular-nums text-muted-foreground">{(insight.weight * 100).toFixed(0)}% weight</span>
      </div>
    </motion.div>
  );
}

export function AISummaryPanel({ case: investigation }: AISummaryPanelProps) {
  const s = investigation.session;
  const decisionColor = s.decision === "Allow" ? "text-success" : s.decision === "Challenge" ? "text-warning" : "text-destructive";
  const decisionBg = s.decision === "Allow" ? "bg-success/10 border-success/30" : s.decision === "Challenge" ? "bg-warning/10 border-warning/30" : "bg-destructive/10 border-destructive/30";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border px-3 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Brain className="h-4 w-4 text-primary" />
            <h2 className="text-[13px] font-semibold tracking-tight text-foreground">AI Summary</h2>
          </div>
          <span className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            <Sparkles className="h-3 w-3" /> Coherence Brain
          </span>
        </div>
        <div className="mt-1 text-[10px] text-muted-foreground">
          Case <span className="font-mono font-semibold text-foreground">{investigation.caseId}</span> · synthesized {relativeTime(s.loginTime)}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto scrollbar-thin p-3">
        {/* Decision summary */}
        <div className={cn("rounded-lg border p-3", decisionBg)}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Decision Summary</span>
            <span className={cn("text-lg font-bold", decisionColor)}>{s.decision}</span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Risk</div>
              <div className={cn("font-mono text-base font-bold tabular-nums", s.riskScore >= 75 ? "text-destructive" : s.riskScore >= 40 ? "text-warning" : "text-success")}>{s.riskScore}</div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Fraud %</div>
              <div className={cn("font-mono text-base font-bold tabular-nums", s.fraudProbability >= 60 ? "text-destructive" : s.fraudProbability >= 30 ? "text-warning" : "text-success")}>{s.fraudProbability}%</div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Coherence</div>
              <div className={cn("font-mono text-base font-bold tabular-nums", s.coherenceScore >= 70 ? "text-success" : s.coherenceScore >= 40 ? "text-warning" : "text-destructive")}>{s.coherenceScore}</div>
            </div>
          </div>
        </div>

        {/* Narrative */}
        <div>
          <div className="mb-1.5 flex items-center gap-1.5">
            <Info className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Narrative</span>
          </div>
          <div className="space-y-1.5 rounded-lg border border-border bg-card/40 p-2.5">
            {investigation.narrative.map((line, i) => (
              <p key={i} className="text-[11px] leading-relaxed text-foreground/80">{line}</p>
            ))}
          </div>
        </div>

        {/* Insights */}
        <div>
          <div className="mb-1.5 flex items-center gap-1.5">
            <Lightbulb className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Insights ({investigation.insights.length})</span>
          </div>
          <div className="space-y-2">
            {investigation.insights.map((ins, i) => (
              <InsightCard key={ins.id} insight={ins} index={i} />
            ))}
          </div>
        </div>

        {/* Model scores */}
        <div>
          <div className="mb-1.5 flex items-center gap-1.5">
            <Cpu className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Model Contributions</span>
          </div>
          <div className="space-y-1.5 rounded-lg border border-border bg-card/40 p-2.5">
            {investigation.modelScores.map((m) => (
              <div key={m.model}>
                <div className="flex items-center justify-between text-[10.5px]">
                  <span className="text-foreground/80">{m.model}</span>
                  <span className="font-mono font-semibold text-foreground">{m.score}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/60">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${m.score}%` }} transition={{ duration: 0.5 }} className={cn("h-full rounded-full", m.score >= 70 ? "bg-destructive" : m.score >= 40 ? "bg-warning" : "bg-success")} />
                  </div>
                  <span className="font-mono text-[9px] tabular-nums text-muted-foreground">{(m.contribution * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended actions */}
        <div>
          <div className="mb-1.5 flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Recommended Actions</span>
          </div>
          <div className="space-y-1.5">
            {investigation.recommendedActions.map((ra) => {
              const s2 = SEVERITY_STYLES[ra.severity];
              return (
                <div key={ra.id} className={cn("rounded-lg border p-2.5", s2.border, s2.bg)}>
                  <div className="flex items-center gap-2">
                    <ChevronRight className={cn("h-3.5 w-3.5 shrink-0", s2.text)} />
                    <span className="text-[12px] font-semibold text-foreground">{ra.label}</span>
                    <span className={cn("ml-auto rounded px-1.5 py-px text-[8.5px] font-bold uppercase", s2.bg, s2.text)}>{s2.label}</span>
                  </div>
                  <p className="mt-1 pl-5 text-[10.5px] leading-relaxed text-foreground/70">{ra.rationale}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Similar cases */}
        <div>
          <div className="mb-1.5 flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Similar Cases</span>
          </div>
          <div className="overflow-hidden rounded-lg border border-border">
            {investigation.similarCases.map((c, i) => (
              <div key={c.caseId} className={cn("flex items-center gap-2 px-2.5 py-2 text-[11px]", i > 0 && "border-t border-border/60")}>
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[10px] text-muted-foreground">{c.caseId}</div>
                  <div className="truncate text-foreground/80">{c.customer}</div>
                </div>
                <div className="text-right">
                  <div className={cn("font-semibold", c.decision === "Deny" ? "text-destructive" : c.decision === "Challenge" ? "text-warning" : "text-success")}>{c.decision}</div>
                  <div className="font-mono text-[9px] text-muted-foreground">{(c.similarity * 100).toFixed(0)}% sim</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
