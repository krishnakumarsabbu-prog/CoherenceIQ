import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ChevronDown, FolderTree, Boxes, Activity } from "lucide-react";
import { ruleIntelligenceApi, type ClusterNode } from "@/lib/ruleIntelligenceData";
import { BarChart, PieChart } from "@/components/charts/Charts";
import { cn } from "@/lib/utils";

const CLUSTER_COLORS: Record<string, string> = {
  "Device Intelligence": "hsl(199, 89%, 52%)",
  "Network Intelligence": "hsl(142, 71%, 48%)",
  "Location Intelligence": "hsl(38, 92%, 54%)",
  "Credential Intelligence": "hsl(0, 72%, 56%)",
  "Behavior Intelligence": "hsl(262, 83%, 62%)",
  "Customer Intelligence": "hsl(330, 81%, 56%)",
  "Transaction Intelligence": "hsl(24, 90%, 56%)",
  "Temporal Intelligence": "hsl(173, 80%, 40%)",
  Unclustered: "hsl(215, 20%, 50%)",
};

const CLUSTER_ICONS: Record<string, string> = {
  "Device Intelligence": "Smartphone",
  "Network Intelligence": "Network",
  "Location Intelligence": "MapPin",
  "Credential Intelligence": "KeyRound",
  "Behavior Intelligence": "Activity",
  "Customer Intelligence": "Users",
  "Transaction Intelligence": "CreditCard",
  "Temporal Intelligence": "Clock",
  Unclustered: "Circle",
};

interface Props {
  selectedCluster: string | null;
  onSelectCluster: (cluster: string | null) => void;
}

export function RuleClustering({ selectedCluster, onSelectCluster }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["Rule Intelligence"]));
  const { data: hierarchy } = useQuery({ queryKey: ["ri-clusters"], queryFn: ruleIntelligenceApi.getClusters });
  const { data: flatClusters = [] } = useQuery({ queryKey: ["ri-clusters-flat"], queryFn: ruleIntelligenceApi.getClustersFlat });
  const { data: rules = [] } = useQuery({ queryKey: ["ri-rules"], queryFn: ruleIntelligenceApi.getRules });

  const toggle = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const children = hierarchy?.children ?? [];

  const rulesPerCluster = useMemo(() => ({
    categories: children.map((c) => c.name.split(" ")[0]),
    series: [{ name: "Rules", data: children.map((c) => c.rule_count) }],
  }), [children]);

  const paramsPerCluster = useMemo(() => ({
    categories: children.map((c) => c.name.split(" ")[0]),
    series: [{ name: "Parameters", data: children.map((c) => Math.round(c.avg_parameters * c.rule_count)) }],
  }), [children]);

  const avgParams = useMemo(() => ({
    categories: children.map((c) => c.name.split(" ")[0]),
    series: [{ name: "Avg Params", data: children.map((c) => Math.round(c.avg_parameters * 10) / 10) }],
  }), [children]);

  const confidenceDist = useMemo(() => {
    const buckets = { "0-25%": 0, "26-50%": 0, "51-75%": 0, "76-100%": 0 };
    for (const r of rules) {
      const p = r.confidence * 100;
      if (p <= 25) buckets["0-25%"]++; else if (p <= 50) buckets["26-50%"]++; else if (p <= 75) buckets["51-75%"]++; else buckets["76-100%"]++;
    }
    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [rules]);

  const riskDist = useMemo(() => {
    const dist: Record<string, number> = {};
    for (const r of rules) dist[r.risk_level] = (dist[r.risk_level] ?? 0) + 1;
    const order = ["Critical", "High", "Medium", "Low"];
    return order.filter((k) => dist[k]).map((k) => ({ name: k, value: dist[k] }));
  }, [rules]);

  return (
    <div className="flex h-full gap-4">
      {/* Tree view */}
      <div className="flex w-[280px] shrink-0 flex-col">
        <div className="mb-2 flex items-center gap-2">
          <FolderTree className="h-4 w-4 text-primary" />
          <span className="text-[13px] font-semibold text-foreground">Cluster Hierarchy</span>
        </div>
        <div className="glass-card flex-1 overflow-auto p-2">
          <ClusterNodeRow
            name="Rule Intelligence"
            count={hierarchy?.total_rules ?? 0}
            depth={0}
            expanded={expanded}
            onToggle={toggle}
            selected={selectedCluster === null}
            onSelect={() => onSelectCluster(null)}
            isRoot
          />
          {children.map((c) => (
            <div key={c.name}>
              <ClusterNodeRow
                name={c.name}
                count={c.rule_count}
                depth={1}
                expanded={expanded}
                onToggle={toggle}
                selected={selectedCluster === c.name}
                onSelect={() => onSelectCluster(c.name)}
                keywords={c.keywords}
                avgConf={c.avg_confidence}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 rounded-lg border border-border/60 bg-card/30 p-2.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Selected</div>
          <div className="mt-0.5 text-[12px] font-semibold text-foreground">{selectedCluster ?? "All Clusters"}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid flex-1 grid-cols-1 gap-3 overflow-auto md:grid-cols-2 xl:grid-cols-3">
        <ChartCard title="Rules per Cluster" icon={Boxes}>
          <BarChart data={rulesPerCluster} height={220} />
        </ChartCard>
        <ChartCard title="Parameters per Cluster" icon={Activity}>
          <BarChart data={paramsPerCluster} height={220} />
        </ChartCard>
        <ChartCard title="Average Parameters" icon={Activity}>
          <BarChart data={avgParams} height={220} />
        </ChartCard>
        <ChartCard title="Confidence Distribution" icon={Activity}>
          <PieChart data={confidenceDist} height={220} />
        </ChartCard>
        <ChartCard title="Risk Distribution" icon={Activity}>
          <PieChart data={riskDist} height={220} />
        </ChartCard>
        <ChartCard title="Cluster Summary" icon={FolderTree}>
          <div className="space-y-1.5 overflow-auto" style={{ maxHeight: 220 }}>
            {flatClusters.filter((c) => c.rule_count > 0).map((c) => (
              <div key={c.name} className="flex items-center justify-between rounded-md border border-border/40 bg-card/20 px-2.5 py-1.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: CLUSTER_COLORS[c.name] }} />
                  <span className="text-[11px] font-medium text-foreground">{c.name}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] tabular-nums text-muted-foreground">
                  <span>{c.rule_count} rules</span>
                  <span>{Math.round(c.avg_confidence * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card flex flex-col p-3">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</span>
      </div>
      <div className="flex-1">{children}</div>
    </motion.div>
  );
}

interface RowProps {
  name: string;
  count: number;
  depth: number;
  expanded: Set<string>;
  onToggle: (name: string) => void;
  selected: boolean;
  onSelect: () => void;
  isRoot?: boolean;
  keywords?: string[];
  avgConf?: number;
}

function ClusterNodeRow({ name, count, depth, expanded, onToggle, selected, onSelect, isRoot, keywords, avgConf }: RowProps) {
  const isOpen = expanded.has(name);
  const hasChildren = isRoot || (keywords && keywords.length > 0);
  return (
    <div>
      <div
        onClick={onSelect}
        className={cn(
          "flex cursor-pointer items-center gap-1 rounded-md py-1.5 pr-2 transition-colors",
          selected ? "bg-primary/15 text-primary" : "hover:bg-accent/40 text-foreground",
        )}
        style={{ paddingLeft: depth * 14 + 4 }}
      >
        {hasChildren ? (
          <button onClick={(e) => { e.stopPropagation(); onToggle(name); }} className="shrink-0">
            {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: CLUSTER_COLORS[name] ?? "hsl(215,20%,50%)" }} />
        <span className={cn("flex-1 truncate text-[12px]", isRoot ? "font-bold" : "font-medium")}>{name}</span>
        <span className="rounded bg-muted px-1.5 py-0.5 text-[9.5px] font-bold tabular-nums text-muted-foreground">{count}</span>
      </div>
      {isOpen && !isRoot && keywords && (
        <div className="space-y-0.5 pb-1" style={{ paddingLeft: depth * 14 + 22 }}>
          {keywords.map((k) => (
            <div key={k} className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
              <span className="h-1 w-1 rounded-full bg-muted-foreground/50" /> {k}
            </div>
          ))}
          {avgConf !== undefined && (
            <div className="mt-1 text-[10px] font-medium text-primary">Avg confidence: {Math.round((avgConf ?? 0) * 100)}%</div>
          )}
        </div>
      )}
    </div>
  );
}
