import type { PipelineEdge, PipelineNode } from "./pipelineData";

export interface ExecutionStep {
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled" | "skipped" | "warning";
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  rowsIn: number | null;
  rowsOut: number | null;
  log: string[];
  artifacts: Record<string, unknown>;
}

export interface ExecutionMetrics {
  throughput: number;
  decisions: { allow: number; challenge: number; deny: number };
  avgLatencyMs: number;
}

export interface PipelineSummary {
  id: string;
  name: string;
  description: string;
  version: string;
  owner: string;
  tags: string[];
  updatedAt: string;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
}

export interface Execution {
  id: string;
  pipelineId: string;
  pipelineName: string;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled" | "warning";
  trigger: string;
  triggeredBy: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  steps: ExecutionStep[];
  metrics: ExecutionMetrics;
  intermediate: Record<string, { rowsOut: number; logs: string[] }>;
  replayOf: string | null;
}

export interface ExecutionEvent {
  type: string;
  executionId: string;
  nodeId?: string;
  nodeLabel?: string;
  nodeType?: string;
  status?: string;
  durationMs?: number;
  rowsIn?: number | null;
  rowsOut?: number | null;
  logs?: string[];
  progress?: number;
  total?: number;
  level?: number;
  startedAt?: string;
  finishedAt?: string;
}

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export async function listPipelines(): Promise<PipelineSummary[]> {
  return j(await fetch("/api/pipelines"));
}

export async function getPipeline(id: string): Promise<PipelineSummary> {
  return j(await fetch(`/api/pipelines/${id}`));
}

export async function listExecutions(pipelineId?: string): Promise<Execution[]> {
  const qs = pipelineId ? `?pipeline_id=${encodeURIComponent(pipelineId)}` : "";
  return j(await fetch(`/api/executions${qs}`));
}

export async function getExecution(id: string): Promise<Execution> {
  return j(await fetch(`/api/executions/${id}`));
}

export async function startExecution(pipelineId: string, triggeredBy = "ui"): Promise<Execution> {
  return j(
    await fetch("/api/executions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipelineId, triggeredBy }),
    }),
  );
}

export async function cancelExecution(id: string): Promise<Execution> {
  return j(await fetch(`/api/executions/${id}/cancel`, { method: "POST" }));
}

export async function replayExecution(id: string, triggeredBy = "ui"): Promise<Execution> {
  return j(
    await fetch(`/api/executions/${id}/replay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ triggeredBy }),
    }),
  );
}

export function streamExecutionEvents(
  id: string,
  onEvent: (e: ExecutionEvent) => void,
  onEnd?: () => void,
): () => void {
  const ctrl = new AbortController();
  (async () => {
    try {
      const res = await fetch(`/api/executions/${id}/events`, { signal: ctrl.signal });
      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          try {
            const evt = JSON.parse(payload) as ExecutionEvent;
            if (evt.type === "stream_end") {
              onEnd?.();
              return;
            }
            onEvent(evt);
          } catch {
            // ignore malformed
          }
        }
      }
    } catch {
      // aborted or network error — ignore
    } finally {
      onEnd?.();
    }
  })();
  return () => ctrl.abort();
}

// ---------------------------------------------------------------------------
// Multi-pipeline comparison
// ---------------------------------------------------------------------------

export type ComparisonInputType = "login" | "file" | "dataset";

export interface ComparisonStep {
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  status: ExecutionStep["status"];
  durationMs: number;
  rowsIn: number | null;
  rowsOut: number | null;
  log: string[];
  artifacts: Record<string, unknown>;
}

export interface ComparisonResult {
  executionId: string;
  pipelineId: string;
  pipelineName: string;
  status: Execution["status"];
  durationMs: number;
  throughput: number;
  avgLatencyMs: number;
  decision: string;
  decisions: { allow: number; challenge: number; deny: number };
  fraudProbability: number | null;
  coherenceScore: number | null;
  riskScore: number | null;
  triggeredRules: number | null;
  signals: number | null;
  engineeredFeatures: number | null;
  modelAuc: number | null;
  modelPrecision: number | null;
  modelRecall: number | null;
  domainScores: Record<string, number> | null;
  reasonCodes: number | null;
  explainability: number | null;
  graphRings: number | null;
  temporalAnomalies: number | null;
  ruleCount: number | null;
  ruleClusters: number | null;
  steps: ComparisonStep[];
}

export interface BenchmarkSummary {
  completed: number;
  total: number;
  averages: Record<string, number>;
  best: Record<string, { pipeline: string; value: number }>;
  worst: Record<string, { pipeline: string; value: number }>;
  decisionDistribution: Record<string, number>;
  rankings: { rank: number; pipeline: string; score: number }[];
}

export interface ComparisonRun {
  id: string;
  pipelineIds: string[];
  inputType: ComparisonInputType;
  inputPayload: string | null;
  triggeredBy: string;
  createdAt: string;
  executionIds: string[];
  status: "running" | "succeeded" | "failed";
  results: ComparisonResult[];
  summary: Partial<BenchmarkSummary>;
}

export async function createComparison(
  pipelineIds: string[],
  inputType: ComparisonInputType = "dataset",
  inputPayload?: string,
  triggeredBy = "ui",
): Promise<ComparisonRun> {
  return j<ComparisonRun>(
    await fetch("/api/comparisons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipelineIds, inputType, inputPayload, triggeredBy }),
    }),
  );
}

export async function listComparisons(): Promise<ComparisonRun[]> {
  return j(await fetch("/api/comparisons"));
}

export async function getComparison(id: string): Promise<ComparisonRun> {
  return j(await fetch(`/api/comparisons/${id}`));
}

export async function deleteComparison(id: string): Promise<void> {
  await fetch(`/api/comparisons/${id}`, { method: "DELETE" });
}
