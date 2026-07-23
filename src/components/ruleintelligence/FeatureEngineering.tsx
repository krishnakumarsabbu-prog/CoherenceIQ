import { useMemo, useState } from "react";
import ReactFlow, { Background, Controls, type Node, type Edge, type NodeTypes, MarkerType } from "reactflow";
import "reactflow/dist/style.css";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Boxes, Workflow, Brain, Cpu, GitBranch, Filter } from "lucide-react";
import { ruleIntelligenceApi, type EngineeredFeatureRecord, type DependencyGraph } from "@/lib/ruleIntelligenceData";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const DOMAIN_COLORS: Record<string, string> = {
  "Device Intelligence": "#0ea5e9",
  "Network Intelligence": "#10b981",
  "Location Intelligence": "#f59e0b",
  "Credential Intelligence": "#ef4444",
  "Behavior Intelligence": "#8b5cf6",
  "Customer Intelligence": "#ec4899",
  "Transaction Intelligence": "#f97316",
  "Temporal Intelligence": "#14b8a6",
};

interface GraphNodeData {
  label: string;
  type: "rule" | "feature" | "domain";
  domain?: string;
  cluster?: string;
}

function RuleNode({ data }: { data: GraphNodeData }) {
  return (
    <div className="react-flow-node-custom rounded-lg border border-border/60 bg-card/80 px-2.5 py-1.5 text-center shadow-sm backdrop-blur">
      <div className="max-w-[140px] truncate text-[10px] font-semibold text-foreground" title={data.label}>{data.label}</div>
    </div>
  );
}

function FeatureNode({ data }: { data: GraphNodeData }) {
  const color = data.domain ? DOMAIN_COLORS[data.domain] ?? "#0ea5e9" : "#0ea5e9";
  return (
    <div className="react-flow-node-custom rounded-xl border-2 px-3 py-2 text-center shadow-md backdrop-blur-md" style={{ borderColor: color, background: `${color}18` }}>
      <div className="text-[11px] font-bold" style={{ color }}>{data.label}</div>
      <div className="text-[8.5px] uppercase tracking-wide text-muted-foreground">Feature</div>
    </div>
  );
}

function DomainNode({ data }: { data: GraphNodeData }) {
  const color = DOMAIN_COLORS[data.label] ?? "#0ea5e9";
  return (
    <div className="react-flow-node-custom rounded-xl border-2 px-4 py-2.5 text-center shadow-lg backdrop-blur-md" style={{ borderColor: color, background: `${color}22` }}>
      <div className="text-[12px] font-bold" style={{ color }}>{data.label}</div>
      <div className="text-[8.5px] uppercase tracking-wide text-muted-foreground">Domain</div>
    </div>
  );
}

const nodeTypes: NodeTypes = { rule: RuleNode, feature: FeatureNode, domain: DomainNode };

export function FeatureEngineering() {
  const [view, setView] = useState<"table" | "graph">("table");
  const { data: features = [] } = useQuery({ queryKey: ["ri-features"], queryFn: ruleIntelligenceApi.getFeatures });
  const { data: graph } = useQuery({ queryKey: ["ri-feature-graph"], queryFn: ruleIntelligenceApi.getFeatureGraph });

  const { nodes, edges } = useMemo(() => buildLayout(graph), [graph]);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setView("table")} className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-all", view === "table" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground")}>
            <Boxes className="h-3.5 w-3.5" /> Feature Catalog
          </button>
          <button onClick={() => setView("graph")} className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-all", view === "graph" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground")}>
            <Workflow className="h-3.5 w-3.5" /> Dependency Graph
          </button>
        </div>
        <Badge variant="default">{features.length} engineered features</Badge>
      </div>

      {view === "table" ? (
        <div className="flex-1 overflow-auto">
          <FeatureTable features={features} />
        </div>
      ) : (
        <div className="ag-theme-coherence glass-card relative flex-1 min-h-[500px] overflow-hidden p-0">
          <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.15 }} proOptions={{ hideAttribution: true }} defaultEdgeOptions={{ type: "smoothstep" }} className="h-full w-full">
            <Background gap={24} size={1} color="rgba(148,163,184,0.12)" />
            <Controls showInteractive={false} className="!bg-background/80 !border-border !backdrop-blur" />
          </ReactFlow>
          <div className="absolute left-3 top-3 z-10 rounded-md bg-background/60 px-2 py-1 text-[9px] text-muted-foreground backdrop-blur-sm">
            Rules → Features → Domains · Drag to rearrange
          </div>
        </div>
      )}
    </div>
  );
}

function FeatureTable({ features }: { features: EngineeredFeatureRecord[] }) {
  return (
    <div className="overflow-auto">
      <table className="w-full border-collapse text-left">
        <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur">
          <tr className="border-b border-border">
            {["Feature Name", "Domain", "Derived Parameters", "Weight", "Description", "Used By", "Derived Rules"].map((h) => (
              <th key={h} className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map((f, i) => {
            const color = DOMAIN_COLORS[f.domain] ?? "#0ea5e9";
            return (
              <motion.tr key={f.feature_name} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="border-b border-border/40 transition-colors hover:bg-accent/30">
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                    <span className="text-[12px] font-bold text-foreground">{f.feature_name}</span>
                  </div>
                </td>
                <td className="px-3 py-3"><Badge variant="outline" className="text-[9.5px]">{f.domain}</Badge></td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1">
                    {f.derived_parameters.map((p) => <span key={p} className="rounded bg-muted px-1.5 py-0.5 text-[9.5px] font-medium text-muted-foreground">{p}</span>)}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-10 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${f.weight * 100}%` }} /></div>
                    <span className="text-[11px] font-semibold tabular-nums text-foreground">{f.weight.toFixed(2)}</span>
                  </div>
                </td>
                <td className="max-w-[260px] px-3 py-3"><span className="text-[11px] leading-relaxed text-muted-foreground">{f.description}</span></td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1">
                    {f.used_by.map((u) => {
                      const Icon = u === "Coherence Brain" ? Brain : u === "ML Model" ? Cpu : GitBranch;
                      return <span key={u} className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[9.5px] font-medium text-primary"><Icon className="h-2.5 w-2.5" /> {u}</span>;
                    })}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span className="font-mono text-[10px] text-muted-foreground">{f.derived_rules.length} rules</span>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function buildLayout(graph: DependencyGraph | undefined): { nodes: Node[]; edges: Edge[] } {
  if (!graph) return { nodes: [], edges: [] };

  const domains = graph.nodes.filter((n) => n.type === "domain");
  const features = graph.nodes.filter((n) => n.type === "feature");
  const rules = graph.nodes.filter((n) => n.type === "rule");

  const positions: Record<string, { x: number; y: number }> = {};

  const domainSpacing = 260;
  domains.forEach((d, i) => { positions[d.id] = { x: i * domainSpacing, y: 0 }; });

  const domainIndex = new Map(domains.map((d, i) => [d.label, i]));
  features.forEach((f) => {
    const di = domainIndex.get(f.domain ?? "") ?? 0;
    positions[f.id] = { x: di * domainSpacing + 80, y: 160 };
  });

  const featureIndex = new Map(features.map((f, i) => [f.id, i]));
  const featureCol = new Map<string, number>();
  rules.forEach((r) => {
    const matching = graph.edges.filter((e) => e.source === r.id && e.kind === "rule-feature");
    if (matching.length === 0) { positions[r.id] = { x: 0, y: 360 }; return; }
    const fid = matching[0].target;
    const fi = featureIndex.get(fid) ?? 0;
    const col = featureCol.get(fid) ?? 0;
    featureCol.set(fid, col + 1);
    positions[r.id] = { x: fi * domainSpacing + 40 + col * 150, y: 340 + col * 55 };
  });

  const nodes: Node[] = graph.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: positions[n.id] ?? { x: 0, y: 0 },
    data: { label: n.label, type: n.type, domain: n.domain, cluster: n.cluster },
    draggable: true,
  }));

  const edges: Edge[] = graph.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    animated: e.kind === "rule-feature",
    style: { stroke: e.kind === "rule-feature" ? "rgba(148,163,184,0.4)" : "rgba(14,165,233,0.6)", strokeWidth: 1.2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: e.kind === "rule-feature" ? "rgba(148,163,184,0.5)" : "rgba(14,165,233,0.6)" },
  }));

  return { nodes, edges };
}
