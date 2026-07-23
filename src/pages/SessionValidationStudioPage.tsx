import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, Upload, FileJson, FileText, FileCode, Sparkles, Dice5,
  Play, Download, GitCompare, Clock, CheckCircle2, AlertTriangle, XCircle,
  ChevronDown, ChevronRight, Activity, Zap, Brain, Target, Gauge,
  Network, MapPin, KeyRound, User, CreditCard, Smartphone, Globe,
  Server, Cpu, Layers, Eye, FileDown, History as HistoryIcon, Share2,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { sessionValidationApi, type ValidationResult, type HistoryEntry } from "@/lib/sessionValidationData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { EChart } from "@/components/charts/EChart";
import ReactFlow, {
  Background, Controls, type Node, type Edge, Position, MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { cn } from "@/lib/utils";

type ContentType = "json" | "xml" | "markdown" | "api";
type DetailTab = "raw" | "entities" | "rules" | "signals" | "features" | "domains" | "decision" | "reasons";

const CONTENT_TYPE_LABELS: Record<ContentType, { label: string; icon: any }> = {
  json: { label: "JSON", icon: FileJson },
  xml: { label: "XML", icon: FileCode },
  markdown: { label: "Markdown", icon: FileText },
  api: { label: "API Payload", icon: FileCode },
};

const PIPELINE_STAGES = [
  { name: "Session Received", icon: Upload },
  { name: "Session Parser", icon: FileJson },
  { name: "Entity Extraction", icon: Eye },
  { name: "Rule Discovery", icon: Layers },
  { name: "Rule Matching", icon: Target },
  { name: "Signal Generation", icon: Zap },
  { name: "Feature Engineering", icon: Cpu },
  { name: "Domain Score Calculation", icon: Gauge },
  { name: "Coherence Brain", icon: Brain },
  { name: "Decision Engine", icon: ShieldCheck },
];

const DECISION_COLORS = {
  ALLOW: { bg: "bg-success/15", text: "text-success", border: "border-success/30", icon: CheckCircle2 },
  CHALLENGE: { bg: "bg-warning/15", text: "text-warning", border: "border-warning/30", icon: AlertTriangle },
  DENY: { bg: "bg-destructive/15", text: "text-destructive", border: "border-destructive/30", icon: XCircle },
};


export function SessionValidationStudioPage() {
  const [rawInput, setRawInput] = useState("");
  const [contentType, setContentType] = useState<ContentType>("json");
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [activeStage, setActiveStage] = useState<number>(-1);
  const [expandedStage, setExpandedStage] = useState<number>(-1);
  const [activeTab, setActiveTab] = useState<DetailTab>("raw");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareA, setCompareA] = useState<string | null>(null);
  const [compareB, setCompareB] = useState<string | null>(null);
  const [compareResult, setCompareResult] = useState<{ a: ValidationResult; b: ValidationResult } | null>(null);
  const [flowOpen, setFlowOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: history } = useQuery({
    queryKey: ["sv-history"],
    queryFn: sessionValidationApi.getHistory,
    refetchInterval: 5000,
  });

  const runMutation = useMutation({
    mutationFn: ({ input, type }: { input: string; type: string }) =>
      sessionValidationApi.run(input, type),
    onSuccess: (data) => {
      setResult(data);
      setActiveStage(-1);
      setExpandedStage(-1);
      setActiveTab("raw");
    },
  });

  const handleRun = useCallback(() => {
    if (!rawInput.trim()) return;
    runMutation.mutate({ input: rawInput, type: contentType });
  }, [rawInput, contentType, runMutation]);

  // Animate pipeline stages when result arrives
  useEffect(() => {
    if (!result) return;
    let stage = 0;
    setActiveStage(0);
    const interval = setInterval(() => {
      stage++;
      if (stage < PIPELINE_STAGES.length) {
        setActiveStage(stage);
      } else {
        clearInterval(interval);
      }
    }, 250);
    return () => clearInterval(interval);
  }, [result]);

  const handleSample = async (index: number) => {
    const sample = await sessionValidationApi.getSample(index);
    setRawInput(sample.content);
    setContentType(sample.content_type as ContentType);
  };

  const handleRandom = async () => {
    const sample = await sessionValidationApi.getRandomSession();
    setRawInput(sample.content);
    setContentType(sample.content_type as ContentType);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      setRawInput(content);
      if (file.name.endsWith(".xml")) setContentType("xml");
      else if (file.name.endsWith(".md")) setContentType("markdown");
      else setContentType("json");
    };
    reader.readAsText(file);
  };

  const handleDownloadReport = async () => {
    if (!result) return;
    const report = await sessionValidationApi.getReport(result.session_id);
    const blob = new Blob([report], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `validation-report-${result.session_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCompare = async () => {
    if (!compareA || !compareB) return;
    const [a, b] = await Promise.all([
      sessionValidationApi.getSession(compareA),
      sessionValidationApi.getSession(compareB),
    ]);
    setCompareResult({ a, b });
  };

  const isRunning = runMutation.isPending;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 pt-4 pb-3 lg:px-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Session Validation Studio</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Validate login sessions against the complete Rule Intelligence pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
            <HistoryIcon className="h-3.5 w-3.5" /> History
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCompareOpen(true)} disabled={!history || history.length < 2}>
            <GitCompare className="h-3.5 w-3.5" /> Compare
          </Button>
          <Button variant="outline" size="sm" onClick={() => setFlowOpen(true)} disabled={!result}>
            <Share2 className="h-3.5 w-3.5" /> Flow Graph
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadReport} disabled={!result}>
            <FileDown className="h-3.5 w-3.5" /> Report
          </Button>
        </div>
      </div>

      {/* Main 4-panel layout */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel: Session Input */}
          <div className="w-[320px] shrink-0 border-r border-border overflow-y-auto p-4 space-y-3">
            <SessionInputPanel
              rawInput={rawInput}
              setRawInput={setRawInput}
              contentType={contentType}
              setContentType={setContentType}
              onRun={handleRun}
              onUpload={() => fileInputRef.current?.click()}
              onSample={handleSample}
              onRandom={handleRandom}
              isRunning={isRunning}
            />
            <input ref={fileInputRef} type="file" accept=".json,.xml,.md,.txt" onChange={handleFileUpload} className="hidden" />
          </div>

          {/* Center Panel: Execution Pipeline */}
          <div className="flex-1 overflow-y-auto p-4">
            <ExecutionPipeline
              result={result}
              activeStage={activeStage}
              expandedStage={expandedStage}
              setExpandedStage={setExpandedStage}
              isRunning={isRunning}
              onStageClick={(idx) => {
                setExpandedStage(expandedStage === idx ? -1 : idx);
                if (result) {
                  const tabMap: Record<number, DetailTab> = {
                    0: "raw", 1: "raw", 2: "entities", 3: "rules", 4: "rules",
                    5: "signals", 6: "features", 7: "domains", 8: "domains", 9: "decision",
                  };
                  setActiveTab(tabMap[idx] || "raw");
                }
              }}
            />
          </div>

          {/* Right Panel: Execution Details */}
          <div className="w-[400px] shrink-0 border-l border-border overflow-y-auto">
            <ExecutionDetails result={result} activeTab={activeTab} setActiveTab={setActiveTab} />
          </div>
        </div>

        {/* Bottom Panel: Timeline */}
        <div className="h-[180px] shrink-0 border-t border-border overflow-y-auto">
          <TimelinePanel result={result} />
        </div>
      </div>

      {/* Modals */}
      <HistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} history={history || []} onSelect={async (id) => {
        const r = await sessionValidationApi.getSession(id);
        setResult(r);
        setHistoryOpen(false);
      }} />
      <CompareModal
        open={compareOpen}
        onClose={() => { setCompareOpen(false); setCompareResult(null); setCompareA(null); setCompareB(null); }}
        history={history || []}
        compareA={compareA} setCompareA={setCompareA}
        compareB={compareB} setCompareB={setCompareB}
        onCompare={handleCompare}
        compareResult={compareResult}
      />
      <FlowGraphModal open={flowOpen} onClose={() => setFlowOpen(false)} result={result} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Left Panel: Session Input
// ---------------------------------------------------------------------------
function SessionInputPanel({
  rawInput, setRawInput, contentType, setContentType, onRun, onUpload, onSample, onRandom, isRunning,
}: {
  rawInput: string;
  setRawInput: (v: string) => void;
  contentType: ContentType;
  setContentType: (v: ContentType) => void;
  onRun: () => void;
  onUpload: () => void;
  onSample: (index: number) => void;
  onRandom: () => void;
  isRunning: boolean;
}) {
  const { data: samples } = useQuery({
    queryKey: ["sv-samples"],
    queryFn: sessionValidationApi.getSamples,
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Session Input</h3>
      </div>

      {/* Content type selector */}
      <div className="flex flex-wrap gap-1">
        {(Object.keys(CONTENT_TYPE_LABELS) as ContentType[]).map((ct) => {
          const { label, icon: Icon } = CONTENT_TYPE_LABELS[ct];
          return (
            <button
              key={ct}
              onClick={() => setContentType(ct)}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-all",
                contentType === ct
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              <Icon className="h-3 w-3" /> {label}
            </button>
          );
        })}
      </div>

      {/* Text area */}
      <textarea
        value={rawInput}
        onChange={(e) => setRawInput(e.target.value)}
        placeholder={`Paste ${CONTENT_TYPE_LABELS[contentType].label} session payload here...`}
        className="h-[280px] w-full resize-none rounded-md border border-input bg-background/40 p-3 font-mono text-[11px] leading-relaxed shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      {/* Action buttons */}
      <div className="space-y-2">
        <Button className="w-full" onClick={onRun} disabled={isRunning || !rawInput.trim()}>
          {isRunning ? (
            <><Activity className="h-3.5 w-3.5 animate-pulse" /> Running...</>
          ) : (
            <><Play className="h-3.5 w-3.5" /> Run Validation</>
          )}
        </Button>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={onUpload}>
            <Upload className="h-3 w-3" /> Upload
          </Button>
          <Button variant="outline" size="sm" onClick={onRandom}>
            <Dice5 className="h-3 w-3" /> Random
          </Button>
        </div>

        {samples && samples.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Sample Payloads</p>
            {samples.map((s, i) => (
              <button
                key={i}
                onClick={() => onSample(i)}
                className="flex w-full items-center gap-1.5 rounded-md border border-border bg-background/30 px-2 py-1.5 text-[11px] text-foreground transition-all hover:border-primary/30 hover:bg-primary/5"
              >
                <Sparkles className="h-3 w-3 text-primary" /> {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Center Panel: Execution Pipeline
// ---------------------------------------------------------------------------
function ExecutionPipeline({
  result, activeStage, expandedStage, setExpandedStage, isRunning, onStageClick,
}: {
  result: ValidationResult | null;
  activeStage: number;
  expandedStage: number;
  setExpandedStage: (v: number) => void;
  isRunning: boolean;
  onStageClick: (idx: number) => void;
}) {
  if (!result && !isRunning) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">No validation run yet</p>
            <p className="text-xs text-muted-foreground">Paste a session payload on the left and click Run Validation</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {PIPELINE_STAGES.map((stage, idx) => {
        const isActive = activeStage === idx && isRunning;
        const isCompleted = result ? true : activeStage > idx;
        const isExpanded = expandedStage === idx;
        const timelineEntry = result?.timeline[idx];

        return (
          <div key={stage.name}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => onStageClick(idx)}
              className={cn(
                "group flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all",
                isActive && "border-primary/40 bg-primary/10 shadow-[0_0_20px_-4px_hsl(var(--primary)/0.3)]",
                isCompleted && !isActive && "border-border bg-background/40",
                !isCompleted && !isActive && "border-border/50 bg-transparent opacity-50",
                isExpanded && "ring-1 ring-primary/30",
              )}
            >
              <div className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all",
                isActive ? "bg-primary text-primary-foreground animate-pulse" :
                isCompleted ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
              )}>
                <stage.icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-foreground">{stage.name}</span>
                  {isCompleted && timelineEntry && (
                    <span className="text-[10px] text-muted-foreground">{timelineEntry.duration_ms}ms</span>
                  )}
                </div>
                {isCompleted && timelineEntry && (
                  <p className="truncate text-[11px] text-muted-foreground">{timelineEntry.detail}</p>
                )}
              </div>
              {isCompleted && (
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              )}
              {isExpanded && (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
            </motion.div>

            {/* Connector arrow */}
            {idx < PIPELINE_STAGES.length - 1 && (
              <div className="flex justify-center py-0.5">
                <ChevronDown className={cn("h-3 w-3", isCompleted ? "text-primary/40" : "text-border")} />
              </div>
            )}

            {/* Expanded detail */}
            <AnimatePresence>
              {isExpanded && result && timelineEntry && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="ml-12 mb-2 rounded-md border border-border bg-background/60 p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-muted-foreground">Duration:</span>{" "}
                        <span className="font-medium text-foreground">{timelineEntry.duration_ms}ms</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status:</span>{" "}
                        <Badge variant="success" className="text-[9px]">{timelineEntry.status}</Badge>
                      </div>
                      {timelineEntry.rules_executed > 0 && (
                        <div>
                          <span className="text-muted-foreground">Rules:</span>{" "}
                          <span className="font-medium text-foreground">{timelineEntry.rules_executed}</span>
                        </div>
                      )}
                      {timelineEntry.features_generated > 0 && (
                        <div>
                          <span className="text-muted-foreground">Features:</span>{" "}
                          <span className="font-medium text-foreground">{timelineEntry.features_generated}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{timelineEntry.detail}</p>
                    {idx === 3 && result.domain_candidates.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-medium uppercase text-muted-foreground">Domain Candidates</p>
                        {result.domain_candidates.map((dc) => (
                          <div key={dc.domain} className="flex items-center justify-between text-[11px]">
                            <span className="text-foreground">{dc.domain}</span>
                            <Badge variant="muted" className="text-[9px]">{dc.candidate_rules} rules</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* Final decision badge */}
      {result && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-4"
        >
          <DecisionBanner decision={result.decision.decision} score={result.decision.coherence_score} confidence={result.decision.confidence} />
        </motion.div>
      )}
    </div>
  );
}

function DecisionBanner({ decision, score, confidence }: { decision: string; score: number; confidence: number }) {
  const colors = DECISION_COLORS[decision as keyof typeof DECISION_COLORS] || DECISION_COLORS.DENY;
  const Icon = colors.icon;
  return (
    <div className={cn("flex items-center gap-4 rounded-xl border-2 p-4", colors.bg, colors.border)}>
      <div className={cn("flex h-12 w-12 items-center justify-center rounded-full", colors.bg)}>
        <Icon className={cn("h-6 w-6", colors.text)} />
      </div>
      <div className="flex-1">
        <div className={cn("text-2xl font-bold tracking-tight", colors.text)}>{decision}</div>
        <p className="text-[11px] text-muted-foreground">
          Coherence Score: <span className="font-medium text-foreground">{score.toFixed(4)}</span>
          {" · "}Confidence: <span className="font-medium text-foreground">{(confidence * 100).toFixed(0)}%</span>
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Right Panel: Execution Details Tabs
// ---------------------------------------------------------------------------
const DETAIL_TABS: { id: DetailTab; label: string }[] = [
  { id: "raw", label: "Raw Input" },
  { id: "entities", label: "Extracted Fields" },
  { id: "rules", label: "Matched Rules" },
  { id: "signals", label: "Generated Signals" },
  { id: "features", label: "Generated Features" },
  { id: "domains", label: "Domain Scores" },
  { id: "decision", label: "Decision" },
  { id: "reasons", label: "Reason Codes" },
];

function ExecutionDetails({
  result, activeTab, setActiveTab,
}: {
  result: ValidationResult | null;
  activeTab: DetailTab;
  setActiveTab: (v: DetailTab) => void;
}) {
  if (!result) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-xs text-muted-foreground">Execution details will appear here after a validation run</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap gap-1 border-b border-border p-2">
        {DETAIL_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "rounded-md px-2 py-1 text-[11px] font-medium transition-all",
              activeTab === tab.id
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === "raw" && <RawInputTab result={result} />}
        {activeTab === "entities" && <EntitiesTab result={result} />}
        {activeTab === "rules" && <RulesTab result={result} />}
        {activeTab === "signals" && <SignalsTab result={result} />}
        {activeTab === "features" && <FeaturesTab result={result} />}
        {activeTab === "domains" && <DomainsTab result={result} />}
        {activeTab === "decision" && <DecisionTab result={result} />}
        {activeTab === "reasons" && <ReasonsTab result={result} />}
      </div>
    </div>
  );
}

function RawInputTab({ result }: { result: ValidationResult }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <Badge variant="muted" className="text-[9px]">{result.content_type}</Badge>
        <span>{result.raw_input.length} chars</span>
      </div>
      <pre className="max-h-[500px] overflow-auto rounded-md border border-border bg-background/60 p-3 font-mono text-[10px] leading-relaxed text-foreground">
        {result.raw_input}
      </pre>
    </div>
  );
}

function EntitiesTab({ result }: { result: ValidationResult }) {
  const entityIcons: Record<string, any> = {
    Customer: User, Account: User, Device: Smartphone, Browser: Globe,
    IP: Network, Carrier: Server, Country: MapPin, Location: MapPin,
    Credential: KeyRound, Transaction: CreditCard, Session: Activity,
  };
  return (
    <div className="space-y-1.5">
      {result.entities.map((e, i) => {
        const Icon = entityIcons[e.entity] || Activity;
        return (
          <div key={i} className="flex items-center gap-2 rounded-md border border-border bg-background/40 p-2">
            <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-foreground">{e.entity}</span>
                <Badge variant={e.confidence > 0.8 ? "success" : "warning"} className="text-[9px]">
                  {(e.confidence * 100).toFixed(0)}%
                </Badge>
              </div>
              <p className="truncate text-[10px] text-muted-foreground">{e.value}</p>
              <p className="text-[9px] text-muted-foreground/70">{e.source}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RulesTab({ result }: { result: ValidationResult }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="space-y-1.5">
      {result.matched_rules.map((rule) => {
        const isExpanded = expanded === rule.rule_id;
        return (
          <div key={rule.rule_id} className="rounded-md border border-border bg-background/40 overflow-hidden">
            <button
              onClick={() => setExpanded(isExpanded ? null : rule.rule_id)}
              className="flex w-full items-center gap-2 p-2 text-left hover:bg-accent/30"
            >
              {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[11px] font-medium text-foreground">{rule.rule_name}</span>
                  {rule.matched ? (
                    <Badge variant="destructive" className="text-[9px]">Matched</Badge>
                  ) : (
                    <Badge variant="muted" className="text-[9px]">Not Matched</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                  <span>{rule.primary_cluster}</span>
                  <span>·</span>
                  <span>{rule.execution_time_ms}ms</span>
                  <span>·</span>
                  <span>{(rule.confidence * 100).toFixed(0)}% conf</span>
                </div>
              </div>
            </button>
            {isExpanded && (
              <div className="border-t border-border p-2 space-y-2 bg-background/60">
                <div>
                  <p className="text-[9px] font-medium uppercase text-muted-foreground">Description</p>
                  <p className="text-[11px] text-foreground">{rule.description}</p>
                </div>
                <div>
                  <p className="text-[9px] font-medium uppercase text-muted-foreground">Parameters</p>
                  <div className="flex flex-wrap gap-1">
                    {rule.parameters.map((p) => (
                      <Badge key={p} variant="outline" className="text-[9px]">{p}</Badge>
                    ))}
                  </div>
                </div>
                {rule.thresholds.length > 0 && (
                  <div>
                    <p className="text-[9px] font-medium uppercase text-muted-foreground">Thresholds</p>
                    <div className="flex flex-wrap gap-1">
                      {rule.thresholds.map((t) => <Badge key={t} variant="warning" className="text-[9px]">{t}</Badge>)}
                    </div>
                  </div>
                )}
                {rule.matched_parameters.length > 0 && (
                  <div>
                    <p className="text-[9px] font-medium uppercase text-muted-foreground">Matched Fields</p>
                    <div className="flex flex-wrap gap-1">
                      {rule.matched_parameters.map((p) => (
                        <Badge key={p} variant="success" className="text-[9px]">{p}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-[9px] font-medium uppercase text-muted-foreground">
                    {rule.matched ? "Why it matched" : "Why it failed"}
                  </p>
                  <p className="text-[11px] text-foreground">{rule.reason}</p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SignalsTab({ result }: { result: ValidationResult }) {
  return (
    <div className="space-y-1.5">
      {result.signals.map((sig) => (
        <div key={sig.signal_id} className="rounded-md border border-border bg-background/40 p-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-3 w-3 text-warning" />
              <span className="text-[11px] font-medium text-foreground">{sig.label}</span>
            </div>
            <Badge variant={sig.confidence > 0.5 ? "destructive" : "warning"} className="text-[9px]">
              {(sig.confidence * 100).toFixed(0)}%
            </Badge>
          </div>
          <div className="mt-1 space-y-0.5">
            <p className="text-[9px] text-muted-foreground">{sig.signal_id}</p>
            {sig.derived_rules.length > 0 && (
              <p className="text-[9px] text-muted-foreground">
                Derived from: {sig.derived_rules.join(", ")}
              </p>
            )}
            {sig.keywords_matched.length > 0 && (
              <div className="flex flex-wrap gap-0.5">
                {sig.keywords_matched.map((kw) => (
                  <Badge key={kw} variant="muted" className="text-[8px]">{kw}</Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function FeaturesTab({ result }: { result: ValidationResult }) {
  return (
    <div className="space-y-1.5">
      {result.features.map((f) => (
        <div key={f.feature_name} className="rounded-md border border-border bg-background/40 p-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-foreground">{f.feature_name}</span>
            <Badge variant="default" className="text-[9px]">{f.value.toFixed(3)}</Badge>
          </div>
          <p className="text-[9px] text-muted-foreground">{f.domain}</p>
          <div className="mt-1 space-y-0.5">
            <p className="text-[9px] text-muted-foreground/70">Formula: {f.formula}</p>
            <p className="text-[9px] text-muted-foreground/70">Weight: {(f.weight * 100).toFixed(1)}% · Confidence: {(f.confidence * 100).toFixed(0)}%</p>
            {f.signals_used.length > 0 && (
              <p className="text-[9px] text-muted-foreground/70">Signals: {f.signals_used.join(", ")}</p>
            )}
            {f.rules_used.length > 0 && (
              <p className="text-[9px] text-muted-foreground/70">Rules: {f.rules_used.length} rule(s)</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function DomainsTab({ result }: { result: ValidationResult }) {
  const radarOption = {
    tooltip: { trigger: "item" as const },
    radar: {
      indicator: result.domain_scores.map((d) => ({ name: d.domain.replace(" Intelligence", ""), max: 1 })),
      radius: "65%",
      axisName: { color: "hsl(215, 16%, 47%)", fontSize: 9 },
      splitArea: { areaStyle: { color: ["rgba(199,89,48,0.03)", "rgba(199,89,48,0.06)"] } },
    },
    series: [{
      type: "radar" as const,
      data: [{
        value: result.domain_scores.map((d) => d.score),
        name: "Domain Scores",
        areaStyle: { color: "rgba(199,89,48,0.2)" },
        lineStyle: { color: "hsl(199, 89%, 52%)", width: 2 },
        itemStyle: { color: "hsl(199, 89%, 52%)" },
      }],
    }],
  };

  return (
    <div className="space-y-3">
      <div className="h-[220px]">
        <EChart option={radarOption} />
      </div>
      {result.domain_scores.map((d) => (
        <div key={d.domain} className="rounded-md border border-border bg-background/40 p-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-foreground">{d.domain}</span>
            <Badge variant={d.score > 0.7 ? "success" : d.score > 0.5 ? "warning" : "destructive"} className="text-[9px]">
              {d.score.toFixed(3)}
            </Badge>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${d.score * 100}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className={cn(
                "h-full rounded-full",
                d.score > 0.7 ? "bg-success" : d.score > 0.5 ? "bg-warning" : "bg-destructive",
              )}
            />
          </div>
          <p className="mt-1 text-[9px] text-muted-foreground">
            Weight: {(d.weight * 100).toFixed(0)}% · Feature: {d.feature} · Active signals: {d.active_signals}
          </p>
        </div>
      ))}
    </div>
  );
}

function DecisionTab({ result }: { result: ValidationResult }) {
  const { decision } = result;
  const colors = DECISION_COLORS[decision.decision];
  const Icon = colors.icon;

  return (
    <div className="space-y-3">
      <div className={cn("rounded-xl border-2 p-4 text-center", colors.bg, colors.border)}>
        <Icon className={cn("mx-auto h-10 w-10", colors.text)} />
        <div className={cn("mt-2 text-2xl font-bold", colors.text)}>{decision.decision}</div>
        <p className="text-[11px] text-muted-foreground">
          Risk Level: <span className="font-medium text-foreground">{decision.risk_level}</span>
        </p>
      </div>

      {/* Coherence Brain calculation */}
      <div className="rounded-md border border-border bg-background/40 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-semibold text-foreground">Coherence Brain Calculation</span>
        </div>
        <div className="space-y-1">
          {result.coherence.contributions.map((c) => (
            <div key={c.domain} className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground">{c.domain}</span>
              <span className="font-mono text-foreground">{c.formula} = {c.contribution.toFixed(4)}</span>
            </div>
          ))}
          <div className="border-t border-border pt-1 flex items-center justify-between">
            <span className="text-[11px] font-bold text-foreground">Final Coherence Score</span>
            <span className="font-mono text-[13px] font-bold text-primary">{result.coherence.coherence_score.toFixed(4)}</span>
          </div>
        </div>
      </div>

      {/* Decision Path */}
      <div className="rounded-md border border-border bg-background/40 p-3">
        <p className="text-[11px] font-semibold text-foreground mb-2">Decision Path</p>
        <div className="space-y-1">
          {decision.decision_path.map((step, i) => (
            <div key={i} className="flex items-start gap-2 text-[10px]">
              <span className="font-mono text-primary shrink-0">{i + 1}.</span>
              <span className="text-muted-foreground">{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Contributors */}
      <div className="rounded-md border border-border bg-background/40 p-3">
        <p className="text-[11px] font-semibold text-foreground mb-2">Top Contributors (Lowest Domains)</p>
        <div className="space-y-1">
          {decision.top_contributors.map((c) => (
            <div key={c.domain} className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground">{c.domain}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-foreground">{c.score.toFixed(3)}</span>
                <Badge variant="muted" className="text-[8px]">{(c.weight * 100).toFixed(0)}%</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Explainability */}
      <div className="rounded-md border border-border bg-background/40 p-3 space-y-2">
        <p className="text-[11px] font-semibold text-foreground">Explainability</p>
        <div>
          <p className="text-[9px] font-medium uppercase text-muted-foreground">Top Triggered Rules</p>
          {decision.top_triggered_rules.map((r) => (
            <p key={r.rule_id} className="text-[10px] text-foreground">{r.rule_name}</p>
          ))}
        </div>
        <div>
          <p className="text-[9px] font-medium uppercase text-muted-foreground">Top Signals</p>
          <div className="flex flex-wrap gap-1">
            {decision.top_signals.map((s) => (
              <Badge key={s.signal_id} variant="warning" className="text-[9px]">{s.label}</Badge>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[9px] font-medium uppercase text-muted-foreground">Top Features</p>
          {decision.top_features.map((f) => (
            <p key={f.feature_name} className="text-[10px] text-foreground">
              {f.feature_name}: {f.value.toFixed(3)}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReasonsTab({ result }: { result: ValidationResult }) {
  return (
    <div className="space-y-1.5">
      {result.decision.reason_codes.map((rc, i) => (
        <div key={i} className="rounded-md border border-border bg-background/40 p-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[9px] font-mono">{rc.code}</Badge>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{rc.description}</p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bottom Panel: Timeline
// ---------------------------------------------------------------------------
function TimelinePanel({ result }: { result: ValidationResult | null }) {
  if (!result) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-xs text-muted-foreground">Timeline will appear here after validation</p>
      </div>
    );
  }

  return (
    <div className="p-3">
      <div className="mb-2 flex items-center gap-2">
        <Clock className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] font-semibold text-foreground">Execution Timeline</span>
        <Badge variant="muted" className="text-[9px]">{result.performance.pipeline_duration_ms}ms total</Badge>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {result.timeline.map((entry, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="min-w-[180px] shrink-0 rounded-md border border-border bg-background/40 p-2"
          >
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-success" />
              <span className="text-[10px] font-medium text-foreground">{entry.stage}</span>
            </div>
            <div className="mt-1 space-y-0.5 text-[9px] text-muted-foreground">
              <div>Duration: <span className="font-mono text-foreground">{entry.duration_ms}ms</span></div>
              <div>Status: <Badge variant="success" className="text-[8px]">{entry.status}</Badge></div>
              {entry.rules_executed > 0 && <div>Rules: {entry.rules_executed}</div>}
              {entry.features_generated > 0 && <div>Features: {entry.features_generated}</div>}
            </div>
            <p className="mt-1 text-[9px] text-muted-foreground/70 truncate">{entry.detail}</p>
          </motion.div>
        ))}
      </div>

      {/* Performance stats */}
      <div className="mt-2 flex flex-wrap gap-3 border-t border-border pt-2">
        <PerfStat label="Execution Time" value={`${result.performance.execution_time_ms}ms`} />
        <PerfStat label="Rules Evaluated" value={result.performance.rules_evaluated} />
        <PerfStat label="Rules Matched" value={result.performance.rules_matched} />
        <PerfStat label="Signals Generated" value={result.performance.signals_generated} />
        <PerfStat label="Features Generated" value={result.performance.features_generated} />
        <PerfStat label="Avg Rule Time" value={`${result.performance.average_rule_time_ms}ms`} />
        <PerfStat label="Pipeline Duration" value={`${result.performance.pipeline_duration_ms}ms`} />
      </div>
    </div>
  );
}

function PerfStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}:</span>
      <span className="text-[11px] font-medium text-foreground">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// History Modal
// ---------------------------------------------------------------------------
function HistoryModal({
  open, onClose, history, onSelect,
}: {
  open: boolean;
  onClose: () => void;
  history: HistoryEntry[];
  onSelect: (id: string) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} className="max-w-2xl">
      <div className="p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Validation History</h3>
        {history.length === 0 ? (
          <p className="text-xs text-muted-foreground py-8 text-center">No validations run yet</p>
        ) : (
          <div className="max-h-[400px] space-y-1.5 overflow-y-auto">
            {history.map((h) => {
              const colors = DECISION_COLORS[h.decision as keyof typeof DECISION_COLORS] || DECISION_COLORS.DENY;
              return (
                <button
                  key={h.session_id}
                  onClick={() => onSelect(h.session_id)}
                  className="flex w-full items-center gap-3 rounded-md border border-border bg-background/40 p-2 text-left hover:border-primary/30 hover:bg-primary/5"
                >
                  <Badge variant={h.decision === "ALLOW" ? "success" : h.decision === "CHALLENGE" ? "warning" : "destructive"} className="text-[9px]">
                    {h.decision}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-medium text-foreground">{h.customer_id}</span>
                    <span className="text-[9px] text-muted-foreground ml-2">{h.session_id}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-mono text-foreground">{h.coherence_score.toFixed(4)}</div>
                    <div className="text-[9px] text-muted-foreground">{h.execution_time_ms}ms</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Compare Modal
// ---------------------------------------------------------------------------
function CompareModal({
  open, onClose, history, compareA, setCompareA, compareB, setCompareB, onCompare, compareResult,
}: {
  open: boolean;
  onClose: () => void;
  history: HistoryEntry[];
  compareA: string | null;
  setCompareA: (v: string | null) => void;
  compareB: string | null;
  setCompareB: (v: string | null) => void;
  onCompare: () => void;
  compareResult: { a: ValidationResult; b: ValidationResult } | null;
}) {
  return (
    <Modal open={open} onClose={onClose} className="max-w-4xl">
      <div className="p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Compare Sessions</h3>
        <div className="flex items-center gap-3 mb-3">
          <select
            value={compareA || ""}
            onChange={(e) => setCompareA(e.target.value || null)}
            className="flex-1 rounded-md border border-input bg-background/40 px-2 py-1.5 text-[11px] text-foreground"
          >
            <option value="">Select Session A...</option>
            {history.map((h) => <option key={h.session_id} value={h.session_id}>{h.session_id} ({h.customer_id})</option>)}
          </select>
          <GitCompare className="h-4 w-4 text-muted-foreground" />
          <select
            value={compareB || ""}
            onChange={(e) => setCompareB(e.target.value || null)}
            className="flex-1 rounded-md border border-input bg-background/40 px-2 py-1.5 text-[11px] text-foreground"
          >
            <option value="">Select Session B...</option>
            {history.map((h) => <option key={h.session_id} value={h.session_id}>{h.session_id} ({h.customer_id})</option>)}
          </select>
          <Button size="sm" onClick={onCompare} disabled={!compareA || !compareB}>Compare</Button>
        </div>

        {compareResult && (
          <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
            <CompareColumn label="Session A" result={compareResult.a} />
            <CompareColumn label="Session B" result={compareResult.b} />
            <div className="col-span-2">
              <CompareDiff a={compareResult.a} b={compareResult.b} />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function CompareColumn({ label, result }: { label: string; result: ValidationResult }) {
  const colors = DECISION_COLORS[result.decision.decision as keyof typeof DECISION_COLORS] || DECISION_COLORS.DENY;
  return (
    <div className="rounded-md border border-border bg-background/40 p-3 space-y-2">
      <p className="text-[11px] font-semibold text-foreground">{label}</p>
      <div className={cn("rounded-md border p-2 text-center", colors.bg, colors.border)}>
        <span className={cn("text-lg font-bold", colors.text)}>{result.decision.decision}</span>
        <p className="text-[9px] text-muted-foreground">Score: {result.coherence.coherence_score.toFixed(4)}</p>
      </div>
      <div className="space-y-1 text-[10px]">
        <div className="flex justify-between"><span className="text-muted-foreground">Rules Matched</span><span className="text-foreground">{result.performance.rules_matched}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Signals</span><span className="text-foreground">{result.performance.signals_generated}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Features</span><span className="text-foreground">{result.performance.features_generated}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span className="text-foreground">{result.performance.execution_time_ms}ms</span></div>
      </div>
      <div>
        <p className="text-[9px] font-medium uppercase text-muted-foreground">Signals</p>
        <div className="flex flex-wrap gap-0.5">
          {result.signals.map((s) => <Badge key={s.signal_id} variant="warning" className="text-[8px]">{s.label}</Badge>)}
        </div>
      </div>
    </div>
  );
}

function CompareDiff({ a, b }: { a: ValidationResult; b: ValidationResult }) {
  const rulesA = new Set(a.matched_rules.filter(r => r.matched).map(r => r.rule_id));
  const rulesB = new Set(b.matched_rules.filter(r => r.matched).map(r => r.rule_id));
  const sigsA = new Set(a.signals.map(s => s.signal_id));
  const sigsB = new Set(b.signals.map(s => s.signal_id));
  const diffRules = [...new Set([...rulesA, ...rulesB])].filter(r => rulesA.has(r) !== rulesB.has(r));
  const diffSigs = [...new Set([...sigsA, ...sigsB])].filter(s => sigsA.has(s) !== sigsB.has(s));
  const diffDecision = a.decision.decision !== b.decision.decision;

  return (
    <div className="rounded-md border border-border bg-background/40 p-3 space-y-2">
      <p className="text-[11px] font-semibold text-foreground">Differences</p>
      {diffDecision && (
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-3 w-3 text-warning" />
          <span className="text-[10px] text-foreground">Decision differs: {a.decision.decision} vs {b.decision.decision}</span>
        </div>
      )}
      {diffRules.length > 0 && (
        <div>
          <p className="text-[9px] font-medium uppercase text-muted-foreground">Different Rules</p>
          {diffRules.map(r => {
            const inA = rulesA.has(r);
            return (
              <p key={r} className="text-[10px] text-foreground">
                {r}: {inA ? "A only" : "B only"}
              </p>
            );
          })}
        </div>
      )}
      {diffSigs.length > 0 && (
        <div>
          <p className="text-[9px] font-medium uppercase text-muted-foreground">Different Signals</p>
          <div className="flex flex-wrap gap-0.5">
            {diffSigs.map(s => {
              const inA = sigsA.has(s);
              return <Badge key={s} variant="outline" className="text-[8px]">{s}: {inA ? "A" : "B"}</Badge>;
            })}
          </div>
        </div>
      )}
      {!diffDecision && diffRules.length === 0 && diffSigs.length === 0 && (
        <p className="text-[10px] text-muted-foreground">No differences detected</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// React Flow Graph Modal
// ---------------------------------------------------------------------------
function FlowGraphModal({ open, onClose, result }: { open: boolean; onClose: () => void; result: ValidationResult | null }) {
  if (!result) return null;

  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let yPos = 0;

  // Session node
  nodes.push({
    id: "session",
    data: { label: `Session: ${result.session.session_id}` },
    position: { x: 250, y: yPos },
    style: { background: "hsl(199, 89%, 52%)", color: "white", borderRadius: 8, padding: 8, fontSize: 11 },
  sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
  });

  // Rules
  yPos += 80;
  const matchedRules = result.matched_rules.filter(r => r.matched).slice(0, 6);
  matchedRules.forEach((r, i) => {
    const id = `rule-${r.rule_id}`;
    nodes.push({
      id,
      data: { label: r.rule_name.slice(0, 30) },
      position: { x: 100 + i * 120, y: yPos },
      style: { background: "hsl(0, 72%, 56%)", color: "white", borderRadius: 6, padding: 6, fontSize: 9 },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    });
    edges.push({ id: `e-session-${id}`, source: "session", target: id, animated: true });
  });

  // Signals
  yPos += 80;
  result.signals.slice(0, 6).forEach((s, i) => {
    const id = `signal-${s.signal_id}`;
    nodes.push({
      id,
      data: { label: s.label },
      position: { x: 100 + i * 120, y: yPos },
      style: { background: "hsl(38, 92%, 54%)", color: "white", borderRadius: 6, padding: 6, fontSize: 9 },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    });
    edges.push({ id: `e-rules-${id}`, source: matchedRules[0]?.rule_id ? `rule-${matchedRules[0].rule_id}` : "session", target: id, animated: true });
  });

  // Features
  yPos += 80;
  result.features.forEach((f, i) => {
    const id = `feature-${f.feature_name}`;
    nodes.push({
      id,
      data: { label: f.feature_name },
      position: { x: 50 + i * 130, y: yPos },
      style: { background: "hsl(142, 71%, 48%)", color: "white", borderRadius: 6, padding: 6, fontSize: 9 },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    });
  });

  // Domain scores
  yPos += 80;
  result.domain_scores.forEach((d, i) => {
    const id = `domain-${d.domain}`;
    nodes.push({
      id,
      data: { label: `${d.domain.replace(" Intelligence", "")}: ${d.score.toFixed(2)}` },
      position: { x: 50 + i * 130, y: yPos },
      style: { background: "hsl(262, 83%, 62%)", color: "white", borderRadius: 6, padding: 6, fontSize: 9 },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    });
  });

  // Coherence brain
  yPos += 80;
  nodes.push({
    id: "coherence",
    data: { label: `Coherence: ${result.coherence.coherence_score.toFixed(4)}` },
    position: { x: 250, y: yPos },
    style: { background: "hsl(199, 89%, 52%)", color: "white", borderRadius: 8, padding: 8, fontSize: 11 },
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
  });

  // Decision
  yPos += 80;
  const decColors = DECISION_COLORS[result.decision.decision as keyof typeof DECISION_COLORS] || DECISION_COLORS.DENY;
  nodes.push({
    id: "decision",
    data: { label: result.decision.decision },
    position: { x: 250, y: yPos },
    style: { background: result.decision.decision === "ALLOW" ? "hsl(142, 71%, 48%)" : result.decision.decision === "CHALLENGE" ? "hsl(38, 92%, 54%)" : "hsl(0, 72%, 56%)", color: "white", borderRadius: 8, padding: 10, fontSize: 14, fontWeight: "bold" },
    targetPosition: Position.Top,
  });
  edges.push({ id: "e-coherence-decision", source: "coherence", target: "decision", animated: true });

  return (
    <Modal open={open} onClose={onClose} className="max-w-5xl">
      <div className="p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Validation Flow Graph</h3>
        <div style={{ height: 500 }} className="rounded-md border border-border bg-background/40">
          <ReactFlow nodes={nodes} edges={edges} fitView>
            <Background color="hsl(214, 32%, 91%)" gap={16} />
            <Controls />
          </ReactFlow>
        </div>
      </div>
    </Modal>
  );
}
