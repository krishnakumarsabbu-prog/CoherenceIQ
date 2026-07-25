import type { LucideIcon } from "lucide-react";
import {
  Layers3, Boxes, Network, Radio, Workflow, FunctionSquare, Database,
  Cpu, Share2, Clock, Gavel, Puzzle, FileCode2, type LucideIcon as _LucideIcon,
} from "lucide-react";

export type AssetType =
  | "rule-set" | "cluster" | "taxonomy" | "signal"
  | "feature-set" | "feature-formula" | "dataset"
  | "predictive-model" | "graph-model" | "temporal-model"
  | "decision-policy" | "plugin" | "template";

export type ApprovalStatus = "Draft" | "In Review" | "Approved" | "Published" | "Rejected" | "Archived";
export type LifecycleStatus = "active" | "draft" | "archived";

export interface AssetVersion {
  version: string;
  author: string;
  date: string;
  change: string;
  status: ApprovalStatus;
}

export interface ApprovalStep {
  id: string;
  step: string;
  approver: string;
  role: string;
  status: "Pending" | "Approved" | "Rejected";
  date: string | null;
  comment: string;
}

export interface AssetDependency {
  assetId: string;
  assetName: string;
  assetType: AssetType;
  kind: "depends-on" | "consumed-by";
}

export interface PipelineUsage {
  pipelineId: string;
  pipelineName: string;
  nodeType: string;
  nodeLabel: string;
}

export interface AssetMetadataEntry {
  key: string;
  value: string;
}

export interface WorkspaceAsset {
  id: string;
  name: string;
  type: AssetType;
  description: string;
  version: string;
  owner: string;
  team: string;
  updatedAt: string;
  createdAt: string;
  tags: string[];
  lifecycleStatus: LifecycleStatus;
  approvalStatus: ApprovalStatus;
  stats: { label: string; value: string }[];
  metadata: AssetMetadataEntry[];
  versions: AssetVersion[];
  approvals: ApprovalStep[];
  dependencies: AssetDependency[];
  usedByPipelines: PipelineUsage[];
  color: string;
}

export const ASSET_TYPE_META: Record<AssetType, { label: string; icon: LucideIcon; color: string; description: string }> = {
  "rule-set": { label: "Rule Set", icon: Layers3, color: "#8b5cf6", description: "Collections of parsed risk rules" },
  cluster: { label: "Cluster", icon: Boxes, color: "#a855f7", description: "Grouped rule clusters for governance" },
  taxonomy: { label: "Taxonomy", icon: Network, color: "#6366f1", description: "Classification hierarchies for rules and signals" },
  signal: { label: "Signal", icon: Radio, color: "#0ea5e9", description: "Derived risk signals and indicators" },
  "feature-set": { label: "Feature Set", icon: Workflow, color: "#d946ef", description: "Engineered feature collections" },
  "feature-formula": { label: "Feature Formula", icon: FunctionSquare, color: "#c026d3", description: "Reusable feature derivation expressions" },
  dataset: { label: "Dataset", icon: Database, color: "#06b6d4", description: "Labelled data for training and backtesting" },
  "predictive-model": { label: "Predictive Model", icon: Cpu, color: "#f59e0b", description: "Trained ML risk models" },
  "graph-model": { label: "Graph Model", icon: Share2, color: "#10b981", description: "Entity relationship graph models" },
  "temporal-model": { label: "Temporal Model", icon: Clock, color: "#14b8a6", description: "Time-series anomaly and velocity models" },
  "decision-policy": { label: "Decision Policy", icon: Gavel, color: "#ef4444", description: "Deterministic decision and routing policies" },
  plugin: { label: "Plugin", icon: Puzzle, color: "#f97316", description: "Detection plugins and integrations" },
  template: { label: "Template", icon: FileCode2, color: "#64748b", description: "Reusable pipeline and asset templates" },
};

export const ASSET_TYPES = Object.keys(ASSET_TYPE_META) as AssetType[];

const now = () => new Date().toISOString();
const iso = (offsetMin: number) => new Date(Date.now() - offsetMin * 60_000).toISOString();
const date = (offsetDays: number) => new Date(Date.now() - offsetDays * 86400000).toISOString().slice(0, 10);

export const WORKSPACE_ASSETS: WorkspaceAsset[] = [
  {
    id: "rs-prod-v3", name: "Production Rule Set v3", type: "rule-set",
    description: "412 parsed risk rules across 14 clusters, deployed to production scoring pipelines.",
    version: "v3.0", owner: "Maya Chen", team: "governance-team", updatedAt: iso(240), createdAt: iso(43200),
    tags: ["production", "rules", "scoring"], lifecycleStatus: "active", approvalStatus: "Published",
    stats: [{ label: "Rules", value: "412" }, { label: "Clusters", value: "14" }, { label: "Confidence", value: "91%" }],
    metadata: [{ key: "source", value: "rule-markdown-corpus" }, { key: "parser", value: "intelligence-v2" }, { key: "environment", value: "production" }],
    versions: [
      { version: "v3.0", author: "Maya Chen", date: date(10), change: "Published to production", status: "Published" },
      { version: "v2.4", author: "Diego Ramos", date: date(35), change: "Added 18 velocity rules", status: "Archived" },
      { version: "v2.0", author: "Maya Chen", date: date(72), change: "Initial clustering integration", status: "Archived" },
    ],
    approvals: [
      { id: "ap1", step: "Author Review", approver: "Maya Chen", role: "Rule Author", status: "Approved", date: date(11), comment: "Ready" },
      { id: "ap2", step: "Peer Review", approver: "Diego Ramos", role: "Rule Reviewer", status: "Approved", date: date(11), comment: "LGTM" },
      { id: "ap3", step: "Production Gate", approver: "Aria Patel", role: "Release Manager", status: "Approved", date: date(10), comment: "Cleared" },
    ],
    dependencies: [
      { assetId: "cl-rule-clusters", assetName: "Rule Cluster Map", assetType: "cluster", kind: "depends-on" },
      { assetId: "tx-risk-taxonomy", assetName: "Risk Taxonomy", assetType: "taxonomy", kind: "depends-on" },
      { assetId: "fs-engineered-v24", assetName: "Engineered Feature Set v24", assetType: "feature-set", kind: "consumed-by" },
    ],
    usedByPipelines: [
      { pipelineId: "pl-realtime-session-scoring", pipelineName: "Realtime Session Scoring", nodeType: "rule-intelligence", nodeLabel: "Rule Intelligence" },
      { pipelineId: "pl-rule-intelligence-build", pipelineName: "Rule Intelligence Build", nodeType: "rule-studio", nodeLabel: "Publish Rule Set" },
    ],
    color: "#8b5cf6",
  },
  {
    id: "cl-rule-clusters", name: "Rule Cluster Map", type: "cluster",
    description: "DBSCAN-derived clusters grouping 412 rules into 14 governance clusters by semantic similarity.",
    version: "v1.2", owner: "Diego Ramos", team: "governance-team", updatedAt: iso(180), createdAt: iso(21600),
    tags: ["clustering", "governance", "dbscan"], lifecycleStatus: "active", approvalStatus: "Published",
    stats: [{ label: "Clusters", value: "14" }, { label: "Avg Confidence", value: "89%" }, { label: "Algorithm", value: "DBSCAN" }],
    metadata: [{ key: "algorithm", value: "dbscan" }, { key: "minSamples", value: "3" }, { key: "eps", value: "0.32" }],
    versions: [
      { version: "v1.2", author: "Diego Ramos", date: date(12), change: "Re-clustered after rule additions", status: "Published" },
      { version: "v1.0", author: "Diego Ramos", date: date(60), change: "Initial clustering", status: "Archived" },
    ],
    approvals: [
      { id: "ap1", step: "Author Review", approver: "Diego Ramos", role: "Rule Author", status: "Approved", date: date(13), comment: "" },
      { id: "ap2", step: "Governance Review", approver: "Aria Patel", role: "Governance Lead", status: "Approved", date: date(12), comment: "Approved" },
    ],
    dependencies: [
      { assetId: "rs-prod-v3", assetName: "Production Rule Set v3", assetType: "rule-set", kind: "depends-on" },
    ],
    usedByPipelines: [
      { pipelineId: "pl-rule-intelligence-build", pipelineName: "Rule Intelligence Build", nodeType: "rule-clustering", nodeLabel: "Cluster Rules" },
    ],
    color: "#a855f7",
  },
  {
    id: "tx-risk-taxonomy", name: "Risk Taxonomy", type: "taxonomy",
    description: "Hierarchical classification of risk domains: credential, device, geo, behavioral, network, and graph.",
    version: "v2.1", owner: "Aria Patel", team: "governance-team", updatedAt: iso(720), createdAt: iso(57600),
    tags: ["taxonomy", "classification", "governance"], lifecycleStatus: "active", approvalStatus: "Published",
    stats: [{ label: "Domains", value: "6" }, { label: "Categories", value: "24" }, { label: "Leaf Nodes", value: "118" }],
    metadata: [{ key: "version", value: "2.1" }, { key: "maintainer", value: "governance" }],
    versions: [
      { version: "v2.1", author: "Aria Patel", date: date(30), change: "Added graph-risk domain", status: "Published" },
      { version: "v2.0", author: "Aria Patel", date: date(120), change: "Restructured behavioral categories", status: "Archived" },
    ],
    approvals: [
      { id: "ap1", step: "Author Review", approver: "Aria Patel", role: "Taxonomy Owner", status: "Approved", date: date(31), comment: "" },
      { id: "ap2", step: "Governance Review", approver: "Maya Chen", role: "Governance Lead", status: "Approved", date: date(30), comment: "Approved" },
    ],
    dependencies: [],
    usedByPipelines: [
      { pipelineId: "pl-rule-intelligence-build", pipelineName: "Rule Intelligence Build", nodeType: "rule-intelligence", nodeLabel: "Parse & Classify" },
    ],
    color: "#6366f1",
  },
  {
    id: "sg-velocity-anomaly", name: "Velocity Anomaly Signal", type: "signal",
    description: "Derived signal flagging abnormal login velocity within 5m / 1h / 24h windows per user and device.",
    version: "v1.4", owner: "Lena Park", team: "fraud-platform", updatedAt: iso(90), createdAt: iso(14400),
    tags: ["signal", "velocity", "anomaly"], lifecycleStatus: "active", approvalStatus: "Published",
    stats: [{ label: "Windows", value: "3" }, { label: "Sensitivity", value: "0.7" }, { label: "False Pos.", value: "4%" }],
    metadata: [{ key: "windows", value: "5m,1h,24h" }, { key: "sensitivity", value: "0.7" }],
    versions: [
      { version: "v1.4", author: "Lena Park", date: date(3), change: "Tuned 24h threshold", status: "Published" },
      { version: "v1.2", author: "Lena Park", date: date(40), change: "Added per-device baseline", status: "Archived" },
    ],
    approvals: [
      { id: "ap1", step: "Author Review", approver: "Lena Park", role: "Signal Author", status: "Approved", date: date(4), comment: "" },
      { id: "ap2", step: "Fraud Review", approver: "Sam Okafor", role: "Fraud Analyst", status: "Approved", date: date(3), comment: "Looks good" },
    ],
    dependencies: [
      { assetId: "ff-velocity-score", assetName: "Velocity Score Formula", assetType: "feature-formula", kind: "depends-on" },
    ],
    usedByPipelines: [
      { pipelineId: "pl-realtime-session-scoring", pipelineName: "Realtime Session Scoring", nodeType: "temporal-intelligence", nodeLabel: "Temporal Intelligence" },
    ],
    color: "#0ea5e9",
  },
  {
    id: "fs-engineered-v24", name: "Engineered Feature Set v24", type: "feature-set",
    description: "24 PCA-reduced features derived from rule parameters and thresholds across 6 risk domains.",
    version: "v24", owner: "Sam Okafor", team: "ml-ops", updatedAt: iso(720), createdAt: iso(28800),
    tags: ["features", "pca", "production"], lifecycleStatus: "active", approvalStatus: "Published",
    stats: [{ label: "Features", value: "24" }, { label: "Domains", value: "6" }, { label: "Coverage", value: "98%" }],
    metadata: [{ key: "pca", value: "24" }, { key: "vectorize", value: "true" }, { key: "coverage", value: "0.98" }],
    versions: [
      { version: "v24", author: "Sam Okafor", date: date(5), change: "Added graph-linkage feature", status: "Published" },
      { version: "v22", author: "Sam Okafor", date: date(45), change: "PCA recompute", status: "Archived" },
    ],
    approvals: [
      { id: "ap1", step: "Author Review", approver: "Sam Okafor", role: "ML Engineer", status: "Approved", date: date(6), comment: "" },
      { id: "ap2", step: "ML Review", approver: "Priya Shah", role: "ML Lead", status: "Approved", date: date(5), comment: "Approved" },
    ],
    dependencies: [
      { assetId: "rs-prod-v3", assetName: "Production Rule Set v3", assetType: "rule-set", kind: "depends-on" },
      { assetId: "ff-velocity-score", assetName: "Velocity Score Formula", assetType: "feature-formula", kind: "depends-on" },
    ],
    usedByPipelines: [
      { pipelineId: "pl-realtime-session-scoring", pipelineName: "Realtime Session Scoring", nodeType: "feature-engineering", nodeLabel: "Feature Engineering" },
      { pipelineId: "pl-model-training", pipelineName: "Model Training & Evaluation", nodeType: "feature-engineering", nodeLabel: "Feature Engineering" },
    ],
    color: "#d946ef",
  },
  {
    id: "ff-velocity-score", name: "Velocity Score Formula", type: "feature-formula",
    description: "Reusable expression computing a normalized velocity score from login counts across time windows.",
    version: "v1.1", owner: "Lena Park", team: "fraud-platform", updatedAt: iso(120), createdAt: iso(10080),
    tags: ["formula", "velocity", "reusable"], lifecycleStatus: "active", approvalStatus: "Published",
    stats: [{ label: "Inputs", value: "3" }, { label: "Output", value: "0..1" }, { label: "Reused By", value: "2" }],
    metadata: [{ key: "expression", value: "norm_sum(v5m*0.5, v1h*0.3, v24h*0.2)" }, { key: "output", value: "float[0,1]" }],
    versions: [
      { version: "v1.1", author: "Lena Park", date: date(2), change: "Adjusted weights", status: "Published" },
      { version: "v1.0", author: "Lena Park", date: date(80), change: "Initial formula", status: "Archived" },
    ],
    approvals: [
      { id: "ap1", step: "Author Review", approver: "Lena Park", role: "Formula Author", status: "Approved", date: date(3), comment: "" },
      { id: "ap2", step: "Fraud Review", approver: "Sam Okafor", role: "Fraud Analyst", status: "Approved", date: date(2), comment: "Approved" },
    ],
    dependencies: [],
    usedByPipelines: [
      { pipelineId: "pl-realtime-session-scoring", pipelineName: "Realtime Session Scoring", nodeType: "feature-engineering", nodeLabel: "Feature Engineering" },
    ],
    color: "#c026d3",
  },
  {
    id: "ds-labelled", name: "Labelled Sessions Dataset", type: "dataset",
    description: "50k labelled login sessions with Allow / Challenge / Deny outcomes for model training and backtesting.",
    version: "v2.0", owner: "Priya Shah", team: "ml-ops", updatedAt: iso(5760), createdAt: iso(43200),
    tags: ["dataset", "training", "labelled"], lifecycleStatus: "active", approvalStatus: "Published",
    stats: [{ label: "Rows", value: "50k" }, { label: "Labels", value: "3" }, { label: "Features", value: "118" }],
    metadata: [{ key: "rows", value: "50000" }, { key: "labels", value: "Allow/Challenge/Deny" }, { key: "split", value: "70/15/15" }],
    versions: [
      { version: "v2.0", author: "Priya Shah", date: date(90), change: "Added 10k sessions", status: "Published" },
      { version: "v1.0", author: "Priya Shah", date: date(200), change: "Initial dataset", status: "Archived" },
    ],
    approvals: [
      { id: "ap1", step: "Author Review", approver: "Priya Shah", role: "Data Owner", status: "Approved", date: date(91), comment: "" },
      { id: "ap2", step: "Compliance Review", approver: "Aria Patel", role: "Compliance", status: "Approved", date: date(90), comment: "PII scrubbed" },
    ],
    dependencies: [],
    usedByPipelines: [
      { pipelineId: "pl-model-training", pipelineName: "Model Training & Evaluation", nodeType: "dataset-source", nodeLabel: "Labelled Sessions" },
    ],
    color: "#06b6d4",
  },
  {
    id: "pm-wcm-v32", name: "Weighted Coherence Model", type: "predictive-model",
    description: "Weighted ensemble fusing domain-model outputs into a single coherence score. AUC 0.961, 12ms latency.",
    version: "v3.2", owner: "Priya Shah", team: "ml-ops", updatedAt: iso(4320), createdAt: iso(36000),
    tags: ["production", "ensemble", "scoring"], lifecycleStatus: "active", approvalStatus: "Published",
    stats: [{ label: "ROC", value: "0.961" }, { label: "Accuracy", value: "94.2%" }, { label: "Latency", value: "12ms" }],
    metadata: [{ key: "algorithm", value: "weighted-ensemble" }, { key: "trainingDate", value: "2026-06-12" }, { key: "latencyMs", value: "12" }],
    versions: [
      { version: "v3.2", author: "Priya Shah", date: date(43), change: "Retrained on v2.0 dataset", status: "Published" },
      { version: "v3.0", author: "Priya Shah", date: date(100), change: "New feature weights", status: "Archived" },
    ],
    approvals: [
      { id: "ap1", step: "Author Review", approver: "Priya Shah", role: "ML Engineer", status: "Approved", date: date(44), comment: "" },
      { id: "ap2", step: "ML Review", approver: "Sam Okafor", role: "ML Lead", status: "Approved", date: date(43), comment: "Approved" },
      { id: "ap3", step: "Production Gate", approver: "Aria Patel", role: "Release Manager", status: "Approved", date: date(43), comment: "Cleared" },
    ],
    dependencies: [
      { assetId: "fs-engineered-v24", assetName: "Engineered Feature Set v24", assetType: "feature-set", kind: "depends-on" },
      { assetId: "ds-labelled", assetName: "Labelled Sessions Dataset", assetType: "dataset", kind: "depends-on" },
    ],
    usedByPipelines: [
      { pipelineId: "pl-realtime-session-scoring", pipelineName: "Realtime Session Scoring", nodeType: "coherence-brain", nodeLabel: "Coherence Brain" },
    ],
    color: "#f59e0b",
  },
  {
    id: "pm-gbfm-v7", name: "Gradient Boosted Fraud Model", type: "predictive-model",
    description: "XGBoost ensemble over 240 engineered features with nightly retrain. AUC 0.974, 18ms latency.",
    version: "v7.0", owner: "Sam Okafor", team: "ml-ops", updatedAt: iso(2880), createdAt: iso(30000),
    tags: ["production", "xgboost", "ensemble"], lifecycleStatus: "active", approvalStatus: "Published",
    stats: [{ label: "ROC", value: "0.974" }, { label: "Precision", value: "93.3%" }, { label: "Latency", value: "18ms" }],
    metadata: [{ key: "algorithm", value: "xgboost" }, { key: "trainingDate", value: "2026-07-01" }, { key: "features", value: "240" }],
    versions: [
      { version: "v7.0", author: "Sam Okafor", date: date(24), change: "Nightly retrain", status: "Published" },
      { version: "v6.4", author: "Sam Okafor", date: date(50), change: "Feature expansion", status: "Archived" },
    ],
    approvals: [
      { id: "ap1", step: "Author Review", approver: "Sam Okafor", role: "ML Engineer", status: "Approved", date: date(25), comment: "" },
      { id: "ap2", step: "ML Review", approver: "Priya Shah", role: "ML Lead", status: "Approved", date: date(24), comment: "Approved" },
    ],
    dependencies: [
      { assetId: "fs-engineered-v24", assetName: "Engineered Feature Set v24", assetType: "feature-set", kind: "depends-on" },
      { assetId: "ds-labelled", assetName: "Labelled Sessions Dataset", assetType: "dataset", kind: "depends-on" },
    ],
    usedByPipelines: [
      { pipelineId: "pl-model-training", pipelineName: "Model Training & Evaluation", nodeType: "model-studio", nodeLabel: "Train Model" },
    ],
    color: "#f97316",
  },
  {
    id: "gm-entity-graph", name: "Entity Relationship Graph Model", type: "graph-model",
    description: "Customer-device-IP relationship graph with GNN scoring and fraud ring detection up to 3 hops.",
    version: "v2.4", owner: "Lena Park", team: "investigations", updatedAt: iso(90), createdAt: iso(20000),
    tags: ["graph", "gnn", "rings"], lifecycleStatus: "active", approvalStatus: "Published",
    stats: [{ label: "Entities", value: "1.2M" }, { label: "Edges", value: "4.8M" }, { label: "Rings", value: "37" }],
    metadata: [{ key: "model", value: "GraphSAGE" }, { key: "hops", value: "3" }, { key: "trainingDate", value: "2026-06-28" }],
    versions: [
      { version: "v2.4", author: "Lena Park", date: date(27), change: "Retrained GNN weights", status: "Published" },
      { version: "v2.0", author: "Lena Park", date: date(70), change: "Added 3-hop rings", status: "Archived" },
    ],
    approvals: [
      { id: "ap1", step: "Author Review", approver: "Lena Park", role: "Graph Engineer", status: "Approved", date: date(28), comment: "" },
      { id: "ap2", step: "Investigations Review", approver: "Diego Ramos", role: "Investigator", status: "Approved", date: date(27), comment: "Approved" },
    ],
    dependencies: [
      { assetId: "ds-labelled", assetName: "Labelled Sessions Dataset", assetType: "dataset", kind: "depends-on" },
    ],
    usedByPipelines: [
      { pipelineId: "pl-realtime-session-scoring", pipelineName: "Realtime Session Scoring", nodeType: "graph-intelligence", nodeLabel: "Graph Intelligence" },
      { pipelineId: "pl-session-investigation", pipelineName: "Session Investigation Replay", nodeType: "graph-intelligence", nodeLabel: "Entity Graph" },
    ],
    color: "#10b981",
  },
  {
    id: "tm-velocity-v4", name: "Velocity Temporal Model", type: "temporal-model",
    description: "Time-series anomaly model with per-user seasonality baselines and drift detection across velocity windows.",
    version: "v4.1", owner: "Lena Park", team: "fraud-platform", updatedAt: iso(360), createdAt: iso(18000),
    tags: ["temporal", "anomaly", "velocity"], lifecycleStatus: "active", approvalStatus: "Published",
    stats: [{ label: "Windows", value: "3" }, { label: "Sensitivity", value: "0.7" }, { label: "Health", value: "degraded" }],
    metadata: [{ key: "windows", value: "5m,1h,24h" }, { key: "sensitivity", value: "0.7" }, { key: "trainingDate", value: "2026-06-20" }],
    versions: [
      { version: "v4.1", author: "Lena Park", date: date(35), change: "Drift detection tuned", status: "Published" },
      { version: "v4.0", author: "Lena Park", date: date(80), change: "Seasonality baselines", status: "Archived" },
    ],
    approvals: [
      { id: "ap1", step: "Author Review", approver: "Lena Park", role: "ML Engineer", status: "Approved", date: date(36), comment: "" },
      { id: "ap2", step: "Fraud Review", approver: "Sam Okafor", role: "Fraud Analyst", status: "Approved", date: date(35), comment: "Approved" },
    ],
    dependencies: [
      { assetId: "sg-velocity-anomaly", assetName: "Velocity Anomaly Signal", assetType: "signal", kind: "depends-on" },
    ],
    usedByPipelines: [
      { pipelineId: "pl-realtime-session-scoring", pipelineName: "Realtime Session Scoring", nodeType: "temporal-intelligence", nodeLabel: "Temporal Intelligence" },
    ],
    color: "#14b8a6",
  },
  {
    id: "dp-decision-router", name: "Decision Router Policy", type: "decision-policy",
    description: "Deterministic policy routing decisions to allow, challenge, or deny based on score thresholds and overrides.",
    version: "v2.0", owner: "Aria Patel", team: "fraud-platform", updatedAt: iso(120), createdAt: iso(15000),
    tags: ["policy", "decision", "routing"], lifecycleStatus: "active", approvalStatus: "Published",
    stats: [{ label: "Routes", value: "3" }, { label: "Allow <=", value: "40" }, { label: "Deny >=", value: "75" }],
    metadata: [{ key: "allowThreshold", value: "40" }, { key: "challengeThreshold", value: "75" }, { key: "overrides", value: "enabled" }],
    versions: [
      { version: "v2.0", author: "Aria Patel", date: date(5), change: "Added override eligibility", status: "Published" },
      { version: "v1.0", author: "Aria Patel", date: date(90), change: "Initial policy", status: "Archived" },
    ],
    approvals: [
      { id: "ap1", step: "Author Review", approver: "Aria Patel", role: "Policy Author", status: "Approved", date: date(6), comment: "" },
      { id: "ap2", step: "Fraud Review", approver: "Sam Okafor", role: "Fraud Lead", status: "Approved", date: date(5), comment: "Approved" },
      { id: "ap3", step: "Production Gate", approver: "Maya Chen", role: "Release Manager", status: "Approved", date: date(5), comment: "Cleared" },
    ],
    dependencies: [
      { assetId: "pm-wcm-v32", assetName: "Weighted Coherence Model", assetType: "predictive-model", kind: "depends-on" },
    ],
    usedByPipelines: [
      { pipelineId: "pl-realtime-session-scoring", pipelineName: "Realtime Session Scoring", nodeType: "decision-router", nodeLabel: "Decision Router" },
    ],
    color: "#ef4444",
  },
  {
    id: "pl-geo-enrichment", name: "Geo Enrichment Plugin", type: "plugin",
    description: "Enriches sessions with country, city, ASN, and ISP from IP geolocation. 8ms p95 latency.",
    version: "v1.3", owner: "Diego Ramos", team: "fraud-platform", updatedAt: iso(15), createdAt: iso(8000),
    tags: ["plugin", "geo", "enrichment"], lifecycleStatus: "active", approvalStatus: "Published",
    stats: [{ label: "Latency", value: "8ms" }, { label: "Coverage", value: "99.2%" }, { label: "Fields", value: "6" }],
    metadata: [{ key: "version", value: "1.3" }, { key: "source", value: "maxmind-geoip2" }, { key: "p95Latency", value: "8" }],
    versions: [
      { version: "v1.3", author: "Diego Ramos", date: date(1), change: "Updated MaxMind DB", status: "Published" },
      { version: "v1.2", author: "Diego Ramos", date: date(30), change: "Added ASN field", status: "Archived" },
    ],
    approvals: [
      { id: "ap1", step: "Author Review", approver: "Diego Ramos", role: "Plugin Author", status: "Approved", date: date(2), comment: "" },
      { id: "ap2", step: "Platform Review", approver: "Lena Park", role: "Platform Lead", status: "Approved", date: date(1), comment: "Approved" },
    ],
    dependencies: [],
    usedByPipelines: [
      { pipelineId: "pl-realtime-session-scoring", pipelineName: "Realtime Session Scoring", nodeType: "session-source", nodeLabel: "Session Source" },
    ],
    color: "#f97316",
  },
  {
    id: "tp-realtime-scoring", name: "Realtime Scoring Pipeline Template", type: "template",
    description: "Reusable template scaffolding a realtime session scoring pipeline with intelligence, model, and decision nodes.",
    version: "v1.1", owner: "Maya Chen", team: "fraud-platform", updatedAt: iso(600), createdAt: iso(12000),
    tags: ["template", "pipeline", "scoring"], lifecycleStatus: "active", approvalStatus: "Published",
    stats: [{ label: "Nodes", value: "10" }, { label: "Used By", value: "2" }, { label: "Category", value: "scoring" }],
    metadata: [{ key: "category", value: "scoring" }, { key: "nodes", value: "10" }, { key: "minVersion", value: "3.2" }],
    versions: [
      { version: "v1.1", author: "Maya Chen", date: date(10), change: "Added metrics output", status: "Published" },
      { version: "v1.0", author: "Maya Chen", date: date(60), change: "Initial template", status: "Archived" },
    ],
    approvals: [
      { id: "ap1", step: "Author Review", approver: "Maya Chen", role: "Template Author", status: "Approved", date: date(11), comment: "" },
      { id: "ap2", step: "Platform Review", approver: "Aria Patel", role: "Platform Lead", status: "Approved", date: date(10), comment: "Approved" },
    ],
    dependencies: [],
    usedByPipelines: [],
    color: "#64748b",
  },
  {
    id: "rs-inbound-draft", name: "Inbound Rule Markdown (Draft)", type: "rule-set",
    description: "Raw markdown rule definitions awaiting parsing and clustering. 28 files, 12.4k words.",
    version: "draft", owner: "Maya Chen", team: "governance-team", updatedAt: iso(30), createdAt: iso(1440),
    tags: ["draft", "rules", "inbound"], lifecycleStatus: "draft", approvalStatus: "Draft",
    stats: [{ label: "Files", value: "28" }, { label: "Words", value: "12.4k" }, { label: "Status", value: "Draft" }],
    metadata: [{ key: "source", value: "upload" }, { key: "files", value: "28" }],
    versions: [
      { version: "draft", author: "Maya Chen", date: date(0), change: "Uploaded 28 files", status: "Draft" },
    ],
    approvals: [
      { id: "ap1", step: "Author Review", approver: "Maya Chen", role: "Rule Author", status: "Pending", date: null, comment: "" },
    ],
    dependencies: [],
    usedByPipelines: [
      { pipelineId: "pl-rule-intelligence-build", pipelineName: "Rule Intelligence Build", nodeType: "dataset-source", nodeLabel: "Rule Markdown" },
    ],
    color: "#8b5cf6",
  },
  {
    id: "pm-meta-ensemble", name: "Meta Ensemble (Staging)", type: "predictive-model",
    description: "Stacked meta-learner over five base models producing the final fraud probability. AUC 0.983, in staging.",
    version: "v1.6", owner: "Priya Shah", team: "ml-ops", updatedAt: iso(240), createdAt: iso(6000),
    tags: ["staging", "ensemble", "meta"], lifecycleStatus: "draft", approvalStatus: "In Review",
    stats: [{ label: "ROC", value: "0.983" }, { label: "Accuracy", value: "96.8%" }, { label: "Latency", value: "26ms" }],
    metadata: [{ key: "algorithm", value: "stacked-meta" }, { key: "trainingDate", value: "2026-07-10" }, { key: "baseModels", value: "5" }],
    versions: [
      { version: "v1.6", author: "Priya Shah", date: date(15), change: "Submitted for review", status: "In Review" },
      { version: "v1.4", author: "Priya Shah", date: date(40), change: "Added temporal base", status: "Archived" },
    ],
    approvals: [
      { id: "ap1", step: "Author Review", approver: "Priya Shah", role: "ML Engineer", status: "Approved", date: date(16), comment: "Ready" },
      { id: "ap2", step: "ML Review", approver: "Sam Okafor", role: "ML Lead", status: "Pending", date: null, comment: "" },
      { id: "ap3", step: "Production Gate", approver: "Aria Patel", role: "Release Manager", status: "Pending", date: null, comment: "" },
    ],
    dependencies: [
      { assetId: "pm-wcm-v32", assetName: "Weighted Coherence Model", assetType: "predictive-model", kind: "depends-on" },
      { assetId: "pm-gbfm-v7", assetName: "Gradient Boosted Fraud Model", assetType: "predictive-model", kind: "depends-on" },
      { assetId: "gm-entity-graph", assetName: "Entity Relationship Graph Model", assetType: "graph-model", kind: "depends-on" },
      { assetId: "tm-velocity-v4", assetName: "Velocity Temporal Model", assetType: "temporal-model", kind: "depends-on" },
    ],
    usedByPipelines: [],
    color: "#8b5cf6",
  },
];

export const APPROVAL_STATUS_TONE: Record<ApprovalStatus, "success" | "warning" | "default" | "muted" | "destructive"> = {
  Published: "success",
  Approved: "default",
  "In Review": "warning",
  Draft: "muted",
  Rejected: "destructive",
  Archived: "muted",
};

export const LIFECYCLE_STATUS_TONE: Record<LifecycleStatus, "success" | "default" | "outline"> = {
  active: "success",
  draft: "default",
  archived: "outline",
};

export function searchAssets(assets: WorkspaceAsset[], query: string, type: AssetType | "all", approval: ApprovalStatus | "all"): WorkspaceAsset[] {
  const q = query.trim().toLowerCase();
  return assets.filter((a) => {
    if (type !== "all" && a.type !== type) return false;
    if (approval !== "all" && a.approvalStatus !== approval) return false;
    if (!q) return true;
    return (a.name + " " + a.description + " " + a.tags.join(" ") + " " + a.owner + " " + a.team).toLowerCase().includes(q);
  });
}

export function buildDependencyGraph(asset: WorkspaceAsset, allAssets: WorkspaceAsset[]) {
  const nodes: { id: string; label: string; type: AssetType; color: string; category: "asset" | "pipeline" }[] = [];
  const edges: { id: string; source: string; target: string; label: string }[] = [];

  nodes.push({ id: asset.id, label: asset.name, type: asset.type, color: asset.color, category: "asset" });

  for (const dep of asset.dependencies) {
    if (dep.kind === "depends-on") {
      const meta = ASSET_TYPE_META[dep.assetType];
      nodes.push({ id: dep.assetId, label: dep.assetName, type: dep.assetType, color: meta.color, category: "asset" });
      edges.push({ id: `e-${dep.assetId}-${asset.id}`, source: dep.assetId, target: asset.id, label: "feeds" });
    } else {
      const meta = ASSET_TYPE_META[dep.assetType];
      nodes.push({ id: dep.assetId, label: dep.assetName, type: dep.assetType, color: meta.color, category: "asset" });
      edges.push({ id: `e-${asset.id}-${dep.assetId}`, source: asset.id, target: dep.assetId, label: "feeds" });
    }
  }

  for (const usage of asset.usedByPipelines) {
    const pipeId = `pipe-${usage.pipelineId}`;
    if (!nodes.find((n) => n.id === pipeId)) {
      nodes.push({ id: pipeId, label: usage.pipelineName, type: "template", color: "#0ea5e9", category: "pipeline" });
    }
    edges.push({ id: `e-${asset.id}-${pipeId}`, source: asset.id, target: pipeId, label: usage.nodeType });
  }

  return { nodes, edges };
}
