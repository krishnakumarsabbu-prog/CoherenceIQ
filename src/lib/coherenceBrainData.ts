import type { LoginSession } from "@/types";

export type RiskBand = "low" | "medium" | "high" | "critical";

export type DomainKind =
  | "Device DNA" | "Location" | "IP" | "Behavior"
  | "Policy" | "Graph" | "Temporal" | "Fraud Model";

export interface FeatureImportance {
  feature: string;
  value: string;
  weight: number;
  direction: "increases" | "decreases";
}

export interface ReasonCode {
  code: string;
  label: string;
  severity: RiskBand;
  weight: number;
}

export interface DomainModel {
  id: string;
  kind: DomainKind;
  label: string;
  confidence: number;
  risk: number;
  band: RiskBand;
  contribution: number;
  latency: number;
  reasonCodes: ReasonCode[];
  evidence: string[];
  featureImportance: FeatureImportance[];
  version: string;
  description: string;
}

export interface DecisionTimelineEntry {
  t: string;
  label: string;
  detail: string;
  kind: RiskBand;
  latency: number;
}

export interface BrainData {
  models: DomainModel[];
  coherenceScore: number;
  fraudProbability: number;
  decision: string;
  reasonCodes: ReasonCode[];
  modelContributions: { model: string; contribution: number; score: number }[];
  decisionTimeline: DecisionTimelineEntry[];
  stats: {
    avgConfidence: number;
    totalLatency: number;
    modelsFired: number;
    featureCount: number;
    version: string;
    auc: number;
  };
}

const iso = (offsetMin: number) => new Date(Date.now() - offsetMin * 60 * 1000).toISOString();

function band(score: number): RiskBand {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  return "low";
}

export function buildBrain(session: LoginSession): BrainData {
  const s = session;
  const high = s.riskScore >= 60;

  const models: DomainModel[] = [
    {
      id: "dm-device", kind: "Device DNA", label: "Device DNA",
      confidence: 0.88, risk: s.newDevice ? 68 : 14, band: band(s.newDevice ? 68 : 14),
      contribution: s.newDevice ? 0.21 : 0.06, latency: 112, version: "dna-v4.2",
      description: s.newDevice ? "First-seen fingerprint with no trust history." : "Trusted device with stable fingerprint.",
      reasonCodes: [
        { code: "D-101", label: s.newDevice ? "First-seen fingerprint" : "Known device", severity: s.newDevice ? "high" : "low", weight: s.newDevice ? 0.61 : 0.08 },
        ...(s.newDevice ? [{ code: "D-318", label: "Canvas hash mismatch", severity: "medium" as RiskBand, weight: 0.34 }] : []),
      ],
      evidence: [
        `Fingerprint ${s.fingerprint.slice(0, 12)}… stable across 38 components`,
        `First seen: ${s.newDevice ? "1h ago" : "90d ago"}`,
        `Login count: ${s.newDevice ? "1" : "47"}`,
      ],
      featureImportance: [
        { feature: "fingerprint_stability", value: "0.92", weight: 0.34, direction: "decreases" },
        { feature: "first_seen_recency", value: s.newDevice ? "1h" : "90d", weight: s.newDevice ? 0.61 : 0.08, direction: s.newDevice ? "increases" : "decreases" },
        { feature: "device_trust_score", value: s.newDevice ? "34" : "82", weight: s.newDevice ? 0.42 : 0.12, direction: s.newDevice ? "increases" : "decreases" },
        { feature: "login_count", value: s.newDevice ? "1" : "47", weight: 0.21, direction: s.newDevice ? "increases" : "decreases" },
      ],
    },
    {
      id: "dm-location", kind: "Location", label: "Location",
      confidence: 0.91, risk: high ? 78 : 18, band: band(high ? 78 : 18),
      contribution: high ? 0.28 : 0.05, latency: 64, version: "geo-v3.1",
      description: high ? "Impossible travel detected against baseline." : "Geographic consistency with baseline.",
      reasonCodes: [
        { code: "L-301", label: high ? "Impossible travel detected" : "Geographic consistency", severity: high ? "critical" : "low", weight: high ? 0.78 : 0.05 },
        { code: "L-115", label: "Accuracy radius 20km", severity: "low", weight: 0.09 },
      ],
      evidence: [
        `Distance: ${high ? "8412 km" : "14 km"}`,
        `Travel time: ${high ? "4.2h" : "96h"}`,
        `Previous: ${s.previousCity ?? "—"}, ${s.previousCountry ?? "—"}`,
      ],
      featureImportance: [
        { feature: "distance_km", value: high ? "8412" : "14", weight: high ? 0.78 : 0.05, direction: high ? "increases" : "decreases" },
        { feature: "travel_time_h", value: high ? "4.2" : "96", weight: high ? 0.66 : 0.03, direction: high ? "increases" : "decreases" },
        { feature: "timezone_match", value: "true", weight: 0.18, direction: "decreases" },
      ],
    },
    {
      id: "dm-ip", kind: "IP", label: "IP Intelligence",
      confidence: 0.97, risk: s.vpn ? 71 : 12, band: band(s.vpn ? 71 : 12),
      contribution: s.vpn ? 0.18 : 0.04, latency: 48, version: "ip-v2.8",
      description: s.vpn ? "VPN / anonymizing exit node detected." : "Clean residential IP.",
      reasonCodes: [
        { code: "N-201", label: s.vpn ? "VPN / proxy detected" : "Clean residential IP", severity: s.vpn ? "high" : "low", weight: s.vpn ? 0.71 : 0.04 },
        { code: "N-110", label: `ASN ${s.asn}`, severity: s.vpn ? "medium" : "low", weight: 0.38 },
      ],
      evidence: [
        `IP ${s.ip} · ${s.isp}`,
        `VPN: ${s.vpn} · Tor: false`,
        `ASN reputation: ${s.vpn ? "low" : "high"}`,
      ],
      featureImportance: [
        { feature: "vpn_proxy", value: s.vpn ? "true" : "false", weight: s.vpn ? 0.71 : 0.04, direction: s.vpn ? "increases" : "decreases" },
        { feature: "asn_reputation", value: s.vpn ? "low" : "high", weight: 0.38, direction: s.vpn ? "increases" : "decreases" },
        { feature: "datacenter", value: "false", weight: 0.02, direction: "decreases" },
      ],
    },
    {
      id: "dm-behavior", kind: "Behavior", label: "Behavioral Biometrics",
      confidence: 0.83, risk: s.coherenceScore < 50 ? 58 : 22, band: band(s.coherenceScore < 50 ? 58 : 22),
      contribution: s.coherenceScore < 50 ? 0.17 : 0.05, latency: 156, version: "bbm-v4.0",
      description: s.coherenceScore < 60 ? "Behavioral drift detected against baseline." : "Behavioral biometrics nominal.",
      reasonCodes: [
        { code: "B-401", label: s.coherenceScore < 50 ? "Low behavioral coherence" : "Coherence nominal", severity: s.coherenceScore < 50 ? "medium" : "low", weight: s.coherenceScore < 50 ? 0.58 : 0.12 },
        { code: "B-510", label: `Keystroke cadence ${s.coherenceScore < 50 ? "anomalous" : "nominal"}`, severity: s.coherenceScore < 50 ? "medium" : "low", weight: 0.34 },
      ],
      evidence: [
        `Coherence: ${s.coherenceScore}/100`,
        `Keystroke: ${s.coherenceScore < 50 ? "anomalous" : "nominal"}`,
        `Mouse dynamics: ${s.coherenceScore < 50 ? "erratic" : "smooth"}`,
      ],
      featureImportance: [
        { feature: "keystroke_cadence", value: s.coherenceScore < 50 ? "anomalous" : "nominal", weight: s.coherenceScore < 50 ? 0.58 : 0.12, direction: s.coherenceScore < 50 ? "increases" : "decreases" },
        { feature: "mouse_dynamics", value: s.coherenceScore < 50 ? "erratic" : "smooth", weight: 0.34, direction: s.coherenceScore < 50 ? "increases" : "decreases" },
        { feature: "navigation_pattern", value: s.coherenceScore < 50 ? "non-linear" : "linear", weight: 0.22, direction: s.coherenceScore < 50 ? "increases" : "decreases" },
      ],
    },
    {
      id: "dm-policy", kind: "Policy", label: "Policy Scoring",
      confidence: 0.96, risk: s.riskScore * 0.4, band: band(s.riskScore * 0.4),
      contribution: 0.15, latency: 38, version: "policy-v34",
      description: `${s.triggeredRules.length} policy rules fired.`,
      reasonCodes: s.triggeredRules.slice(0, 3).map((r, i) => ({
        code: `R-${100 + i}`, label: r, severity: band(s.riskScore) as RiskBand, weight: 0.3 + i * 0.1,
      })),
      evidence: [
        `Rules fired: ${s.triggeredRules.length}`,
        `Policy bundle: retail-v34`,
        `Thresholds: allow <45, challenge 45-77, deny ≥78`,
      ],
      featureImportance: [
        { feature: "rule_count", value: String(s.triggeredRules.length), weight: 0.4, direction: s.triggeredRules.length > 2 ? "increases" : "decreases" },
        { feature: "rule_severity", value: band(s.riskScore), weight: 0.3, direction: "increases" },
      ],
    },
    {
      id: "dm-graph", kind: "Graph", label: "Graph Intelligence",
      confidence: 0.86, risk: high ? 64 : 20, band: band(high ? 64 : 20),
      contribution: high ? 0.12 : 0.04, latency: 94, version: "graph-v2.4",
      description: high ? "Device linked to flagged cluster." : "No flagged cluster linkage.",
      reasonCodes: [
        { code: "G-301", label: high ? "Device linked to flagged cluster" : "No cluster linkage", severity: high ? "high" : "low", weight: high ? 0.64 : 0.08 },
        { code: "G-120", label: `Entity degree ${high ? 7 : 2}`, severity: "low", weight: 0.18 },
      ],
      evidence: [
        `Degree: ${high ? 7 : 2} entities`,
        `Path to known-bad: ${high ? 2 : 6} hops`,
        `Shared IP accounts: ${high ? 4 : 1}`,
      ],
      featureImportance: [
        { feature: "entity_degree", value: high ? "7" : "2", weight: high ? 0.64 : 0.08, direction: high ? "increases" : "decreases" },
        { feature: "ato_linkage", value: high ? "1" : "0", weight: high ? 0.58 : 0.02, direction: high ? "increases" : "decreases" },
      ],
    },
    {
      id: "dm-temporal", kind: "Temporal", label: "Temporal Intelligence",
      confidence: 0.88, risk: s.velocityEvents > 10 ? 67 : 15, band: band(s.velocityEvents > 10 ? 67 : 15),
      contribution: s.velocityEvents > 10 ? 0.14 : 0.04, latency: 72, version: "temporal-v3.2",
      description: s.velocityEvents > 10 ? "Velocity spike detected." : "Velocity within baseline.",
      reasonCodes: [
        { code: "T-201", label: s.velocityEvents > 10 ? "Velocity spike" : "Velocity nominal", severity: s.velocityEvents > 10 ? "high" : "low", weight: s.velocityEvents > 10 ? 0.67 : 0.08 },
        { code: "T-110", label: `${s.velocityEvents} events/1h`, severity: s.velocityEvents > 10 ? "medium" : "low", weight: 0.21 },
      ],
      evidence: [
        `Events: ${s.velocityEvents}/1h (baseline 4)`,
        `Failed attempts: ${s.failedAttempts}`,
        `Cadence: ${s.velocityEvents > 10 ? "bursty" : "regular"}`,
      ],
      featureImportance: [
        { feature: "velocity_1h", value: String(s.velocityEvents), weight: s.velocityEvents > 10 ? 0.67 : 0.08, direction: s.velocityEvents > 10 ? "increases" : "decreases" },
        { feature: "failed_attempts", value: String(s.failedAttempts), weight: Math.min(0.5, s.failedAttempts * 0.12), direction: s.failedAttempts > 2 ? "increases" : "decreases" },
      ],
    },
    {
      id: "dm-fraud", kind: "Fraud Model", label: "Fraud Model",
      confidence: 0.84, risk: s.fraudProbability, band: band(s.fraudProbability),
      contribution: 0.34, latency: 134, version: "ifm-xgb-v7",
      description: `Ensemble fraud score: ${s.fraudProbability}% probability.`,
      reasonCodes: [
        { code: "F-001", label: s.fraudProbability >= 50 ? "Elevated fraud probability" : "Low fraud probability", severity: band(s.fraudProbability), weight: 0.5 },
        { code: "F-101", label: s.failedAttempts >= 3 ? "Credential stuffing pattern" : "No credential pattern", severity: s.failedAttempts >= 3 ? "high" : "low", weight: 0.3 },
      ],
      evidence: [
        `Fraud probability: ${s.fraudProbability}%`,
        `Account takeover risk: ${high ? "high" : "low"}`,
        `Credential stuffing: ${s.failedAttempts >= 3}`,
      ],
      featureImportance: [
        { feature: "failed_attempts", value: String(s.failedAttempts), weight: Math.min(0.6, s.failedAttempts * 0.12), direction: s.failedAttempts > 2 ? "increases" : "decreases" },
        { feature: "new_device", value: String(s.newDevice), weight: s.newDevice ? 0.22 : 0.02, direction: s.newDevice ? "increases" : "decreases" },
        { feature: "geo_velocity", value: high ? "0.78" : "0.05", weight: high ? 0.18 : 0.02, direction: high ? "increases" : "decreases" },
      ],
    },
  ];

  const reasonCodes: ReasonCode[] = models
    .flatMap(m => m.reasonCodes)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 8);

  const modelContributions = models.map(m => ({
    model: m.label, contribution: m.contribution, score: m.risk,
  }));

  const decisionTimeline: DecisionTimelineEntry[] = [
    { t: iso(5), label: "Signal Ingestion", detail: "8 domain models queried in parallel", kind: "low", latency: 18 },
    { t: iso(4), label: "Feature Extraction", detail: "240+ features engineered across domains", kind: "low", latency: 42 },
    { t: iso(3), label: "Model Inference", detail: "Ensemble GNN + XGBoost scored", kind: band(s.riskScore), latency: 134 },
    { t: iso(2), label: "Coherence Fusion", detail: `Coherence ${s.coherenceScore} · fraud ${s.fraudProbability}%`, kind: band(s.fraudProbability), latency: 28 },
    { t: iso(1), label: "Policy Application", detail: `${s.triggeredRules.length} rules evaluated`, kind: band(s.riskScore), latency: 38 },
    { t: iso(0), label: "Decision Emitted", detail: s.decision, kind: s.decision === "Deny" ? "critical" : s.decision === "Challenge" ? "high" : "low", latency: 18 },
  ];

  const avgConfidence = models.reduce((a, m) => a + m.confidence, 0) / models.length;
  const totalLatency = models.reduce((a, m) => a + m.latency, 0);

  return {
    models, coherenceScore: s.coherenceScore, fraudProbability: s.fraudProbability, decision: s.decision,
    reasonCodes, modelContributions, decisionTimeline,
    stats: {
      avgConfidence, totalLatency, modelsFired: models.filter(m => m.band !== "low").length,
      featureCount: 240, version: "v3.2", auc: 0.961,
    },
  };
}
