import { NODE_TYPE_MAP, type PipelineNode, type PipelineEdge } from "./pipelineData";

export type IssueSeverity = "error" | "warning";

export interface ValidationIssue {
  id: string;
  severity: IssueSeverity;
  message: string;
  nodeId?: string;
  edgeId?: string;
}

export function validatePipeline(nodes: PipelineNode[], edges: PipelineEdge[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const nodeIds = new Set(nodes.map((n) => n.id));

  if (nodes.length === 0) {
    issues.push({ id: "empty", severity: "warning", message: "Pipeline is empty. Add nodes to get started." });
    return issues;
  }

  const sources = nodes.filter((n) => NODE_TYPE_MAP[n.type]?.inputs === 0 && n.type !== "comment");
  if (sources.length === 0) {
    issues.push({ id: "no-source", severity: "error", message: "Pipeline has no entry point. Add a source node." });
  }

  for (const n of nodes) {
    const def = NODE_TYPE_MAP[n.type];
    if (!def) {
      issues.push({ id: `unknown-${n.id}`, severity: "error", message: `Unknown node type "${n.type}".`, nodeId: n.id });
      continue;
    }
    if (n.type === "comment") continue;
    if (def.inputs > 0) {
      const incoming = edges.filter((e) => e.target === n.id);
      if (incoming.length === 0) {
        issues.push({ id: `unconnected-in-${n.id}`, severity: "warning", message: `"${n.data.label}" has no input connection.`, nodeId: n.id });
      }
    }
    if (def.outputs > 0) {
      const outgoing = edges.filter((e) => e.source === n.id);
      if (outgoing.length === 0) {
        issues.push({ id: `unconnected-out-${n.id}`, severity: "warning", message: `"${n.data.label}" has no output connection.`, nodeId: n.id });
      }
    }
    if (!n.data.label?.trim()) {
      issues.push({ id: `nolabel-${n.id}`, severity: "error", message: "A node is missing a label.", nodeId: n.id });
    }
  }

  for (const e of edges) {
    if (!nodeIds.has(e.source)) {
      issues.push({ id: `dangling-src-${e.id}`, severity: "error", message: "Edge references a missing source node.", edgeId: e.id });
    }
    if (!nodeIds.has(e.target)) {
      issues.push({ id: `dangling-tgt-${e.id}`, severity: "error", message: "Edge references a missing target node.", edgeId: e.id });
    }
    if (e.source === e.target) {
      issues.push({ id: `self-${e.id}`, severity: "error", message: "A node cannot connect to itself.", edgeId: e.id, nodeId: e.source });
    }
  }

  const edgeKeys = new Set<string>();
  for (const e of edges) {
    const k = `${e.source}:${e.sourceHandle ?? ""}->${e.target}:${e.targetHandle ?? ""}`;
    if (edgeKeys.has(k)) {
      issues.push({ id: `dup-${e.id}`, severity: "warning", message: "Duplicate connection between the same two handles.", edgeId: e.id });
    }
    edgeKeys.add(k);
  }

  const hasCycle = detectCycle(nodes, edges);
  if (hasCycle) {
    issues.push({ id: "cycle", severity: "error", message: "Pipeline contains a cycle. Loops must use the Loop node, not circular edges." });
  }

  return issues;
}

function detectCycle(nodes: PipelineNode[], edges: PipelineEdge[]): boolean {
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) adj.get(e.source)?.push(e.target);
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>(nodes.map((n) => [n.id, WHITE]));
  let cycle = false;
  const visit = (u: string) => {
    if (cycle) return;
    color.set(u, GRAY);
    for (const v of adj.get(u) ?? []) {
      const c = color.get(v);
      if (c === GRAY) { cycle = true; return; }
      if (c === WHITE) visit(v);
    }
    color.set(u, BLACK);
  };
  for (const n of nodes) if (color.get(n.id) === WHITE) visit(n.id);
  return cycle;
}

export function issueCounts(issues: ValidationIssue[]) {
  return {
    errors: issues.filter((i) => i.severity === "error").length,
    warnings: issues.filter((i) => i.severity === "warning").length,
  };
}
