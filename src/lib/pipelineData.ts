import type { LucideIcon } from "lucide-react";
import {
  Share2, Clock, Brain, History, Cpu, Sparkles, ShieldCheck, Layers3,
  Boxes, Workflow, Gavel, Database, Activity, GitBranch, Gauge,
  type LucideIcon as _LucideIcon,
} from "lucide-react";

export type NodeCategory = "source" | "intelligence" | "model" | "decision" | "output" | "governance";
export type NodeStatus = "idle" | "running" | "success" | "error" | "warning";
export type ExecutionStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled" | "warning";
export type AssetKind =
  | "pipeline" | "rule-set" | "model" | "feature-set" | "graph"
  | "temporal-profile" | "session-validator" | "replay" | "copilot-agent" | "dataset";

export interface NodeTypeDef {
  type: string;
  label: string;
  category: NodeCategory;
  icon: LucideIcon;
  color: string;
  description: string;
  inputs: number;
  outputs: number;
  defaultConfig: Record<string, unknown>;
}

export interface PipelineNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    config: Record<string, unknown>;
    status?: NodeStatus;
    assetRef?: string;
  };
}

export interface PipelineEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  animated?: boolean;
}

export interface Pipeline {
  id: string;
  name: string;
  description: string;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  version: string;
  updatedAt: string;
  tags: string[];
  owner: string;
}

export interface ExecutionStep {
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  status: ExecutionStatus;
  startedAt: string;
  durationMs: number;
  rowsIn?: number;
  rowsOut?: number;
  log: string[];
}

export interface Execution {
  id: string;
  pipelineId: string;
  pipelineName: string;
  status: ExecutionStatus;
  trigger: "manual" | "schedule" | "webhook" | "api";
  startedAt: string;
  finishedAt: string | null;
  durationMs: number;
  steps: ExecutionStep[];
  triggeredBy: string;
  metrics: { throughput: number; decisions: { allow: number; challenge: number; deny: number }; avgLatencyMs: number };
}

export interface AssetRecord {
  id: string;
  name: string;
  kind: AssetKind;
  description: string;
  version: string;
  owner: string;
  updatedAt: string;
  tags: string[];
  stats: { label: string; value: string }[];
  status: "active" | "draft" | "archived";
  usedByPipelines: number;
}

export const NODE_TYPES: NodeTypeDef[] = [
  { type: "session-source", label: "Session Source", category: "source", icon: Database, color: "#0ea5e9", description: "Ingest login sessions from the session store or a dataset asset.", inputs: 0, outputs: 1, defaultConfig: { source: "session-store", batchSize: 500, filter: "status:Success" } },
  { type: "dataset-source", label: "Dataset Source", category: "source", icon: Database, color: "#06b6d4", description: "Load a labelled dataset asset for training or backtesting.", inputs: 0, outputs: 1, defaultConfig: { datasetAssetId: "", split: "train" } },
  { type: "rule-intelligence", label: "Rule Intelligence", category: "intelligence", icon: Layers3, color: "#8b5cf6", description: "Parse, cluster, and engineer features from a rule-set asset.", inputs: 1, outputs: 2, defaultConfig: { ruleSetAssetId: "", clusterAlgorithm: "dbscan", featureEngineering: true } },
  { type: "rule-clustering", label: "Rule Clustering", category: "intelligence", icon: Boxes, color: "#a855f7", description: "Group similar rules into clusters for governance.", inputs: 1, outputs: 1, defaultConfig: { algorithm: "dbscan", minSamples: 3 } },
  { type: "feature-engineering", label: "Feature Engineering", category: "intelligence", icon: Workflow, color: "#d946ef", description: "Derive engineered features from rule parameters and thresholds.", inputs: 1, outputs: 1, defaultConfig: { vectorize: true, pca: 24 } },
  { type: "graph-intelligence", label: "Graph Intelligence", category: "intelligence", icon: Share2, color: "#10b981", description: "Build entity relationship graph and detect fraud rings.", inputs: 1, outputs: 1, defaultConfig: { rings: 2, minStrength: 0.4 } },
  { type: "temporal-intelligence", label: "Temporal Intelligence", category: "intelligence", icon: Clock, color: "#14b8a6", description: "Time-series anomaly and velocity detection.", inputs: 1, outputs: 1, defaultConfig: { windows: ["5m", "1h", "24h"], sensitivity: 0.7 } },
  { type: "coherence-brain", label: "Coherence Brain", category: "model", icon: Brain, color: "#f59e0b", description: "Core ML inference engine producing coherence scores.", inputs: 1, outputs: 1, defaultConfig: { modelAssetId: "", threshold: 0.5 } },
  { type: "model-studio", label: "Model Studio", category: "model", icon: Cpu, color: "#f97316", description: "Train, evaluate, and register risk models.", inputs: 2, outputs: 1, defaultConfig: { mode: "train", algorithm: "gradient-boosted", validationSplit: 0.2 } },
  { type: "session-validation", label: "Session Validation", category: "decision", icon: ShieldCheck, color: "#22c55e", description: "Validate sessions against the full rule intelligence pipeline.", inputs: 1, outputs: 1, defaultConfig: { strictMode: true, emitReasonCodes: true } },
  { type: "rule-studio", label: "Rule Studio", category: "governance", icon: Gavel, color: "#6366f1", description: "Author, test, and deploy risk rules.", inputs: 1, outputs: 1, defaultConfig: { environment: "staging", dryRun: false } },
  { type: "replay-studio", label: "Replay Studio", category: "output", icon: History, color: "#ec4899", description: "Replay sessions step-by-step against a pipeline snapshot.", inputs: 1, outputs: 1, defaultConfig: { speed: 1, breakpoints: [] } },
  { type: "ai-copilot", label: "AI Copilot", category: "output", icon: Sparkles, color: "#0ea5e9", description: "Conversational risk assistant over pipeline results.", inputs: 1, outputs: 1, defaultConfig: { model: "gpt-4o", contextWindow: 32 } },
  { type: "decision-router", label: "Decision Router", category: "decision", icon: GitBranch, color: "#ef4444", description: "Route decisions to allow, challenge, or deny based on scores.", inputs: 2, outputs: 3, defaultConfig: { allowThreshold: 40, challengeThreshold: 75 } },
  { type: "webhook-output", label: "Webhook Output", category: "output", icon: Activity, color: "#84cc16", description: "Emit pipeline results to an external webhook.", inputs: 1, outputs: 0, defaultConfig: { url: "", method: "POST" } },
  { type: "metrics-output", label: "Metrics Output", category: "output", icon: Gauge, color: "#3b82f6", description: "Publish pipeline metrics to the observability backend.", inputs: 1, outputs: 0, defaultConfig: { sink: "prometheus" } },
];

export const NODE_TYPE_MAP: Record<string, NodeTypeDef> = Object.fromEntries(
  NODE_TYPES.map((n) => [n.type, n]),
);

export const CATEGORY_META: Record<NodeCategory, { label: string; color: string }> = {
  source: { label: "Sources", color: "#0ea5e9" },
  intelligence: { label: "Intelligence", color: "#8b5cf6" },
  model: { label: "Models", color: "#f59e0b" },
  decision: { label: "Decisions", color: "#ef4444" },
  output: { label: "Outputs", color: "#84cc16" },
  governance: { label: "Governance", color: "#6366f1" },
};

const now = () => new Date().toISOString();
const iso = (offsetMin: number) => new Date(Date.now() - offsetMin * 60_000).toISOString();

export const SAMPLE_PIPELINES: Pipeline[] = [
  {
    id: "pl-realtime-session-scoring",
    name: "Realtime Session Scoring",
    description: "Production pipeline scoring every login session through rule intelligence, graph, temporal, and the Coherence Brain.",
    version: "v3.2.1",
    updatedAt: iso(12),
    owner: "fraud-platform",
    tags: ["production", "realtime", "scoring"],
    nodes: [
      { id: "n1", type: "session-source", position: { x: 40, y: 200 }, data: { label: "Session Source", config: { source: "session-store", batchSize: 500 } } },
      { id: "n2", type: "rule-intelligence", position: { x: 320, y: 80 }, data: { label: "Rule Intelligence", config: { ruleSetAssetId: "rs-prod-v3", clusterAlgorithm: "dbscan" } } },
      { id: "n3", type: "graph-intelligence", position: { x: 320, y: 320 }, data: { label: "Graph Intelligence", config: { rings: 2 } } },
      { id: "n4", type: "temporal-intelligence", position: { x: 600, y: 200 }, data: { label: "Temporal Intelligence", config: { windows: ["5m", "1h", "24h"] } } },
      { id: "n5", type: "coherence-brain", position: { x: 880, y: 200 }, data: { label: "Coherence Brain", config: { modelAssetId: "m-wcm-v32", threshold: 0.5 } } },
      { id: "n6", type: "decision-router", position: { x: 1160, y: 200 }, data: { label: "Decision Router", config: { allowThreshold: 40, challengeThreshold: 75 } } },
      { id: "n7", type: "webhook-output", position: { x: 1440, y: 80 }, data: { label: "Allow Webhook", config: { url: "/api/decisions/allow" } } },
      { id: "n8", type: "webhook-output", position: { x: 1440, y: 200 }, data: { label: "Challenge Webhook", config: { url: "/api/decisions/challenge" } } },
      { id: "n9", type: "webhook-output", position: { x: 1440, y: 320 }, data: { label: "Deny Webhook", config: { url: "/api/decisions/deny" } } },
      { id: "n10", type: "metrics-output", position: { x: 1440, y: 440 }, data: { label: "Metrics", config: { sink: "prometheus" } } },
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2", animated: true },
      { id: "e2", source: "n1", target: "n3", animated: true },
      { id: "e3", source: "n2", target: "n4" },
      { id: "e4", source: "n3", target: "n4" },
      { id: "e5", source: "n4", target: "n5", animated: true },
      { id: "e6", source: "n5", target: "n6", animated: true },
      { id: "e7", source: "n6", target: "n7", sourceHandle: "allow" },
      { id: "e8", source: "n6", target: "n8", sourceHandle: "challenge" },
      { id: "e9", source: "n6", target: "n9", sourceHandle: "deny" },
      { id: "e10", source: "n6", target: "n10" },
    ],
  },
  {
    id: "pl-rule-intelligence-build",
    name: "Rule Intelligence Build",
    description: "Parse uploaded rule markdown, cluster, engineer features, and register a feature-set asset.",
    version: "v1.4.0",
    updatedAt: iso(180),
    owner: "governance-team",
    tags: ["governance", "rules", "features"],
    nodes: [
      { id: "b1", type: "dataset-source", position: { x: 40, y: 200 }, data: { label: "Rule Markdown", config: { datasetAssetId: "ds-rules-md" } } },
      { id: "b2", type: "rule-intelligence", position: { x: 320, y: 200 }, data: { label: "Parse & Classify", config: { ruleSetAssetId: "rs-inbound" } } },
      { id: "b3", type: "rule-clustering", position: { x: 600, y: 120 }, data: { label: "Cluster Rules", config: { algorithm: "dbscan" } } },
      { id: "b4", type: "feature-engineering", position: { x: 600, y: 300 }, data: { label: "Engineer Features", config: { pca: 24 } } },
      { id: "b5", type: "rule-studio", position: { x: 880, y: 200 }, data: { label: "Publish Rule Set", config: { environment: "staging" } } },
    ],
    edges: [
      { id: "be1", source: "b1", target: "b2", animated: true },
      { id: "be2", source: "b2", target: "b3" },
      { id: "be3", source: "b2", target: "b4" },
      { id: "be4", source: "b3", target: "b5" },
      { id: "be5", source: "b4", target: "b5" },
    ],
  },
  {
    id: "pl-model-training",
    name: "Model Training & Evaluation",
    description: "Train a gradient-boosted model on labelled sessions, evaluate ROC, and register the model asset.",
    version: "v2.0.3",
    updatedAt: iso(1440),
    owner: "ml-ops",
    tags: ["ml", "training", "evaluation"],
    nodes: [
      { id: "t1", type: "dataset-source", position: { x: 40, y: 200 }, data: { label: "Labelled Sessions", config: { datasetAssetId: "ds-labelled", split: "train" } } },
      { id: "t2", type: "feature-engineering", position: { x: 320, y: 200 }, data: { label: "Feature Engineering", config: { vectorize: true } } },
      { id: "t3", type: "model-studio", position: { x: 600, y: 200 }, data: { label: "Train Model", config: { algorithm: "gradient-boosted", validationSplit: 0.2 } } },
      { id: "t4", type: "metrics-output", position: { x: 880, y: 200 }, data: { label: "Publish Metrics", config: { sink: "prometheus" } } },
    ],
    edges: [
      { id: "te1", source: "t1", target: "t2", animated: true },
      { id: "te2", source: "t2", target: "t3", animated: true },
      { id: "te3", source: "t3", target: "t4" },
    ],
  },
  {
    id: "pl-session-investigation",
    name: "Session Investigation Replay",
    description: "Replay a flagged session through the full pipeline and surface results to the AI Copilot.",
    version: "v1.1.0",
    updatedAt: iso(60),
    owner: "investigations",
    tags: ["investigation", "replay", "copilot"],
    nodes: [
      { id: "i1", type: "session-source", position: { x: 40, y: 200 }, data: { label: "Flagged Session", config: { filter: "decision:Deny" } } },
      { id: "i2", type: "graph-intelligence", position: { x: 320, y: 120 }, data: { label: "Entity Graph", config: { rings: 3 } } },
      { id: "i3", type: "temporal-intelligence", position: { x: 320, y: 300 }, data: { label: "Velocity", config: { windows: ["1h"] } } },
      { id: "i4", type: "replay-studio", position: { x: 600, y: 200 }, data: { label: "Replay", config: { speed: 1 } } },
      { id: "i5", type: "ai-copilot", position: { x: 880, y: 200 }, data: { label: "Copilot Summary", config: { model: "gpt-4o" } } },
    ],
    edges: [
      { id: "ie1", source: "i1", target: "i2", animated: true },
      { id: "ie2", source: "i1", target: "i3", animated: true },
      { id: "ie3", source: "i2", target: "i4" },
      { id: "ie4", source: "i3", target: "i4" },
      { id: "ie5", source: "i4", target: "i5", animated: true },
    ],
  },
];

export const SAMPLE_ASSETS: AssetRecord[] = [
  { id: "rs-prod-v3", name: "Production Rule Set v3", kind: "rule-set", description: "412 parsed risk rules across 14 clusters, deployed to production.", version: "v3.0", owner: "governance-team", updatedAt: iso(240), tags: ["production", "rules"], status: "active", usedByPipelines: 2, stats: [{ label: "Rules", value: "412" }, { label: "Clusters", value: "14" }, { label: "Confidence", value: "91%" }] },
  { id: "rs-inbound", name: "Inbound Rule Markdown", kind: "rule-set", description: "Raw markdown rule definitions awaiting parsing and clustering.", version: "draft", owner: "governance-team", updatedAt: iso(30), tags: ["draft", "rules"], status: "draft", usedByPipelines: 1, stats: [{ label: "Files", value: "28" }, { label: "Words", value: "12.4k" }] },
  { id: "m-wcm-v32", name: "Weighted Coherence Model", kind: "model", description: "Weighted ensemble risk model, AUC 0.961, deployed to production.", version: "v3.2", owner: "ml-ops", updatedAt: iso(4320), tags: ["production", "ensemble"], status: "active", usedByPipelines: 1, stats: [{ label: "ROC", value: "0.961" }, { label: "Accuracy", value: "94.2%" }, { label: "Latency", value: "12ms" }] },
  { id: "m-gbm-v2", name: "Gradient Boosted Model", kind: "model", description: "Gradient-boosted trees trained on labelled sessions, AUC 0.948.", version: "v2.0", owner: "ml-ops", updatedAt: iso(2880), tags: ["training", "gbm"], status: "active", usedByPipelines: 1, stats: [{ label: "ROC", value: "0.948" }, { label: "Precision", value: "91.8%" }, { label: "Recall", value: "90.4%" }] },
  { id: "fs-engineered-v24", name: "Engineered Feature Set v24", kind: "feature-set", description: "24 PCA-reduced features derived from rule parameters and thresholds.", version: "v24", owner: "ml-ops", updatedAt: iso(720), tags: ["features", "pca"], status: "active", usedByPipelines: 2, stats: [{ label: "Features", value: "24" }, { label: "Domains", value: "6" }, { label: "Coverage", value: "98%" }] },
  { id: "g-entity-graph", name: "Entity Relationship Graph", kind: "graph", description: "Customer-device-IP relationship graph with fraud ring detection.", version: "v1.5", owner: "investigations", updatedAt: iso(90), tags: ["graph", "rings"], status: "active", usedByPipelines: 2, stats: [{ label: "Entities", value: "1.2M" }, { label: "Edges", value: "4.8M" }, { label: "Rings", value: "37" }] },
  { id: "tp-velocity", name: "Velocity Temporal Profile", kind: "temporal-profile", description: "5m / 1h / 24h velocity windows with anomaly detection thresholds.", version: "v1.2", owner: "fraud-platform", updatedAt: iso(360), tags: ["temporal", "velocity"], status: "active", usedByPipelines: 1, stats: [{ label: "Windows", value: "3" }, { label: "Sensitivity", value: "0.7" }] },
  { id: "sv-full-pipeline", name: "Full Pipeline Validator", kind: "session-validator", description: "Validates sessions against the complete rule intelligence pipeline with reason codes.", version: "v2.1", owner: "fraud-platform", updatedAt: iso(120), tags: ["validation", "reason-codes"], status: "active", usedByPipelines: 1, stats: [{ label: "Strict", value: "true" }, { label: "Reason Codes", value: "on" }] },
  { id: "rp-session-replay", name: "Session Replay Pack", kind: "replay", description: "Step-by-step replay engine for flagged session investigation.", version: "v1.0", owner: "investigations", updatedAt: iso(45), tags: ["replay", "investigation"], status: "active", usedByPipelines: 1, stats: [{ label: "Speed", value: "1x" }, { label: "Breakpoints", value: "0" }] },
  { id: "cp-risk-analyst", name: "Risk Analyst Copilot", kind: "copilot-agent", description: "Conversational assistant over pipeline results and session evidence.", version: "v1.3", owner: "fraud-platform", updatedAt: iso(15), tags: ["copilot", "ai"], status: "active", usedByPipelines: 1, stats: [{ label: "Model", value: "gpt-4o" }, { label: "Context", value: "32k" }] },
  { id: "ds-labelled", name: "Labelled Sessions Dataset", kind: "dataset", description: "50k labelled login sessions for model training and backtesting.", version: "v2.0", owner: "ml-ops", updatedAt: iso(5760), tags: ["dataset", "training"], status: "active", usedByPipelines: 1, stats: [{ label: "Rows", value: "50k" }, { label: "Labels", value: "Allow/Chal/Deny" }] },
  { id: "ds-rules-md", name: "Rule Markdown Corpus", kind: "dataset", description: "Raw markdown rule definitions from the fraud policy team.", version: "v1.0", owner: "governance-team", updatedAt: iso(2880), tags: ["dataset", "rules"], status: "active", usedByPipelines: 1, stats: [{ label: "Files", value: "28" }, { label: "Words", value: "12.4k" }] },
];

export const SAMPLE_EXECUTIONS: Execution[] = [
  {
    id: "ex-9f3a",
    pipelineId: "pl-realtime-session-scoring",
    pipelineName: "Realtime Session Scoring",
    status: "succeeded",
    trigger: "schedule",
    startedAt: iso(12),
    finishedAt: iso(11),
    durationMs: 48213,
    triggeredBy: "scheduler",
    metrics: { throughput: 412, decisions: { allow: 318, challenge: 64, deny: 30 }, avgLatencyMs: 88 },
    steps: [
      { nodeId: "n1", nodeLabel: "Session Source", nodeType: "session-source", status: "succeeded", startedAt: iso(12), durationMs: 412, rowsOut: 412, log: ["Ingested 412 sessions from session-store"] },
      { nodeId: "n2", nodeLabel: "Rule Intelligence", nodeType: "rule-intelligence", status: "succeeded", startedAt: iso(12), durationMs: 8421, rowsIn: 412, rowsOut: 412, log: ["Parsed 412 rules", "14 clusters detected", "24 features engineered"] },
      { nodeId: "n3", nodeLabel: "Graph Intelligence", nodeType: "graph-intelligence", status: "succeeded", startedAt: iso(12), durationMs: 11240, rowsIn: 412, rowsOut: 412, log: ["Built entity graph", "2 fraud rings flagged"] },
      { nodeId: "n4", nodeLabel: "Temporal Intelligence", nodeType: "temporal-intelligence", status: "succeeded", startedAt: iso(11), durationMs: 6230, rowsIn: 412, rowsOut: 412, log: ["Velocity windows 5m/1h/24h", "17 velocity anomalies"] },
      { nodeId: "n5", nodeLabel: "Coherence Brain", nodeType: "coherence-brain", status: "succeeded", startedAt: iso(11), durationMs: 4980, rowsIn: 412, rowsOut: 412, log: ["Inference complete", "Avg coherence 0.72"] },
      { nodeId: "n6", nodeLabel: "Decision Router", nodeType: "decision-router", status: "succeeded", startedAt: iso(11), durationMs: 320, rowsIn: 412, rowsOut: 412, log: ["318 allow", "64 challenge", "30 deny"] },
      { nodeId: "n7", nodeLabel: "Allow Webhook", nodeType: "webhook-output", status: "succeeded", startedAt: iso(11), durationMs: 180, rowsIn: 318, log: ["POSTed 318 allow decisions"] },
      { nodeId: "n8", nodeLabel: "Challenge Webhook", nodeType: "webhook-output", status: "succeeded", startedAt: iso(11), durationMs: 210, rowsIn: 64, log: ["POSTed 64 challenge decisions"] },
      { nodeId: "n9", nodeLabel: "Deny Webhook", nodeType: "webhook-output", status: "warning", startedAt: iso(11), durationMs: 240, rowsIn: 30, log: ["POSTed 30 deny decisions", "2 webhooks retried"] },
      { nodeId: "n10", nodeLabel: "Metrics", nodeType: "metrics-output", status: "succeeded", startedAt: iso(11), durationMs: 90, rowsIn: 412, log: ["Published 14 metrics to prometheus"] },
    ],
  },
  {
    id: "ex-2c1b",
    pipelineId: "pl-realtime-session-scoring",
    pipelineName: "Realtime Session Scoring",
    status: "running",
    trigger: "schedule",
    startedAt: iso(1),
    finishedAt: null,
    durationMs: 0,
    triggeredBy: "scheduler",
    metrics: { throughput: 0, decisions: { allow: 0, challenge: 0, deny: 0 }, avgLatencyMs: 0 },
    steps: [
      { nodeId: "n1", nodeLabel: "Session Source", nodeType: "session-source", status: "succeeded", startedAt: iso(1), durationMs: 380, rowsOut: 388, log: ["Ingested 388 sessions"] },
      { nodeId: "n2", nodeLabel: "Rule Intelligence", nodeType: "rule-intelligence", status: "running", startedAt: iso(1), durationMs: 0, rowsIn: 388, log: ["Parsing rules..."] },
      { nodeId: "n3", nodeLabel: "Graph Intelligence", nodeType: "graph-intelligence", status: "queued", startedAt: iso(1), durationMs: 0, log: [] },
      { nodeId: "n4", nodeLabel: "Temporal Intelligence", nodeType: "temporal-intelligence", status: "queued", startedAt: iso(1), durationMs: 0, log: [] },
      { nodeId: "n5", nodeLabel: "Coherence Brain", nodeType: "coherence-brain", status: "queued", startedAt: iso(1), durationMs: 0, log: [] },
      { nodeId: "n6", nodeLabel: "Decision Router", nodeType: "decision-router", status: "queued", startedAt: iso(1), durationMs: 0, log: [] },
    ],
  },
  {
    id: "ex-7d44",
    pipelineId: "pl-rule-intelligence-build",
    pipelineName: "Rule Intelligence Build",
    status: "succeeded",
    trigger: "manual",
    startedAt: iso(180),
    finishedAt: iso(178),
    durationMs: 124_000,
    triggeredBy: "governance-team",
    metrics: { throughput: 0, decisions: { allow: 0, challenge: 0, deny: 0 }, avgLatencyMs: 0 },
    steps: [
      { nodeId: "b1", nodeLabel: "Rule Markdown", nodeType: "dataset-source", status: "succeeded", startedAt: iso(180), durationMs: 1200, rowsOut: 28, log: ["Loaded 28 markdown files"] },
      { nodeId: "b2", nodeLabel: "Parse & Classify", nodeType: "rule-intelligence", status: "succeeded", startedAt: iso(180), durationMs: 48_000, rowsIn: 28, rowsOut: 412, log: ["Parsed 412 rules", "14 clusters"] },
      { nodeId: "b3", nodeLabel: "Cluster Rules", nodeType: "rule-clustering", status: "succeeded", startedAt: iso(179), durationMs: 32_000, rowsIn: 412, rowsOut: 14, log: ["DBSCAN clusters: 14"] },
      { nodeId: "b4", nodeLabel: "Engineer Features", nodeType: "feature-engineering", status: "succeeded", startedAt: iso(179), durationMs: 28_000, rowsIn: 412, rowsOut: 24, log: ["24 PCA features"] },
      { nodeId: "b5", nodeLabel: "Publish Rule Set", nodeType: "rule-studio", status: "succeeded", startedAt: iso(178), durationMs: 14_000, rowsIn: 14, log: ["Published rs-prod-v3 to staging"] },
    ],
  },
  {
    id: "ex-5e21",
    pipelineId: "pl-model-training",
    pipelineName: "Model Training & Evaluation",
    status: "failed",
    trigger: "manual",
    startedAt: iso(1440),
    finishedAt: iso(1438),
    durationMs: 198_000,
    triggeredBy: "ml-ops",
    metrics: { throughput: 0, decisions: { allow: 0, challenge: 0, deny: 0 }, avgLatencyMs: 0 },
    steps: [
      { nodeId: "t1", nodeLabel: "Labelled Sessions", nodeType: "dataset-source", status: "succeeded", startedAt: iso(1440), durationMs: 3200, rowsOut: 50000, log: ["Loaded 50k labelled rows"] },
      { nodeId: "t2", nodeLabel: "Feature Engineering", nodeType: "feature-engineering", status: "succeeded", startedAt: iso(1440), durationMs: 62_000, rowsIn: 50000, rowsOut: 50000, log: ["Vectorized", "PCA to 24 dims"] },
      { nodeId: "t3", nodeLabel: "Train Model", nodeType: "model-studio", status: "failed", startedAt: iso(1439), durationMs: 132_000, rowsIn: 50000, log: ["Training started", "ERROR: GPU OOM at epoch 12", "Run aborted"] },
      { nodeId: "t4", nodeLabel: "Publish Metrics", nodeType: "metrics-output", status: "cancelled", startedAt: iso(1438), durationMs: 0, log: [] },
    ],
  },
  {
    id: "ex-1a8f",
    pipelineId: "pl-session-investigation",
    pipelineName: "Session Investigation Replay",
    status: "succeeded",
    trigger: "api",
    startedAt: iso(60),
    finishedAt: iso(59),
    durationMs: 38_000,
    triggeredBy: "investigator-7",
    metrics: { throughput: 1, decisions: { allow: 0, challenge: 0, deny: 1 }, avgLatencyMs: 38 },
    steps: [
      { nodeId: "i1", nodeLabel: "Flagged Session", nodeType: "session-source", status: "succeeded", startedAt: iso(60), durationMs: 120, rowsOut: 1, log: ["Loaded S-10432"] },
      { nodeId: "i2", nodeLabel: "Entity Graph", nodeType: "graph-intelligence", status: "succeeded", startedAt: iso(60), durationMs: 12_000, rowsIn: 1, rowsOut: 1, log: ["3-ring graph built", "1 flagged ring"] },
      { nodeId: "i3", nodeLabel: "Velocity", nodeType: "temporal-intelligence", status: "succeeded", startedAt: iso(60), durationMs: 8_400, rowsIn: 1, rowsOut: 1, log: ["Velocity anomaly: 14 logins/5m"] },
      { nodeId: "i4", nodeLabel: "Replay", nodeType: "replay-studio", status: "succeeded", startedAt: iso(59), durationMs: 9_200, rowsIn: 1, rowsOut: 1, log: ["Replay complete", "Breakpoint at step 7"] },
      { nodeId: "i5", nodeLabel: "Copilot Summary", nodeType: "ai-copilot", status: "succeeded", startedAt: iso(59), durationMs: 8_280, rowsIn: 1, log: ["Generated narrative summary", "3 reason codes surfaced"] },
    ],
  },
];

export const ASSET_KIND_META: Record<AssetKind, { label: string; icon: LucideIcon; color: string }> = {
  pipeline: { label: "Pipeline", icon: Workflow, color: "#0ea5e9" },
  "rule-set": { label: "Rule Set", icon: Layers3, color: "#8b5cf6" },
  model: { label: "Model", icon: Cpu, color: "#f59e0b" },
  "feature-set": { label: "Feature Set", icon: Workflow, color: "#d946ef" },
  graph: { label: "Graph", icon: Share2, color: "#10b981" },
  "temporal-profile": { label: "Temporal Profile", icon: Clock, color: "#14b8a6" },
  "session-validator": { label: "Session Validator", icon: ShieldCheck, color: "#22c55e" },
  replay: { label: "Replay", icon: History, color: "#ec4899" },
  "copilot-agent": { label: "Copilot Agent", icon: Sparkles, color: "#0ea5e9" },
  dataset: { label: "Dataset", icon: Database, color: "#06b6d4" },
};
