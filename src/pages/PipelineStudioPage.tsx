import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background, Controls, MiniMap, type Node, type Edge, type NodeTypes,
  type Connection, type OnConnect, addEdge, useNodesState, useEdgesState,
  MarkerType, ReactFlowProvider, useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Save, Plus, Copy, Trash2, Sparkles, History, ChevronDown, GitCommitVertical as GitCommit, LayoutGrid, Clipboard, ClipboardCheck, Undo2, Redo2, MessageSquarePlus, CircleCheck as CheckCircle2, CircleAlert as AlertCircle, TriangleAlert as AlertTriangle, FolderPlus, Search, Pencil } from "lucide-react";
import { useTheme } from "@/providers/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { cn, relativeTime } from "@/lib/utils";
import {
  NODE_TYPE_MAP, type PipelineNode, type PipelineEdge, type NodeStatus,
} from "@/lib/pipelineData";
import { pipelineStore, type PipelineDocument } from "@/lib/pipelineStore";
import { usePipelineStore } from "@/lib/usePipelineStore";
import { autoLayout } from "@/lib/pipelineLayout";
import { validatePipeline, issueCounts, type ValidationIssue } from "@/lib/pipelineValidation";
import { PipelineNode as PipelineNodeComp, type PipelineNodeData } from "@/components/pipeline/PipelineNode";
import { NodePalette } from "@/components/pipeline/NodePalette";
import { NodeConfigPanel } from "@/components/pipeline/NodeConfigPanel";
import { VersionHistoryModal } from "@/components/pipeline/VersionHistoryModal";
import { ValidationPanel } from "@/components/pipeline/ValidationPanel";

const nodeTypes: NodeTypes = { pipeline: PipelineNodeComp };

let idCounter = 1000;
const nextId = () => `n${idCounter++}`;

interface CanvasState {
  nodes: Node<PipelineNodeData>[];
  edges: Edge[];
}

export function PipelineStudioPage() {
  return (
    <ReactFlowProvider>
      <PipelineStudioInner />
    </ReactFlowProvider>
  );
}

function PipelineStudioInner() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const docs = usePipelineStore();
  const [pipelineId, setPipelineId] = useState<string>(docs[0]?.id ?? "");
  const doc = useMemo(() => docs.find((d) => d.id === pipelineId) ?? docs[0], [docs, pipelineId]);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<PipelineNodeData>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);
  const [validationOpen, setValidationOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [clipboard, setClipboard] = useState<CanvasState | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [undoStack, setUndoStack] = useState<CanvasState[]>([]);
  const [redoStack, setRedoStack] = useState<CanvasState[]>([]);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const rf = useReactFlow();

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }, []);

  const edgeStyle = useMemo(() => ({
    type: "smoothstep" as const,
    style: { stroke: isDark ? "rgba(148,163,184,0.5)" : "rgba(100,116,139,0.55)", strokeWidth: 1.8 },
    markerEnd: { type: MarkerType.ArrowClosed, color: isDark ? "rgba(148,163,184,0.7)" : "rgba(100,116,139,0.7)" },
  }), [isDark]);

  const toRfNode = useCallback((n: PipelineNode): Node<PipelineNodeData> => ({
    id: n.id,
    type: "pipeline",
    position: n.position,
    data: {
      ...n.data,
      __nodeType: n.type,
      selected: false,
      onConfig: () => { setSelectedNodeId(n.id); setConfigOpen(true); },
    },
    draggable: true,
  }), []);

  const toRfEdge = useCallback((e: PipelineEdge): Edge => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? null,
    targetHandle: e.targetHandle ?? null,
    animated: e.animated,
    ...edgeStyle,
  }), [edgeStyle]);

  useEffect(() => {
    if (!doc) return;
    setRfNodes(doc.nodes.map(toRfNode));
    setRfEdges(doc.edges.map(toRfEdge));
    setSelectedNodeId(null);
    setConfigOpen(false);
    setUndoStack([]);
    setRedoStack([]);
  }, [doc, toRfNode, toRfEdge, setRfNodes, setRfEdges]);

  const snapshot = useCallback((): CanvasState => ({
    nodes: rfNodes.map((n) => ({ ...n, data: { ...n.data } })),
    edges: rfEdges.map((e) => ({ ...e })),
  }), [rfNodes, rfEdges]);

  const pushUndo = useCallback(() => {
    setUndoStack((s) => [...s.slice(-49), snapshot()]);
    setRedoStack([]);
  }, [snapshot]);

  const persist = useCallback((markDirty = true) => {
    if (!doc) return;
    const nodes: PipelineNode[] = rfNodes.map((n) => ({
      id: n.id, type: n.data.__nodeType, position: n.position,
      data: { label: n.data.label, config: n.data.config, status: n.data.status, assetRef: n.data.assetRef },
    }));
    const edges: PipelineEdge[] = rfEdges.map((e) => ({
      id: e.id, source: e.source, target: e.target,
      sourceHandle: e.sourceHandle ?? null, targetHandle: e.targetHandle ?? null, animated: e.animated,
    }));
    pipelineStore.setCanvas(doc.id, nodes, edges, markDirty);
  }, [doc, rfNodes, rfEdges]);

  const onConnect: OnConnect = useCallback((connection: Connection) => {
    pushUndo();
    setRfEdges((eds) => addEdge({ ...connection, ...edgeStyle, animated: true }, eds));
    setTimeout(() => persist(), 0);
  }, [edgeStyle, pushUndo, setRfEdges, persist]);

  const addNode = useCallback((type: string, position?: { x: number; y: number }) => {
    const def = NODE_TYPE_MAP[type];
    if (!def) return;
    pushUndo();
    const id = nextId();
    const pos = position ?? (() => {
      const c = rf.getViewport();
      return { x: (220 - c.x) / c.zoom, y: (160 - c.y) / c.zoom };
    })();
    const newNode: Node<PipelineNodeData> = {
      id, type: "pipeline", position: pos,
      data: {
        label: def.label, config: { ...def.defaultConfig }, __nodeType: type,
        selected: false, onConfig: () => { setSelectedNodeId(id); setConfigOpen(true); },
      },
    };
    setRfNodes((ns) => [...ns, newNode]);
    setPickerOpen(false);
    setTimeout(() => persist(), 0);
  }, [pushUndo, rf, setRfNodes, persist]);

  const updateNode = useCallback((id: string, patch: Partial<PipelineNode["data"]>) => {
    setRfNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)));
    setTimeout(() => persist(), 0);
  }, [setRfNodes, persist]);

  const deleteNode = useCallback((id: string) => {
    pushUndo();
    setRfNodes((ns) => ns.filter((n) => n.id !== id));
    setRfEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
    setConfigOpen(false);
    setSelectedNodeId(null);
    setTimeout(() => persist(), 0);
  }, [pushUndo, setRfNodes, setRfEdges, persist]);

  const selectedNode = useMemo<PipelineNode | null>(() => {
    if (!selectedNodeId) return null;
    const n = rfNodes.find((x) => x.id === selectedNodeId);
    if (!n) return null;
    return { id: n.id, type: n.data.__nodeType, position: n.position, data: { label: n.data.label, config: n.data.config, status: n.data.status, assetRef: n.data.assetRef } };
  }, [selectedNodeId, rfNodes]);

  const issues = useMemo<ValidationIssue[]>(() => {
    const nodes: PipelineNode[] = rfNodes.map((n) => ({ id: n.id, type: n.data.__nodeType, position: n.position, data: { label: n.data.label, config: n.data.config } }));
    return validatePipeline(nodes, rfEdges as PipelineEdge[]);
  }, [rfNodes, rfEdges]);

  const counts = useMemo(() => issueCounts(issues), [issues]);

  const runPipeline = useCallback(() => {
    if (counts.errors > 0) {
      setValidationOpen(true);
      showToast("Fix errors before running");
      return;
    }
    setRunning(true);
    const ids = rfNodes.filter((n) => n.data.__nodeType !== "comment").map((n) => n.id);
    setRfNodes((ns) => ns.map((n) => ({ ...n, data: { ...n.data, status: "queued" as NodeStatus } })));
    ids.forEach((id, i) => {
      setTimeout(() => {
        setRfNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, status: "running" as NodeStatus } } : n)));
        setTimeout(() => {
          setRfNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, status: "success" as NodeStatus } } : n)));
          if (i === ids.length - 1) setRunning(false);
        }, 500);
      }, i * 350);
    });
  }, [counts.errors, rfNodes, setRfNodes, showToast]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("application/pipeline-node");
    if (!type) return;
    const bounds = wrapperRef.current?.getBoundingClientRect();
    const position = bounds ? { x: (e.clientX - bounds.left - 100) / rf.getViewport().zoom, y: (e.clientY - bounds.top - 30) / rf.getViewport().zoom } : { x: 200, y: 200 };
    addNode(type, position);
  }, [rf, addNode]);

  const copySelection = useCallback(() => {
    const sel = rfNodes.filter((n) => n.selected);
    if (sel.length === 0) return;
    const selIds = new Set(sel.map((n) => n.id));
    const selEdges = rfEdges.filter((e) => selIds.has(e.source) && selIds.has(e.target));
    setClipboard({ nodes: sel.map((n) => ({ ...n, data: { ...n.data } })), edges: selEdges.map((e) => ({ ...e })) });
    showToast("Copied");
  }, [rfNodes, rfEdges, showToast]);

  const paste = useCallback(() => {
    if (!clipboard) return;
    pushUndo();
    const idMap = new Map<string, string>();
    const newNodes = clipboard.nodes.map((n) => {
      const nid = nextId();
      idMap.set(n.id, nid);
      return { ...n, id: nid, position: { x: n.position.x + 40, y: n.position.y + 40 }, selected: true, data: { ...n.data, onConfig: () => { setSelectedNodeId(nid); setConfigOpen(true); } } };
    });
    const newEdges = clipboard.edges.map((e) => ({ ...e, id: `e${nextId()}`, source: idMap.get(e.source)!, target: idMap.get(e.target)! }));
    setRfNodes((ns) => [...ns.map((n) => ({ ...n, selected: false })), ...newNodes]);
    setRfEdges((es) => [...es, ...newEdges]);
    setTimeout(() => persist(), 0);
    showToast("Pasted");
  }, [clipboard, pushUndo, setRfNodes, setRfEdges, persist, showToast]);

  const deleteSelection = useCallback(() => {
    const sel = rfNodes.filter((n) => n.selected);
    const selEdges = rfEdges.filter((e) => e.selected);
    if (sel.length === 0 && selEdges.length === 0) return;
    pushUndo();
    const ids = new Set(sel.map((n) => n.id));
    setRfNodes((ns) => ns.filter((n) => !n.selected));
    setRfEdges((es) => es.filter((e) => !e.selected && !ids.has(e.source) && !ids.has(e.target)));
    setTimeout(() => persist(), 0);
  }, [rfNodes, rfEdges, pushUndo, setRfNodes, setRfEdges, persist]);

  const undo = useCallback(() => {
    setUndoStack((s) => {
      if (s.length === 0) return s;
      setRedoStack((r) => [...r, snapshot()]);
      const prev = s[s.length - 1];
      setRfNodes(prev.nodes);
      setRfEdges(prev.edges);
      setTimeout(() => persist(), 0);
      return s.slice(0, -1);
    });
  }, [snapshot, setRfNodes, setRfEdges, persist]);

  const redo = useCallback(() => {
    setRedoStack((s) => {
      if (s.length === 0) return s;
      setUndoStack((u) => [...u, snapshot()]);
      const next = s[s.length - 1];
      setRfNodes(next.nodes);
      setRfEdges(next.edges);
      setTimeout(() => persist(), 0);
      return s.slice(0, -1);
    });
  }, [snapshot, setRfNodes, setRfEdges, persist]);

  const doAutoLayout = useCallback(() => {
    pushUndo();
    const nodes: PipelineNode[] = rfNodes.map((n) => ({ id: n.id, type: n.data.__nodeType, position: n.position, data: { label: n.data.label, config: n.data.config } }));
    const laid = autoLayout(nodes, rfEdges as PipelineEdge[]);
    const map = new Map(laid.nodes.map((n) => [n.id, n.position]));
    setRfNodes((ns) => ns.map((n) => ({ ...n, position: map.get(n.id) ?? n.position })));
    setTimeout(() => { persist(); rf.fitView({ padding: 0.15 }); }, 30);
    showToast("Auto-layout applied");
  }, [rfNodes, rfEdges, pushUndo, setRfNodes, persist, rf, showToast]);

  const groupSelection = useCallback(() => {
    const sel = rfNodes.filter((n) => n.selected);
    if (sel.length < 2) { showToast("Select 2+ nodes to group"); return; }
    pushUndo();
    const xs = sel.map((n) => n.position.x);
    const ys = sel.map((n) => n.position.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const groupId = `grp-${nextId()}`;
    const groupNode: Node<PipelineNodeData> = {
      id: groupId, type: "pipeline",
      position: { x: minX - 20, y: minY - 20 },
      data: { label: "Group", config: {}, __nodeType: "comment", __isComment: true, selected: false },
      style: { width: maxX - minX + 240, height: maxY - minY + 110, background: "rgba(99,102,241,0.06)", border: "1px dashed rgba(99,102,241,0.4)", borderRadius: 12 },
      draggable: false, selectable: false,
    };
    setRfNodes((ns) => [...ns.filter((n) => !n.selected).map((n) => ({ ...n, selected: false })), groupNode, ...sel.map((n) => ({ ...n, selected: false }))]);
    setTimeout(() => persist(), 0);
    showToast("Grouped");
  }, [rfNodes, pushUndo, setRfNodes, persist, showToast]);

  const addComment = useCallback(() => {
    addNode("comment");
  }, [addNode]);

  const savePipeline = useCallback(() => {
    if (!doc) return;
    pipelineStore.save(doc.id, "Manual save");
    showToast("Saved");
  }, [doc, showToast]);

  const publishPipeline = useCallback(() => {
    if (!doc) return;
    if (counts.errors > 0) { setValidationOpen(true); showToast("Fix errors before publishing"); return; }
    pipelineStore.publish(doc.id, "Published");
    showToast("Published");
  }, [doc, counts.errors, showToast]);

  const clonePipeline = useCallback(() => {
    if (!doc) return;
    const nid = pipelineStore.clone(doc.id);
    if (nid) { setPipelineId(nid); showToast("Pipeline cloned"); }
  }, [doc, showToast]);

  const deletePipeline = useCallback(() => {
    if (!doc) return;
    if (docs.length <= 1) { showToast("Cannot delete the last pipeline"); return; }
    pipelineStore.remove(doc.id);
    setPipelineId(docs.find((d) => d.id !== doc.id)?.id ?? "");
    showToast("Pipeline deleted");
  }, [doc, docs, showToast]);

  const createPipeline = useCallback(() => {
    const nid = pipelineStore.create("Untitled Pipeline");
    setPipelineId(nid);
    showToast("Pipeline created");
  }, [showToast]);

  const onNodeClick = useCallback((_: unknown, n: Node) => {
    setSelectedNodeId(n.id);
    setConfigOpen(true);
  }, []);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return rfNodes.filter((n) => n.data.label.toLowerCase().includes(q)).slice(0, 8);
  }, [searchQuery, rfNodes]);

  const focusNode = useCallback((id: string) => {
    rf.setCenter(rfNodes.find((n) => n.id === id)!.position.x + 100, rfNodes.find((n) => n.id === id)!.position.y + 35, { zoom: 1.2, duration: 400 });
    setSelectedNodeId(id);
    setConfigOpen(true);
    setSearchOpen(false);
  }, [rf, rfNodes]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable) return;
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      else if (meta && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
      else if (meta && e.key === "c") { e.preventDefault(); copySelection(); }
      else if (meta && e.key === "v") { e.preventDefault(); paste(); }
      else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); deleteSelection(); }
      else if (meta && e.key === "s") { e.preventDefault(); savePipeline(); }
      else if (meta && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
      else if (meta && e.key === "l") { e.preventDefault(); doAutoLayout(); }
      else if (meta && e.key === "g") { e.preventDefault(); groupSelection(); }
      else if (e.key === "/" && !meta) { e.preventDefault(); addComment(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, copySelection, paste, deleteSelection, savePipeline, doAutoLayout, groupSelection, addComment]);

  const bgDot = isDark ? "rgba(148,163,184,0.12)" : "rgba(100,116,139,0.16)";

  if (!doc) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="mb-3 text-[13px]">No pipelines yet.</p>
          <Button onClick={createPipeline}><Plus className="h-4 w-4" /> Create pipeline</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-5 pt-4 lg:px-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Pipeline Studio</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{docs.length} pipelines · drag nodes to compose executable flows</p>
        </div>
        <div className="flex items-center gap-2">
          <PipelineSwitcher docs={docs} value={pipelineId} onChange={setPipelineId} onCreate={createPipeline} />
          <Button variant="outline" size="sm" onClick={() => setVersionOpen(true)}><History className="h-3.5 w-3.5" /> Versions <Badge variant="outline" className="ml-1 text-[9px]">{doc.versions.length}</Badge></Button>
          <Button variant="outline" size="sm" onClick={savePipeline}><Save className="h-3.5 w-3.5" /> Save</Button>
          <Button size="sm" onClick={publishPipeline} disabled={counts.errors > 0}><GitCommit className="h-3.5 w-3.5" /> Publish</Button>
          <Button size="sm" onClick={runPipeline} disabled={running}>
            {running ? <><Sparkles className="h-3.5 w-3.5 animate-pulse" /> Running…</> : <><Play className="h-3.5 w-3.5" /> Run</>}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <NodePalette onAddNode={addNode} />

        <div className="relative flex flex-1 flex-col overflow-hidden" ref={wrapperRef} onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card/30 px-4 py-2">
            <Badge variant={doc.publishedVersionId ? "default" : "outline"}>{doc.publishedVersionId ? "Published" : "Draft"}</Badge>
            <span className="text-[12px] font-semibold text-foreground">{doc.name}</span>
            {doc.dirty && <span className="text-[10px] text-warning">· unsaved</span>}
            <span className="text-[10.5px] text-muted-foreground">· {doc.nodes.length} nodes · updated {relativeTime(doc.updatedAt)}</span>
            <div className="flex-1" />

            <button onClick={() => setSearchOpen(true)} className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground">
              <Search className="h-3 w-3" /> Search <kbd className="ml-1 rounded bg-muted px-1 text-[9px]">⌘K</kbd>
            </button>

            <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
              <IconBtn onClick={undo} disabled={undoStack.length === 0} title="Undo (⌘Z)"><Undo2 className="h-3.5 w-3.5" /></IconBtn>
              <IconBtn onClick={redo} disabled={redoStack.length === 0} title="Redo (⌘⇧Z)"><Redo2 className="h-3.5 w-3.5" /></IconBtn>
            </div>
            <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
              <IconBtn onClick={copySelection} title="Copy (⌘C)"><Copy className="h-3.5 w-3.5" /></IconBtn>
              <IconBtn onClick={paste} disabled={!clipboard} title="Paste (⌘V)"><Clipboard className="h-3.5 w-3.5" /></IconBtn>
            </div>
            <IconBtn onClick={groupSelection} title="Group (⌘G)"><FolderPlus className="h-3.5 w-3.5" /></IconBtn>
            <IconBtn onClick={addComment} title="Comment (/)"><MessageSquarePlus className="h-3.5 w-3.5" /></IconBtn>
            <IconBtn onClick={doAutoLayout} title="Auto-layout (⌘L)"><LayoutGrid className="h-3.5 w-3.5" /></IconBtn>
            <IconBtn onClick={deleteSelection} title="Delete (Del)"><Trash2 className="h-3.5 w-3.5" /></IconBtn>

            <button onClick={() => setValidationOpen((o) => !o)} className={cn("flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium", counts.errors ? "border-destructive/40 text-destructive" : counts.warnings ? "border-warning/40 text-warning" : "border-border text-muted-foreground hover:bg-accent")}>
              {counts.errors > 0 ? <AlertCircle className="h-3 w-3" /> : counts.warnings > 0 ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3 text-success" />}
              {counts.errors + counts.warnings === 0 ? "Valid" : `${counts.errors}e ${counts.warnings}w`}
            </button>

            <button onClick={() => setPickerOpen(true)} className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden">
              <Plus className="h-3 w-3" /> Add
            </button>
            <PipelineMenu onClone={clonePipeline} onDelete={deletePipeline} onRename={(n) => pipelineStore.rename(doc.id, n)} />
          </div>

          <div className="relative flex-1 min-h-0">
            <ReactFlow
              nodes={rfNodes}
              edges={rfEdges}
              onNodesChange={(chg) => { onNodesChange(chg); if (chg.some((c) => c.type === "remove")) setTimeout(() => persist(), 0); }}
              onEdgesChange={(chg) => { onEdgesChange(chg); if (chg.some((c) => c.type === "remove")) setTimeout(() => persist(), 0); }}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onNodeDragStop={() => persist()}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.12 }}
              proOptions={{ hideAttribution: true }}
              defaultEdgeOptions={{ type: "smoothstep" }}
              className="h-full w-full"
              deleteKeyCode={null}
            >
              <Background gap={22} size={1} color={bgDot} />
              <Controls showInteractive={false} className="!bg-background/80 !border-border !backdrop-blur" />
              <MiniMap
                nodeColor={(n) => NODE_TYPE_MAP[(n.data as PipelineNodeData)?.__nodeType]?.color ?? "#64748b"}
                maskColor={isDark ? "rgba(15,23,42,0.7)" : "rgba(255,255,255,0.7)"}
                className="!bg-background/80 !border-border !backdrop-blur"
                pannable
              />
            </ReactFlow>
          </div>

          <ValidationPanel issues={issues} open={validationOpen} onSelectNode={(id) => focusNode(id)} />
        </div>

        <NodeConfigPanel node={selectedNode} open={configOpen} issues={issues} onClose={() => setConfigOpen(false)} onUpdate={updateNode} onDelete={deleteNode} onRunNode={() => showToast("Node run simulated")} />
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
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${n.color}22`, color: n.color }}><n.icon className="h-3.5 w-3.5" /></div>
                    <span className="text-[11px] font-semibold text-foreground">{n.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <VersionHistoryModal
        open={versionOpen}
        onClose={() => setVersionOpen(false)}
        versions={doc.versions}
        publishedId={doc.publishedVersionId}
        onRestore={(vid) => {
          pipelineStore.restoreVersion(doc.id, vid);
          setVersionOpen(false);
          showToast("Version restored");
        }}
      />

      <AnimatePresence>
        {searchOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[160] flex items-start justify-center pt-[15vh]" onClick={() => setSearchOpen(false)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.97, opacity: 0, y: -8 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.97, opacity: 0 }} className="relative z-10 w-full max-w-md glass-card p-3" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search nodes by name…" className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none" />
                <kbd className="rounded bg-muted px-1.5 text-[9px] text-muted-foreground">esc</kbd>
              </div>
              <div className="mt-2 max-h-[40vh] overflow-y-auto scrollbar-thin">
                {searchQuery.trim() === "" ? (
                  <div className="px-2 py-6 text-center text-[12px] text-muted-foreground">Type to search across all nodes in this pipeline.</div>
                ) : searchResults.length === 0 ? (
                  <div className="px-2 py-6 text-center text-[12px] text-muted-foreground">No nodes match "{searchQuery}".</div>
                ) : (
                  searchResults.map((n) => (
                    <button key={n.id} onClick={() => focusNode(n.id)} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left hover:bg-accent">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: `${NODE_TYPE_MAP[n.data.__nodeType]?.color}22`, color: NODE_TYPE_MAP[n.data.__nodeType]?.color }}>
                        {(() => { const I = NODE_TYPE_MAP[n.data.__nodeType]?.icon; return I ? <I className="h-3 w-3" /> : null; })()}
                      </div>
                      <span className="flex-1 truncate text-[12px] font-medium text-foreground">{n.data.label}</span>
                      <span className="text-[10px] text-muted-foreground">{NODE_TYPE_MAP[n.data.__nodeType]?.label}</span>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 rounded-lg border border-border bg-card px-4 py-2 text-[12px] font-medium text-foreground shadow-xl backdrop-blur-xl">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function IconBtn({ children, onClick, disabled, title }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; title?: string }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title} className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent">
      {children}
    </button>
  );
}

function PipelineSwitcher({ docs, value, onChange, onCreate }: { docs: PipelineDocument[]; value: string; onChange: (id: string) => void; onCreate: () => void }) {
  const [open, setOpen] = useState(false);
  const current = docs.find((p) => p.id === value);
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
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute right-0 top-full z-50 mt-1 w-80 glass-card p-1.5">
              {docs.map((p) => (
                <button key={p.id} onClick={() => { onChange(p.id); setOpen(false); }} className={cn("flex w-full flex-col rounded-md px-2.5 py-2 text-left hover:bg-accent", p.id === value && "bg-primary/10")}>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-foreground">{p.name}</span>
                    <div className="flex items-center gap-1">
                      {p.dirty && <span className="h-1.5 w-1.5 rounded-full bg-warning" />}
                      <Badge variant={p.publishedVersionId ? "default" : "outline"} className="text-[9px]">{p.publishedVersionId ? "Published" : "Draft"}</Badge>
                    </div>
                  </div>
                  <span className="truncate text-[10px] text-muted-foreground">{p.description}</span>
                </button>
              ))}
              <div className="my-1 h-px bg-border" />
              <button onClick={() => { onCreate(); setOpen(false); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[12px] font-semibold text-primary hover:bg-primary/10">
                <Plus className="h-3.5 w-3.5" /> New pipeline
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function PipelineMenu({ onClone, onDelete, onRename }: { onClone: () => void; onDelete: () => void; onRename: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState("");
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground">
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute right-0 top-full z-50 mt-1 w-48 glass-card p-1">
              <button onClick={() => { setRenaming(true); setOpen(false); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[12px] text-foreground hover:bg-accent">
                <Pencil className="h-3.5 w-3.5" /> Rename
              </button>
              <button onClick={() => { onClone(); setOpen(false); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[12px] text-foreground hover:bg-accent">
                <Copy className="h-3.5 w-3.5" /> Clone
              </button>
              <div className="my-1 h-px bg-border" />
              <button onClick={() => { onDelete(); setOpen(false); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[12px] text-destructive hover:bg-destructive/10">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <Modal open={renaming} onClose={() => setRenaming(false)} className="max-w-sm">
        <div className="border-b border-border px-5 py-4 text-[14px] font-bold text-foreground">Rename pipeline</div>
        <div className="p-5">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Pipeline name" className="h-9 w-full rounded-md border border-border bg-background px-3 text-[13px] text-foreground focus:border-primary focus:outline-none" />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setRenaming(false)}>Cancel</Button>
            <Button size="sm" onClick={() => { if (name.trim()) { onRename(name.trim()); setRenaming(false); } }}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}