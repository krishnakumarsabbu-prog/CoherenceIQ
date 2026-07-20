import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Code as Code2, FileJson, SquareFunction as FunctionSquare, Play, CircleCheck as CheckCircle2, TriangleAlert as AlertTriangle, Circle as XCircle, GitBranch, Clock, Check, X, ArrowUpRight, History, FlaskConical, ShieldCheck, PanelRightClose } from "lucide-react";
import { type RiskRule, type TreeNode, type ConditionNode, type GroupNode, OPERATORS } from "@/lib/ruleStudioData";
import { CodeEditor } from "./CodeEditor";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./RuleStudioTabs";

function isGroup(n?: TreeNode | null): n is GroupNode { return Boolean(n && typeof n === "object" && "op" in n); }

function nodeToExpression(n?: TreeNode | null): string {
  if (!n) return "";
  if (isGroup(n)) {
    const kids = (n.children ?? []).map(nodeToExpression);
    const body = kids.join(` ${n.op} `);
    const wrapped = kids.length > 1 ? `(${body})` : body;
    return n.negated ? `NOT ${wrapped}` : wrapped;
  }
  const op = OPERATORS.find((o) => o.value === n.op);
  const sym = op?.symbol ?? n.op ?? "";
  if (n.op === "is_true") return `$${n.variable ?? ""}`;
  if (n.op === "is_false") return `!$${n.variable ?? ""}`;
  const val = n.value ?? "";
  return `$${n.variable ?? ""} ${sym} ${/^[a-zA-Z0-9_.\-]+$/.test(val) ? val : `"${val}"`}`;
}

function nodeToJson(n?: TreeNode | null, indent = 2): string {
  if (!n) return "{}";
  const pad = " ".repeat(indent);
  const pad2 = " ".repeat(indent + 2);
  if (isGroup(n)) {
    const inner = (n.children ?? []).map((c) => nodeToJson(c, indent + 2)).join(",\n");
    return `${pad}{\n${pad2}"type": "${n.negated ? "not_" : ""}${(n.op ?? "AND").toLowerCase()}",\n${pad2}"children": [\n${inner}\n${pad2}]\n${pad}}`;
  }
  return `${pad}{\n${pad2}"variable": "${n.variable ?? ""}",\n${pad2}"op": "${n.op ?? ""}",\n${pad2}"value": ${JSON.stringify(n.value ?? "")},\n${pad2}"plugin": "${n.plugin ?? ""}"\n${pad}}`;
}

function ruleToJson(rule?: RiskRule | null): string {
  if (!rule) return "{}";
  const actions = (rule.actions ?? []).map((a) => `    { "kind": "${a.kind}", "amount": ${a.amount ?? "null"}, "reason": ${JSON.stringify(a.reason ?? "")} }`).join(",\n");
  return `{\n  "id": "${rule.id ?? ""}",\n  "name": ${JSON.stringify(rule.name ?? "")},\n  "version": ${rule.version ?? 1},\n  "status": "${rule.status ?? "Draft"}",\n  "tier": "${rule.tier ?? ""}",\n  "root":\n${nodeToJson(rule.root, 4)},\n  "actions": [\n${actions}\n  ]\n}`;
}

function ruleToExpression(rule?: RiskRule | null): string {
  if (!rule) return "";
  const acts = (rule.actions ?? []).map((a) => `  → ${a.kind}${a.amount ? ` +${a.amount}` : ""}${a.reason ? `  // ${a.reason}` : ""}`).join("\n");
  return `// ${rule.name ?? "Rule"} (v${rule.version ?? 1})\nif ${nodeToExpression(rule.root)} {\n${acts}\n}`;
}

interface ValidationItem { level: "ok" | "warn" | "error"; message: string }

function validateRule(rule?: RiskRule | null): ValidationItem[] {
  const items: ValidationItem[] = [];
  if (!rule) return items;
  if (!rule.name?.trim()) items.push({ level: "error", message: "Rule name is empty." });
  let conds = 0, emptyGroups = 0;
  const walk = (n?: TreeNode | null) => {
    if (!n) return;
    if (isGroup(n)) {
      const kids = n.children ?? [];
      if (kids.length === 0) emptyGroups++;
      kids.forEach(walk);
    }
    else { conds++; if (!n.value && n.op !== "is_true" && n.op !== "is_false") items.push({ level: "warn", message: `Condition on ${n.variable} has no value.` }); }
  };
  walk(rule.root);
  if (emptyGroups) items.push({ level: "warn", message: `${emptyGroups} empty group(s) will match nothing.` });
  if (conds === 0) items.push({ level: "error", message: "Rule has no conditions." });
  const actions = rule.actions ?? [];
  if (actions.length === 0) items.push({ level: "error", message: "Rule has no actions." });
  if (actions.some((a) => (a.kind === "Risk Increase" || a.kind === "Risk Reduction") && (!a.amount || a.amount <= 0))) {
    items.push({ level: "warn", message: "A risk adjustment action has no amount." });
  }
  if (items.length === 0) items.push({ level: "ok", message: "Rule is valid and ready for simulation." });
  return items;
}

function runSimulation(rule?: RiskRule | null): { label: string; value: string; tone: string }[] {
  if (!rule || !rule.simulation) return [];
  const s = rule.simulation;
  const samples = s.samples ?? 0;
  const flagged = s.flagged ?? 0;
  const failed = s.failed ?? 0;
  const matchRate = samples > 0 ? ((flagged / samples) * 100).toFixed(2) : "0.00";
  const precision = (flagged + failed) > 0 ? ((flagged / (flagged + failed)) * 100).toFixed(1) : "0.0";
  return [
    { label: "Sessions sampled", value: samples.toLocaleString(), tone: "text-foreground" },
    { label: "Rule matched", value: flagged.toLocaleString(), tone: "text-primary" },
    { label: "Match rate", value: `${matchRate}%`, tone: "text-primary" },
    { label: "Correctly blocked", value: flagged.toLocaleString(), tone: "text-success" },
    { label: "False positives", value: failed.toLocaleString(), tone: "text-warning" },
    { label: "Precision", value: `${precision}%`, tone: "text-success" },
  ];
}

interface Props {
  rule: RiskRule;
  onPublish: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onCollapse?: () => void;
}

export function RuleEditor({ rule, onPublish, onApprove, onReject, onCollapse }: Props) {
  const [tab, setTab] = useState<"design" | "json" | "expression" | "simulation" | "validation" | "versions" | "approval">("design");
  const [jsonValue, setJsonValue] = useState(() => ruleToJson(rule));
  const [running, setRunning] = useState(false);
  const sim = useMemo(() => runSimulation(rule), [rule]);
  const validations = useMemo(() => validateRule(rule), [rule]);

  useEffect(() => {
    setJsonValue(ruleToJson(rule));
  }, [rule]);

  const tabs = [
    { id: "design" as const, label: "Design", icon: Code2 },
    { id: "json" as const, label: "JSON View", icon: FileJson },
    { id: "expression" as const, label: "Expression", icon: FunctionSquare },
    { id: "simulation" as const, label: "Simulation", icon: FlaskConical },
    { id: "validation" as const, label: "Validation", icon: CheckCircle2 },
    { id: "versions" as const, label: "Version History", icon: GitBranch },
    { id: "approval" as const, label: "Approval Workflow", icon: ShieldCheck },
  ];

  const versions = rule?.versions ?? [];
  const approvals = rule?.approvals ?? [];

  return (
    <div className="flex h-full flex-col">
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
          <TabsList>
            {tabs.map((t) => (
              <TabsTrigger key={t.id} value={t.id}><t.icon className="h-3.5 w-3.5" /> {t.label}</TabsTrigger>
            ))}
          </TabsList>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setRunning(true)}>
              <Play className="h-3.5 w-3.5" /> {running ? "Simulating…" : "Run"}
            </Button>
            <Button size="sm" onClick={onPublish} disabled={rule?.status === "Published"}>
              <ArrowUpRight className="h-3.5 w-3.5" /> {rule?.status === "Published" ? "Published" : "Publish"}
            </Button>
            {onCollapse && (
              <Button variant="ghost" size="icon-sm" onClick={onCollapse} title="Collapse Panel to Right">
                <PanelRightClose className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="design">
          <Card><CardContent className="p-0">
            <div className="border-b border-border bg-muted/30 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Rule definition</div>
            <div className="p-4">
              <CodeEditor value={jsonValue} onChange={setJsonValue} language="json" readOnly minHeight={420} />
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="json">
          <CodeEditor value={jsonValue} onChange={setJsonValue} language="json" className="h-full" minHeight={480} />
        </TabsContent>

        <TabsContent value="expression">
          <CodeEditor value={ruleToExpression(rule)} language="expression" readOnly className="h-full" minHeight={480} />
        </TabsContent>

        <TabsContent value="simulation">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {sim.map((m, i) => (
              <motion.div key={m.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card><CardContent className="p-4">
                  <div className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">{m.label}</div>
                  <div className={cn("mt-1 text-2xl font-bold tabular-nums", m.tone)}>{m.value}</div>
                </CardContent></Card>
              </motion.div>
            ))}
          </div>
          <Card className="mt-3">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center gap-2"><FlaskConical className="h-4 w-4 text-primary" /><span className="text-[13px] font-semibold">Simulation trace (last 90 days)</span></div>
              <SimTrace />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="validation">
          <div className="space-y-2">
            {validations.map((v, i) => {
              const Icon = v.level === "ok" ? CheckCircle2 : v.level === "warn" ? AlertTriangle : XCircle;
              const tone = v.level === "ok" ? "text-success" : v.level === "warn" ? "text-warning" : "text-destructive";
              const ring = v.level === "ok" ? "border-success/30 bg-success/5" : v.level === "warn" ? "border-warning/30 bg-warning/5" : "border-destructive/30 bg-destructive/5";
              return (
                <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className={cn("flex items-center gap-3 rounded-lg border px-4 py-2.5", ring)}>
                  <Icon className={cn("h-4 w-4 shrink-0", tone)} />
                  <span className="text-[12.5px] text-foreground">{v.message}</span>
                  <Badge variant="muted" className="ml-auto uppercase">{v.level}</Badge>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="versions">
          <Card><CardContent className="p-0">
            <div className="divide-y divide-border">
              {versions.map((v, i) => (
                <motion.div key={v.version} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="flex items-center gap-4 px-4 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 font-mono text-[12px] font-bold text-primary">v{v.version}</div>
                  <div className="flex-1">
                    <div className="text-[13px] font-medium text-foreground">{v.change}</div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><History className="h-3 w-3" /> {v.author}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {v.date}</span>
                    </div>
                  </div>
                  <Badge variant={v.status === "Published" ? "success" : v.status === "Archived" ? "muted" : "warning"}>{v.status}</Badge>
                  {v.status !== "Published" && <Button variant="ghost" size="sm" className="h-7"><GitBranch className="h-3.5 w-3.5" /> Diff</Button>}
                </motion.div>
              ))}
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="approval">
          <div className="space-y-2">
            {approvals.map((a, i) => {
              const Icon = a.status === "Approved" ? Check : a.status === "Rejected" ? X : Clock;
              const tone = a.status === "Approved" ? "text-success" : a.status === "Rejected" ? "text-destructive" : "text-muted-foreground";
              const ring = a.status === "Approved" ? "border-success/30 bg-success/5" : a.status === "Rejected" ? "border-destructive/30 bg-destructive/5" : "border-border bg-background/40";
              const isPending = a.status === "Pending";
              return (
                <motion.div key={a.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className={cn("flex items-center gap-3 rounded-lg border px-4 py-3", ring)}>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground/5">
                    <Icon className={cn("h-4 w-4", tone)} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-foreground">{a.step}</span>
                      <Badge variant={a.status === "Approved" ? "success" : a.status === "Rejected" ? "destructive" : "muted"}>{a.status}</Badge>
                    </div>
                    <div className="text-[11.5px] text-muted-foreground">{a.approver} · {a.role}{a.date ? ` · ${a.date}` : ""}</div>
                    {a.comment && <div className="mt-1 text-[12px] italic text-muted-foreground">"{a.comment}"</div>}
                  </div>
                  {isPending && (
                    <div className="flex items-center gap-1.5">
                      <Button variant="outline" size="sm" className="h-7 border-success/40 text-success hover:bg-success/10" onClick={() => onApprove(a.id)}><Check className="h-3.5 w-3.5" /> Approve</Button>
                      <Button variant="outline" size="sm" className="h-7 border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => onReject(a.id)}><X className="h-3.5 w-3.5" /> Reject</Button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SimTrace() {
  const rows = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => {
      const matched = i % 3 !== 0;
      const correct = i % 5 !== 0;
      return { id: `S-${10000 - i * 7}`, risk: 30 + ((i * 17) % 65), matched, correct, decision: matched ? (i % 2 ? "Block" : "Challenge") : "Allow" };
    });
  }, []);
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="grid grid-cols-[120px_80px_90px_90px_90px_1fr] bg-muted/30 px-3 py-2 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>Session</span><span>Risk</span><span>Matched</span><span>Expected</span><span>Result</span><span>Note</span>
      </div>
      {rows.map((r) => (
        <div key={r.id} className="grid grid-cols-[120px_80px_90px_90px_90px_1fr] items-center border-t border-border/60 px-3 py-2 text-[12px]">
          <span className="font-mono text-primary">{r.id}</span>
          <span className={cn("tabular-nums font-semibold", r.risk >= 75 ? "text-destructive" : r.risk >= 45 ? "text-warning" : "text-success")}>{r.risk}</span>
          <span className={r.matched ? "text-primary" : "text-muted-foreground"}>{r.matched ? "yes" : "no"}</span>
          <span className="text-muted-foreground">{r.correct ? "yes" : "no"}</span>
          <span>{r.decision}</span>
          <span className={cn("text-[11px]", r.matched && !r.correct ? "text-warning" : "text-muted-foreground")}>
            {r.matched && !r.correct ? "False positive — rule over-triggered" : r.matched ? "Correctly flagged" : "Not matched (expected)"}
          </span>
        </div>
      ))}
    </div>
  );
}
