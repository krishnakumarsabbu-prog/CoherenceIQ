export type DeploymentStatus = "production" | "shadow" | "staging" | "retired" | "training";
export type ModelHealth = "healthy" | "degraded" | "down";

export interface ModelFeature {
  feature: string;
  importance: number; // 0..1
}

export interface RiskModel {
  id: string;
  name: string;
  kind: "weighted" | "gradient" | "graph" | "temporal" | "policy" | "ensemble";
  version: string;
  accuracy: number; // 0..1
  precision: number; // 0..1
  recall: number; // 0..1
  roc: number; // AUC 0..1
  trainingDate: string;
  deploymentStatus: DeploymentStatus;
  featureImportance: ModelFeature[];
  health: ModelHealth;
  description: string;
  latencyMs: number;
  color: string;
}

export const RISK_MODELS: RiskModel[] = [
  {
    id: "wcm",
    name: "Weighted Coherence Model",
    kind: "weighted",
    version: "v3.2",
    accuracy: 0.942,
    precision: 0.918,
    recall: 0.904,
    roc: 0.961,
    trainingDate: "2026-06-12",
    deploymentStatus: "production",
    latencyMs: 12,
    health: "healthy",
    description: "Fuses domain-model outputs into a single coherence score using learned weights.",
    color: "#0ea5e9",
    featureImportance: [
      { feature: "device_trust_score", importance: 0.82 },
      { feature: "geo_velocity", importance: 0.74 },
      { feature: "behavioral_coherence", importance: 0.68 },
      { feature: "ip_reputation", importance: 0.55 },
      { feature: "graph_linkage", importance: 0.42 },
    ],
  },
  {
    id: "gbfm",
    name: "Gradient Boosted Fraud Model",
    kind: "gradient",
    version: "v7.0",
    accuracy: 0.951,
    precision: 0.933,
    recall: 0.921,
    roc: 0.974,
    trainingDate: "2026-07-01",
    deploymentStatus: "production",
    latencyMs: 18,
    health: "healthy",
    description: "XGBoost ensemble over 240 engineered features; nightly retrain on labeled outcomes.",
    color: "#f97316",
    featureImportance: [
      { feature: "failed_attempts_1h", importance: 0.91 },
      { feature: "first_seen_recency", importance: 0.78 },
      { feature: "distance_km", importance: 0.72 },
      { feature: "credential_breach_flag", importance: 0.66 },
      { feature: "asn_reputation", importance: 0.51 },
    ],
  },
  {
    id: "grm",
    name: "Graph Risk Model",
    kind: "graph",
    version: "v2.4",
    accuracy: 0.918,
    precision: 0.902,
    recall: 0.877,
    roc: 0.943,
    trainingDate: "2026-06-28",
    deploymentStatus: "shadow",
    latencyMs: 34,
    health: "healthy",
    description: "Graph neural network over the entity relationship graph; scores device/IP/account linkage.",
    color: "#ec4899",
    featureImportance: [
      { feature: "entity_degree", importance: 0.86 },
      { feature: "ato_linkage", importance: 0.81 },
      { feature: "shared_ip_accounts", importance: 0.69 },
      { feature: "path_to_known_bad", importance: 0.63 },
      { feature: "community_flag", importance: 0.47 },
    ],
  },
  {
    id: "tm",
    name: "Temporal Model",
    kind: "temporal",
    version: "v4.1",
    accuracy: 0.927,
    precision: 0.911,
    recall: 0.895,
    roc: 0.952,
    trainingDate: "2026-06-20",
    deploymentStatus: "production",
    latencyMs: 22,
    health: "degraded",
    description: "Time-series anomaly model with per-user seasonality baselines and drift detection.",
    color: "#14b8a6",
    featureImportance: [
      { feature: "velocity_1h", importance: 0.88 },
      { feature: "failed_attempts_window", importance: 0.74 },
      { feature: "off_hours_flag", importance: 0.58 },
      { feature: "cadence_burstiness", importance: 0.52 },
      { feature: "seasonality_deviation", importance: 0.44 },
    ],
  },
  {
    id: "pe",
    name: "Policy Engine",
    kind: "policy",
    version: "v2026.07",
    accuracy: 0.934,
    precision: 0.929,
    recall: 0.908,
    roc: 0.958,
    trainingDate: "2026-07-05",
    deploymentStatus: "production",
    latencyMs: 8,
    health: "healthy",
    description: "Deterministic rule engine applying the active policy bundle with weighted scoring.",
    color: "#f59e0b",
    featureImportance: [
      { feature: "rule_match_count", importance: 0.92 },
      { feature: "rule_tier_weight", importance: 0.84 },
      { feature: "override_eligible", importance: 0.49 },
      { feature: "channel_match", importance: 0.37 },
      { feature: "whitelist_hit", importance: 0.28 },
    ],
  },
  {
    id: "me",
    name: "Meta Ensemble",
    kind: "ensemble",
    version: "v1.6",
    accuracy: 0.968,
    precision: 0.949,
    recall: 0.937,
    roc: 0.983,
    trainingDate: "2026-07-10",
    deploymentStatus: "staging",
    latencyMs: 26,
    health: "healthy",
    description: "Stacked meta-learner over the five base models; produces the final fraud probability.",
    color: "#8b5cf6",
    featureImportance: [
      { feature: "gbfm_score", importance: 0.88 },
      { feature: "wcm_score", importance: 0.79 },
      { feature: "grm_score", importance: 0.71 },
      { feature: "tm_score", importance: 0.62 },
      { feature: "pe_score", importance: 0.54 },
    ],
  },
];

export const MODEL_HEALTH_HISTORY: { day: string; healthy: number; degraded: number; down: number }[] = Array.from(
  { length: 14 },
  (_, i) => {
    const d = new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(5, 10);
    return {
      day: d,
      healthy: 5 + (i % 2),
      degraded: i % 3 === 0 ? 1 : 0,
      down: 0,
    };
  },
);

export const DEPLOYMENT_STATUS_TONE: Record<DeploymentStatus, "success" | "warning" | "default" | "muted" | "destructive"> = {
  production: "success",
  shadow: "default",
  staging: "warning",
  retired: "muted",
  training: "muted",
};

export const HEALTH_TONE: Record<ModelHealth, "success" | "warning" | "destructive"> = {
  healthy: "success",
  degraded: "warning",
  down: "destructive",
};
