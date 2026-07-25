import { useMemo, useState } from "react";
import { Layers3, Boxes, Workflow, Share2, FileText, Hash, Gauge, Copy, ShieldCheck, Target, TrendingUp, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/rulestudio/RuleStudioTabs";
import { ruleIntelligenceApi, type RuleRecord } from "@/lib/ruleIntelligenceData";
import { RuleCatalog } from "@/components/ruleintelligence/RuleCatalog";
import { RuleClustering } from "@/components/ruleintelligence/RuleClustering";
import { RuleDetailsDrawer } from "@/components/ruleintelligence/RuleDetailsDrawer";
import { Badge } from "@/components/ui/badge";
import { BarChart, PieChart } from "@/components/charts/Charts";
import { cn } from "@/lib/utils";

type Tab = "catalog" | "clustering" | "features" | "graph";

export function RuleIntelligencePage() {
  const [tab, setTab] = useState<Tab>("catalog");
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [selectedRule, setSelectedRule] = useState<RuleRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: stats } = useQuery({ queryKey: ["ri-stats"], queryFn: ruleIntelligenceApi.getStats });
  const { data: features = [] } = useQuery({ queryKey: ["ri-features"], queryFn: ruleIntelligenceApi.getFeatures });
  const { data: graph } = useQuery({ queryKey: ["ri-graph"], queryFn: ruleIntelligenceApi.getFeatureGraph });

  const subtitle = useMemo(() => {
    const parts: string[] = [];
    if (stats) {
      parts.push(`${stats.total_rules} rules`);
      parts.push(`${stats.total_clusters} clusters`);
      parts.push(`${features.length} features`);
      parts.push(`${Math.round(stats.avg_confidence * 100)}% avg confidence`);
    }
    return parts.join(" · ") || "Upload rule files to parse, cluster, and engineer features";
  }, [stats, features.length]);

  const openRule = (rule: RuleRecord) => {
    setSelectedRule(rule);
    setDrawerOpen(true);
  };

  const kpiCards = useMemo(() => {
    if (!stats) return [];
    return [
      { label: "Total Rules", value: stats.total_rules, icon: FileText, tone: "text-primary" },
      { label: "Parsed Rules", value: stats.parsed_rules, icon: Hash, tone: "text-success" },
      { label: "Suggested Domains", value: stats.total_clusters, icon: Layers3, tone: "text-primary" },
      { label: "Rule Quality", value: `${Math.round(stats.rule_quality * 100)}%`, icon: Gauge, tone: "text-success" },
      { label: "Duplicate Rules", value: stats.duplicate_rules, icon: Copy, tone: "text-warning" },
      { label: "Coverage", value: `${Math.round(stats.coverage * 100)}%`, icon: Target, tone: "text-primary" },
      { label: "Parameter Count", value: stats.parameter_count, icon: Activity, tone: "text-primary" },
      { label: "Avg Complexity", value: stats.avg_complexity.toFixed(1), icon: TrendingUp, tone: "text-warning" },
    ];
  }, [stats]);

  const riskDist = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.risk_distribution)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [stats]);

  const clusterDist = useMemo(() => {
    if (!stats) return { categories: [], series: [] };
    const entries = Object.entries(stats.cluster_distribution).sort((a, b) => b[1] - a[1]);
    return {
      categories: entries.map(([k]) => k.split(" ")[0]),
      series: [{ name: "Rules", data: entries.map(([, v]) => v) }],
    };
  }, [stats]);

  return (
    <div className="relative flex h-full flex-col">
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <div className="flex items-center justify-between border-b border-border px-5 pt-5 lg:px-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Rule Intelligence</h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <TabsList>
              <TabsTrigger value="catalog"><Layers3 className="h-3.5 w-3.5" /> Catalog</TabsTrigger>
              <TabsTrigger value="clustering"><Boxes className="h-3.5 w-3.5" /> Clustering</TabsTrigger>
              <TabsTrigger value="features"><Workflow className="h-3.5 w-3.5" /> Features</TabsTrigger>
              <TabsTrigger value="graph"><Share2 className="h-3.5 w-3.5" /> Graph</TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 gap-2 border-b border-border px-5 py-3 sm:grid-cols-4 lg:grid-cols-8 lg:px-6">
          {kpiCards.map((kpi) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card flex items-center gap-2.5 px-3 py-2"
            >
              <kpi.icon className={cn("h-4 w-4 shrink-0", kpi.tone)} />
              <div className="min-w-0">
                <div className="text-[16px] font-bold tabular-nums text-foreground leading-none">{kpi.value}</div>
                <div className="mt-0.5 truncate text-[9.5px] font-medium uppercase tracking-wider text-muted-foreground">{kpi.label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        <TabsContent value="catalog" className="flex-1 overflow-hidden p-5 lg:p-6">
          <RuleCatalog onRowSelect={openRule} />
        </TabsContent>

        <TabsContent value="clustering" className="flex-1 overflow-hidden p-5 lg:p-6">
          <RuleClustering selectedCluster={selectedCluster} onSelectCluster={setSelectedCluster} />
        </TabsContent>

        <TabsContent value="features" className="flex-1 overflow-auto p-5 lg:p-6">
          <FeatureTab features={features} />
        </TabsContent>

        <TabsContent value="graph" className="flex-1 overflow-auto p-5 lg:p-6">
          <GraphTab graph={graph} riskDist={riskDist} clusterDist={clusterDist} />
        </TabsContent>
      </Tabs>

      <RuleDetailsDrawer rule={selectedRule} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}

function FeatureTab({ features }: { features: ReturnType<typeof ruleIntelligenceApi.getFeatures> extends Promise<infer T> ? T : never }) {
  if (features.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Workflow className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-[13px]">No features generated yet.</p>
          <p className="mt-1 text-[11px]">Features are auto-generated from rule clusters.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {features.map((f, i) => (
        <motion.div
          key={f.feature_name}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          className="glass-card glass-card-hover p-4"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-[13px] font-bold text-foreground">{f.feature_name}</h3>
              <Badge variant="default" className="mt-1 text-[9px]">{f.domain}</Badge>
            </div>
            <div className="text-right">
              <div className="text-[18px] font-bold tabular-nums text-primary">{(f.weight * 100).toFixed(0)}%</div>
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Weight</div>
            </div>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{f.description}</p>
          <div className="mt-3 flex flex-wrap gap-1">
            {f.derived_parameters.slice(0, 5).map((p) => (
              <span key={p} className="rounded bg-primary/10 px-1.5 py-0.5 text-[9.5px] font-medium text-primary">{p}</span>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
            <ShieldCheck className="h-3 w-3" />
            {f.derived_rules.length} rules · {f.used_by.length} pipelines
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function GraphTab({ graph, riskDist, clusterDist }: {
  graph: Awaited<ReturnType<typeof ruleIntelligenceApi.getFeatureGraph>> | undefined;
  riskDist: { name: string; value: number }[];
  clusterDist: { categories: string[]; series: { name: string; data: number[] }[] };
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="glass-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Share2 className="h-4 w-4 text-primary" />
          <h3 className="text-[13px] font-bold text-foreground">Rule Relationship Graph</h3>
        </div>
        <div className="flex h-[300px] flex-wrap items-center justify-center gap-2 overflow-auto">
          {graph?.nodes.filter((n) => n.type === "domain").map((node) => {
            const count = graph.edges.filter((e) => e.target === node.id).length;
            return (
              <div key={node.id} className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/40 px-3 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                <span className="text-[11px] font-semibold text-foreground">{node.label}</span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] tabular-nums text-muted-foreground">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="glass-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="text-[13px] font-bold text-foreground">Rules per Cluster</h3>
        </div>
        <BarChart data={clusterDist} height={280} />
      </div>
      <div className="glass-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" />
          <h3 className="text-[13px] font-bold text-foreground">Risk Distribution</h3>
        </div>
        <PieChart data={riskDist} height={280} />
      </div>
      <div className="glass-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Workflow className="h-4 w-4 text-primary" />
          <h3 className="text-[13px] font-bold text-foreground">Feature Dependencies</h3>
        </div>
        <div className="max-h-[280px] space-y-1.5 overflow-auto">
          {graph?.nodes.filter((n) => n.type === "feature").slice(0, 12).map((node) => {
            const deps = graph.edges.filter((e) => e.source === node.id).length;
            return (
              <div key={node.id} className="flex items-center justify-between rounded-md border border-border/40 bg-card/20 px-2.5 py-1.5">
                <span className="text-[11px] font-medium text-foreground">{node.label}</span>
                <span className="text-[10px] text-muted-foreground">{deps} deps</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
