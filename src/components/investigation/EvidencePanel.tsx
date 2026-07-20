import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronDown, TrendingUp, TrendingDown, CircleAlert as AlertCircle, Clock, Activity, X } from "lucide-react";
import type { EvidenceCard, RiskLevel } from "@/lib/investigationData";
import { EVIDENCE_ICONS } from "./icons";
import { cn } from "@/lib/utils";

interface EvidencePanelProps {
  evidence: EvidenceCard[];
}

const RISK_STYLES: Record<RiskLevel, { text: string; bg: string; bar: string; label: string }> = {
  low: { text: "text-success", bg: "bg-success/15", bar: "bg-success", label: "Low" },
  medium: { text: "text-warning", bg: "bg-warning/15", bar: "bg-warning", label: "Medium" },
  high: { text: "text-orange-500 dark:text-orange-400", bg: "bg-orange-500/15", bar: "bg-orange-500", label: "High" },
  critical: { text: "text-destructive", bg: "bg-destructive/15", bar: "bg-destructive", label: "Critical" },
};

type CardTab = "evidence" | "features" | "history" | "timeline";

function SeverityDot({ severity }: { severity: RiskLevel }) {
  const color = RISK_STYLES[severity].bar;
  return <span className={cn("inline-block h-1.5 w-1.5 rounded-full", color)} />;
}

function EvidenceCardView({ card, index }: { card: EvidenceCard; index: number }) {
  const [expanded, setExpanded] = useState(index === 0);
  const [tab, setTab] = useState<CardTab>("evidence");
  const Icon = EVIDENCE_ICONS[card.kind] ?? AlertCircle;
  const r = RISK_STYLES[card.riskLevel];

  const tabs: { id: CardTab; label: string; icon: typeof Activity }[] = [
    { id: "evidence", label: "Evidence", icon: AlertCircle },
    { id: "features", label: "Features", icon: TrendingUp },
    { id: "history", label: "History", icon: Clock },
    { id: "timeline", label: "Timeline", icon: Activity },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      className={cn(
        "rounded-lg border bg-card/60 transition-all",
        expanded ? "border-primary/40 shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]" : "border-border hover:border-primary/30"
      )}
    >
      {/* Card header */}
      <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center gap-3 p-3 text-left">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", r.bg, r.text)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-foreground">{card.title}</span>
            <span className={cn("rounded px-1.5 py-px text-[9px] font-bold uppercase", r.bg, r.text)}>{r.label}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-[10.5px] text-muted-foreground">
            <span>Confidence <span className="font-semibold text-foreground">{(card.confidence * 100).toFixed(0)}%</span></span>
            <span>Risk <span className={cn("font-semibold", r.text)}>{card.risk}</span></span>
            <span>{card.reasonCodes.length} reason codes</span>
          </div>
        </div>
        {/* Meters */}
        <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
          <div className="flex items-center gap-2">
            <span className="text-[8.5px] uppercase tracking-wide text-muted-foreground">Conf</span>
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted/60">
              <motion.div initial={{ width: 0 }} animate={{ width: `${card.confidence * 100}%` }} transition={{ duration: 0.5 }} className="h-full rounded-full bg-primary" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[8.5px] uppercase tracking-wide text-muted-foreground">Risk</span>
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted/60">
              <motion.div initial={{ width: 0 }} animate={{ width: `${card.risk}%` }} transition={{ duration: 0.5 }} className={cn("h-full rounded-full", r.bar)} />
            </div>
          </div>
        </div>
        {expanded ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/60 px-3 pb-3 pt-2">
              {/* Reason codes */}
              <div className="mb-2.5 flex flex-wrap gap-1.5">
                {card.reasonCodes.map((rc) => (
                  <span key={rc.code} className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9.5px] font-medium", RISK_STYLES[rc.severity].bg, RISK_STYLES[rc.severity].text, "border-transparent")}>
                    <SeverityDot severity={rc.severity} />
                    <span className="font-mono font-bold">{rc.code}</span>
                    <span className="text-foreground/70">{rc.label}</span>
                  </span>
                ))}
              </div>

              {/* Tabs */}
              <div className="mb-2 flex items-center gap-1 border-b border-border/60">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "relative -mb-px flex items-center gap-1 px-2 py-1 text-[10.5px] font-medium transition-colors",
                      tab === t.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <t.icon className="h-3 w-3" /> {t.label}
                    {tab === t.id && <motion.span layoutId={`ev-tab-${card.id}`} className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />}
                  </button>
                ))}
              </div>

              <div className="min-h-[80px]">
                {tab === "evidence" && (
                  <ul className="space-y-1">
                    {card.evidence.map((e, i) => (
                      <li key={i} className="flex items-start gap-2 text-[11px] leading-relaxed text-foreground/80">
                        <span className={cn("mt-1.5 h-1 w-1 shrink-0 rounded-full", r.bar)} />
                        <span>{e}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {tab === "features" && (
                  <div className="space-y-1.5">
                    {card.featureImportance.map((f) => (
                      <div key={f.feature} className="flex items-center gap-2 rounded-md border border-border/50 px-2 py-1.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="truncate font-mono text-[10.5px] font-medium text-foreground">{f.feature}</span>
                            <span className="ml-2 shrink-0 rounded bg-muted px-1.5 py-px font-mono text-[9.5px] text-foreground/80">{f.value}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted/60">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${f.weight * 100}%` }} transition={{ duration: 0.4 }} className={cn("h-full rounded-full", f.direction === "increases" ? "bg-destructive/70" : "bg-success/70")} />
                            </div>
                            <span className="font-mono text-[9px] tabular-nums text-muted-foreground">{(f.weight * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                        <span className={cn("flex shrink-0 items-center gap-0.5 text-[9px] font-medium", f.direction === "increases" ? "text-destructive" : "text-success")}>
                          {f.direction === "increases" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {f.direction === "increases" ? "risk" : "safe"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {tab === "history" && (
                  <div className="relative pl-4">
                    <div className="absolute left-[5px] top-1 bottom-1 w-px bg-border" />
                    {card.history.map((h, i) => (
                      <div key={i} className="relative mb-2 last:mb-0">
                        <span className={cn("absolute -left-[11px] top-1 h-2 w-2 rounded-full ring-2 ring-card", h.delta > 0 ? "bg-destructive" : h.delta < 0 ? "bg-success" : "bg-muted-foreground")} />
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-foreground/80">{h.label}</span>
                          <span className={cn("shrink-0 font-mono text-[10px] font-semibold tabular-nums", h.delta > 0 ? "text-destructive" : h.delta < 0 ? "text-success" : "text-muted-foreground")}>
                            {h.delta > 0 ? "+" : ""}{h.delta}
                          </span>
                        </div>
                        <div className="font-mono text-[9px] text-muted-foreground">{new Date(h.t).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}</div>
                      </div>
                    ))}
                  </div>
                )}

                {tab === "timeline" && (
                  <div className="relative pl-4">
                    <div className="absolute left-[5px] top-1 bottom-1 w-px bg-border" />
                    {card.timeline.map((tl, i) => {
                      const color = tl.kind === "completed" ? "bg-success" : tl.kind === "warning" ? "bg-warning" : tl.kind === "failed" ? "bg-destructive" : "bg-muted-foreground";
                      return (
                        <div key={i} className="relative mb-2.5 last:mb-0">
                          <span className={cn("absolute -left-[11px] top-1 h-2 w-2 rounded-full ring-2 ring-card", color)} />
                          <div className="text-[11px] text-foreground/80">{tl.label}</div>
                          <div className="font-mono text-[9px] text-muted-foreground">{new Date(tl.t).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function EvidencePanel({ evidence }: EvidencePanelProps) {
  const [filter, setFilter] = useState<string | null>(null);
  const filters: { id: string; label: string }[] = [
    { id: "device", label: "Device" },
    { id: "ip", label: "IP" },
    { id: "location", label: "Location" },
    { id: "cookie", label: "Cookie" },
    { id: "behavior", label: "Behavior" },
    { id: "graph", label: "Graph" },
    { id: "temporal", label: "Temporal" },
  ];
  const visible = filter ? evidence.filter((e) => e.kind === filter) : evidence;
  const avgRisk = Math.round(evidence.reduce((a, e) => a + e.risk, 0) / evidence.length);
  const critical = evidence.filter((e) => e.riskLevel === "critical" || e.riskLevel === "high").length;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-3 py-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-semibold tracking-tight text-foreground">Evidence Explorer</h2>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>{evidence.length} signals</span>
            <span>·</span>
            <span>Avg risk <span className="font-semibold text-foreground">{avgRisk}</span></span>
            <span>·</span>
            <span className={cn("font-semibold", critical > 0 ? "text-destructive" : "text-success")}>{critical} elevated</span>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <button
            onClick={() => setFilter(null)}
            className={cn("rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors", !filter ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground")}
          >
            All
          </button>
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(filter === f.id ? null : f.id)}
              className={cn("rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors", filter === f.id ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground")}
            >
              {f.label}
            </button>
          ))}
          {filter && (
            <button onClick={() => setFilter(null)} className="ml-1 flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" /> clear
            </button>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto scrollbar-thin p-3">
        {visible.map((e, i) => (
          <EvidenceCardView key={e.id} card={e} index={i} />
        ))}
        {visible.length === 0 && (
          <div className="flex h-full items-center justify-center text-[12px] text-muted-foreground">No evidence signals for this filter.</div>
        )}
      </div>
    </div>
  );
}
