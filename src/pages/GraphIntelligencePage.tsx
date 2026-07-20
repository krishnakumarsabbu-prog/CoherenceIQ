import { useMemo, useState, useCallback, useEffect } from "react";
import ReactFlow, {
  Background, Controls, type Node, type Edge, type NodeTypes,
  Position, MarkerType, useNodesState, useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import { User, Smartphone, Globe, Cookie, Phone, Mail, Chrome as Home, Network, Server, MapPin, Building2, Wallet, ArrowLeftRight, X, Share2, ShieldAlert, Filter, Sparkles, Activity } from "lucide-react";
import { generateSessions } from "@/lib/mockData";
import { buildGraph, buildProfile, type GraphNode, type EntityKind, type GraphData, type EntityProfile } from "@/lib/graphIntelligenceData";
import { PageHeader } from "@/components/shell/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn, formatDateTime } from "@/lib/utils";

const SESSIONS = generateSessions(200);
const SESSION = SESSIONS.find(s => s.riskScore >= 60) ?? SESSIONS[0];

const KIND_META: Record<EntityKind, { icon: typeof User; color: string; bg: string }> = {
  Customer: { icon: User, color: "#0ea5e9", bg: "rgba(14,165,233,0.14)" },
  Device: { icon: Smartphone, color: "#8b5cf6", bg: "rgba(139,92,246,0.14)" },
  Browser: { icon: Globe, color: "#06b6d4", bg: "rgba(6,182,212,0.14)" },
  Cookie: { icon: Cookie, color: "#f59e0b", bg: "rgba(245,158,11,0.14)" },
  Phone: { icon: Phone, color: "#10b981", bg: "rgba(16,185,129,0.14)" },
  Email: { icon: Mail, color: "#14b8a6", bg: "rgba(20,184,166,0.14)" },
  Address: { icon: Home, color: "#84cc16", bg: "rgba(132,204,22,0.14)" },
  IP: { icon: Network, color: "#ef4444", bg: "rgba(239,68,68,0.14)" },
  ASN: { icon: Server, color: "#f97316", bg: "rgba(249,115,22,0.14)" },
  Country: { icon: MapPin, color: "#3b82f6", bg: "rgba(59,130,246,0.14)" },
  City: { icon: Building2, color: "#6366f1", bg: "rgba(99,102,241,0.14)" },
  Merchant: { icon: Building2, color: "#ec4899", bg: "rgba(236,72,153,0.14)" },
  Payee: { icon: ArrowLeftRight, color: "#d946ef", bg: "rgba(217,70,239,0.14)" },
  Account: { icon: Wallet, color: "#22d3ee", bg: "rgba(34,211,238,0.14)" },
};

const RISK_COLOR = (risk: number) =>
  risk >= 75 ? "#ef4444" : risk >= 50 ? "#f59e0b" : risk >= 25 ? "#eab308" : "#22c55e";

function radialLayout(nodes: GraphNode[]): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  const center = nodes.find(n => n.kind === "Customer");
  if (center) positions[center.id] = { x: 0, y: 0 };
  const others = nodes.filter(n => n.kind !== "Customer");
  const radius = 260;
  others.forEach((n, i) => {
    const angle = (i / others.length) * Math.PI * 2 - Math.PI / 2;
    positions[n.id] = { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius * 0.78 };
  });
  return positions;
}

interface EntityNodeData {
  node: GraphNode;
  onselect: (id: string) => void;
  selected: boolean;
}

function EntityNode({ data }: { data: EntityNodeData }) {
  const { node, onselect, selected } = data;
  const meta = KIND_META[node.kind];
  const Icon = meta.icon;
  const riskColor = RISK_COLOR(node.risk);
  const isCustomer = node.kind === "Customer";
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      onClick={() => onselect(node.id)}
      style={{
        cursor: "pointer",
        background: meta.bg,
        borderColor: selected ? meta.color : node.flagged ? riskColor : "rgba(148,163,184,0.25)",
        boxShadow: selected ? `0 0 0 2px ${meta.color}, 0 0 24px ${meta.color}55` : node.flagged ? `0 0 18px ${riskColor}44` : "none",
      }}
      className="react-flow-node-custom flex flex-col items-center justify-center rounded-xl border-2 px-3 py-2 backdrop-blur-md transition-all hover:scale-105"
    >
      <div className="flex items-center gap-1.5">
        <Icon className="h-4 w-4" style={{ color: meta.color }} />
        <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: meta.color }}>{node.kind}</span>
      </div>
      <div className="mt-1 max-w-[120px] truncate text-[11px] font-semibold text-foreground" title={node.label}>{node.label}</div>
      {node.sub && <div className="max-w-[120px] truncate text-[9px] text-muted-foreground" title={node.sub}>{node.sub}</div>}
      <div className="mt-1.5 flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: riskColor }} />
        <span className="font-mono text-[9px] font-bold tabular-nums" style={{ color: riskColor }}>{node.risk}</span>
        {node.flagged && <ShieldAlert className="h-2.5 w-2.5 text-destructive" />}
      </div>
    </motion.div>
  );
}

const nodeTypes: NodeTypes = { entity: EntityNode };

export function GraphIntelligencePage() {
  const graph = useMemo(() => buildGraph(SESSION), []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filter, setFilter] = useState<EntityKind | "all">("all");
  const [hoveredCluster, setHoveredCluster] = useState<string | null>(null);

  const positions = useMemo(() => radialLayout(graph.nodes), [graph.nodes]);

  const initialNodes: Node[] = useMemo(() =>
    graph.nodes.map(n => ({
      id: n.id, type: "entity", position: positions[n.id] ?? { x: 0, y: 0 },
      data: { node: n, onselect: (id: string) => { setSelectedId(id); setDrawerOpen(true); }, selected: false },
      draggable: true,
    })), [graph.nodes, positions]);

  const initialEdges: Edge[] = useMemo(() =>
    graph.edges.map(e => ({
      id: e.id, source: e.source, target: e.target,
      label: e.label,
      animated: e.flagged,
      style: {
        stroke: e.flagged ? "#ef4444" : "rgba(148,163,184,0.45)",
        strokeWidth: 1.5 + e.strength * 1.5,
        strokeDasharray: e.flagged ? "5 3" : undefined,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: e.flagged ? "#ef4444" : "rgba(148,163,184,0.6)" },
      labelStyle: { fill: "rgba(148,163,184,0.85)", fontSize: 9, fontWeight: 600 },
      labelBgStyle: { fill: "rgba(15,23,42,0.6)" },
    })), [graph.edges]);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(initialNodes);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setRfNodes(ns => ns.map(n => ({
      ...n,
      data: { ...n.data, selected: n.id === selectedId },
      hidden: filter !== "all" && (n.data as EntityNodeData).node.kind !== filter,
    })));
  }, [selectedId, filter, setRfNodes]);

  useEffect(() => {
    if (!hoveredCluster) { setRfEdges(es => es); return; }
    const cluster = graph.clusters.find(c => c.id === hoveredCluster);
    if (!cluster) return;
    setRfEdges(es => es.map(e => {
      const inCluster = cluster.nodeIds.includes(e.source) && cluster.nodeIds.includes(e.target);
      return { ...e, style: { ...e.style, stroke: inCluster ? "#0ea5e9" : "rgba(148,163,184,0.15)", strokeWidth: inCluster ? 2.5 : 1 } };
    }));
  }, [hoveredCluster, graph.clusters, setRfEdges]);

  const profile = useMemo<EntityProfile | null>(() => {
    if (!selectedId) return null;
    const node = graph.nodes.find(n => n.id === selectedId);
    if (!node) return null;
    return buildProfile(node, graph);
  }, [selectedId, graph]);

  const onNodeClick = useCallback(() => {}, []);

  const kinds: EntityKind[] = ["all", "Customer", "Device", "Browser", "Cookie", "Phone", "Email", "Address", "IP", "ASN", "Country", "City", "Merchant", "Payee", "Account"] as EntityKind[];
  const kindFilter = kinds as (EntityKind | "all")[];

  return (
    <div className="flex h-full flex-col p-4 lg:p-5">
      <PageHeader
        title="Graph Intelligence"
        subtitle={`Entity relationship graph for ${SESSION.customer} · Session ${SESSION.sessionId}`}
        actions={
          <>
            <Badge variant="warning"><Share2 className="h-3 w-3" /> {graph.stats.rings} rings</Badge>
            <Button variant="outline" size="sm"><Filter className="h-3.5 w-3.5" /> Layout</Button>
            <Button size="sm"><Sparkles className="h-3.5 w-3.5" /> Re-run</Button>
          </>
        }
      />

      {/* Stats strip */}
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-5">
        {[
          { label: "Entities", value: graph.stats.entities, icon: Share2, color: "text-primary" },
          { label: "Edges", value: graph.stats.edges, icon: Activity, color: "text-success" },
          { label: "Flagged", value: graph.stats.flagged, icon: ShieldAlert, color: "text-destructive" },
          { label: "Fraud Rings", value: graph.stats.rings, icon: ShieldAlert, color: "text-warning" },
          { label: "Avg Degree", value: graph.stats.avgDegree, icon: Network, color: "text-primary" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="glass-card glass-card-hover p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{s.label}</span>
              <s.icon className={cn("h-3.5 w-3.5", s.color)} />
            </div>
            <div className={cn("mt-1 text-xl font-bold tabular-nums", s.color)}>{s.value}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-1 gap-3 min-h-0 xl:grid-cols-[1fr_320px]">
        {/* Graph canvas */}
        <Card className="relative min-h-[520px] overflow-hidden p-0">
          {/* Filter chips */}
          <div className="absolute left-3 top-3 z-10 flex max-w-[60%] flex-wrap gap-1">
            {kindFilter.slice(0, 8).map(k => {
              const active = filter === k;
              const meta = k === "all" ? null : KIND_META[k as EntityKind];
              return (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-all",
                    active ? "border-primary bg-primary/15 text-primary" : "border-border bg-background/60 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {meta && <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: meta.color }} />}
                  {k === "all" ? "All" : k}
                </button>
              );
            })}
          </div>
          <div className="absolute right-3 top-3 z-10 rounded-md bg-background/60 px-2 py-1 text-[9px] text-muted-foreground backdrop-blur-sm">
            Click node to inspect · Drag to rearrange
          </div>
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.18 }}
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{ type: "smoothstep" }}
            className="h-full w-full"
          >
            <Background gap={24} size={1} color="rgba(148,163,184,0.12)" />
            <Controls showInteractive={false} className="!bg-background/80 !border-border !backdrop-blur" />
          </ReactFlow>
        </Card>

        {/* Clusters panel */}
        <div className="flex min-h-0 flex-col gap-3">
          <Card className="p-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-[13px]">Entity Clusters</CardTitle>
              <CardDescription>Hover to highlight intra-cluster edges</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-1">
              {graph.clusters.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                  onMouseEnter={() => setHoveredCluster(c.id)}
                  onMouseLeave={() => setHoveredCluster(null)}
                  className="cursor-pointer rounded-lg border border-border/60 bg-card/40 p-2.5 transition-all hover:border-primary/40 hover:bg-primary/5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-foreground">{c.label}</span>
                    <span className={cn("font-mono text-[11px] font-bold tabular-nums", c.risk >= 75 ? "text-destructive" : c.risk >= 50 ? "text-warning" : "text-success")}>{c.risk}</span>
                  </div>
                  <div className="mt-1 text-[10.5px] leading-relaxed text-muted-foreground">{c.description}</div>
                  <div className="mt-1.5 flex items-center gap-1">
                    {c.nodeIds.slice(0, 4).map(id => {
                      const n = graph.nodes.find(x => x.id === id);
                      if (!n) return null;
                      const m = KIND_META[n.kind];
                      const Icon = m.icon;
                      return <Icon key={id} className="h-3 w-3" style={{ color: m.color }} />;
                    })}
                    <span className="ml-1 text-[9px] text-muted-foreground">{c.nodeIds.length} nodes</span>
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>

          <Card className="flex-1 p-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-[13px]">Legend</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-1.5 pt-1">
              {(Object.keys(KIND_META) as EntityKind[]).map(k => {
                const m = KIND_META[k];
                const Icon = m.icon;
                return (
                  <div key={k} className="flex items-center gap-1.5 rounded px-1 py-0.5">
                    <Icon className="h-3 w-3 shrink-0" style={{ color: m.color }} />
                    <span className="text-[10px] text-muted-foreground">{k}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      <ProfileDrawer profile={profile} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}

function ProfileDrawer({ profile, open, onClose }: { profile: EntityProfile | null; open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && profile && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[180]">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className="absolute right-0 top-0 flex h-full w-full max-w-[480px] flex-col border-l border-border bg-background shadow-2xl"
          >
            <ProfileContent profile={profile} onClose={onClose} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ProfileContent({ profile, onClose }: { profile: EntityProfile; onClose: () => void }) {
  const { node, connected, timeline, riskFactors, reasonCodes, summary } = profile;
  const meta = KIND_META[node.kind];
  const Icon = meta.icon;
  const riskColor = RISK_COLOR(node.risk);
  const [tab, setTab] = useState<"overview" | "connected" | "factors">("overview");

  return (
    <>
      <div className="shrink-0 border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: meta.bg, color: meta.color }}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-[15px] font-semibold text-foreground">{node.label}</h3>
              <span className="rounded px-1.5 py-px font-mono text-[9px] font-bold" style={{ background: meta.bg, color: meta.color }}>{node.kind}</span>
            </div>
            {node.sub && <p className="truncate text-[11.5px] text-muted-foreground">{node.sub}</p>}
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        {/* Risk band */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-border bg-card/40 p-2.5">
            <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Risk</div>
            <div className="font-mono text-xl font-bold tabular-nums" style={{ color: riskColor }}>{node.risk}</div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
              <motion.div initial={{ width: 0 }} animate={{ width: `${node.risk}%` }} transition={{ duration: 0.5 }} className="h-full rounded-full" style={{ background: riskColor }} />
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card/40 p-2.5">
            <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Band</div>
            <div className="text-sm font-bold capitalize" style={{ color: riskColor }}>{node.band}</div>
            <div className="mt-0.5 text-[9px] text-muted-foreground">{node.flagged ? "flagged" : "nominal"}</div>
          </div>
          <div className="rounded-lg border border-border bg-card/40 p-2.5">
            <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Degree</div>
            <div className="font-mono text-xl font-bold tabular-nums text-primary">{node.degree}</div>
            <div className="mt-0.5 text-[9px] text-muted-foreground">{connected.length} links</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-3 flex items-center gap-1">
          {(["overview", "connected", "factors"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("relative -mb-px px-3 py-1.5 text-[12px] font-medium capitalize transition-colors",
                tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
              {t}
              {tab === t && <motion.span layoutId="profile-tab" className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto scrollbar-thin p-4">
        {tab === "overview" && (
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Summary</div>
              <p className="text-[12.5px] leading-relaxed text-foreground/85">{summary}</p>
            </div>

            <div>
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Properties</div>
              <div className="grid grid-cols-2 gap-2">
                {node.properties.map(p => (
                  <div key={p.key} className="rounded-lg border border-border bg-card/40 p-2.5">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{p.key}</div>
                    <div className="mt-0.5 truncate font-mono text-[11px] font-medium text-foreground" title={p.value}>{p.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reason Codes</div>
              <div className="space-y-1.5">
                {reasonCodes.map(r => (
                  <div key={r.code} className="flex items-center gap-2 rounded-lg border border-border bg-card/40 px-2.5 py-2">
                    <span className="font-mono text-[10px] font-bold text-primary">{r.code}</span>
                    <span className="flex-1 text-[12px] text-foreground/85">{r.label}</span>
                    <span className={cn("rounded px-1.5 py-px text-[9px] font-bold uppercase",
                      r.severity === "critical" ? "bg-destructive/15 text-destructive" :
                      r.severity === "high" ? "bg-destructive/15 text-destructive" :
                      r.severity === "medium" ? "bg-warning/15 text-warning" : "bg-success/15 text-success")}>
                      {r.severity}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Timeline</div>
              <div className="relative space-y-2 pl-4">
                <div className="absolute left-1.5 top-1 bottom-1 w-px bg-border" />
                {timeline.map((t, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="relative">
                    <span className={cn("absolute -left-[14px] top-1 h-2.5 w-2.5 rounded-full ring-2 ring-background",
                      t.kind === "critical" ? "bg-destructive" : t.kind === "high" ? "bg-destructive" : t.kind === "medium" ? "bg-warning" : "bg-success")} />
                    <div className="text-[11.5px] font-medium text-foreground">{t.label}</div>
                    <div className="text-[10px] text-muted-foreground">{formatDateTime(t.t)}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "connected" && (
          <div className="space-y-2">
            {connected.map(({ node: cn_, edge }, i) => {
              const m = KIND_META[cn_.kind];
              const Icon = m.icon;
              return (
                <motion.div key={cn_.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-2.5 rounded-lg border border-border bg-card/40 p-2.5 transition-colors hover:bg-accent/30">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: m.bg, color: m.color }}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[12.5px] font-medium text-foreground">{cn_.label}</span>
                      <span className="rounded px-1 text-[8px] font-bold uppercase" style={{ background: m.bg, color: m.color }}>{cn_.kind}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">{edge.label} · strength {(edge.strength * 100).toFixed(0)}%</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[13px] font-bold tabular-nums" style={{ color: RISK_COLOR(cn_.risk) }}>{cn_.risk}</div>
                    <div className="text-[9px] text-muted-foreground">risk</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {tab === "factors" && (
          <div className="space-y-2">
            {riskFactors.map((f, i) => (
              <motion.div key={f.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="rounded-lg border border-border bg-card/40 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold text-foreground">{f.label}</span>
                  <span className={cn("text-[10px] font-bold", f.direction === "increases" ? "text-destructive" : "text-success")}>
                    {f.direction === "increases" ? "↑ risk" : "↓ risk"}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>value: <span className="font-mono text-foreground/80">{f.value}</span></span>
                  <span>weight: <span className="font-mono text-foreground/80">{f.weight.toFixed(2)}</span></span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${f.weight * 100}%` }} transition={{ duration: 0.5 }}
                    className={cn("h-full rounded-full", f.direction === "increases" ? "bg-destructive" : "bg-success")} />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
