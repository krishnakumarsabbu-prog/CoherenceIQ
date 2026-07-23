import { AnimatePresence, motion } from "framer-motion";
import { X, Tag, Layers, Gauge, KeyRound, Clock, ShieldAlert, FileText, CircleCheck as CheckCircle2, Hash } from "lucide-react";
import type { RuleRecord } from "@/lib/ruleIntelligenceData";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const RISK_TONE: Record<string, "destructive" | "warning" | "default" | "muted"> = {
  Critical: "destructive", High: "warning", Medium: "default", Low: "muted",
};

interface Props {
  rule: RuleRecord | null;
  open: boolean;
  onClose: () => void;
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/30 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</span>
      </div>
      {children}
    </div>
  );
}

export function RuleDetailsDrawer({ rule, open, onClose }: Props) {
  return (
    <AnimatePresence>
      {open && rule && (
        <motion.div
          initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 260 }}
          className="absolute right-0 top-0 z-40 flex h-full w-full max-w-[440px] flex-col border-l border-border bg-background/95 backdrop-blur-xl shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="min-w-0">
              <h3 className="truncate text-[14px] font-bold text-foreground">{rule.rule_name}</h3>
              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{rule.rule_id}</p>
            </div>
            <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>

          <div className="flex-1 space-y-3 overflow-auto p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={RISK_TONE[rule.risk_level] ?? "muted"}>{rule.risk_level}</Badge>
              <Badge variant="default">{rule.primary_cluster}</Badge>
              {rule.secondary_cluster && <Badge variant="outline">{rule.secondary_cluster}</Badge>}
              <Badge variant="success">{rule.status}</Badge>
            </div>

            <Section icon={FileText} title="Description">
              <p className="text-[12px] leading-relaxed text-foreground">{rule.description}</p>
            </Section>

            <div className="grid grid-cols-2 gap-3">
              <Section icon={Hash} title="Parameter Count">
                <span className="text-[20px] font-bold tabular-nums text-foreground">{rule.parameter_count}</span>
              </Section>
              <Section icon={Gauge} title="Confidence">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-full rounded-full", rule.confidence >= 0.75 ? "bg-success" : rule.confidence >= 0.5 ? "bg-primary" : "bg-warning")} style={{ width: `${rule.confidence * 100}%` }} />
                  </div>
                  <span className="text-[14px] font-bold tabular-nums text-foreground">{Math.round(rule.confidence * 100)}%</span>
                </div>
              </Section>
            </div>

            <Section icon={Layers} title="Parameters">
              <div className="flex flex-wrap gap-1.5">
                {rule.parameters.map((p) => <span key={p} className="rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">{p}</span>)}
              </div>
            </Section>

            <Section icon={Tag} title="Extracted Keywords">
              <div className="flex flex-wrap gap-1">
                {rule.keywords.map((k) => <span key={k} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{k}</span>)}
              </div>
            </Section>

            <Section icon={Gauge} title="Suggested Cluster">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-semibold text-foreground">{rule.primary_cluster}</span>
                {rule.secondary_cluster && <span className="text-[11px] text-muted-foreground">· secondary: {rule.secondary_cluster}</span>}
              </div>
            </Section>

            {rule.thresholds.length > 0 && (
              <Section icon={ShieldAlert} title="Thresholds">
                <div className="flex flex-wrap gap-1">{rule.thresholds.map((t) => <span key={t} className="rounded bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning">{t}</span>)}</div>
              </Section>
            )}

            {rule.time_windows.length > 0 && (
              <Section icon={Clock} title="Time Windows">
                <div className="flex flex-wrap gap-1">{rule.time_windows.map((t) => <span key={t} className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">{t}</span>)}</div>
              </Section>
            )}

            {rule.decision_words.length > 0 && (
              <Section icon={KeyRound} title="Decision Words">
                <div className="flex flex-wrap gap-1">{rule.decision_words.map((d) => <Badge key={d} variant="destructive">{d}</Badge>)}</div>
              </Section>
            )}

            <Section icon={CheckCircle2} title="Matched Classification Rules">
              <ul className="space-y-1">
                {rule.matched_classification_rules.map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-success" /> {r}
                  </li>
                ))}
                {rule.matched_classification_rules.length === 0 && <li className="text-[11px] text-muted-foreground">No classification rules matched.</li>}
              </ul>
            </Section>

            <p className="text-[10px] text-muted-foreground">Source: {rule.source_file}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
