import type { LoginSession } from "@/types";
import { generateSessions } from "@/lib/mockData";

// ---------------------------------------------------------------------------
// In-memory database for the Dataset Builder + Model Studio.
// Everything lives in module-level state — no Supabase, no persistence.
// Reset on full page reload.
// ---------------------------------------------------------------------------

export type DatasetKind = "labelled" | "unlabelled";
export type FeatureCategory =
  | "identity" | "device" | "geo" | "network" | "temporal"
  | "behavioral" | "risk" | "auth" | "derived";

export interface FeatureSpec {
  key: string;
  label: string;
  category: FeatureCategory;
  dtype: "numeric" | "categorical" | "boolean";
  description: string;
  /** default selected when building a new dataset */
  defaultOn: boolean;
}

export interface SignalGenerator {
  id: string;
  name: string;
  category: FeatureCategory;
  description: string;
  /** produces a numeric signal 0..1 from a session + cohort context */
  compute: (ctx: SignalContext) => number;
}

export interface SignalContext {
  session: LoginSession;
  cohort: LoginSession[];
  index: number;
}

export interface DatasetRow {
  sessionId: string;
  features: Record<string, number | string | boolean>;
  label: number | null; // 1 = fraud, 0 = legit, null = unlabelled
}

export interface DatasetStats {
  rows: number;
  features: number;
  fraudRows: number;
  legitRows: number;
  unlabelledRows: number;
  fraudRate: number;
  missingRate: number;
  featureDistributions: {
    key: string;
    label: string;
    min: number;
    max: number;
    mean: number;
    std: number;
  }[];
}

export interface DatasetVersion {
  version: string;
  date: string;
  change: string;
  rows: number;
  features: number;
}

export interface Dataset {
  id: string;
  name: string;
  description: string;
  kind: DatasetKind;
  sourceSessionCount: number;
  featureKeys: string[];
  rows: DatasetRow[];
  stats: DatasetStats;
  createdAt: string;
  updatedAt: string;
  versions: DatasetVersion[];
  tags: string[];
}

// ---------------------------------------------------------------------------
// Model Studio types
// ---------------------------------------------------------------------------

export type ModelAlgorithm =
  | "xgboost" | "lightgbm" | "catboost" | "random-forest"
  | "logistic-regression" | "isolation-forest";

export type ModelTask = "classification" | "anomaly";

export interface HyperparameterSpec {
  key: string;
  label: string;
  type: "number" | "select";
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  default: number | string;
}

export interface TrainConfig {
  algorithm: ModelAlgorithm;
  testSplit: number; // 0..1
  cvFolds: number;
  featureKeys: string[];
  hyperparameters: Record<string, number | string>;
  tuning: boolean;
  tuningTrials: number;
  randomSeed: number;
}

export interface ConfusionMatrix {
  tn: number;
  fp: number;
  fn: number;
  tp: number;
}

export interface CurvePoint {
  threshold: number;
  tpr: number;
  fpr: number;
  precision: number;
  recall: number;
}

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  rocAuc: number;
  prAuc: number;
  confusion: ConfusionMatrix;
  rocCurve: CurvePoint[];
  prCurve: CurvePoint[];
}

export interface FeatureImportanceEntry {
  feature: string;
  importance: number;
}

export interface ModelVersion {
  version: string;
  date: string;
  metrics: ModelMetrics;
  change: string;
}

export interface TrainedModel {
  id: string;
  name: string;
  algorithm: ModelAlgorithm;
  task: ModelTask;
  datasetId: string;
  datasetName: string;
  config: TrainConfig;
  metrics: ModelMetrics;
  featureImportance: FeatureImportanceEntry[];
  selectedFeatures: string[];
  versions: ModelVersion[];
  createdAt: string;
  updatedAt: string;
  status: "draft" | "published" | "archived";
  attachedPipelines: string[];
}

// ---------------------------------------------------------------------------
// Feature catalog — the engineered feature library
// ---------------------------------------------------------------------------

export const FEATURE_CATALOG: FeatureSpec[] = [
  { key: "risk_score", label: "Risk Score", category: "risk", dtype: "numeric", description: "Engine risk score 0..100", defaultOn: true },
  { key: "coherence_score", label: "Coherence Score", category: "risk", dtype: "numeric", description: "Behavioral coherence 0..100", defaultOn: true },
  { key: "fraud_probability", label: "Fraud Probability", category: "risk", dtype: "numeric", description: "Model fraud probability 0..100", defaultOn: true },
  { key: "failed_attempts", label: "Failed Attempts", category: "auth", dtype: "numeric", description: "Failed login attempts in session", defaultOn: true },
  { key: "velocity_events", label: "Velocity Events", category: "temporal", dtype: "numeric", description: "Login events in velocity window", defaultOn: true },
  { key: "duration", label: "Session Duration", category: "temporal", dtype: "numeric", description: "Session duration seconds", defaultOn: true },
  { key: "latency", label: "API Latency", category: "network", dtype: "numeric", description: "API latency ms", defaultOn: true },
  { key: "evidence_count", label: "Evidence Count", category: "behavioral", dtype: "numeric", description: "Evidence signals collected", defaultOn: true },
  { key: "triggered_rules", label: "Triggered Rules", category: "risk", dtype: "numeric", description: "Count of triggered risk rules", defaultOn: true },
  { key: "new_device", label: "New Device", category: "device", dtype: "boolean", description: "First-seen device flag", defaultOn: true },
  { key: "vpn", label: "VPN / Proxy", category: "network", dtype: "boolean", description: "VPN or proxy detected", defaultOn: true },
  { key: "mfa_used", label: "MFA Used", category: "auth", dtype: "boolean", description: "Multi-factor auth used", defaultOn: true },
  { key: "device_type", label: "Device Type", category: "device", dtype: "categorical", description: "Desktop / Mobile / Tablet", defaultOn: true },
  { key: "channel", label: "Channel", category: "identity", dtype: "categorical", description: "Web / Mobile App / API / SSO", defaultOn: true },
  { key: "country_code", label: "Country", category: "geo", dtype: "categorical", description: "ISO country code", defaultOn: true },
  // Derived / engineered features
  { key: "geo_velocity", label: "Geo Velocity (km/h)", category: "derived", dtype: "numeric", description: "Implied travel speed from previous login", defaultOn: true },
  { key: "distance_km", label: "Distance from Prev (km)", category: "derived", dtype: "numeric", description: "Great-circle distance from previous login", defaultOn: true },
  { key: "country_changed", label: "Country Changed", category: "derived", dtype: "boolean", description: "Country differs from previous login", defaultOn: true },
  { key: "off_hours", label: "Off-Hours Login", category: "derived", dtype: "boolean", description: "Login outside 07:00–22:00 local", defaultOn: true },
  { key: "hour_of_day", label: "Hour of Day", category: "derived", dtype: "numeric", description: "Login hour 0..23", defaultOn: true },
  { key: "asn_risk", label: "ASN Risk Score", category: "derived", dtype: "numeric", description: "Reputation score for ASN", defaultOn: true },
  { key: "rule_density", label: "Rule Density", category: "derived", dtype: "numeric", description: "Triggered rules per evidence signal", defaultOn: true },
  { key: "velocity_ratio", label: "Velocity Ratio", category: "derived", dtype: "numeric", description: "Velocity events / failed attempts", defaultOn: true },
  { key: "latency_zscore", label: "Latency Z-Score", category: "derived", dtype: "numeric", description: "Latency normalized against cohort", defaultOn: false },
  { key: "risk_zscore", label: "Risk Z-Score", category: "derived", dtype: "numeric", description: "Risk score normalized against cohort", defaultOn: false },
];

export const FEATURE_BY_KEY = new Map(FEATURE_CATALOG.map((f) => [f.key, f]));

export const FEATURE_CATEGORIES: { id: FeatureCategory; label: string; color: string }[] = [
  { id: "identity", label: "Identity", color: "#0ea5e9" },
  { id: "device", label: "Device", color: "#6366f1" },
  { id: "geo", label: "Geo", color: "#14b8a6" },
  { id: "network", label: "Network", color: "#f59e0b" },
  { id: "temporal", label: "Temporal", color: "#ec4899" },
  { id: "behavioral", label: "Behavioral", color: "#8b5cf6" },
  { id: "risk", label: "Risk", color: "#ef4444" },
  { id: "auth", label: "Auth", color: "#10b981" },
  { id: "derived", label: "Derived", color: "#f97316" },
];

// ---------------------------------------------------------------------------
// Signal generators — automatic signal creation in pipelines
// ---------------------------------------------------------------------------

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export const SIGNAL_GENERATORS: SignalGenerator[] = [
  {
    id: "sig-geo-velocity",
    name: "Geo Velocity",
    category: "geo",
    description: "Implied travel speed between consecutive logins",
    compute: ({ session }) => {
      if (!session.previousLoginTime) return 0;
      const dist = haversineKm(session.latitude, session.longitude, session.latitude, session.longitude);
      const hours = (new Date(session.loginTime).getTime() - new Date(session.previousLoginTime).getTime()) / 3_600_000;
      if (hours <= 0) return 0;
      return Math.min(1, dist / hours / 900);
    },
  },
  {
    id: "sig-impossible-travel",
    name: "Impossible Travel",
    category: "geo",
    description: "Flags logins implying > 800 km/h travel",
    compute: ({ session }) => {
      if (!session.previousCountry) return 0;
      return session.previousCountry !== session.country && session.velocityEvents > 4 ? 1 : 0;
    },
  },
  {
    id: "sig-velocity-burst",
    name: "Velocity Burst",
    category: "temporal",
    description: "Abnormal login velocity in 1h window",
    compute: ({ session }) => Math.min(1, session.velocityEvents / 28),
  },
  {
    id: "sig-credential-stuffing",
    name: "Credential Stuffing",
    category: "auth",
    description: "High failed attempts + new device",
    compute: ({ session }) => (session.failedAttempts >= 3 && session.newDevice ? 1 : 0),
  },
  {
    id: "sig-new-device-risk",
    name: "New Device Risk",
    category: "device",
    description: "New device + off-hours + VPN combo",
    compute: ({ session }) => {
      const hour = new Date(session.loginTime).getHours();
      const offHours = hour < 7 || hour > 22 ? 1 : 0;
      return (session.newDevice ? 0.4 : 0) + (offHours ? 0.3 : 0) + (session.vpn ? 0.3 : 0);
    },
  },
  {
    id: "sig-low-coherence",
    name: "Low Coherence",
    category: "behavioral",
    description: "Coherence below 40",
    compute: ({ session }) => (session.coherenceScore < 40 ? 1 : 0),
  },
  {
    id: "sig-rule-density",
    name: "Rule Density Anomaly",
    category: "risk",
    description: "Triggered rules per evidence signal",
    compute: ({ session }) => {
      const density = session.triggeredRules.length / Math.max(1, session.evidenceCount);
      return Math.min(1, density);
    },
  },
  {
    id: "sig-asn-reputation",
    name: "ASN Reputation",
    category: "network",
    description: "Risk weight per ASN",
    compute: ({ session }) => {
      const hash = session.asn.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
      return (hash % 100) / 100;
    },
  },
  {
    id: "sig-latency-outlier",
    name: "Latency Outlier",
    category: "network",
    description: "Latency above cohort mean + 2σ",
    compute: ({ session, cohort }) => {
      const lats = cohort.map((s) => s.latency);
      const mean = lats.reduce((a, b) => a + b, 0) / Math.max(1, lats.length);
      const std = Math.sqrt(lats.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, lats.length));
      return std > 0 && session.latency > mean + 2 * std ? 1 : 0;
    },
  },
];

// ---------------------------------------------------------------------------
// Feature extraction
// ---------------------------------------------------------------------------

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdDev(arr: number[]): number {
  if (arr.length === 0) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length);
}

export function extractFeatures(
  session: LoginSession,
  cohort: LoginSession[],
  featureKeys: string[],
): Record<string, number | string | boolean> {
  const features: Record<string, number | string | boolean> = {};
  const hour = new Date(session.loginTime).getHours();
  const lats = cohort.map((s) => s.latency);
  const risks = cohort.map((s) => s.riskScore);
  const latMean = mean(lats);
  const latStd = stdDev(lats);
  const riskMean = mean(risks);
  const riskStd = stdDev(risks);

  for (const key of featureKeys) {
    switch (key) {
      case "risk_score": features[key] = session.riskScore; break;
      case "coherence_score": features[key] = session.coherenceScore; break;
      case "fraud_probability": features[key] = session.fraudProbability; break;
      case "failed_attempts": features[key] = session.failedAttempts; break;
      case "velocity_events": features[key] = session.velocityEvents; break;
      case "duration": features[key] = session.duration; break;
      case "latency": features[key] = session.latency; break;
      case "evidence_count": features[key] = session.evidenceCount; break;
      case "triggered_rules": features[key] = session.triggeredRules.length; break;
      case "new_device": features[key] = session.newDevice; break;
      case "vpn": features[key] = session.vpn; break;
      case "mfa_used": features[key] = session.mfaUsed; break;
      case "device_type": features[key] = session.deviceType; break;
      case "channel": features[key] = session.channel; break;
      case "country_code": features[key] = session.countryCode; break;
      case "geo_velocity": {
        if (!session.previousLoginTime) { features[key] = 0; break; }
        const dist = haversineKm(session.latitude, session.longitude, session.latitude + 1, session.longitude + 1);
        const hours = (new Date(session.loginTime).getTime() - new Date(session.previousLoginTime).getTime()) / 3_600_000;
        features[key] = hours > 0 ? Math.round(dist / hours) : 0;
        break;
      }
      case "distance_km": {
        if (!session.previousLoginTime) { features[key] = 0; break; }
        features[key] = Math.round(haversineKm(session.latitude, session.longitude, session.latitude + 2, session.longitude - 1));
        break;
      }
      case "country_changed": features[key] = session.previousCountry !== null && session.previousCountry !== session.country; break;
      case "off_hours": features[key] = hour < 7 || hour > 22; break;
      case "hour_of_day": features[key] = hour; break;
      case "asn_risk": {
        const hash = session.asn.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
        features[key] = hash % 100;
        break;
      }
      case "rule_density": features[key] = parseFloat((session.triggeredRules.length / Math.max(1, session.evidenceCount)).toFixed(3)); break;
      case "velocity_ratio": features[key] = session.failedAttempts > 0 ? parseFloat((session.velocityEvents / session.failedAttempts).toFixed(3)) : session.velocityEvents; break;
      case "latency_zscore": features[key] = latStd > 0 ? parseFloat(((session.latency - latMean) / latStd).toFixed(3)) : 0; break;
      case "risk_zscore": features[key] = riskStd > 0 ? parseFloat(((session.riskScore - riskMean) / riskStd).toFixed(3)) : 0; break;
      default: break;
    }
  }
  return features;
}

function computeStats(rows: DatasetRow[], featureKeys: string[]): DatasetStats {
  const fraudRows = rows.filter((r) => r.label === 1).length;
  const legitRows = rows.filter((r) => r.label === 0).length;
  const unlabelledRows = rows.filter((r) => r.label === null).length;
  const labelled = rows.filter((r) => r.label !== null);
  const fraudRate = labelled.length > 0 ? fraudRows / labelled.length : 0;

  const dists = featureKeys.map((key) => {
    const vals = rows.map((r) => r.features[key]).filter((v): v is number => typeof v === "number");
    if (vals.length === 0) {
      const spec = FEATURE_BY_KEY.get(key);
      return { key, label: spec?.label ?? key, min: 0, max: 0, mean: 0, std: 0 };
    }
    return {
      key,
      label: FEATURE_BY_KEY.get(key)?.label ?? key,
      min: Math.min(...vals),
      max: Math.max(...vals),
      mean: parseFloat(mean(vals).toFixed(3)),
      std: parseFloat(stdDev(vals).toFixed(3)),
    };
  });

  return {
    rows: rows.length,
    features: featureKeys.length,
    fraudRows,
    legitRows,
    unlabelledRows,
    fraudRate: parseFloat(fraudRate.toFixed(4)),
    missingRate: 0,
    featureDistributions: dists,
  };
}

// ---------------------------------------------------------------------------
// In-memory store
// ---------------------------------------------------------------------------

const SESSIONS: LoginSession[] = generateSessions(400);
const DATASETS: Dataset[] = [];
const MODELS: TrainedModel[] = [];

let datasetIdCounter = 1;
let modelIdCounter = 1;

const now = () => new Date().toISOString();

export function getSessions(): LoginSession[] {
  return SESSIONS;
}

export function listDatasets(): Dataset[] {
  return [...DATASETS];
}

export function getDataset(id: string): Dataset | undefined {
  return DATASETS.find((d) => d.id === id);
}

export function createDataset(input: {
  name: string;
  description: string;
  kind: DatasetKind;
  featureKeys: string[];
  sessionCount: number;
  labelStrategy: "decision" | "risk_threshold" | "manual" | "none";
  riskThreshold?: number;
}): Dataset {
  const cohort = SESSIONS.slice(0, Math.min(input.sessionCount, SESSIONS.length));
  const rows: DatasetRow[] = cohort.map((session) => {
    const features = extractFeatures(session, cohort, input.featureKeys);
    let label: number | null = null;
    if (input.kind === "labelled") {
      if (input.labelStrategy === "decision") {
        label = session.decision === "Deny" ? 1 : session.decision === "Challenge" ? 1 : 0;
      } else if (input.labelStrategy === "risk_threshold") {
        label = session.riskScore >= (input.riskThreshold ?? 70) ? 1 : 0;
      } else if (input.labelStrategy === "manual") {
        label = session.fraudProbability >= 60 ? 1 : 0;
      }
    }
    return { sessionId: session.sessionId, features, label };
  });

  const stats = computeStats(rows, input.featureKeys);
  const id = `ds-${datasetIdCounter++}`;
  const dataset: Dataset = {
    id,
    name: input.name,
    description: input.description,
    kind: input.kind,
    sourceSessionCount: cohort.length,
    featureKeys: input.featureKeys,
    rows,
    stats,
    createdAt: now(),
    updatedAt: now(),
    versions: [{ version: "v1", date: new Date().toISOString().slice(0, 10), change: "Initial build", rows: rows.length, features: input.featureKeys.length }],
    tags: [input.kind],
  };
  DATASETS.unshift(dataset);
  return dataset;
}

export function deleteDataset(id: string): void {
  const idx = DATASETS.findIndex((d) => d.id === id);
  if (idx >= 0) DATASETS.splice(idx, 1);
  for (let i = MODELS.length - 1; i >= 0; i--) {
    if (MODELS[i].datasetId === id) MODELS.splice(i, 1);
  }
}

export function listModels(): TrainedModel[] {
  return [...MODELS];
}

export function getModel(id: string): TrainedModel | undefined {
  return MODELS.find((m) => m.id === id);
}

// ---------------------------------------------------------------------------
// Algorithm metadata
// ---------------------------------------------------------------------------

export const ALGORITHM_META: Record<ModelAlgorithm, {
  label: string;
  task: ModelTask;
  color: string;
  description: string;
  hyperparameters: HyperparameterSpec[];
}> = {
  xgboost: {
    label: "XGBoost",
    task: "classification",
    color: "#f97316",
    description: "Gradient-boosted trees with high accuracy on tabular fraud data.",
    hyperparameters: [
      { key: "n_estimators", label: "Estimators", type: "number", min: 50, max: 1000, step: 50, default: 300 },
      { key: "max_depth", label: "Max Depth", type: "number", min: 2, max: 12, step: 1, default: 6 },
      { key: "learning_rate", label: "Learning Rate", type: "number", min: 0.01, max: 0.5, step: 0.01, default: 0.1 },
      { key: "subsample", label: "Subsample", type: "number", min: 0.5, max: 1, step: 0.05, default: 0.8 },
    ],
  },
  lightgbm: {
    label: "LightGBM",
    task: "classification",
    color: "#0ea5e9",
    description: "Leaf-wise gradient boosting — fast training on large datasets.",
    hyperparameters: [
      { key: "n_estimators", label: "Estimators", type: "number", min: 50, max: 1000, step: 50, default: 300 },
      { key: "num_leaves", label: "Num Leaves", type: "number", min: 15, max: 255, step: 1, default: 63 },
      { key: "learning_rate", label: "Learning Rate", type: "number", min: 0.01, max: 0.5, step: 0.01, default: 0.1 },
      { key: "min_child_samples", label: "Min Child Samples", type: "number", min: 1, max: 100, step: 1, default: 20 },
    ],
  },
  catboost: {
    label: "CatBoost",
    task: "classification",
    color: "#8b5cf6",
    description: "Gradient boosting with native categorical feature handling.",
    hyperparameters: [
      { key: "iterations", label: "Iterations", type: "number", min: 50, max: 1000, step: 50, default: 300 },
      { key: "depth", label: "Tree Depth", type: "number", min: 2, max: 10, step: 1, default: 6 },
      { key: "learning_rate", label: "Learning Rate", type: "number", min: 0.01, max: 0.5, step: 0.01, default: 0.1 },
    ],
  },
  "random-forest": {
    label: "Random Forest",
    task: "classification",
    color: "#10b981",
    description: "Bagged decision trees — robust, low-variance baseline.",
    hyperparameters: [
      { key: "n_estimators", label: "Estimators", type: "number", min: 50, max: 1000, step: 50, default: 200 },
      { key: "max_depth", label: "Max Depth", type: "number", min: 2, max: 20, step: 1, default: 10 },
      { key: "min_samples_split", label: "Min Samples Split", type: "number", min: 2, max: 20, step: 1, default: 5 },
    ],
  },
  "logistic-regression": {
    label: "Logistic Regression",
    task: "classification",
    color: "#14b8a6",
    description: "Linear model — interpretable, fast, strong baseline.",
    hyperparameters: [
      { key: "C", label: "Regularization (C)", type: "number", min: 0.01, max: 10, step: 0.01, default: 1 },
      { key: "max_iter", label: "Max Iterations", type: "number", min: 50, max: 1000, step: 50, default: 200 },
    ],
  },
  "isolation-forest": {
    label: "Isolation Forest",
    task: "anomaly",
    color: "#ec4899",
    description: "Unsupervised anomaly detection — works on unlabelled data.",
    hyperparameters: [
      { key: "n_estimators", label: "Estimators", type: "number", min: 50, max: 1000, step: 50, default: 200 },
      { key: "contamination", label: "Contamination", type: "number", min: 0.01, max: 0.5, step: 0.01, default: 0.1 },
      { key: "max_samples", label: "Max Samples", type: "number", min: 50, max: 1000, step: 50, default: 256 },
    ],
  },
};

export const ALGORITHMS = Object.keys(ALGORITHM_META) as ModelAlgorithm[];

// ---------------------------------------------------------------------------
// Simulated training + evaluation engine
// ---------------------------------------------------------------------------

function shuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function aucFromCurve(points: { fpr: number; tpr: number }[]): number {
  let area = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].fpr - points[i - 1].fpr;
    area += dx * (points[i].tpr + points[i - 1].tpr) / 2;
  }
  return Math.max(0, Math.min(1, area));
}

function aucFromPR(points: { recall: number; precision: number }[]): number {
  let area = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].recall - points[i - 1].recall;
    area += dx * (points[i].precision + points[i - 1].precision) / 2;
  }
  return Math.max(0, Math.min(1, area));
}

/** Deterministic pseudo-score per row, influenced by features + algorithm. */
function scoreRow(row: DatasetRow, featureKeys: string[], algo: ModelAlgorithm, hp: Record<string, number | string>, seed: number): number {
  let z = 0;
  for (const key of featureKeys) {
    const v = row.features[key];
    if (typeof v === "number") {
      const weight = ((key.charCodeAt(0) + key.length) % 7) / 7;
      z += v * weight * 0.01;
    } else if (typeof v === "boolean") {
      z += v ? 0.3 : -0.1;
    }
  }
  // algorithm bias
  const algoBias: Record<ModelAlgorithm, number> = {
    xgboost: 0.15, lightgbm: 0.12, catboost: 0.13, "random-forest": 0.05,
    "logistic-regression": -0.05, "isolation-forest": 0.0,
  };
  z += algoBias[algo];
  // hyperparameter influence
  const est = Number(hp.n_estimators ?? hp.iterations ?? 200);
  z += Math.log(est) * 0.05;
  const lr = Number(hp.learning_rate ?? 0.1);
  z += (0.1 - Math.abs(lr - 0.1)) * 0.2;
  // seed noise
  const noise = ((seed * (row.sessionId.charCodeAt(2) + 1)) % 100) / 100 - 0.5;
  z += noise * 0.3;
  return sigmoid(z);
}

function buildCurves(scores: { score: number; label: number }[]) {
  const thresholds: number[] = [];
  for (let i = 0; i <= 20; i++) thresholds.push(i / 20);
  const roc: CurvePoint[] = [];
  const pr: CurvePoint[] = [];
  const pos = scores.filter((s) => s.label === 1).length;
  const neg = scores.filter((s) => s.label === 0).length;
  for (const t of thresholds) {
    const tp = scores.filter((s) => s.score >= t && s.label === 1).length;
    const fp = scores.filter((s) => s.score >= t && s.label === 0).length;
    const fn = scores.filter((s) => s.score < t && s.label === 1).length;
    const tpr = pos > 0 ? tp / pos : 0;
    const fpr = neg > 0 ? fp / neg : 0;
    const precision = tp + fp > 0 ? tp / (tp + fp) : 1;
    const recall = tpr;
    roc.push({ threshold: t, tpr, fpr, precision, recall });
    pr.push({ threshold: t, tpr, fpr, precision, recall });
  }
  return { roc, pr };
}

function computeFeatureImportance(rows: DatasetRow[], featureKeys: string[], algo: ModelAlgorithm): FeatureImportanceEntry[] {
  const entries: FeatureImportanceEntry[] = featureKeys.map((key) => {
    const spec = FEATURE_BY_KEY.get(key);
    let importance = 0;
    if (spec?.dtype === "numeric") {
      const vals = rows.map((r) => r.features[key]).filter((v): v is number => typeof v === "number");
      if (vals.length > 1) {
        const m = mean(vals);
        const sd = stdDev(vals);
        importance = sd > 0 ? Math.min(1, Math.abs(m) / (sd * 10 + 1)) : 0;
      }
    } else if (spec?.dtype === "boolean") {
      const trues = rows.filter((r) => r.features[key] === true).length;
      importance = Math.min(1, trues / rows.length);
    } else {
      const counts = new Map<string, number>();
      rows.forEach((r) => {
        const v = String(r.features[key]);
        counts.set(v, (counts.get(v) ?? 0) + 1);
      });
      const max = Math.max(...counts.values());
      importance = 1 - max / rows.length;
    }
    const algoBoost: Record<ModelAlgorithm, number> = {
      xgboost: 1.2, lightgbm: 1.15, catboost: 1.18, "random-forest": 1.0,
      "logistic-regression": 0.85, "isolation-forest": 0.9,
    };
    importance *= algoBoost[algo];
    return { feature: spec?.label ?? key, importance: Math.min(1, Math.max(0, importance)) };
  });
  const total = entries.reduce((a, e) => a + e.importance, 0);
  if (total > 0) entries.forEach((e) => (e.importance = e.importance / total));
  return entries.sort((a, b) => b.importance - a.importance);
}

export function trainModel(dataset: Dataset, config: TrainConfig): { model: TrainedModel; metrics: ModelMetrics; importance: FeatureImportanceEntry[] } {
  const algo = config.algorithm;
  const meta = ALGORITHM_META[algo];
  const labelledRows = dataset.rows.filter((r) => r.label !== null);
  const rows = meta.task === "anomaly" ? dataset.rows : labelledRows;
  const shuffled = shuffle(rows, config.randomSeed);
  const splitIdx = Math.floor(shuffled.length * (1 - config.testSplit));
  const train = shuffled.slice(0, splitIdx);
  const test = shuffled.slice(splitIdx);

  // Cross-validation (simulated): average metric across folds
  const foldSize = Math.floor(train.length / Math.max(2, config.cvFolds));
  const cvAucs: number[] = [];
  for (let f = 0; f < config.cvFolds; f++) {
    const foldTest = train.slice(f * foldSize, (f + 1) * foldSize);
    const foldScores = foldTest.map((r) => ({ score: scoreRow(r, config.featureKeys, algo, config.hyperparameters, config.randomSeed + f), label: r.label ?? 0 }));
    const { roc } = buildCurves(foldScores);
    cvAucs.push(aucFromCurve(roc));
  }
  const cvAuc = cvAucs.length > 0 ? cvAucs.reduce((a, b) => a + b, 0) / cvAucs.length : 0.5;

  // Hyperparameter tuning: simulated improvement
  let tuningBoost = 0;
  if (config.tuning) {
    tuningBoost = Math.min(0.05, config.tuningTrials * 0.004);
  }

  // Final test scores
  const testScores = test.map((r) => ({ score: scoreRow(r, config.featureKeys, algo, config.hyperparameters, config.randomSeed), label: r.label ?? 0 }));
  const { roc, pr } = buildCurves(testScores);
  const rocAuc = Math.min(0.999, Math.max(0.5, aucFromCurve(roc) + tuningBoost + (cvAuc - 0.5) * 0.1));
  const prAuc = Math.min(0.999, Math.max(0.4, aucFromPR(pr) + tuningBoost));

  // Confusion matrix at 0.5 threshold
  const threshold = 0.5;
  let tp = 0, fp = 0, fn = 0, tn = 0;
  for (const s of testScores) {
    if (s.score >= threshold && s.label === 1) tp++;
    else if (s.score >= threshold && s.label === 0) fp++;
    else if (s.score < threshold && s.label === 1) fn++;
    else tn++;
  }
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const accuracy = testScores.length > 0 ? (tp + tn) / testScores.length : 0;

  const metrics: ModelMetrics = {
    accuracy: parseFloat(accuracy.toFixed(4)),
    precision: parseFloat(precision.toFixed(4)),
    recall: parseFloat(recall.toFixed(4)),
    f1: parseFloat(f1.toFixed(4)),
    rocAuc: parseFloat(rocAuc.toFixed(4)),
    prAuc: parseFloat(prAuc.toFixed(4)),
    confusion: { tn, fp, fn, tp },
    rocCurve: roc,
    prCurve: pr,
  };

  const importance = computeFeatureImportance(rows, config.featureKeys, algo);

  const id = `mdl-${modelIdCounter++}`;
  const isoNow = now();
  const model: TrainedModel = {
    id,
    name: `${meta.label} · ${dataset.name}`,
    algorithm: algo,
    task: meta.task,
    datasetId: dataset.id,
    datasetName: dataset.name,
    config,
    metrics,
    featureImportance: importance,
    selectedFeatures: config.featureKeys,
    versions: [{ version: "v1", date: new Date().toISOString().slice(0, 10), metrics, change: "Initial training" }],
    createdAt: isoNow,
    updatedAt: isoNow,
    status: "draft",
    attachedPipelines: [],
  };
  MODELS.unshift(model);
  return { model, metrics, importance };
}

export function retrainModel(modelId: string, config: TrainConfig): TrainedModel | undefined {
  const existing = getModel(modelId);
  if (!existing) return undefined;
  const dataset = getDataset(existing.datasetId);
  if (!dataset) return undefined;
  const { metrics, importance } = trainModel(dataset, config);
  // trainModel adds a new model; instead we want to version the existing one
  // Remove the freshly created model and version the existing
  const justCreated = MODELS.shift();
  void justCreated;
  const versionNum = existing.versions.length + 1;
  existing.metrics = metrics;
  existing.featureImportance = importance;
  existing.config = config;
  existing.selectedFeatures = config.featureKeys;
  existing.updatedAt = now();
  existing.versions.unshift({ version: `v${versionNum}`, date: new Date().toISOString().slice(0, 10), metrics, change: "Retrained with new config" });
  return existing;
}

export function publishModel(modelId: string): TrainedModel | undefined {
  const m = getModel(modelId);
  if (!m) return undefined;
  m.status = "published";
  m.updatedAt = now();
  return m;
}

export function archiveModel(modelId: string): TrainedModel | undefined {
  const m = getModel(modelId);
  if (!m) return undefined;
  m.status = "archived";
  m.updatedAt = now();
  return m;
}

export function deleteModel(modelId: string): void {
  const idx = MODELS.findIndex((m) => m.id === modelId);
  if (idx >= 0) MODELS.splice(idx, 1);
}

export function attachModelToPipeline(modelId: string, pipelineName: string): TrainedModel | undefined {
  const m = getModel(modelId);
  if (!m) return undefined;
  if (!m.attachedPipelines.includes(pipelineName)) {
    m.attachedPipelines.push(pipelineName);
    m.updatedAt = now();
  }
  return m;
}

export function detachModelFromPipeline(modelId: string, pipelineName: string): TrainedModel | undefined {
  const m = getModel(modelId);
  if (!m) return undefined;
  m.attachedPipelines = m.attachedPipelines.filter((p) => p !== pipelineName);
  m.updatedAt = now();
  return m;
}

// ---------------------------------------------------------------------------
// Seed data — a couple of starter datasets + models
// ---------------------------------------------------------------------------

export function seedData(): void {
  if (DATASETS.length > 0) return;
  const labelled = createDataset({
    name: "Fraud Labelled Sessions",
    description: "Labelled login sessions derived from historical decision outcomes. Used for supervised fraud classification.",
    kind: "labelled",
    featureKeys: FEATURE_CATALOG.filter((f) => f.defaultOn).map((f) => f.key),
    sessionCount: 400,
    labelStrategy: "decision",
  });
  const unlabelled = createDataset({
    name: "Unlabelled Behaviour Baseline",
    description: "Unlabelled sessions for anomaly detection and unsupervised baseline modelling.",
    kind: "unlabelled",
    featureKeys: FEATURE_CATALOG.filter((f) => f.defaultOn).map((f) => f.key),
    sessionCount: 400,
    labelStrategy: "none",
  });

  trainModel(labelled, {
    algorithm: "xgboost",
    testSplit: 0.2,
    cvFolds: 5,
    featureKeys: labelled.featureKeys,
    hyperparameters: { n_estimators: 300, max_depth: 6, learning_rate: 0.1, subsample: 0.8 },
    tuning: false,
    tuningTrials: 0,
    randomSeed: 42,
  });
  trainModel(unlabelled, {
    algorithm: "isolation-forest",
    testSplit: 0.2,
    cvFolds: 3,
    featureKeys: unlabelled.featureKeys,
    hyperparameters: { n_estimators: 200, contamination: 0.1, max_samples: 256 },
    tuning: false,
    tuningTrials: 0,
    randomSeed: 7,
  });
}
