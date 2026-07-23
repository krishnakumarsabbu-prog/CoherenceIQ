import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Play, GitCompareArrows, Check, X, ArrowUp, ArrowDown,
  History, FileJson, ShieldCheck, ShieldAlert, ShieldX, Clock, Zap,
} from "lucide-react";
import { PageHeader } from "@/components/shell/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/markdown/Markdown";
import { EChart } from "@/components/charts/EChart";
import type { EChartsOption } from "echarts";
import {
  runReplay, diffReplays, sampleRequestJson, parseRequestJson, buildSessionFromRequest,
  RULESET_LABEL, RULESET_TONE,
  type RuleSet, type ReplayResult, type ReplayDiff,
} from "@/lib/replayData";
import type { Decision, LoginSession } from "@/types";

const ALL_SETS: RuleSet[] = ["current", "previous", "experimental"];

const DECISION_ICON: Record<Decision, React.ElementType> = {
  Allow: ShieldCheck,
  Challenge: ShieldAlert,
  Deny: ShieldX,
};
const DECISION_TONE: Record<Decision, "success" | "warning" | "destructive"> = {
  Allow: "success",
  Challenge: "warning",
  Deny: "destructive",
};
const DECISION_COLOR: Record<Decision, string> = {
  Allow: "#22c55e",
  Challenge: "#f59e0b",
  Deny: "#ef4444",
};

export function ReplayStudioPage() {
  const [jsonText, setJsonText] = useState(sampleRequestJson());
  const [parseError, setParseError] = useState<string | null>(null);
  const [session, setSession] = useState<LoginSession>(() => buildSessionFromRequest(parseRequestJson(sampleRequestJson()) ?? {}));
  const [primary, setPrimary] = useState<RuleSet>("current");
  const [secondary, setSecondary] = useState<RuleSet>("experimental");
  const [hasReplayed, setHasReplayed] = useState(false);

  const primaryResult = useMemo<ReplayResult>(() => runReplay(session, primary), [session, primary]);
  const secondaryResult = useMemo<ReplayResult>(() => runReplay(session, secondary), [session, secondary]);
  const diff = useMemo<ReplayDiff>(() => diffReplays(primaryResult, secondaryResult), [primaryResult, secondaryResult]);

  const onLoadJson = () => {
    const parsed = parseRequestJson(jsonText);
    if (!parsed) {
      setParseError("Invalid JSON. Please check the request payload.");
      return;
    }
    setParseError(null);
    setSession(buildSessionFromRequest(parsed));
    setHasReplayed(true);
  };

  const onUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setJsonText(text);
      const parsed = parseRequestJson(text);
      if (!parsed) {
        setParseError("Uploaded file is not valid JSON.");
        return;
      }
      setParseError(null);
      setSession(buildSessionFromRequest(parsed));
      setHasReplayed(true);
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex h-full flex-col p-4 lg:p-5">
      <PageHeader
        title="Replay Studio"
        subtitle="Upload a request and replay it against current, previous, or experimental rule sets"
        actions={
          <>
            <Badge variant="default"><History className="h-3 w-3" /> Beta</Badge>
            <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-transparent px-3 text-xs font-medium transition-colors hover:bg-accent">
              <Upload className="h-3.5 w-3.5" /> Upload JSON
              <input type="file" accept=".json,application/json" className="hidden" onChange={onUploadFile} />
            </label>
            <Button size="sm" onClick={onLoadJson}><Play className="h-3.5 w-3.5" /> Replay</Button>
          </>
        }
      />

      <div className="grid flex-1 grid-cols-1 gap-3 min-h-0 xl:grid-cols-[400px_1fr]">
        {/* Left: request editor */}
        <Card className="flex flex-col overflow-hidden p-0">
          <CardHeader className="shrink-0 border-b border-border px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-[13px]"><FileJson className="h-4 w-4 text-primary" /> Request JSON</CardTitle>
                <CardDescription className="mt-0.5">Paste or upload a login request payload</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setJsonText(sampleRequestJson())} className="h-7 text-[11px]">Sample</Button>
            </div>
          </CardHeader>
          <div className="flex min-h-0 flex-1 flex-col">
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              spellCheck={false}
              className="scrollbar-thin min-h-[200px] flex-1 resize-none bg-muted/30 p-3 font-mono text-[11.5px] leading-relaxed text-foreground outline-none dark:bg-black/30"
            />
            <div className="shrink-0 border-t border-border px-4 py-2.5">
              {parseError ? (
                <div className="flex items-center gap-2 text-[11.5px] text-destructive">
                  <X className="h-3.5 w-3.5" /> {parseError}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
                  <Check className="h-3.5 w-3.5 text-success" /> Loaded: <span className="font-mono text-foreground/70">{session.sessionId}</span> · {session.customer}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Right: replay results + comparison */}
        <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
          {/* Rule set selectors */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <RuleSetSelector label="Primary (baseline)" value={primary} onChange={setPrimary} exclude={secondary} />
            <RuleSetSelector label="Secondary (comparison)" value={secondary} onChange={setSecondary} exclude={primary} />
          </div>

          {/* Decision comparison cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DecisionCard result={primaryResult} label={RULESET_LABEL[primary]} tone={RULESET_TONE[primary]} />
            <DecisionCard result={secondaryResult} label={RULESET_LABEL[secondary]} tone={RULESET_TONE[secondary]} diff={diff} />
          </div>

          {/* Differences summary */}
          <AnimatePresence>
            {hasReplayed && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <DiffSummary diff={diff} primary={primaryResult} secondary={secondaryResult} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tabbed comparison: timelines, evidence, rules, report */}
          <ComparisonTabs primary={primaryResult} secondary={secondaryResult} diff={diff} />
        </div>
      </div>
    </div>
  );
}

function RuleSetSelector({ label, value, onChange, exclude }: { label: string; value: RuleSet; onChange: (v: RuleSet) => void; exclude: RuleSet }) {
  return (
    <Card className="p-3">
      <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {ALL_SETS.map((s) => (
          <button
            key={s}
            disabled={s === exclude}
            onClick={() => onChange(s)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-all disabled:opacity-30",
              value === s ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {RULESET_LABEL[s]}
          </button>
        ))}
      </div>
    </Card>
  );
}

function DecisionCard({ result, label, tone, diff }: { result: ReplayResult; label: string; tone: "success" | "muted" | "default"; diff?: ReplayDiff }) {
  const Icon = DECISION_ICON[result.decision];
  const decisionColor = DECISION_COLOR[result.decision];
  return (
    <Card className="relative overflow-hidden p-4">
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full blur-[60px]" style={{ background: `${decisionColor}22` }} />
      <div className="relative flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
            <Badge variant={tone} className="text-[9px]">{result.ruleSet}</Badge>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${decisionColor}22`, color: decisionColor }}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-bold" style={{ color: decisionColor }}>{result.decision}</div>
              <div className="text-[10.5px] text-muted-foreground">{result.totalLatencyMs}ms · {result.rulesFired.length} rules fired</div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Metric label="Risk" value={result.riskScore} delta={diff?.riskDelta} />
          <Metric label="Coherence" value={result.coherenceScore} delta={diff?.coherenceDelta} invert />
          <Metric label="Fraud %" value={result.fraudProbability} delta={diff?.fraudDelta} />
        </div>
      </div>
    </Card>
  );
}

function Metric({ label, value, delta, invert }: { label: string; value: number; delta?: number; invert?: boolean }) {
  const showDelta = delta !== undefined && delta !== 0;
  // For coherence, a decrease is "worse"; for risk/fraud, an increase is "worse".
  const positive = invert ? (delta ?? 0) > 0 : (delta ?? 0) < 0;
  return (
    <div className="rounded-lg border border-border bg-card/40 px-2 py-1.5">
      <div className="text-[8.5px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-mono text-[15px] font-bold tabular-nums text-foreground">{value}</div>
      {showDelta && (
        <div className={cn("flex items-center justify-center gap-0.5 text-[9px] font-bold", positive ? "text-success" : "text-destructive")}>
          {delta! > 0 ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
          {Math.abs(delta!)}
        </div>
      )}
    </div>
  );
}

function DiffSummary({ diff, primary, secondary }: { diff: ReplayDiff; primary: ReplayResult; secondary: ReplayResult }) {
  const report = buildDiffReport(diff, primary, secondary);
  return (
    <Card className="border-primary/30 bg-primary/5 p-4">
      <div className="mb-2 flex items-center gap-2">
        <GitCompareArrows className="h-4 w-4 text-primary" />
        <span className="text-[13px] font-bold text-foreground">Replay differences</span>
        {diff.decisionChanged && <Badge variant="destructive" className="text-[9px]">Decision changed</Badge>}
      </div>
      <Markdown content={report} />
    </Card>
  );
}

function buildDiffReport(diff: ReplayDiff, primary: ReplayResult, secondary: ReplayResult): string {
  const lines: string[] = [];
  lines.push(`Comparing **${RULESET_LABEL[primary.ruleSet]}** → **${RULESET_LABEL[secondary.ruleSet]}**.`);
  lines.push("");
  lines.push(`| Metric | Primary | Secondary | Δ |`);
  lines.push(`|---|---|---|---|`);
  lines.push(`| Risk score | ${primary.riskScore} | ${secondary.riskScore} | ${signed(diff.riskDelta)} |`);
  lines.push(`| Coherence | ${primary.coherenceScore} | ${secondary.coherenceScore} | ${signed(diff.coherenceDelta)} |`);
  lines.push(`| Fraud % | ${primary.fraudProbability}% | ${secondary.fraudProbability}% | ${signed(diff.fraudDelta)} |`);
  lines.push(`| Latency | ${primary.totalLatencyMs}ms | ${secondary.totalLatencyMs}ms | ${signed(secondary.totalLatencyMs - primary.totalLatencyMs)}ms |`);
  lines.push(`| Decision | ${primary.decision} | ${secondary.decision} | ${diff.decisionChanged ? "**changed**" : "same"} |`);
  if (diff.rulesAdded.length || diff.rulesRemoved.length) {
    lines.push("");
    lines.push(`### Rules`);
    if (diff.rulesAdded.length) lines.push(`- **Added in secondary:** ${diff.rulesAdded.map((r) => `\`${r}\``).join(", ")}`);
    if (diff.rulesRemoved.length) lines.push(`- **Removed in secondary:** ${diff.rulesRemoved.map((r) => `\`${r}\``).join(", ")}`);
  }
  return lines.join("\n");
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

const TABS = ["timelines", "evidence", "rules", "report"] as const;
type Tab = (typeof TABS)[number];

function ComparisonTabs({ primary, secondary, diff }: { primary: ReplayResult; secondary: ReplayResult; diff: ReplayDiff }) {
  const [tab, setTab] = useState<Tab>("timelines");
  return (
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
      <div className="flex shrink-0 items-center gap-1 border-b border-border px-3 py-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "relative -mb-px px-3 py-1.5 text-[12px] font-medium capitalize transition-colors",
              tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t === "timelines" ? "Compare Timelines" : t === "evidence" ? "Compare Evidence" : t === "rules" ? "Compare Decisions" : "Report"}
            {tab === t && <motion.span layoutId="replay-tab" className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />}
          </button>
        ))}
      </div>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-auto p-4">
        {tab === "timelines" && <TimelineComparison primary={primary} secondary={secondary} />}
        {tab === "evidence" && <EvidenceComparison primary={primary} secondary={secondary} />}
        {tab === "rules" && <RulesComparison primary={primary} secondary={secondary} diff={diff} />}
        {tab === "report" && <ReportTab primary={primary} secondary={secondary} diff={diff} />}
      </div>
    </Card>
  );
}

function TimelineComparison({ primary, secondary }: { primary: ReplayResult; secondary: ReplayResult }) {
  const option: EChartsOption = useMemo(() => ({
    tooltip: { trigger: "axis" },
    legend: { data: [RULESET_LABEL[primary.ruleSet], RULESET_LABEL[secondary.ruleSet]], top: 0 },
    grid: { left: 48, right: 18, top: 36, bottom: 32, containLabel: true },
    xAxis: {
      type: "category",
      data: primary.timeline.map((e) => e.label),
      axisLabel: { fontSize: 10, rotate: 18, interval: 0 },
    },
    yAxis: [
      { type: "value", name: "latency (ms)", position: "left" },
    ],
    series: [
      {
        name: RULESET_LABEL[primary.ruleSet],
        type: "bar",
        barWidth: "32%",
        itemStyle: { color: "#0ea5e9", borderRadius: [4, 4, 0, 0] },
        data: primary.timeline.map((e) => e.latencyMs),
      },
      {
        name: RULESET_LABEL[secondary.ruleSet],
        type: "bar",
        barWidth: "32%",
        itemStyle: { color: "#f97316", borderRadius: [4, 4, 0, 0] },
        data: secondary.timeline.map((e) => e.latencyMs),
      },
    ],
  }), [primary, secondary]);

  return (
    <div className="space-y-3">
      <div className="h-[220px]">
        <EChart option={option} style={{ height: "220px" }} />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <TimelineList result={primary} color="#0ea5e9" />
        <TimelineList result={secondary} color="#f97316" />
      </div>
    </div>
  );
}

function TimelineList({ result, color }: { result: ReplayResult; color: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        {RULESET_LABEL[result.ruleSet]}
      </div>
      <div className="space-y-1">
        {result.timeline.map((e, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
            className="flex items-center gap-2 rounded-md border border-border/60 bg-card/30 px-2.5 py-1.5"
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
            <span className="flex-1 truncate text-[11.5px] font-medium text-foreground">{e.label}</span>
            {e.rulesFired.length > 0 && (
              <span className="rounded bg-warning/15 px-1.5 py-px text-[9px] font-bold text-warning">{e.rulesFired.length} fired</span>
            )}
            {e.decision !== "pending" && (
              <span className="rounded px-1.5 py-px text-[9px] font-bold uppercase" style={{ background: `${DECISION_COLOR[e.decision]}22`, color: DECISION_COLOR[e.decision] }}>
                {e.decision}
              </span>
            )}
            <span className="flex items-center gap-1 font-mono text-[10.5px] tabular-nums text-muted-foreground">
              <Clock className="h-3 w-3" /> {e.latencyMs}ms
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function EvidenceComparison({ primary, secondary }: { primary: ReplayResult; secondary: ReplayResult }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_80px_80px_80px] gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <div>Evidence</div>
        <div className="text-center">Primary risk</div>
        <div className="text-center">Secondary risk</div>
        <div className="text-center">Δ</div>
      </div>
      {primary.evidence.map((ev, i) => {
        const sec = secondary.evidence[i];
        const delta = (sec?.risk ?? ev.risk) - ev.risk;
        return (
          <motion.div
            key={ev.id}
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="grid grid-cols-[1fr_80px_80px_80px] items-center gap-2 rounded-lg border border-border bg-card/30 px-3 py-2"
          >
            <div className="min-w-0">
              <div className="truncate text-[12px] font-semibold text-foreground">{ev.title}</div>
              <div className="text-[10px] text-muted-foreground">conf {(ev.confidence * 100).toFixed(0)}%</div>
            </div>
            <RiskCell value={ev.risk} />
            <RiskCell value={sec?.risk ?? ev.risk} />
            <div className={cn("text-center font-mono text-[12px] font-bold", delta === 0 ? "text-muted-foreground" : delta > 0 ? "text-destructive" : "text-success")}>
              {signed(delta)}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function RiskCell({ value }: { value: number }) {
  const color = value >= 75 ? "#ef4444" : value >= 50 ? "#f97316" : value >= 25 ? "#eab308" : "#22c55e";
  return (
    <div className="flex flex-col items-center">
      <span className="font-mono text-[14px] font-bold tabular-nums" style={{ color }}>{value}</span>
      <div className="mt-0.5 h-1 w-12 overflow-hidden rounded-full bg-muted/60">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function RulesComparison({ primary, secondary, diff }: { primary: ReplayResult; secondary: ReplayResult; diff: ReplayDiff }) {
  const allRules = Array.from(new Set([...primary.rules.map((r) => r.id), ...secondary.rules.map((r) => r.id)]));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-card/30 p-3">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{RULESET_LABEL[primary.ruleSet]}</div>
          <div className="space-y-1.5">
            {primary.rules.map((r) => (
              <RuleRow key={r.id} rule={r} fired={primary.rulesFired.includes(r.id)} color="#0ea5e9" />
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card/30 p-3">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{RULESET_LABEL[secondary.ruleSet]}</div>
          <div className="space-y-1.5">
            {secondary.rules.map((r) => (
              <RuleRow key={r.id} rule={r} fired={secondary.rulesFired.includes(r.id)} color="#f97316" added={diff.rulesAdded.includes(r.id)} />
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card/30 p-3">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Decision flow</div>
        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          {allRules.map((id) => {
            const inP = primary.rulesFired.includes(id);
            const inS = secondary.rulesFired.includes(id);
            const tone = inP && inS ? "text-success" : inP && !inS ? "text-muted-foreground line-through" : !inP && inS ? "text-primary font-semibold" : "text-muted-foreground";
            return <span key={id} className={cn("rounded border border-border px-1.5 py-0.5 font-mono text-[10.5px]", tone)}>{id}</span>;
          })}
        </div>
      </div>
    </div>
  );
}

function RuleRow({ rule, fired, color, added }: { rule: { id: string; name: string; tier: string; weight: number; active: boolean }; fired: boolean; color: string; added?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 rounded-md border px-2.5 py-1.5", fired ? "border-warning/40 bg-warning/5" : "border-border/60 bg-card/40")}>
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: fired ? color : "transparent", border: fired ? "none" : `1px solid hsl(var(--muted-foreground))` }} />
      <span className="font-mono text-[10.5px] font-bold text-foreground/70">{rule.id}</span>
      <span className="flex-1 truncate text-[11.5px] text-foreground">{rule.name}</span>
      {added && <Badge variant="default" className="text-[9px]">NEW</Badge>}
      <span className="font-mono text-[10px] text-muted-foreground">w{rule.weight}</span>
      {fired && <Zap className="h-3 w-3 text-warning" />}
    </div>
  );
}

function ReportTab({ primary, secondary, diff }: { primary: ReplayResult; secondary: ReplayResult; diff: ReplayDiff }) {
  const report = useMemo(() => buildFullReport(primary, secondary, diff), [primary, secondary, diff]);
  return <Card className="border-none bg-transparent p-0 shadow-none"><CardContent className="p-0"><Markdown content={report} /></CardContent></Card>;
}

function buildFullReport(primary: ReplayResult, secondary: ReplayResult, diff: ReplayDiff): string {
  const lines: string[] = [];
  lines.push(`# Replay comparison report`);
  lines.push("");
  lines.push(`**Session:** \`${primary.rules.length ? "replay" : "—"}\` · **Generated:** ${new Date().toLocaleString()}`);
  lines.push("");
  lines.push(`## Decision comparison`);
  lines.push(`| | Primary | Secondary |`);
  lines.push(`|---|---|---|`);
  lines.push(`| Rule set | ${RULESET_LABEL[primary.ruleSet]} | ${RULESET_LABEL[secondary.ruleSet]} |`);
  lines.push(`| Decision | **${primary.decision}** | **${secondary.decision}** |`);
  lines.push(`| Risk score | ${primary.riskScore} | ${secondary.riskScore} |`);
  lines.push(`| Coherence | ${primary.coherenceScore} | ${secondary.coherenceScore} |`);
  lines.push(`| Fraud probability | ${primary.fraudProbability}% | ${secondary.fraudProbability}% |`);
  lines.push(`| Total latency | ${primary.totalLatencyMs}ms | ${secondary.totalLatencyMs}ms |`);
  lines.push(`| Rules fired | ${primary.rulesFired.length} | ${secondary.rulesFired.length} |`);
  lines.push("");
  lines.push(`## Differences`);
  lines.push(`- Decision ${diff.decisionChanged ? "**changed** between rule sets" : "unchanged"}`);
  lines.push(`- Risk delta: **${signed(diff.riskDelta)}** · Coherence delta: **${signed(diff.coherenceDelta)}** · Fraud delta: **${signed(diff.fraudDelta)}%**`);
  if (diff.rulesAdded.length) lines.push(`- Rules added in secondary: ${diff.rulesAdded.map((r) => `\`${r}\``).join(", ")}`);
  if (diff.rulesRemoved.length) lines.push(`- Rules removed in secondary: ${diff.rulesRemoved.map((r) => `\`${r}\``).join(", ")}`);
  lines.push("");
  lines.push(`## Fired rules`);
  lines.push(`- **Primary:** ${primary.rulesFired.length ? primary.rulesFired.map((r) => `\`${r}\``).join(", ") : "none"}`);
  lines.push(`- **Secondary:** ${secondary.rulesFired.length ? secondary.rulesFired.map((r) => `\`${r}\``).join(", ") : "none"}`);
  lines.push("");
  lines.push(`## Evidence changes`);
  lines.push(`| Evidence | Δ risk |`);
  lines.push(`|---|---|`);
  diff.evidenceChanges.forEach((e) => lines.push(`| ${e.title} | ${signed(e.riskDelta)} |`));
  lines.push("");
  lines.push(`> _Generated by CoherenceIQ Replay Studio. Retain for audit._`);
  return lines.join("\n");
}
