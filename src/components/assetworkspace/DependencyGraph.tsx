import { useMemo } from "react";
import ReactFlow, {
  Background, Controls, type Node, type Edge, type NodeTypes,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { motion } from "framer-motion";
import { Workflow, type LucideIcon } from "lucide-react";
import { useTheme } from "@/providers/ThemeProvider";
import {
  buildDependencyGraph, ASSET_TYPE_META, type WorkspaceAsset,
} from "@/lib/assetWorkspaceData";

interface DepNodeData {
  label: string;
  type: string;
  color: string;
  category: "asset" | "pipeline";
  icon: LucideIcon;
  isCenter: boolean;
}

function DepNode({ data }: { data: DepNodeData }) {
  const Icon = data.icon;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      style={{
        background: `${data.color}1f`,
        borderColor: data.isCenter ? data.color : `${data.color}55`,
        boxShadow: data.isCenter ? `0 0 0 2px ${data.color}, 0 0 22px ${data.color}44` : "none",
      }}
      className="react-flow-node-custom flex items-center gap-2 rounded-xl border-2 px-3 py-2 backdrop-blur-md"
    >
      <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${data.color}22`, color: data.color }}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0">
        <div className="max-w-[150px] truncate text-[11px] font-bold text-foreground">{data.label}</div>
        <div className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: data.color }}>
          {data.category === "pipeline" ? "Pipeline" : ASSET_TYPE_META[data.type as keyof typeof ASSET_TYPE_META]?.label ?? data.type}
        </div>
      </div>
    </motion.div>
  );
}

const nodeTypes: NodeTypes = { dep: DepNode };

function layoutGraph(nodes: { id: string; category: "asset" | "pipeline" }[], centerId: string) {
  const positions: Record<string, { x: number; y: number }> = {};
  const center = nodes.find((n) => n.id === centerId);
  if (center) positions[center.id] = { x: 0, y: 0 };
  const deps = nodes.filter((n) => n.category === "asset" && n.id !== centerId);
  const pipes = nodes.filter((n) => n.category === "pipeline");

  deps.forEach((n, i) => {
    const angle = (i / Math.max(deps.length, 1)) * Math.PI - Math.PI / 2;
    positions[n.id] = { x: Math.cos(angle) * 220 - 120, y: Math.sin(angle) * 160 };
  });
  pipes.forEach((n, i) => {
    const angle = (i / Math.max(pipes.length, 1)) * Math.PI * 0.7 + Math.PI / 6;
    positions[n.id] = { x: Math.cos(angle) * 260 + 140, y: Math.sin(angle) * 180 };
  });
  return positions;
}

export function DependencyGraph({ asset, allAssets }: { asset: WorkspaceAsset; allAssets: WorkspaceAsset[] }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const edgeMuted = isDark ? "rgba(148,163,184,0.5)" : "rgba(100,116,139,0.55)";
  const edgeMarker = isDark ? "rgba(148,163,184,0.7)" : "rgba(100,116,139,0.75)";
  const labelFill = isDark ? "rgba(203,213,225,0.9)" : "rgba(71,85,105,0.95)";
  const labelBg = isDark ? "rgba(15,23,42,0.7)" : "rgba(255,255,255,0.9)";
  const bgDot = isDark ? "rgba(148,163,184,0.12)" : "rgba(100,116,139,0.16)";

  const graph = useMemo(() => buildDependencyGraph(asset, allAssets), [asset, allAssets]);
  const positions = useMemo(() => layoutGraph(graph.nodes, asset.id), [graph.nodes, asset.id]);

  const rfNodes: Node[] = useMemo(() => graph.nodes.map((n) => {
    const meta = n.category === "pipeline" ? { icon: Workflow as LucideIcon } : ASSET_TYPE_META[n.type];
    return {
      id: n.id,
      type: "dep",
      position: positions[n.id] ?? { x: 0, y: 0 },
      data: {
        label: n.label, type: n.type, color: n.color, category: n.category,
        icon: meta.icon, isCenter: n.id === asset.id,
      } as DepNodeData,
      draggable: true,
    };
  }), [graph.nodes, positions, asset.id]);

  const rfEdges: Edge[] = useMemo(() => graph.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    animated: e.target.startsWith("pipe-"),
    type: "smoothstep",
    style: { stroke: edgeMuted, strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: edgeMarker },
    labelStyle: { fill: labelFill, fontSize: 9, fontWeight: 600 },
    labelBgStyle: { fill: labelBg },
  })), [graph.edges, edgeMuted, edgeMarker, labelFill, labelBg]);

  if (graph.nodes.length <= 1) {
    return (
      <div className="flex h-full items-center justify-center text-center text-[12px] text-muted-foreground">
        No dependencies or pipeline consumers recorded for this asset.
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      proOptions={{ hideAttribution: true }}
      className="h-full w-full"
    >
      <Background gap={22} size={1} color={bgDot} />
      <Controls showInteractive={false} className="!bg-background/80 !border-border !backdrop-blur" />
    </ReactFlow>
  );
}
