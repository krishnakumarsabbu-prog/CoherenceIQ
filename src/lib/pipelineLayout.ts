import type { PipelineNode, PipelineEdge } from "./pipelineData";

const NODE_W = 200;
const NODE_H = 70;
const COL_GAP = 80;
const ROW_GAP = 40;

export interface LayoutResult {
  nodes: PipelineNode[];
  layers: number;
}

function adjacency(nodes: PipelineNode[], edges: PipelineEdge[]) {
  const incoming = new Map<string, string[]>();
  const outgoing = new Map<string, string[]>();
  for (const n of nodes) {
    incoming.set(n.id, []);
    outgoing.set(n.id, []);
  }
  for (const e of edges) {
    if (incoming.has(e.target)) incoming.get(e.target)!.push(e.source);
    if (outgoing.has(e.source)) outgoing.get(e.source)!.push(e.target);
  }
  return { incoming, outgoing };
}

function detectCycles(nodes: PipelineNode[], edges: PipelineEdge[]): boolean {
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) adj.get(e.source)?.push(e.target);
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>(nodes.map((n) => [n.id, WHITE]));
  let hasCycle = false;
  const visit = (u: string) => {
    if (hasCycle) return;
    color.set(u, GRAY);
    for (const v of adj.get(u) ?? []) {
      const c = color.get(v);
      if (c === GRAY) { hasCycle = true; return; }
      if (c === WHITE) visit(v);
    }
    color.set(u, BLACK);
  };
  for (const n of nodes) if (color.get(n.id) === WHITE) visit(n.id);
  return hasCycle;
}

export function autoLayout(nodes: PipelineNode[], edges: PipelineEdge[]): LayoutResult {
  if (nodes.length === 0) return { nodes: [], layers: 0 };

  const { incoming, outgoing } = adjacency(nodes, edges);
  const hasCycle = detectCycles(nodes, edges);

  const layer = new Map<string, number>();
  if (hasCycle) {
    nodes.forEach((n, i) => layer.set(n.id, i % 3));
  } else {
    const queue: string[] = [];
    const indeg = new Map<string, number>();
    for (const n of nodes) {
      const d = incoming.get(n.id)!.length;
      indeg.set(n.id, d);
      if (d === 0) { layer.set(n.id, 0); queue.push(n.id); }
    }
    while (queue.length) {
      const u = queue.shift()!;
      const ul = layer.get(u) ?? 0;
      for (const v of outgoing.get(u) ?? []) {
        layer.set(v, Math.max(layer.get(v) ?? 0, ul + 1));
        indeg.set(v, indeg.get(v)! - 1);
        if (indeg.get(v) === 0) queue.push(v);
      }
    }
    for (const n of nodes) if (!layer.has(n.id)) layer.set(n.id, 0);
  }

  const maxLayer = Math.max(0, ...Array.from(layer.values()));
  const byLayer: Map<number, string[]> = new Map();
  for (const [id, l] of layer) {
    if (!byLayer.has(l)) byLayer.set(l, []);
    byLayer.get(l)!.push(id);
  }

  const positioned = nodes.map((n) => {
    const l = layer.get(n.id) ?? 0;
    const col = byLayer.get(l) ?? [];
    const idx = col.indexOf(n.id);
    const x = 60 + l * (NODE_W + COL_GAP);
    const y = 60 + idx * (NODE_H + ROW_GAP);
    return { ...n, position: { x, y } };
  });

  return { nodes: positioned, layers: maxLayer + 1 };
}
