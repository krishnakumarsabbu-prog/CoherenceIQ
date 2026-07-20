import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Gavel, Puzzle, Settings, Plus, Search, GitBranch, ShieldCheck, Filter, CircleCheck as CheckCircle2, Clock, TriangleAlert as AlertTriangle, Circle as XCircle, Play, Sparkles, PanelRightClose, PanelRightOpen, Code as Code2 } from "lucide-react";
import { SEED_RULES, type RiskRule, type RuleStatus, uid, type GroupNode, type ConditionNode, type RuleAction, type ActionKind } from "@/lib/ruleStudioData";
import { cn, relativeTime } from "@/lib/utils";
import { PageHeader } from "@/components/shell/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ResizablePanels } from "@/components/shell/ResizablePanels";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/rulestudio/RuleStudioTabs";
import { RuleBuilder } from "@/components/rulestudio/RuleBuilder";
import { RuleEditor } from "@/components/rulestudio/RuleEditor";
import { PluginMarketplace } from "@/components/rulestudio/PluginMarketplace";
import { Administration } from "@/components/rulestudio/Administration";

type StudioTab = "studio" | "plugins" | "admin";

const STATUS_TONE: Record<RuleStatus, "success" | "warning" | "default" | "muted" | "destructive"> = {
  Published: "success",
  "In Review": "warning",
  Approved: "default",
  Draft: "muted",
  Archived: "muted",
  Rejected: "destructive",
};
const STATUS_ICON: Record<RuleStatus, React.ElementType> = {
  Published: CheckCircle2,
  "In Review": Clock,
  Approved: CheckCircle2,
  Draft: GitBranch,
  Archived: Clock,
  Rejected: XCircle,
};
const TIER_TONE: Record<string, "destructive" | "warning" | "default" | "muted"> = {
  Critical: "destructive",
  High: "warning",
  Medium: "default",
  Low: "muted",
};

function freshRule(): RiskRule {
  const root: GroupNode = { id: uid("g"), op: "AND", negated: false, children: [
    { id: uid("c"), variable: "session.riskScore", op: "greater_than", value: "60", plugin: "Coherence Brain" } as ConditionNode,
  ] };
  const actions: RuleAction[] = [{ id: uid("a"), kind: "Challenge" as ActionKind, reason: "Step-up required" }];
  return {
    id: `R-${Math.floor(100 + Math.random() * 900)}`,
    name: "Untitled Rule",
    description: "New risk rule draft.",
    status: "Draft",
    tier: "Medium",
    channel: "All",
    owner: "Maya Chen",
    updated: new Date().toISOString(),
    version: 1,
    root,
    actions,
    versions: [{ version: 1, author: "Maya Chen", date: new Date().toISOString().slice(0, 10), change: "Created draft", status: "Draft" }],
    approvals: [{ id: uid("ap"), step: "Author Review", approver: "Maya Chen", role: "Rule Author", status: "Pending", date: null, comment: "" }],
    simulation: { passed: 0, failed: 0, flagged: 0, samples: 0 },
    tags: [],
  };
}

export function RuleStudioPage() {
  const { pathname } = useLocation();
  const initialTab: StudioTab = pathname.startsWith("/admin") ? "admin" : pathname.startsWith("/plugins") ? "plugins" : "studio";
  const [tab, setTab] = useState<StudioTab>(initialTab);
  const [rules, setRules] = useState<RiskRule[]>(SEED_RULES);
  const [activeId, setActiveId] = useState<string>(SEED_RULES[0].id);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<RuleStatus | "All">("All");
  const [editorCollapsed, setEditorCollapsed] = useState(false);

  const active = useMemo(() => rules.find((r) => r.id === activeId) ?? rules[0] ?? freshRule(), [rules, activeId]);
  const filtered = useMemo(() => rules.filter((r) =>
    (statusFilter === "All" || r.status === statusFilter) &&
    ((r.name ?? "").toLowerCase().includes(q.toLowerCase()) || (r.id ?? "").toLowerCase().includes(q.toLowerCase()) || (r.owner ?? "").toLowerCase().includes(q.toLowerCase())),
  ), [rules, q, statusFilter]);

  const updateRule = (next: RiskRule) => {
    setRules((prev) => prev.map((r) => r.id === next.id ? { ...next, updated: new Date().toISOString() } : r));
  };
  const createRule = () => {
    const r = freshRule();
    setRules((prev) => [r, ...prev]);
    setActiveId(r.id);
    setTab("studio");
  };
  const publishRule = () => {
    if (!active) return;
    const versions = active.versions ?? [];
    updateRule({
      ...active,
      status: "Published",
      version: (active.version ?? 1) + 1,
      versions: [
        { version: (active.version ?? 1) + 1, author: active.owner ?? "User", date: new Date().toISOString().slice(0, 10), change: "Published to production", status: "Published" },
        ...versions,
      ],
    });
  };
  const approveStep = (id: string) => {
    if (!active) return;
    updateRule({
      ...active,
      approvals: (active.approvals ?? []).map((a) => a.id === id ? { ...a, status: "Approved", date: new Date().toISOString().slice(0, 10) } : a),
    });
  };
  const rejectStep = (id: string) => {
    if (!active) return;
    updateRule({
      ...active,
      approvals: (active.approvals ?? []).map((a) => a.id === id ? { ...a, status: "Rejected", date: new Date().toISOString().slice(0, 10), comment: "Rejected" } : a),
    });
  };

  const stats = useMemo(() => ({
    total: rules.length,
    published: rules.filter((r) => r.status === "Published").length,
    review: rules.filter((r) => r.status === "In Review").length,
    draft: rules.filter((r) => r.status === "Draft").length,
  }), [rules]);

  return (
    <div className="flex h-full flex-col">
      <Tabs value={tab} onValueChange={(v) => setTab(v as StudioTab)}>
        <div className="flex items-center justify-between border-b border-border px-5 pt-5 lg:px-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Rule Studio</h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">Author, simulate, and govern risk rules — visual canvas + Monaco editor.</p>
          </div>
          <TabsList>
            <TabsTrigger value="studio"><Gavel className="h-3.5 w-3.5" /> Rule Builder</TabsTrigger>
            <TabsTrigger value="plugins"><Puzzle className="h-3.5 w-3.5" /> Plugin Marketplace</TabsTrigger>
            <TabsTrigger value="admin"><Settings className="h-3.5 w-3.5" /> Administration</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="studio" className="flex-1 overflow-hidden p-0">
          <div className="flex h-full">
            {/* Rules list sidebar */}
            <div className="flex w-[300px] shrink-0 flex-col border-r border-border bg-background/30">
              <div className="border-b border-border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Rules</span>
                  <Button size="sm" className="h-7" onClick={createRule}><Plus className="h-3.5 w-3.5" /> New</Button>
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search rules…" className="h-8 pl-8 text-[12px]" />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  <Filter className="h-3 w-3 text-muted-foreground" />
                  {(["All", "Published", "In Review", "Draft"] as const).map((s) => (
                    <button key={s} onClick={() => setStatusFilter(s as RuleStatus | "All")} className={cn("rounded px-1.5 py-0.5 text-[10.5px] font-medium transition-colors", statusFilter === s ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1.5 border-b border-border p-3 text-center">
                <div><div className="text-[15px] font-bold text-success">{stats.published}</div><div className="text-[9px] uppercase text-muted-foreground">Published</div></div>
                <div><div className="text-[15px] font-bold text-warning">{stats.review}</div><div className="text-[9px] uppercase text-muted-foreground">Review</div></div>
                <div><div className="text-[15px] font-bold text-muted-foreground">{stats.draft}</div><div className="text-[9px] uppercase text-muted-foreground">Draft</div></div>
              </div>
              <div className="scrollbar-thin flex-1 overflow-auto p-2">
                {filtered.map((r, i) => {
                  const StatusIcon = STATUS_ICON[r.status];
                  return (
                    <motion.button
                      key={r.id}
                      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                      onClick={() => setActiveId(r.id)}
                      className={cn("mb-1 flex w-full flex-col gap-1 rounded-lg border px-3 py-2.5 text-left transition-all", activeId === r.id ? "border-primary/50 bg-primary/10" : "border-transparent hover:border-border hover:bg-accent/40")}
                    >
                      <div className="flex items-center gap-2">
                        <StatusIcon className={cn("h-3.5 w-3.5 shrink-0", r.status === "Published" ? "text-success" : r.status === "In Review" ? "text-warning" : r.status === "Rejected" ? "text-destructive" : "text-muted-foreground")} />
                        <span className="flex-1 truncate text-[12.5px] font-semibold text-foreground">{r.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 pl-5">
                        <span className="font-mono text-[10px] text-muted-foreground">{r.id}</span>
                        <Badge variant={TIER_TONE[r.tier]} className="text-[9px]">{r.tier}</Badge>
                        <span className="ml-auto text-[10px] text-muted-foreground">v{r.version}</span>
                      </div>
                    </motion.button>
                  );
                })}
                {filtered.length === 0 && <div className="py-8 text-center text-[11px] text-muted-foreground">No rules match.</div>}
              </div>
            </div>

            {/* Builder + Editor */}
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-[15px] font-bold text-foreground">{active.name}</h2>
                    <Badge variant={STATUS_TONE[active.status]}>{active.status}</Badge>
                    <Badge variant={TIER_TONE[active.tier]}>{active.tier}</Badge>
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="font-mono">{active.id}</span>
                    <span>v{active.version}</span>
                    <span>{active.owner}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {relativeTime(active.updated)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm"><Play className="h-3.5 w-3.5" /> Simulate</Button>
                  <Button variant="outline" size="sm"><GitBranch className="h-3.5 w-3.5" /> Version</Button>
                  <Button
                    variant={editorCollapsed ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setEditorCollapsed(!editorCollapsed)}
                    title={editorCollapsed ? "Expand Code & Inspector Panel" : "Collapse Code & Inspector Panel"}
                    className="gap-1.5 border-primary/30"
                  >
                    {editorCollapsed ? <PanelRightOpen className="h-3.5 w-3.5 text-primary" /> : <PanelRightClose className="h-3.5 w-3.5" />}
                    <span>{editorCollapsed ? "Show Inspector" : "Hide Inspector"}</span>
                  </Button>
                  <Button size="sm"><Sparkles className="h-3.5 w-3.5" /> Submit</Button>
                </div>
              </div>
              <div className="relative flex-1 overflow-hidden p-4">
                {editorCollapsed ? (
                  <div className="relative h-full w-full overflow-hidden">
                    <RuleBuilder rule={active} onChange={updateRule} />
                    <motion.button
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => setEditorCollapsed(false)}
                      className="group absolute right-3 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-2.5 rounded-xl border border-primary/40 bg-card/95 p-2 shadow-2xl backdrop-blur-md transition-all hover:border-primary hover:bg-card hover:scale-105"
                      title="Expand Code & Inspection Panel"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary shadow-inner">
                        <PanelRightOpen className="h-4 w-4" />
                      </div>
                      <span className="[writing-mode:vertical-lr] rotate-180 text-[11px] font-bold tracking-wider text-muted-foreground transition-colors group-hover:text-primary">
                        Code & Inspector
                      </span>
                    </motion.button>
                  </div>
                ) : (
                  <ResizablePanels defaultSizes={[55, 45]} minSizes={[30, 25]} storageKey="rule-studio-split">
                    <div className="h-full overflow-hidden pr-2">
                      <RuleBuilder rule={active} onChange={updateRule} />
                    </div>
                    <div className="h-full overflow-hidden pl-2">
                      <RuleEditor rule={active} onPublish={publishRule} onApprove={approveStep} onReject={rejectStep} onCollapse={() => setEditorCollapsed(true)} />
                    </div>
                  </ResizablePanels>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="plugins" className="overflow-auto p-5 lg:p-6">
          <PluginMarketplace />
        </TabsContent>

        <TabsContent value="admin" className="overflow-auto p-5 lg:p-6">
          <Administration />
        </TabsContent>
      </Tabs>
    </div>
  );
}
