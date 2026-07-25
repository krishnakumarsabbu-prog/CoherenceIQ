import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background, Controls, MiniMap, type Node, type Edge, type NodeTypes,
  type Connection, type OnConnect, addEdge, useNodesState, useEdgesState,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Save, Plus, Copy, MoveHorizontal as MoreHorizontal, Sparkles, History, ChevronDown } from "lucide-react";
import { useTheme } from "@/providers/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, relativeTime } from "@/lib/utils";
import {
  SAMPLE_PIPELINES, NODE_TYPE_MAP, type Pipeline, type PipelineNode, type PipelineEdge, type NodeStatus,
} from "@/lib/pipelineData";
import { PipelineNode as PipelineNodeComp } from "@/components/pipeline/PipelineNode";
import { NodePalette } from "@/components/pipeline/NodePalette";
import { NodeConfigPanel } from "@/components/pipeline/NodeConfigPanel";

const nodeTypes: NodeTypes = { pipeline: PipelineNodeComp };

interface RfNodeData {
  label: string;
  config: Record<string, unknown>;
  status?: NodeStatus;
  assetRef?: string;
  __nodeType: string;
  onConfig?: () => void;
}

let idCounter = 1000;
const nextId = () => `n${idCounter++}`;

export function PipelineStudioPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [pipelineId, setPipelineId] = useState(SAMPLE_PIPELINES[0].id);
  const pipeline = useMemo(() => SAMPLE_PIPELINES.find((p) => p.id === pipelineId) ?? SAMPLE_PIPELINES[0], [pipelineId]);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<RfNodeData>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nodes: Node<RfNodeData>[] = pipeline.nodes.map((n) => ({
      id: n.id,
      type: "pipeline",
      position: n.position,
      data: { ...n.data, __nodeType: n.type, onConfig: () => { setSelectedNodeId(n.id); setConfigOpen(true); } },
      draggable: true,
    }));
    const edges: Edge[] = pipeline.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? null,
      targetHandle: e.targetHandle ?? null,
      animated: e.animated,
      type: "smoothstep",
      style: { stroke: isDark ? "rgba(148,163,184,0.5)" : "rgba(100,116,139,0.55)", strokeWidth: 1.8 },
      markerEnd: { type: MarkerType.ArrowClosed, color: isDark ? "rgba(148,163,184,0.7)" : "rgba(100,116,139,0.7)" },
    }));
    setRfNodes(nodes);
    setRfEdges(edges);
    setSelectedNodeId(null);
    setConfigOpen(false);
  }, [pipeline, isDark, setRfNodes, setRfEdges]);

  const selectedNode = useMemo<PipelineNode | null>(() => {
    if (!selectedNodeId) return null;
    const n = rfNodes.find((x) => x.id === selectedNodeId);
    if (!n) return null;
    return { id: n.id, type: n.data.__nodeType, position: n.position, data: { label: n.data.label, config: n.data.config, status: n.data.status, assetRef: n.data.assetRef } };
  }, [selectedNodeId, rfNodes]);

  const onConnect: OnConnect = useCallback((connection: Connection) => {
    setRfEdges((eds) => addEdge({ ...connection, type: "smoothstep", animated: true, style: { stroke: isDark ? "rgba(148,163,184,0.5)" : "rgba(100,116,139,0.55)", strokeWidth: 1.8 }, markerEnd: { type: MarkerType.ArrowClosed, color: isDark ? "rgba(148,163,184,0.7)" : "rgba(100,116,139,0.7)" } }, eds));
  }, [isDark, setRfEdges]);

  const addNode = useCallback((type: string) => {
    const def = NODE_TYPE_MAP[type];
    if (!def) return;
    const id = nextId();
    const newNode: Node<RfNodeData> = {
      id,
      type: "pipeline",
      position: { x: 240 + Math.random() * 200, y: 120 + Math.random() * 240 },
      data: { label: def.label, config: { ...def.defaultConfig }, __nodeType: type, onConfig: () => { setSelectedNodeId(id); setConfigOpen(true); } },
    };
    setRfNodes((ns) => [...ns, newNode]);
    setPickerOpen(false);
  }, [setRfNodes]);

  const updateNode = useCallback((id: string, patch: Partial<PipelineNode["data"]>) => {
    setRfNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)));
  }, [setRfNodes]);

  const deleteNode = useCallback((id: string) => {
    setRfNodes((ns) => ns.filter((n) => n.id !== id));
    setRfEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
    setConfigOpen(false);
    setSelectedNodeId(null);
  }, [setRfNodes, setRfEdges]);

  const runPipeline = useCallback(() => {
    setRunning(true);
    const ids = rfNodes.map((n) => n.id);
    setRfNodes((ns) => ns.map((n) => ({ ...n, data: { ...n.data, status: "queued" as NodeStatus } })));
    ids.forEach((id, i) => {
      setTimeout(() => {
        setRfNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, status: "running" as NodeStatus } } : n)));
        setTimeout(() => {
          setRfNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, status: "success" as NodeStatus } } : n)));
          if (i === ids.length - 1) setRunning(false);
        }, 600);
      }, i * 400);
    });
  }, [rfNodes, setRfNodes]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("application/pipeline-node");
    if (!type) return;
    const def = NODE_TYPE_MAP[type];
    if (!def) return;
    const bounds = wrapperRef.current?.getBoundingClientRect();
    const position = bounds ? { x: e.clientX - bounds.left - 100, y: e.clientY - bounds.top - 30 } : { x: 200, y: 200 };
    const id = nextId();
    const newNode: Node<RfNodeData> = {
      id, type: "pipeline", position,
      data: { label: def.label, config: { ...def.defaultConfig }, __nodeType: type, onConfig: () => { setSelectedNodeId(id); setConfigOpen(true); } },
    };
    setRfNodes((ns) => [...ns, newNode]);
  }, [setRfNodes]);

  const bgDot = isDark ? "rgba(148,163,184,0.12)" : "rgba(100,116,139,0.16)";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-5 pt-4 lg:px-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Pipeline Studio</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{SAMPLE_PIPELINES.length} pipelines · drag nodes to compose executable flows</p>
        </div>
        <div className="flex items-center gap-2">
          <PipelineSwitcher value={pipelineId} onChange={setPipelineId} />
          <Button variant="outline" size="sm"><History className="h-3.5 w-3.5" /> Runs</Button>
          <Button variant="outline" size="sm"><Save className="h-3.5 w-3.5" /> Save</Button>
          <Button size="sm" onClick={runPipeline} disabled={running}>
            {running ? <><Sparkles className="h-3.5 w-3.5 animate-pulse" /> Running…</> : <><Play className="h-3.5 w-3.5" /> Run</>}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <NodePalette onAddNode={addNode} />

        <div className="relative flex flex-1 flex-col overflow-hidden" ref={wrapperRef} onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
          <div className="flex items-center gap-2 border-b border-border bg-card/30 px-4 py-2">
            <Badge variant="default">{pipeline.version}</Badge>
            <span className="text-[12px] font-semibold text-foreground">{pipeline.name}</span>
            <span className="text-[10.5px] text-muted-foreground">· {pipeline.nodes.length} nodes · updated {relativeTime(pipeline.updatedAt)}</span>
            <div className="flex-1" />
            <button onClick={() => setPickerOpen(true)} className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden">
              <Plus className="h-3 w-3" /> Add
            </button>
            <button className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground">
              <Copy className="h-3 w-3" /> Duplicate
            </button>
            <button className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground">
              <MoreHorizontal className="h-3 w-3" />
            </button>
          </div>

          <div className="relative flex-1 min-h-0">
            <ReactFlow
              nodes={rfNodes}
              edges={rfEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_, n) => { setSelectedNodeId(n.id); setConfigOpen(true); }}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.12 }}
              proOptions={{ hideAttribution: true }}
              defaultEdgeOptions={{ type: "smoothstep" }}
              className="h-full w-full"
            >
              <Background gap={22} size={1} color={bgDot} />
              <Controls showInteractive={false} className="!bg-background/80 !border-border !backdrop-blur" />
              <MiniMap
                nodeColor={(n) => NODE_TYPE_MAP[(n.data as any)?.__nodeType]?.color ?? "#64748b"}
                maskColor={isDark ? "rgba(15,23,42,0.7)" : "rgba(255,255,255,0.7)"}
                className="!bg-background/80 !border-border !backdrop-blur"
                pannable
              />
            </ReactFlow>
          </div>
        </div>

        <NodeConfigPanel node={selectedNode} open={configOpen} onClose={() => setConfigOpen(false)} onUpdate={updateNode} onDelete={deleteNode} />
      </div>

      <AnimatePresence>
        {pickerOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] flex items-center justify-center lg:hidden" onClick={() => setPickerOpen(false)}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative z-10 w-full max-w-md glass-card p-4" onClick={(e) => e.stopPropagation()}>
              <div className="mb-3 text-[13px] font-bold text-foreground">Add node</div>
              <div className="grid max-h-[50vh] grid-cols-2 gap-2 overflow-y-auto scrollbar-thin">
                {Object.values(NODE_TYPE_MAP).map((n) => (
                  <button key={n.type} onClick={() => addNode(n.type)} className="flex items-center gap-2 rounded-lg border border-border p-2 text-left hover:border-primary/40 hover:bg-primary/5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${n.color}22`, color: n.color }}>
                      <n.icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[11px] font-semibold text-foreground">{n.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PipelineSwitcher({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const current = SAMPLE_PIPELINES.find((p) => p.id === value);
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-[12px] font-medium text-foreground hover:bg-accent">
        <span className="truncate max-w-[160px]">{current?.name ?? "Select pipeline"}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute right-0 top-full z-50 mt-1 w-72 glass-card p-1.5">
              {SAMPLE_PIPELINES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { onChange(p.id); setOpen(false); }}
                  className={cn("flex w-full flex-col rounded-md px-2.5 py-2 text-left hover:bg-accent", p.id === value && "bg-primary/10")}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-foreground">{p.name}</span>
                    <Badge variant="outline" className="text-[9px]">{p.version}</Badge>
                  </div>
                  <span className="truncate text-[10px] text-muted-foreground">{p.description}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
