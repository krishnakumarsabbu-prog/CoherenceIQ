import type { LucideIcon } from "lucide-react";
import {
  Workflow, Layers3, FunctionSquare, Cpu, Database, Gavel, Puzzle,
  type LucideIcon as _LI,
} from "lucide-react";

export type ArtefactKind =
  | "pipeline" | "rule" | "feature" | "model" | "dataset" | "policy" | "plugin";

export type LifecycleState = "Draft" | "Review" | "Approved" | "Deprecated";
export type ApprovalState = "Pending" | "Approved" | "Rejected" | "Withdrawn";
export type AuditAction =
  | "created" | "version-bumped" | "submitted-review" | "approved"
  | "rejected" | "deprecated" | "rolled-back" | "promoted" | "shadow-started"
  | "shadow-stopped" | "champion-set" | "challenger-set" | "owner-changed";

export type SemVer = string;

export interface SemVerParts {
  major: number;
  minor: number;
  patch: number;
  pre?: string;
}

export function parseSemVer(v: string): SemVerParts {
  const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.]+))?$/.exec(v.trim());
  if (!m) return { major: 0, minor: 0, patch: 0 };
  return { major: +m[1], minor: +m[2], patch: +m[3], pre: m[4] };
}

export function bumpSemVer(v: string, kind: "major" | "minor" | "patch"): string {
  const p = parseSemVer(v);
  if (kind === "major") return `${p.major + 1}.0.0`;
  if (kind === "minor") return `${p.major}.${p.minor + 1}.0`;
  return `${p.major}.${p.minor}.${p.patch + 1}`;
}

export function compareSemVer(a: string, b: string): number {
  const pa = parseSemVer(a);
  const pb = parseSemVer(b);
  if (pa.major !== pb.major) return pa.major - pb.major;
  if (pa.minor !== pb.minor) return pa.minor - pb.minor;
  if (pa.patch !== pb.patch) return pa.patch - pb.patch;
  if (pa.pre && !pb.pre) return -1;
  if (!pa.pre && pb.pre) return 1;
  if (pa.pre && pb.pre) return pa.pre.localeCompare(pb.pre);
  return 0;
}

export interface ApprovalStep {
  id: string;
  step: string;
  approver: string;
  role: string;
  status: ApprovalState;
  date: string | null;
  comment: string;
}

export interface AuditEntry {
  id: string;
  action: AuditAction;
  actor: string;
  timestamp: string;
  fromVersion?: SemVer;
  toVersion?: SemVer;
  detail: string;
}

export interface VersionRecord {
  version: SemVer;
  author: string;
  date: string;
  change: string;
  state: LifecycleState;
}

export interface DependencyRef {
  artefactId: string;
  kind: "depends-on" | "consumed-by";
}

export interface ShadowRun {
  id: string;
  startedAt: string;
  endedAt: string | null;
  status: "running" | "completed" | "aborted";
  samples: number;
  agreements: number;
  disagreements: number;
  drift: number;
  championDecision?: string;
  challengerDecision?: string;
}

export interface UsageStat {
  period: string;
  executions: number;
  avgLatencyMs: number;
  successRate: number;
}

export interface DriftPoint {
  date: string;
  psi: number;
  accuracy: number;
  threshold: number;
}

export interface Artefact {
  id: string;
  name: string;
  kind: ArtefactKind;
  description: string;
  version: SemVer;
  owner: string;
  team: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  lifecycle: LifecycleState;
  approvals: ApprovalStep[];
  versions: VersionRecord[];
  audit: AuditEntry[];
  dependencies: DependencyRef[];
  champion: boolean;
  challenger: boolean;
  shadowMode: boolean;
  shadowRuns: ShadowRun[];
  usage: UsageStat[];
  drift: DriftPoint[];
  color: string;
  stats: { label: string; value: string }[];
}

export const ARTEFACT_META: Record<ArtefactKind, { label: string; labelPlural: string; icon: LucideIcon; color: string; description: string }> = {
  pipeline: { label: "Pipeline", labelPlural: "Pipelines", icon: Workflow, color: "#2563eb", description: "Executable session-scoring pipelines" },
  rule: { label: "Rule", labelPlural: "Rules", icon: Layers3, color: "#8b5cf6", description: "Risk rule sets and cluster definitions" },
  feature: { label: "Feature", labelPlural: "Features", icon: FunctionSquare, color: "#d946ef", description: "Engineered feature sets and formulas" },
  model: { label: "Model", labelPlural: "Models", icon: Cpu, color: "#f59e0b", description: "Predictive, graph and temporal ML models" },
  dataset: { label: "Dataset", labelPlural: "Datasets", icon: Database, color: "#06b6d4", description: "Labelled training and backtesting data" },
  policy: { label: "Policy", labelPlural: "Policies", icon: Gavel, color: "#ef4444", description: "Decision routing and governance policies" },
  plugin: { label: "Plugin", labelPlural: "Plugins", icon: Puzzle, color: "#f97316", description: "Detection plugins and integrations" },
};

export const ARTEFACT_KINDS = Object.keys(ARTEFACT_META) as ArtefactKind[];

export const LIFECYCLE_TONE: Record<LifecycleState, "default" | "warning" | "success" | "muted"> = {
  Draft: "muted",
  Review: "warning",
  Approved: "success",
  Deprecated: "default",
};

export const APPROVAL_TONE: Record<ApprovalState, "warning" | "success" | "destructive" | "muted"> = {
  Pending: "warning",
  Approved: "success",
  Rejected: "destructive",
  Withdrawn: "muted",
};

const now = () => new Date().toISOString();
const iso = (offsetMin: number) => new Date(Date.now() - offsetMin * 60_000).toISOString();
const date = (offsetDays: number) => new Date(Date.now() - offsetDays * 86400000).toISOString().slice(0, 10);
let _id = 0;
const uid = (p: string) => `${p}-${++_id}-${Date.now().toString(36).slice(-4)}`;

function driftSeries(base: number, trend: number): DriftPoint[] {
  const out: DriftPoint[] = [];
  let psi = base;
  let acc = 0.96;
  for (let i = 13; i >= 0; i--) {
    psi = Math.max(0, Math.min(1, psi + (Math.random() - 0.45) * 0.04 + trend * 0.012));
    acc = Math.max(0.8, acc - (Math.random() - 0.5) * 0.006 - trend * 0.003);
    out.push({ date: date(i), psi: +psi.toFixed(3), accuracy: +acc.toFixed(3), threshold: 0.2 });
  }
  return out;
}

function usageSeries(exec: number, lat: number, sr: number): UsageStat[] {
  const out: UsageStat[] = [];
  for (let i = 6; i >= 0; i--) {
    out.push({
      period: date(i),
      executions: Math.round(exec * (0.8 + Math.random() * 0.4)),
      avgLatencyMs: Math.round(lat * (0.9 + Math.random() * 0.2)),
      successRate: +(sr * (0.98 + Math.random() * 0.02)).toFixed(3),
    });
  }
  return out;
}

function approvals(steps: [string, string, string, ApprovalState, string | null, string][]): ApprovalStep[] {
  return steps.map((s, i) => ({
    id: `ap-${i}-${Math.random().toString(36).slice(2, 6)}`,
    step: s[0], approver: s[1], role: s[2], status: s[3], date: s[4], comment: s[5],
  }));
}

function versions(rows: [SemVer, string, string, string, LifecycleState][]): VersionRecord[] {
  return rows.map((r) => ({ version: r[0], author: r[1], date: r[2], change: r[3], state: r[4] }));
}

function audit(rows: [AuditAction, string, string, SemVer?, SemVer?][]): AuditEntry[] {
  return rows.map((r, i) => ({
    id: `au-${i}-${Math.random().toString(36).slice(2, 6)}`,
    action: r[0], actor: r[1], timestamp: iso(60 * (rows.length - i)), detail: r[2],
    fromVersion: r[3], toVersion: r[4],
  }));
}

export const SEED_ARTEFACTS: Artefact[] = [
  {
    id: "art-pipe-realtime", name: "Realtime Session Scoring", kind: "pipeline",
    description: "Production realtime pipeline orchestrating enrichment, intelligence, model scoring and decision routing.",
    version: "3.2.0", owner: "Maya Chen", team: "fraud-platform",
    createdAt: iso(43200), updatedAt: iso(240), tags: ["production", "realtime", "scoring"],
    lifecycle: "Approved",
    approvals: approvals([
      ["Author Review", "Maya Chen", "Pipeline Author", "Approved", date(11), "Ready"],
      ["Platform Review", "Aria Patel", "Platform Lead", "Approved", date(10), "Cleared"],
      ["Production Gate", "Diego Ramos", "Release Manager", "Approved", date(10), "Deployed"],
    ]),
    versions: versions([
      ["3.2.0", "Maya Chen", date(10), "Added metrics export node", "Approved"],
      ["3.1.0", "Maya Chen", date(45), "Graph intelligence integration", "Deprecated"],
      ["3.0.0", "Maya Chen", date(90), "Initial v3 topology", "Deprecated"],
    ]),
    audit: audit([
      ["created", "Maya Chen", "Pipeline created", undefined, "3.0.0"],
      ["version-bumped", "Maya Chen", "Minor bump for graph node", "3.0.0", "3.1.0"],
      ["approved", "Diego Ramos", "Production gate cleared", "3.1.0", "3.1.0"],
      ["version-bumped", "Maya Chen", "Metrics export added", "3.1.0", "3.2.0"],
      ["approved", "Diego Ramos", "Production gate cleared", "3.2.0", "3.2.0"],
    ]),
    dependencies: [
      { artefactId: "art-rule-prod", kind: "depends-on" },
      { artefactId: "art-model-wcm", kind: "depends-on" },
      { artefactId: "art-policy-router", kind: "depends-on" },
      { artefactId: "art-plugin-geo", kind: "depends-on" },
    ],
    champion: true, challenger: false, shadowMode: false, shadowRuns: [],
    usage: usageSeries(48200, 14, 0.994), drift: [], color: "#2563eb",
    stats: [{ label: "Exec / day", value: "48.2k" }, { label: "p95 latency", value: "14ms" }, { label: "Success", value: "99.4%" }],
  },
  {
    id: "art-pipe-shadow", name: "Realtime Scoring v4 (Shadow)", kind: "pipeline",
    description: "Next-gen pipeline candidate with fused graph+temporal scoring, running in shadow against the champion.",
    version: "4.0.0-rc.1", owner: "Maya Chen", team: "fraud-platform",
    createdAt: iso(7200), updatedAt: iso(60), tags: ["staging", "shadow", "candidate"],
    lifecycle: "Review",
    approvals: approvals([
      ["Author Review", "Maya Chen", "Pipeline Author", "Approved", date(3), "Ready"],
      ["Platform Review", "Aria Patel", "Platform Lead", "Pending", null, ""],
      ["Production Gate", "Diego Ramos", "Release Manager", "Pending", null, ""],
    ]),
    versions: versions([
      ["4.0.0-rc.1", "Maya Chen", date(2), "Shadow candidate submitted", "Review"],
      ["3.3.0", "Maya Chen", date(20), "Internal prototype", "Deprecated"],
    ]),
    audit: audit([
      ["created", "Maya Chen", "Pipeline created", undefined, "3.3.0"],
      ["version-bumped", "Maya Chen", "RC cut", "3.3.0", "4.0.0-rc.1"],
      ["submitted-review", "Maya Chen", "Submitted for platform review", "4.0.0-rc.1", "4.0.0-rc.1"],
      ["shadow-started", "Maya Chen", "Shadow mode enabled vs champion", "4.0.0-rc.1", "4.0.0-rc.1"],
      ["challenger-set", "Maya Chen", "Designated as challenger to Realtime Session Scoring", "4.0.0-rc.1", "4.0.0-rc.1"],
    ]),
    dependencies: [
      { artefactId: "art-pipe-realtime", kind: "depends-on" },
      { artefactId: "art-model-meta", kind: "depends-on" },
    ],
    champion: false, challenger: true, shadowMode: true,
    shadowRuns: [
      { id: "sr-1", startedAt: iso(55), endedAt: null, status: "running", samples: 18420, agreements: 17233, disagreements: 1187, drift: 0.064, championDecision: "Allow", challengerDecision: "Challenge" },
      { id: "sr-0", startedAt: iso(720), endedAt: iso(60), status: "completed", samples: 9800, agreements: 9212, disagreements: 588, drift: 0.052 },
    ],
    usage: usageSeries(0, 22, 0.971), drift: [], color: "#3b82f6",
    stats: [{ label: "Shadow samples", value: "18.4k" }, { label: "Agreement", value: "93.6%" }, { label: "Drift", value: "0.064" }],
  },
  {
    id: "art-rule-prod", name: "Production Rule Set", kind: "rule",
    description: "412 parsed risk rules across 14 clusters, deployed to production scoring pipelines.",
    version: "3.0.0", owner: "Maya Chen", team: "governance-team",
    createdAt: iso(43200), updatedAt: iso(240), tags: ["production", "rules", "scoring"],
    lifecycle: "Approved",
    approvals: approvals([
      ["Author Review", "Maya Chen", "Rule Author", "Approved", date(11), "Ready"],
      ["Peer Review", "Diego Ramos", "Rule Reviewer", "Approved", date(11), "LGTM"],
      ["Production Gate", "Aria Patel", "Release Manager", "Approved", date(10), "Cleared"],
    ]),
    versions: versions([
      ["3.0.0", "Maya Chen", date(10), "Published to production", "Approved"],
      ["2.4.0", "Diego Ramos", date(35), "Added 18 velocity rules", "Deprecated"],
      ["2.0.0", "Maya Chen", date(72), "Initial clustering integration", "Deprecated"],
    ]),
    audit: audit([
      ["created", "Maya Chen", "Rule set created", undefined, "2.0.0"],
      ["version-bumped", "Diego Ramos", "Velocity rules added", "2.0.0", "2.4.0"],
      ["version-bumped", "Maya Chen", "Major release", "2.4.0", "3.0.0"],
      ["approved", "Aria Patel", "Production gate cleared", "3.0.0", "3.0.0"],
    ]),
    dependencies: [{ artefactId: "art-feature-engineered", kind: "consumed-by" }],
    champion: true, challenger: false, shadowMode: false, shadowRuns: [],
    usage: usageSeries(48200, 3, 0.999), drift: [], color: "#8b5cf6",
    stats: [{ label: "Rules", value: "412" }, { label: "Clusters", value: "14" }, { label: "Confidence", value: "91%" }],
  },
  {
    id: "art-rule-inbound", name: "Inbound Rule Markdown (Draft)", kind: "rule",
    description: "Raw markdown rule definitions awaiting parsing and clustering. 28 files, 12.4k words.",
    version: "0.1.0", owner: "Maya Chen", team: "governance-team",
    createdAt: iso(1440), updatedAt: iso(30), tags: ["draft", "rules", "inbound"],
    lifecycle: "Draft",
    approvals: approvals([
      ["Author Review", "Maya Chen", "Rule Author", "Pending", null, ""],
    ]),
    versions: versions([
      ["0.1.0", "Maya Chen", date(0), "Uploaded 28 files", "Draft"],
    ]),
    audit: audit([
      ["created", "Maya Chen", "Draft created", undefined, "0.1.0"],
    ]),
    dependencies: [],
    champion: false, challenger: false, shadowMode: false, shadowRuns: [],
    usage: [], drift: [], color: "#a855f7",
    stats: [{ label: "Files", value: "28" }, { label: "Words", value: "12.4k" }, { label: "Status", value: "Draft" }],
  },
  {
    id: "art-feature-engineered", name: "Engineered Feature Set", kind: "feature",
    description: "24 PCA-reduced features derived from rule parameters and thresholds across 6 risk domains.",
    version: "24.0.0", owner: "Sam Okafor", team: "ml-ops",
    createdAt: iso(28800), updatedAt: iso(720), tags: ["features", "pca", "production"],
    lifecycle: "Approved",
    approvals: approvals([
      ["Author Review", "Sam Okafor", "ML Engineer", "Approved", date(6), ""],
      ["ML Review", "Priya Shah", "ML Lead", "Approved", date(5), "Approved"],
    ]),
    versions: versions([
      ["24.0.0", "Sam Okafor", date(5), "Added graph-linkage feature", "Approved"],
      ["22.0.0", "Sam Okafor", date(45), "PCA recompute", "Deprecated"],
    ]),
    audit: audit([
      ["created", "Sam Okafor", "Feature set created", undefined, "22.0.0"],
      ["version-bumped", "Sam Okafor", "Graph linkage added", "22.0.0", "24.0.0"],
      ["approved", "Priya Shah", "ML review approved", "24.0.0", "24.0.0"],
    ]),
    dependencies: [
      { artefactId: "art-rule-prod", kind: "depends-on" },
      { artefactId: "art-dataset-labelled", kind: "depends-on" },
    ],
    champion: true, challenger: false, shadowMode: false, shadowRuns: [],
    usage: usageSeries(48200, 5, 0.998), drift: [], color: "#d946ef",
    stats: [{ label: "Features", value: "24" }, { label: "Domains", value: "6" }, { label: "Coverage", value: "98%" }],
  },
  {
    id: "art-model-wcm", name: "Weighted Coherence Model", kind: "model",
    description: "Weighted ensemble fusing domain-model outputs into a single coherence score. AUC 0.961, 12ms latency.",
    version: "3.2.0", owner: "Priya Shah", team: "ml-ops",
    createdAt: iso(36000), updatedAt: iso(4320), tags: ["production", "ensemble", "scoring"],
    lifecycle: "Approved",
    approvals: approvals([
      ["Author Review", "Priya Shah", "ML Engineer", "Approved", date(44), ""],
      ["ML Review", "Sam Okafor", "ML Lead", "Approved", date(43), "Approved"],
      ["Production Gate", "Aria Patel", "Release Manager", "Approved", date(43), "Cleared"],
    ]),
    versions: versions([
      ["3.2.0", "Priya Shah", date(43), "Retrained on v2.0 dataset", "Approved"],
      ["3.0.0", "Priya Shah", date(100), "New feature weights", "Deprecated"],
    ]),
    audit: audit([
      ["created", "Priya Shah", "Model created", undefined, "3.0.0"],
      ["version-bumped", "Priya Shah", "Retrained", "3.0.0", "3.2.0"],
      ["approved", "Aria Patel", "Production gate cleared", "3.2.0", "3.2.0"],
    ]),
    dependencies: [
      { artefactId: "art-feature-engineered", kind: "depends-on" },
      { artefactId: "art-dataset-labelled", kind: "depends-on" },
    ],
    champion: true, challenger: false, shadowMode: false, shadowRuns: [],
    usage: usageSeries(48200, 12, 0.995),
    drift: driftSeries(0.08, 0.01), color: "#f59e0b",
    stats: [{ label: "ROC", value: "0.961" }, { label: "Accuracy", value: "94.2%" }, { label: "Latency", value: "12ms" }],
  },
  {
    id: "art-model-gbfm", name: "Gradient Boosted Fraud Model", kind: "model",
    description: "XGBoost ensemble over 240 engineered features with nightly retrain. AUC 0.974, 18ms latency.",
    version: "7.0.0", owner: "Sam Okafor", team: "ml-ops",
    createdAt: iso(30000), updatedAt: iso(2880), tags: ["production", "xgboost", "ensemble"],
    lifecycle: "Approved",
    approvals: approvals([
      ["Author Review", "Sam Okafor", "ML Engineer", "Approved", date(25), ""],
      ["ML Review", "Priya Shah", "ML Lead", "Approved", date(24), "Approved"],
    ]),
    versions: versions([
      ["7.0.0", "Sam Okafor", date(24), "Nightly retrain", "Approved"],
      ["6.4.0", "Sam Okafor", date(50), "Feature expansion", "Deprecated"],
    ]),
    audit: audit([
      ["created", "Sam Okafor", "Model created", undefined, "6.4.0"],
      ["version-bumped", "Sam Okafor", "Nightly retrain", "6.4.0", "7.0.0"],
      ["approved", "Priya Shah", "ML review approved", "7.0.0", "7.0.0"],
    ]),
    dependencies: [
      { artefactId: "art-feature-engineered", kind: "depends-on" },
      { artefactId: "art-dataset-labelled", kind: "depends-on" },
    ],
    champion: false, challenger: false, shadowMode: false, shadowRuns: [],
    usage: usageSeries(48200, 18, 0.993),
    drift: driftSeries(0.15, 0.02), color: "#f97316",
    stats: [{ label: "ROC", value: "0.974" }, { label: "Precision", value: "93.3%" }, { label: "Latency", value: "18ms" }],
  },
  {
    id: "art-model-meta", name: "Meta Ensemble (Staging)", kind: "model",
    description: "Stacked meta-learner over five base models producing the final fraud probability. AUC 0.983, in staging.",
    version: "1.6.0-rc.2", owner: "Priya Shah", team: "ml-ops",
    createdAt: iso(6000), updatedAt: iso(120), tags: ["staging", "ensemble", "meta", "challenger"],
    lifecycle: "Review",
    approvals: approvals([
      ["Author Review", "Priya Shah", "ML Engineer", "Approved", date(16), "Ready"],
      ["ML Review", "Sam Okafor", "ML Lead", "Pending", null, ""],
      ["Production Gate", "Aria Patel", "Release Manager", "Pending", null, ""],
    ]),
    versions: versions([
      ["1.6.0-rc.2", "Priya Shah", date(4), "RC2 with tuned weights", "Review"],
      ["1.6.0-rc.1", "Priya Shah", date(15), "Submitted for review", "Deprecated"],
      ["1.4.0", "Priya Shah", date(40), "Added temporal base", "Deprecated"],
    ]),
    audit: audit([
      ["created", "Priya Shah", "Model created", undefined, "1.4.0"],
      ["version-bumped", "Priya Shah", "Temporal base added", "1.4.0", "1.6.0-rc.1"],
      ["submitted-review", "Priya Shah", "Submitted for ML review", "1.6.0-rc.1", "1.6.0-rc.1"],
      ["version-bumped", "Priya Shah", "Weight tuning RC2", "1.6.0-rc.1", "1.6.0-rc.2"],
      ["challenger-set", "Priya Shah", "Designated as challenger to Weighted Coherence Model", "1.6.0-rc.2", "1.6.0-rc.2"],
      ["shadow-started", "Priya Shah", "Shadow mode enabled vs champion", "1.6.0-rc.2", "1.6.0-rc.2"],
    ]),
    dependencies: [
      { artefactId: "art-model-wcm", kind: "depends-on" },
      { artefactId: "art-model-gbfm", kind: "depends-on" },
    ],
    champion: false, challenger: true, shadowMode: true,
    shadowRuns: [
      { id: "sr-m1", startedAt: iso(120), endedAt: null, status: "running", samples: 24800, agreements: 23102, disagreements: 1698, drift: 0.041, championDecision: "Challenge", challengerDecision: "Deny" },
    ],
    usage: usageSeries(0, 26, 0.971),
    drift: driftSeries(0.04, -0.005), color: "#8b5cf6",
    stats: [{ label: "ROC", value: "0.983" }, { label: "Accuracy", value: "96.8%" }, { label: "Latency", value: "26ms" }],
  },
  {
    id: "art-dataset-labelled", name: "Labelled Sessions Dataset", kind: "dataset",
    description: "50k labelled login sessions with Allow / Challenge / Deny outcomes for model training and backtesting.",
    version: "2.0.0", owner: "Priya Shah", team: "ml-ops",
    createdAt: iso(43200), updatedAt: iso(5760), tags: ["dataset", "training", "labelled"],
    lifecycle: "Approved",
    approvals: approvals([
      ["Author Review", "Priya Shah", "Data Owner", "Approved", date(91), ""],
      ["Compliance Review", "Aria Patel", "Compliance", "Approved", date(90), "PII scrubbed"],
    ]),
    versions: versions([
      ["2.0.0", "Priya Shah", date(90), "Added 10k sessions", "Approved"],
      ["1.0.0", "Priya Shah", date(200), "Initial dataset", "Deprecated"],
    ]),
    audit: audit([
      ["created", "Priya Shah", "Dataset created", undefined, "1.0.0"],
      ["version-bumped", "Priya Shah", "Added 10k sessions", "1.0.0", "2.0.0"],
      ["approved", "Aria Patel", "Compliance review cleared", "2.0.0", "2.0.0"],
    ]),
    dependencies: [],
    champion: true, challenger: false, shadowMode: false, shadowRuns: [],
    usage: usageSeries(200, 0, 1), drift: [], color: "#06b6d4",
    stats: [{ label: "Rows", value: "50k" }, { label: "Labels", value: "3" }, { label: "Features", value: "118" }],
  },
  {
    id: "art-policy-router", name: "Decision Router Policy", kind: "policy",
    description: "Deterministic policy routing decisions to allow, challenge, or deny based on score thresholds and overrides.",
    version: "2.0.0", owner: "Aria Patel", team: "fraud-platform",
    createdAt: iso(15000), updatedAt: iso(120), tags: ["policy", "decision", "routing"],
    lifecycle: "Approved",
    approvals: approvals([
      ["Author Review", "Aria Patel", "Policy Author", "Approved", date(6), ""],
      ["Fraud Review", "Sam Okafor", "Fraud Lead", "Approved", date(5), "Approved"],
      ["Production Gate", "Maya Chen", "Release Manager", "Approved", date(5), "Cleared"],
    ]),
    versions: versions([
      ["2.0.0", "Aria Patel", date(5), "Added override eligibility", "Approved"],
      ["1.0.0", "Aria Patel", date(90), "Initial policy", "Deprecated"],
    ]),
    audit: audit([
      ["created", "Aria Patel", "Policy created", undefined, "1.0.0"],
      ["version-bumped", "Aria Patel", "Override eligibility added", "1.0.0", "2.0.0"],
      ["approved", "Maya Chen", "Production gate cleared", "2.0.0", "2.0.0"],
    ]),
    dependencies: [{ artefactId: "art-model-wcm", kind: "depends-on" }],
    champion: true, challenger: false, shadowMode: false, shadowRuns: [],
    usage: usageSeries(48200, 1, 1), drift: [], color: "#ef4444",
    stats: [{ label: "Routes", value: "3" }, { label: "Allow <=", value: "40" }, { label: "Deny >=", value: "75" }],
  },
  {
    id: "art-policy-deprecated", name: "Legacy Strict Deny Policy", kind: "policy",
    description: "Deprecated strict-deny policy superseded by the decision router. Retained for audit and rollback.",
    version: "1.4.0", owner: "Aria Patel", team: "fraud-platform",
    createdAt: iso(20000), updatedAt: iso(10000), tags: ["policy", "deprecated", "legacy"],
    lifecycle: "Deprecated",
    approvals: approvals([
      ["Author Review", "Aria Patel", "Policy Author", "Approved", date(200), ""],
      ["Fraud Review", "Sam Okafor", "Fraud Lead", "Approved", date(199), "Approved"],
    ]),
    versions: versions([
      ["1.4.0", "Aria Patel", date(120), "Final legacy revision", "Deprecated"],
      ["1.0.0", "Aria Patel", date(220), "Initial strict policy", "Deprecated"],
    ]),
    audit: audit([
      ["created", "Aria Patel", "Policy created", undefined, "1.0.0"],
      ["version-bumped", "Aria Patel", "Final legacy revision", "1.0.0", "1.4.0"],
      ["deprecated", "Aria Patel", "Superseded by Decision Router Policy v2.0.0", "1.4.0", "1.4.0"],
    ]),
    dependencies: [],
    champion: false, challenger: false, shadowMode: false, shadowRuns: [],
    usage: usageSeries(0, 0, 0), drift: [], color: "#dc2626",
    stats: [{ label: "Status", value: "Deprecated" }, { label: "Superseded", value: "v2.0.0" }, { label: "Exec / day", value: "0" }],
  },
  {
    id: "art-plugin-geo", name: "Geo Enrichment Plugin", kind: "plugin",
    description: "Enriches sessions with country, city, ASN, and ISP from IP geolocation. 8ms p95 latency.",
    version: "1.3.0", owner: "Diego Ramos", team: "fraud-platform",
    createdAt: iso(8000), updatedAt: iso(15), tags: ["plugin", "geo", "enrichment"],
    lifecycle: "Approved",
    approvals: approvals([
      ["Author Review", "Diego Ramos", "Plugin Author", "Approved", date(2), ""],
      ["Platform Review", "Lena Park", "Platform Lead", "Approved", date(1), "Approved"],
    ]),
    versions: versions([
      ["1.3.0", "Diego Ramos", date(1), "Updated MaxMind DB", "Approved"],
      ["1.2.0", "Diego Ramos", date(30), "Added ASN field", "Deprecated"],
    ]),
    audit: audit([
      ["created", "Diego Ramos", "Plugin created", undefined, "1.2.0"],
      ["version-bumped", "Diego Ramos", "MaxMind DB updated", "1.2.0", "1.3.0"],
      ["approved", "Lena Park", "Platform review approved", "1.3.0", "1.3.0"],
    ]),
    dependencies: [],
    champion: true, challenger: false, shadowMode: false, shadowRuns: [],
    usage: usageSeries(48200, 8, 0.999), drift: [], color: "#f97316",
    stats: [{ label: "Latency", value: "8ms" }, { label: "Coverage", value: "99.2%" }, { label: "Fields", value: "6" }],
  },
  {
    id: "art-plugin-velocity", name: "Velocity Plugin (Beta)", kind: "plugin",
    description: "Beta plugin computing per-user velocity across 5m/1h/24h windows. Candidate to replace inline signal.",
    version: "0.9.0-rc.1", owner: "Lena Park", team: "fraud-platform",
    createdAt: iso(1440), updatedAt: iso(45), tags: ["plugin", "velocity", "beta", "challenger"],
    lifecycle: "Review",
    approvals: approvals([
      ["Author Review", "Lena Park", "Plugin Author", "Approved", date(2), "Ready"],
      ["Platform Review", "Diego Ramos", "Platform Lead", "Pending", null, ""],
    ]),
    versions: versions([
      ["0.9.0-rc.1", "Lena Park", date(1), "Beta candidate", "Review"],
    ]),
    audit: audit([
      ["created", "Lena Park", "Plugin created", undefined, "0.9.0-rc.1"],
      ["submitted-review", "Lena Park", "Submitted for platform review", "0.9.0-rc.1", "0.9.0-rc.1"],
      ["challenger-set", "Lena Park", "Designated as challenger to Geo Enrichment Plugin", "0.9.0-rc.1", "0.9.0-rc.1"],
      ["shadow-started", "Lena Park", "Shadow mode enabled vs champion", "0.9.0-rc.1", "0.9.0-rc.1"],
    ]),
    dependencies: [{ artefactId: "art-plugin-geo", kind: "depends-on" }],
    champion: false, challenger: true, shadowMode: true,
    shadowRuns: [
      { id: "sr-p1", startedAt: iso(40), endedAt: null, status: "running", samples: 8200, agreements: 7964, disagreements: 236, drift: 0.029 },
    ],
    usage: usageSeries(0, 11, 0.982), drift: [], color: "#fb923c",
    stats: [{ label: "Shadow samples", value: "8.2k" }, { label: "Agreement", value: "97.1%" }, { label: "Drift", value: "0.029" }],
  },
];

export function searchArtefacts(items: Artefact[], query: string, kind: ArtefactKind | "all", lifecycle: LifecycleState | "all"): Artefact[] {
  const q = query.trim().toLowerCase();
  return items.filter((a) => {
    if (kind !== "all" && a.kind !== kind) return false;
    if (lifecycle !== "all" && a.lifecycle !== lifecycle) return false;
    if (!q) return true;
    return (a.name + " " + a.description + " " + a.tags.join(" ") + " " + a.owner + " " + a.team + " " + a.version).toLowerCase().includes(q);
  });
}

export function dependencyName(id: string, all: Artefact[]): string {
  return all.find((a) => a.id === id)?.name ?? id;
}

export function reverseDeps(id: string, all: Artefact[]): Artefact[] {
  return all.filter((a) => a.dependencies.some((d) => d.artefactId === id));
}

export function governanceHealth(items: Artefact[]) {
  const total = items.length;
  const approved = items.filter((a) => a.lifecycle === "Approved").length;
  const review = items.filter((a) => a.lifecycle === "Review").length;
  const draft = items.filter((a) => a.lifecycle === "Draft").length;
  const deprecated = items.filter((a) => a.lifecycle === "Deprecated").length;
  const shadowing = items.filter((a) => a.shadowMode).length;
  const champions = items.filter((a) => a.champion).length;
  const challengers = items.filter((a) => a.challenger).length;
  const drifters = items.filter((a) => a.drift.some((d) => d.psi > d.threshold)).length;
  const pendingApprovals = items.reduce((n, a) => n + a.approvals.filter((x) => x.status === "Pending").length, 0);
  const score = Math.round(
    (approved / Math.max(total, 1)) * 40 +
    (1 - pendingApprovals / Math.max(items.reduce((n, a) => n + a.approvals.length, 0), 1)) * 25 +
    (champions / Math.max(ARTEFACT_KINDS.length, 1)) * 20 +
    (1 - drifters / Math.max(total, 1)) * 15,
  );
  return { total, approved, review, draft, deprecated, shadowing, champions, challengers, drifters, pendingApprovals, score };
}

export function nextArtefactId(kind: ArtefactKind, items: Artefact[]): string {
  const n = items.filter((a) => a.kind === kind).length + 1;
  return `art-${kind}-${n}`;
}

export { now, iso, date, uid };
