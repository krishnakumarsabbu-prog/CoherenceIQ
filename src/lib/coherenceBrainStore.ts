import type { LoginSession, Decision } from "@/types";
import { generateSessions } from "@/lib/mockData";

export type RiskBand = "low" | "medium" | "high" | "critical";

export type DomainKind =
  | "Rule Scores"
  | "Signal Scores"
  | "Engineered Features"
  | "Predictive Models"
  | "Graph Intelligence"
  | "Temporal Intelligence"
  | "Decision Policies";

export type FusionMethod = "weighted-average" | "ensemble-voting" | "threshold-policy";

export type DecisionOutcome = "ALLOW" | "CHALLENGE" | "DENY";

export interface DomainEvidence {
  feature: string;
  value: string;
  weight: number;
  direction: "increases" | "decreases";
  contribution: number;
}

export interface DomainReason {
  code: string;
  label: string;
  severity: RiskBand;
  weight: number;
}

export interface DomainResult {
  id: string;
  kind: DomainKind;
  label: string;
  score: number;
  normalizedScore: number;
  confidence: number;
  risk: number;
  band: RiskBand;
  contribution: number;
  latency: number;
  version: string;
  description: string;
  evidence: DomainEvidence[];
  reasonCodes: DomainReason[];
  fired: boolean;
  vote?: DecisionOutcome;
}

export interface ThresholdPolicy {
  allowBelow: number;
  challengeBelow: number;
}

export interface StrategyConfig {
  fusionMethod: FusionMethod;
  domainWeights: Record<DomainKind, number>;
  thresholdPolicy: ThresholdPolicy;
  confidenceFloor: number;
  ensembleVotingThreshold: number;
  minDomainsFired: number;
  vetoDomains: DomainKind[];
}

export interface StrategyNodeConfig {
  strategyId: string;
  label: string;
  version: string;
  description: string;
  config: StrategyConfig;
}

export interface BrainEvaluation {
  strategyId: string;
  strategyLabel: string;
  sessionId: string;
  coherenceScore: number;
  fraudProbability: number;
  confidence: number;
  decision: DecisionOutcome;
  domains: DomainResult[];
  domainContributions: { domain: string; contribution: number; score: number }[];
  reasonCodes: DomainReason[];
  timeline: { label: string; detail: string; kind: RiskBand; latency: number }[];
  totalLatency: number;
  avgConfidence: number;
  domainsFired: number;
  featureCount: number;
  ensembleVotes: { domain: string; vote: DecisionOutcome; weight: number }[];
  vetoTriggered: boolean;
  vetoDomain?: string;
  explainability: {
    summary: string;
    domainBreakdown: { domain: string; score: number; contribution: number; rationale: string }[];
    decisionPath: string[];
  };
}

export interface BrainStrategy {
  id: string;
  label: string;
  version: string;
  description: string;
  config: StrategyConfig;
  createdAt: string;
  updatedAt: string;
  owner: string;
  status: "draft" | "published" | "archived";
  evaluationCount: number;
}

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`;
const now = () => new Date().toISOString();

export const DOMAIN_KINDS: DomainKind[] = [
  "Rule Scores",
  "Signal Scores",
  "Engineered Features",
  "Predictive Models",
  "Graph Intelligence",
  "Temporal Intelligence",
  "Decision Policies",
];

export const DOMAIN_META: Record<DomainKind, { color: string; icon: string; defaultWeight: number }> = {
  "Rule Scores": { color: "#8b5cf6", icon: "gavel", defaultWeight: 0.15 },
  "Signal Scores": { color: "#ec4899", icon: "radio", defaultWeight: 0.12 },
  "Engineered Features": { color: "#d946ef", icon: "workflow", defaultWeight: 0.13 },
  "Predictive Models": { color: "#f97316", icon: "cpu", defaultWeight: 0.25 },
  "Graph Intelligence": { color: "#10b981", icon: "share2", defaultWeight: 0.12 },
  "Temporal Intelligence": { color: "#14b8a6", icon: "clock", defaultWeight: 0.10 },
  "Decision Policies": { color: "#f59e0b", icon: "gavel", defaultWeight: 0.13 },
};

function band(score: number): RiskBand {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  return "low";
}

function defaultConfig(): StrategyConfig {
  const domainWeights = {} as Record<DomainKind, number>;
  for (const k of DOMAIN_KINDS) domainWeights[k] = DOMAIN_META[k].defaultWeight;
  return {
    fusionMethod: "weighted-average",
    domainWeights,
    thresholdPolicy: { allowBelow: 40, challengeBelow: 75 },
    confidenceFloor: 0.5,
    ensembleVotingThreshold: 0.6,
    minDomainsFired: 3,
    vetoDomains: ["Decision Policies"],
  };
}

function seedStrategies(): Record<string, BrainStrategy> {
  const t = now();
  const prod = defaultConfig();
  prod.fusionMethod = "weighted-average";
  prod.domainWeights["Predictive Models"] = 0.30;
  prod.domainWeights["Rule Scores"] = 0.16;
  prod.domainWeights["Decision Policies"] = 0.14;
  prod.thresholdPolicy = { allowBelow: 35, challengeBelow: 72 };

  const conservative = defaultConfig();
  conservative.fusionMethod = "threshold-policy";
  conservative.thresholdPolicy = { allowBelow: 25, challengeBelow: 55 };
  conservative.confidenceFloor = 0.7;
  conservative.minDomainsFired = 4;
  conservative.vetoDomains = ["Decision Policies", "Graph Intelligence"];

  const ensemble = defaultConfig();
  ensemble.fusionMethod = "ensemble-voting";
  ensemble.ensembleVotingThreshold = 0.55;
  ensemble.domainWeights["Predictive Models"] = 0.28;

  const docs: Record<string, BrainStrategy> = {};
  docs["strat-production"] = {
    id: "strat-production",
    label: "Production Weighted Ensemble",
    version: "v3.2",
    description: "Production decision strategy using weighted-average fusion across all seven evidence domains with predictive model emphasis.",
    config: prod,
    createdAt: t, updatedAt: t, owner: "fraud-platform", status: "published", evaluationCount: 1284,
  };
  docs["strat-conservative"] = {
    id: "strat-conservative",
    label: "Conservative Threshold Policy",
    version: "v1.4",
    description: "Risk-averse strategy with strict thresholds, higher confidence floor, and policy + graph veto power for high-friction environments.",
    config: conservative,
    createdAt: t, updatedAt: t, owner: "governance-team", status: "published", evaluationCount: 412,
  };
  docs["strat-ensemble"] = {
    id: "strat-ensemble",
    label: "Ensemble Voting Strategy",
    version: "v2.0",
    description: "Majority-vote ensemble where each domain votes ALLOW, CHALLENGE, or DENY; final decision requires voting threshold consensus.",
    config: ensemble,
    createdAt: t, updatedAt: t, owner: "ml-ops", status: "draft", evaluationCount: 86,
  };
  return docs;
}

let strategies: Record<string, BrainStrategy> = seedStrategies();
let order: string[] = Object.keys(strategies);
const listeners = new Set<() => void>();
function bump() { for (const l of listeners) l(); }

export const coherenceBrainStore = {
  subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); },
  list(): BrainStrategy[] { return order.map((id) => strategies[id]).filter(Boolean); },
  get(id: string): BrainStrategy | undefined { return strategies[id]; },
  create(label: string, description = ""): string {
    const id = uid("strat");
    const t = now();
    strategies[id] = {
      id, label, version: "v1.0", description: description || "New decision strategy",
      config: defaultConfig(), createdAt: t, updatedAt: t, owner: "you", status: "draft", evaluationCount: 0,
    };
    order = [id, ...order];
    bump();
    return id;
  },
  clone(id: string): string | null {
    const s = strategies[id];
    if (!s) return null;
    const nid = uid("strat");
    const t = now();
    strategies[nid] = {
      ...s, id: nid, label: `${s.label} (Clone)`, status: "draft", evaluationCount: 0,
      createdAt: t, updatedAt: t, config: JSON.parse(JSON.stringify(s.config)),
    };
    order = [nid, ...order];
    bump();
    return nid;
  },
  update(id: string, patch: Partial<Pick<BrainStrategy, "label" | "description" | "config" | "version">>) {
    const s = strategies[id];
    if (!s) return;
    if (patch.label !== undefined) s.label = patch.label;
    if (patch.description !== undefined) s.description = patch.description;
    if (patch.version !== undefined) s.version = patch.version;
    if (patch.config !== undefined) s.config = patch.config;
    s.updatedAt = now();
    bump();
  },
  remove(id: string) {
    if (!strategies[id]) return;
    delete strategies[id];
    order = order.filter((x) => x !== id);
    bump();
  },
  publish(id: string) {
    const s = strategies[id];
    if (!s) return;
    s.status = "published";
    s.updatedAt = now();
    bump();
  },
  recordEvaluation(id: string) {
    const s = strategies[id];
    if (!s) return;
    s.evaluationCount += 1;
    s.updatedAt = now();
    bump();
  },
};

const SESSIONS = generateSessions(200);

export function getSessions(): LoginSession[] { return SESSIONS; }
export function getSession(sessionId: string): LoginSession | undefined {
  return SESSIONS.find((s) => s.sessionId === sessionId);
}

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }

function computeDomain(kind: DomainKind, s: LoginSession): DomainResult {
  const high = s.riskScore >= 60;
  const baseLatency: Record<DomainKind, number> = {
    "Rule Scores": 38,
    "Signal Scores": 52,
    "Engineered Features": 64,
    "Predictive Models": 134,
    "Graph Intelligence": 94,
    "Temporal Intelligence": 72,
    "Decision Policies": 28,
  };

  if (kind === "Rule Scores") {
    const score = clamp(s.riskScore * 0.45 + (s.triggeredRules.length > 2 ? 18 : 0), 0, 100);
    return {
      id: "d-rule", kind, label: "Rule Scores",
      score, normalizedScore: score / 100, confidence: 0.96, risk: Math.round(score), band: band(score),
      contribution: 0, latency: baseLatency[kind], version: "rs-v3", description: `${s.triggeredRules.length} policy rules fired and scored.`,
      fired: s.triggeredRules.length > 0,
      evidence: [
        { feature: "rule_count", value: String(s.triggeredRules.length), weight: 0.4, direction: s.triggeredRules.length > 2 ? "increases" : "decreases", contribution: 0 },
        { feature: "rule_severity", value: band(s.riskScore), weight: 0.3, direction: "increases", contribution: 0 },
        { feature: "max_severity", value: s.riskScore >= 60 ? "critical" : "medium", weight: 0.3, direction: s.riskScore >= 60 ? "increases" : "decreases", contribution: 0 },
      ],
      reasonCodes: s.triggeredRules.slice(0, 3).map((r, i) => ({
        code: `R-${100 + i}`, label: r, severity: band(s.riskScore), weight: 0.3 + i * 0.1,
      })),
      vote: score >= 75 ? "DENY" : score >= 50 ? "CHALLENGE" : "ALLOW",
    };
  }

  if (kind === "Signal Scores") {
    const vpnScore = s.vpn ? 35 : 0;
    const newDevScore = s.newDevice ? 30 : 0;
    const mfaScore = s.mfaUsed ? -10 : 15;
    const score = clamp(20 + vpnScore + newDevScore + mfaScore + s.failedAttempts * 3, 0, 100);
    return {
      id: "d-signal", kind, label: "Signal Scores",
      score, normalizedScore: score / 100, confidence: 0.91, risk: Math.round(score), band: band(score),
      contribution: 0, latency: baseLatency[kind], version: "sig-v2", description: "Raw risk signals from device, network, and auth context.",
      fired: true,
      evidence: [
        { feature: "vpn_proxy", value: String(s.vpn), weight: 0.35, direction: s.vpn ? "increases" : "decreases", contribution: 0 },
        { feature: "new_device", value: String(s.newDevice), weight: 0.30, direction: s.newDevice ? "increases" : "decreases", contribution: 0 },
        { feature: "mfa_used", value: String(s.mfaUsed), weight: 0.20, direction: s.mfaUsed ? "decreases" : "increases", contribution: 0 },
        { feature: "failed_attempts", value: String(s.failedAttempts), weight: 0.15, direction: s.failedAttempts > 2 ? "increases" : "decreases", contribution: 0 },
      ],
      reasonCodes: [
        ...(s.vpn ? [{ code: "S-201", label: "VPN / proxy signal", severity: "high" as RiskBand, weight: 0.35 }] : []),
        ...(s.newDevice ? [{ code: "S-101", label: "New device signal", severity: "medium" as RiskBand, weight: 0.30 }] : []),
        { code: "S-301", label: s.mfaUsed ? "MFA present" : "No MFA", severity: s.mfaUsed ? "low" : "medium", weight: 0.20 },
      ],
      vote: score >= 75 ? "DENY" : score >= 50 ? "CHALLENGE" : "ALLOW",
    };
  }

  if (kind === "Engineered Features") {
    const score = clamp(
      s.coherenceScore < 50 ? 62 : 22 +
      (s.velocityEvents > 10 ? 15 : 0) +
      (s.fingerprint.length < 8 ? 8 : 0), 0, 100);
    return {
      id: "d-features", kind, label: "Engineered Features",
      score, normalizedScore: score / 100, confidence: 0.88, risk: Math.round(score), band: band(score),
      contribution: 0, latency: baseLatency[kind], version: "fs-v24", description: "24 PCA-reduced features derived from rule parameters and session context.",
      fired: true,
      evidence: [
        { feature: "pca_1_behavioral", value: (s.coherenceScore / 100).toFixed(2), weight: 0.34, direction: s.coherenceScore < 50 ? "increases" : "decreases", contribution: 0 },
        { feature: "pca_2_velocity", value: String(s.velocityEvents), weight: 0.28, direction: s.velocityEvents > 10 ? "increases" : "decreases", contribution: 0 },
        { feature: "pca_3_geo", value: high ? "0.78" : "0.12", weight: 0.22, direction: high ? "increases" : "decreases", contribution: 0 },
        { feature: "pca_4_device", value: s.newDevice ? "0.71" : "0.18", weight: 0.16, direction: s.newDevice ? "increases" : "decreases", contribution: 0 },
      ],
      reasonCodes: [
        { code: "E-201", label: s.coherenceScore < 50 ? "Behavioral feature anomaly" : "Behavioral features nominal", severity: s.coherenceScore < 50 ? "medium" : "low", weight: 0.34 },
        { code: "E-110", label: `Velocity feature ${s.velocityEvents > 10 ? "spike" : "nominal"}`, severity: s.velocityEvents > 10 ? "medium" : "low", weight: 0.28 },
      ],
      vote: score >= 75 ? "DENY" : score >= 50 ? "CHALLENGE" : "ALLOW",
    };
  }

  if (kind === "Predictive Models") {
    const score = clamp(s.fraudProbability, 0, 100);
    return {
      id: "d-model", kind, label: "Predictive Models",
      score, normalizedScore: score / 100, confidence: 0.84, risk: Math.round(score), band: band(score),
      contribution: 0, latency: baseLatency[kind], version: "xgb-v7", description: `Ensemble fraud model: ${s.fraudProbability}% fraud probability.`,
      fired: true,
      evidence: [
        { feature: "fraud_probability", value: String(s.fraudProbability), weight: 0.5, direction: s.fraudProbability >= 50 ? "increases" : "decreases", contribution: 0 },
        { feature: "failed_attempts", value: String(s.failedAttempts), weight: Math.min(0.6, s.failedAttempts * 0.12), direction: s.failedAttempts > 2 ? "increases" : "decreases", contribution: 0 },
        { feature: "new_device", value: String(s.newDevice), weight: s.newDevice ? 0.22 : 0.02, direction: s.newDevice ? "increases" : "decreases", contribution: 0 },
        { feature: "geo_velocity", value: high ? "0.78" : "0.05", weight: high ? 0.18 : 0.02, direction: high ? "increases" : "decreases", contribution: 0 },
      ],
      reasonCodes: [
        { code: "F-001", label: s.fraudProbability >= 50 ? "Elevated fraud probability" : "Low fraud probability", severity: band(s.fraudProbability), weight: 0.5 },
        ...(s.failedAttempts >= 3 ? [{ code: "F-101", label: "Credential stuffing pattern", severity: "high" as RiskBand, weight: 0.3 }] : []),
      ],
      vote: score >= 75 ? "DENY" : score >= 50 ? "CHALLENGE" : "ALLOW",
    };
  }

  if (kind === "Graph Intelligence") {
    const score = clamp(high ? 64 : 20, 0, 100);
    return {
      id: "d-graph", kind, label: "Graph Intelligence",
      score, normalizedScore: score / 100, confidence: 0.86, risk: Math.round(score), band: band(score),
      contribution: 0, latency: baseLatency[kind], version: "graph-v2.4", description: high ? "Device linked to flagged cluster." : "No flagged cluster linkage.",
      fired: high,
      evidence: [
        { feature: "entity_degree", value: high ? "7" : "2", weight: high ? 0.64 : 0.08, direction: high ? "increases" : "decreases", contribution: 0 },
        { feature: "ato_linkage", value: high ? "1" : "0", weight: high ? 0.58 : 0.02, direction: high ? "increases" : "decreases", contribution: 0 },
        { feature: "path_to_known_bad", value: high ? "2" : "6", weight: 0.18, direction: high ? "increases" : "decreases", contribution: 0 },
      ],
      reasonCodes: [
        { code: "G-301", label: high ? "Device linked to flagged cluster" : "No cluster linkage", severity: high ? "high" : "low", weight: high ? 0.64 : 0.08 },
        { code: "G-120", label: `Entity degree ${high ? 7 : 2}`, severity: "low", weight: 0.18 },
      ],
      vote: score >= 75 ? "DENY" : score >= 50 ? "CHALLENGE" : "ALLOW",
    };
  }

  if (kind === "Temporal Intelligence") {
    const score = clamp(s.velocityEvents > 10 ? 67 : 15, 0, 100);
    return {
      id: "d-temporal", kind, label: "Temporal Intelligence",
      score, normalizedScore: score / 100, confidence: 0.88, risk: Math.round(score), band: band(score),
      contribution: 0, latency: baseLatency[kind], version: "temporal-v3.2", description: s.velocityEvents > 10 ? "Velocity spike detected." : "Velocity within baseline.",
      fired: s.velocityEvents > 10,
      evidence: [
        { feature: "velocity_1h", value: String(s.velocityEvents), weight: s.velocityEvents > 10 ? 0.67 : 0.08, direction: s.velocityEvents > 10 ? "increases" : "decreases", contribution: 0 },
        { feature: "failed_attempts", value: String(s.failedAttempts), weight: Math.min(0.5, s.failedAttempts * 0.12), direction: s.failedAttempts > 2 ? "increases" : "decreases", contribution: 0 },
      ],
      reasonCodes: [
        { code: "T-201", label: s.velocityEvents > 10 ? "Velocity spike" : "Velocity nominal", severity: s.velocityEvents > 10 ? "high" : "low", weight: s.velocityEvents > 10 ? 0.67 : 0.08 },
        { code: "T-110", label: `${s.velocityEvents} events/1h`, severity: s.velocityEvents > 10 ? "medium" : "low", weight: 0.21 },
      ],
      vote: score >= 75 ? "DENY" : score >= 50 ? "CHALLENGE" : "ALLOW",
    };
  }

  // Decision Policies
  const policyScore = clamp(s.riskScore * 0.4 + (s.failedAttempts >= 3 ? 20 : 0), 0, 100);
  return {
    id: "d-policy", kind, label: "Decision Policies",
    score: policyScore, normalizedScore: policyScore / 100, confidence: 0.97, risk: Math.round(policyScore), band: band(policyScore),
    contribution: 0, latency: baseLatency[kind], version: "policy-v34", description: `${s.triggeredRules.length} policy rules evaluated against thresholds.`,
    fired: true,
    evidence: [
      { feature: "rule_count", value: String(s.triggeredRules.length), weight: 0.4, direction: s.triggeredRules.length > 2 ? "increases" : "decreases", contribution: 0 },
      { feature: "rule_severity", value: band(s.riskScore), weight: 0.3, direction: "increases", contribution: 0 },
      { feature: "threshold_check", value: policyScore >= 75 ? "deny" : policyScore >= 50 ? "challenge" : "allow", weight: 0.3, direction: policyScore >= 50 ? "increases" : "decreases", contribution: 0 },
    ],
    reasonCodes: s.triggeredRules.slice(0, 3).map((r, i) => ({
      code: `P-${100 + i}`, label: r, severity: band(s.riskScore), weight: 0.3 + i * 0.1,
    })),
    vote: policyScore >= 75 ? "DENY" : policyScore >= 50 ? "CHALLENGE" : "ALLOW",
  };
}

function computeAllDomains(s: LoginSession): DomainResult[] {
  return DOMAIN_KINDS.map((k) => computeDomain(k, s));
}

function normalizeWeights(weights: Record<DomainKind, number>): Record<DomainKind, number> {
  const fired = DOMAIN_KINDS.filter((k) => weights[k] > 0);
  const total = fired.reduce((a, k) => a + weights[k], 0);
  if (total === 0) {
    const even = 1 / DOMAIN_KINDS.length;
    const out = {} as Record<DomainKind, number>;
    for (const k of DOMAIN_KINDS) out[k] = even;
    return out;
  }
  const out = {} as Record<DomainKind, number>;
  for (const k of DOMAIN_KINDS) out[k] = weights[k] / total;
  return out;
}

function confidenceCalculation(domains: DomainResult[], weights: Record<DomainKind, number>): number {
  const fired = domains.filter((d) => d.fired);
  if (fired.length === 0) return 0;
  let sum = 0;
  let wsum = 0;
  for (const d of fired) {
    const w = weights[d.kind];
    sum += d.confidence * w;
    wsum += w;
  }
  return wsum > 0 ? sum / wsum : 0;
}

export function evaluateStrategy(strategy: BrainStrategy, session: LoginSession): BrainEvaluation {
  const config = strategy.config;
  const allDomains = computeAllDomains(session);
  const firedDomains = allDomains.filter((d) => d.fired);
  const normWeights = normalizeWeights(config.domainWeights);

  for (const d of allDomains) {
    d.contribution = d.fired ? normWeights[d.kind] : 0;
    for (const e of d.evidence) {
      e.contribution = e.weight * d.contribution;
    }
  }

  const domainsFired = firedDomains.length;
  const totalLatency = allDomains.reduce((a, d) => a + d.latency, 0);
  const avgConfidence = confidenceCalculation(allDomains, normWeights);
  const featureCount = allDomains.reduce((a, d) => a + d.evidence.length, 0);

  let coherenceScore = 0;
  let fraudProbability = 0;
  let decision: DecisionOutcome = "ALLOW";
  let vetoTriggered = false;
  let vetoDomain: string | undefined;
  const ensembleVotes: { domain: string; vote: DecisionOutcome; weight: number }[] = [];
  const decisionPath: string[] = [];

  if (config.fusionMethod === "weighted-average") {
    let weighted = 0;
    for (const d of firedDomains) {
      weighted += d.normalizedScore * normWeights[d.kind];
    }
    coherenceScore = Math.round(weighted * 100);
    fraudProbability = Math.round(weighted * 100);
    decisionPath.push(`Weighted-average fusion across ${domainsFired} domains`);
    decisionPath.push(`Coherence score = ${coherenceScore}/100`);
    if (coherenceScore >= config.thresholdPolicy.challengeBelow) {
      decision = "DENY";
      decisionPath.push(`Score ≥ ${config.thresholdPolicy.challengeBelow} → DENY`);
    } else if (coherenceScore >= config.thresholdPolicy.allowBelow) {
      decision = "CHALLENGE";
      decisionPath.push(`Score ≥ ${config.thresholdPolicy.allowBelow} → CHALLENGE`);
    } else {
      decision = "ALLOW";
      decisionPath.push(`Score < ${config.thresholdPolicy.allowBelow} → ALLOW`);
    }
  } else if (config.fusionMethod === "threshold-policy") {
    const policyDomain = allDomains.find((d) => d.kind === "Decision Policies");
    const policyScore = policyDomain ? policyDomain.score : 0;
    coherenceScore = Math.round(firedDomains.reduce((a, d) => a + d.normalizedScore * normWeights[d.kind], 0) * 100);
    fraudProbability = Math.round(coherenceScore);
    decisionPath.push(`Threshold-policy evaluation`);
    decisionPath.push(`Policy domain score = ${policyScore.toFixed(0)}`);
    if (policyScore >= config.thresholdPolicy.challengeBelow) {
      decision = "DENY";
      decisionPath.push(`Policy ≥ ${config.thresholdPolicy.challengeBelow} → DENY`);
    } else if (policyScore >= config.thresholdPolicy.allowBelow) {
      decision = "CHALLENGE";
      decisionPath.push(`Policy ≥ ${config.thresholdPolicy.allowBelow} → CHALLENGE`);
    } else {
      decision = "ALLOW";
      decisionPath.push(`Policy < ${config.thresholdPolicy.allowBelow} → ALLOW`);
    }
  } else {
    // ensemble-voting
    for (const d of firedDomains) {
      ensembleVotes.push({ domain: d.label, vote: d.vote ?? "ALLOW", weight: normWeights[d.kind] });
    }
    const voteWeights: Record<DecisionOutcome, number> = { ALLOW: 0, CHALLENGE: 0, DENY: 0 };
    for (const v of ensembleVotes) voteWeights[v.vote] += v.weight;
    decisionPath.push(`Ensemble voting across ${ensembleVotes.length} domains`);
    decisionPath.push(`Vote tally — ALLOW: ${(voteWeights.ALLOW * 100).toFixed(0)}% CHALLENGE: ${(voteWeights.CHALLENGE * 100).toFixed(0)}% DENY: ${(voteWeights.DENY * 100).toFixed(0)}%`);
    if (voteWeights.DENY >= config.ensembleVotingThreshold) {
      decision = "DENY";
      decisionPath.push(`DENY votes ≥ ${(config.ensembleVotingThreshold * 100).toFixed(0)}% → DENY`);
    } else if (voteWeights.CHALLENGE + voteWeights.DENY >= config.ensembleVotingThreshold) {
      decision = "CHALLENGE";
      decisionPath.push(`CHALLENGE+DENY ≥ ${(config.ensembleVotingThreshold * 100).toFixed(0)}% → CHALLENGE`);
    } else {
      decision = "ALLOW";
      decisionPath.push(`Consensus below threshold → ALLOW`);
    }
    coherenceScore = Math.round(firedDomains.reduce((a, d) => a + d.normalizedScore * normWeights[d.kind], 0) * 100);
    fraudProbability = coherenceScore;
  }

  // Veto check
  for (const vKind of config.vetoDomains) {
    const d = allDomains.find((x) => x.kind === vKind);
    if (d && d.fired && d.vote === "DENY" && decision !== "DENY") {
      vetoTriggered = true;
      vetoDomain = vKind;
      decision = "DENY";
      decisionPath.push(`Veto triggered by ${vKind} → DENY`);
      break;
    }
  }

  // Confidence floor
  if (avgConfidence < config.confidenceFloor && decision === "ALLOW") {
    decision = "CHALLENGE";
    decisionPath.push(`Confidence ${(avgConfidence * 100).toFixed(0)}% below floor ${(config.confidenceFloor * 100).toFixed(0)}% → CHALLENGE`);
  }

  // Min domains fired
  if (domainsFired < config.minDomainsFired && decision === "ALLOW") {
    decision = "CHALLENGE";
    decisionPath.push(`Only ${domainsFired} domains fired (< ${config.minDomainsFired}) → CHALLENGE`);
  }

  const domainContributions = allDomains.map((d) => ({
    domain: d.label, contribution: d.contribution, score: d.risk,
  }));

  const reasonCodes = allDomains
    .flatMap((d) => d.reasonCodes.map((r) => ({ ...r, domain: d.label })))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 10) as DomainReason[];

  const timeline = [
    { label: "Signal Ingestion", detail: `${DOMAIN_KINDS.length} evidence domains queried`, kind: "low" as RiskBand, latency: 18 },
    { label: "Feature Extraction", detail: `${featureCount} features across domains`, kind: "low" as RiskBand, latency: 42 },
    { label: "Model Inference", detail: "Ensemble scoring complete", kind: band(coherenceScore), latency: 134 },
    { label: "Coherence Fusion", detail: `${config.fusionMethod} → ${coherenceScore}/100`, kind: band(coherenceScore), latency: 28 },
    { label: "Policy Application", detail: `${config.vetoDomains.length} veto domains checked`, kind: band(coherenceScore), latency: 38 },
    { label: "Decision Emitted", detail: decision, kind: decision === "DENY" ? "critical" as RiskBand : decision === "CHALLENGE" ? "high" as RiskBand : "low" as RiskBand, latency: 18 },
  ];

  const domainBreakdown = allDomains.map((d) => ({
    domain: d.label,
    score: d.risk,
    contribution: d.contribution,
    rationale: d.fired
      ? `${d.label} contributed ${(d.contribution * 100).toFixed(0)}% with risk ${d.risk}/100 (${d.band})`
      : `${d.label} did not fire — no contribution`,
  }));

  const explainability = {
    summary: `Strategy "${strategy.label}" evaluated session ${session.sessionId} using ${config.fusionMethod} fusion across ${domainsFired} of ${DOMAIN_KINDS.length} evidence domains, producing a coherence score of ${coherenceScore}/100 with ${(avgConfidence * 100).toFixed(0)}% confidence, resulting in a ${decision} decision.`,
    domainBreakdown,
    decisionPath,
  };

  return {
    strategyId: strategy.id,
    strategyLabel: strategy.label,
    sessionId: session.sessionId,
    coherenceScore,
    fraudProbability,
    confidence: avgConfidence,
    decision,
    domains: allDomains,
    domainContributions,
    reasonCodes,
    timeline,
    totalLatency,
    avgConfidence,
    domainsFired,
    featureCount,
    ensembleVotes,
    vetoTriggered,
    vetoDomain,
    explainability,
  };
}
