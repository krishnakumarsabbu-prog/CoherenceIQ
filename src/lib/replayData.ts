import type { LoginSession, Decision } from "@/types";

export type RuleSet = "current" | "previous" | "experimental";

export interface ReplayRule {
  id: string;
  name: string;
  tier: "Critical" | "High" | "Medium" | "Low";
  active: boolean;
  weight: number;
  description: string;
}

export interface ReplayTimelineEvent {
  t: string;
  stage: string;
  label: string;
  riskDelta: number;
  rulesFired: string[];
  decision: Decision | "pending";
  latencyMs: number;
}

export interface ReplayEvidence {
  id: string;
  kind: "device" | "ip" | "location" | "behavior" | "graph" | "temporal";
  title: string;
  risk: number;
  confidence: number;
}

export interface ReplayResult {
  ruleSet: RuleSet;
  rules: ReplayRule[];
  decision: Decision;
  riskScore: number;
  coherenceScore: number;
  fraudProbability: number;
  timeline: ReplayTimelineEvent[];
  evidence: ReplayEvidence[];
  rulesFired: string[];
  totalLatencyMs: number;
}

export interface ReplayDiff {
  decisionChanged: boolean;
  riskDelta: number;
  coherenceDelta: number;
  fraudDelta: number;
  rulesAdded: string[];
  rulesRemoved: string[];
  evidenceChanges: { id: string; title: string; riskDelta: number }[];
  timelineChanges: { stage: string; latencyDelta: number }[];
}

const iso = (offsetMs: number) => new Date(Date.now() - offsetMs).toISOString();

const RULE_SETS: Record<RuleSet, ReplayRule[]> = {
  current: [
    { id: "R-117", name: "Impossible Travel", tier: "Critical", active: true, weight: 32, description: "Block impossible-travel patterns within 6h." },
    { id: "R-203", name: "New Device", tier: "High", active: true, weight: 24, description: "Challenge first-seen devices." },
    { id: "R-041", name: "Velocity Spike", tier: "High", active: true, weight: 20, description: "Velocity > 10 events in 1h." },
    { id: "R-310", name: "Credential Stuffing", tier: "Critical", active: true, weight: 28, description: "≥3 failed attempts in 1h." },
    { id: "R-089", name: "Anomalous ASN", tier: "Medium", active: true, weight: 14, description: "Low-reputation ASN." },
    { id: "R-512", name: "Low Coherence", tier: "Medium", active: true, weight: 16, description: "Coherence score < 50." },
  ],
  previous: [
    { id: "R-117", name: "Impossible Travel", tier: "High", active: true, weight: 24, description: "Impossible travel (older threshold)." },
    { id: "R-203", name: "New Device", tier: "Medium", active: true, weight: 16, description: "New device (lighter handling)." },
    { id: "R-041", name: "Velocity Spike", tier: "Medium", active: true, weight: 12, description: "Velocity > 15 events in 1h." },
    { id: "R-089", name: "Anomalous ASN", tier: "Low", active: true, weight: 8, description: "Low-reputation ASN (lighter)." },
    { id: "R-155", name: "Geo Mismatch", tier: "Medium", active: false, weight: 10, description: "Retired in current bundle." },
  ],
  experimental: [
    { id: "R-117", name: "Impossible Travel", tier: "Critical", active: true, weight: 36, description: "Tightened impossible-travel weight." },
    { id: "R-203", name: "New Device", tier: "High", active: true, weight: 24, description: "Challenge first-seen devices." },
    { id: "R-041", name: "Velocity Spike", tier: "High", active: true, weight: 22, description: "Velocity > 8 events in 1h (tighter)." },
    { id: "R-310", name: "Credential Stuffing", tier: "Critical", active: true, weight: 32, description: "≥3 failed attempts in 1h." },
    { id: "R-512", name: "Low Coherence", tier: "High", active: true, weight: 22, description: "Coherence < 55 (tighter)." },
    { id: "R-621", name: "VPN + New Device", tier: "Critical", active: true, weight: 30, description: "Experimental combined signal." },
    { id: "R-700", name: "Graph Cluster Link", tier: "High", active: true, weight: 26, description: "Experimental graph-linkage rule." },
  ],
};

function decide(risk: number): Decision {
  if (risk >= 78) return "Deny";
  if (risk >= 45) return "Challenge";
  return "Allow";
}

function fireRules(s: LoginSession, rules: ReplayRule[]): string[] {
  const fired: string[] = [];
  const impossible = s.previousCountry !== null && s.previousCountry !== s.country;
  for (const r of rules) {
    if (!r.active) continue;
    if (r.id === "R-117" && impossible) fired.push(r.id);
    if (r.id === "R-203" && s.newDevice) fired.push(r.id);
    if (r.id === "R-041" && s.velocityEvents > 10) fired.push(r.id);
    if (r.id === "R-310" && s.failedAttempts >= 3) fired.push(r.id);
    if (r.id === "R-089" && s.vpn) fired.push(r.id);
    if (r.id === "R-512" && s.coherenceScore < 50) fired.push(r.id);
    if (r.id === "R-155" && s.previousCountry !== s.country) fired.push(r.id);
    if (r.id === "R-621" && s.vpn && s.newDevice) fired.push(r.id);
    if (r.id === "R-700" && s.riskScore > 60) fired.push(r.id);
  }
  return fired;
}

function scoreSession(s: LoginSession, rules: ReplayRule[], fired: string[]): { risk: number; coherence: number; fraud: number } {
  const base = 18;
  const weighted = fired.reduce((acc, id) => {
    const r = rules.find((x) => x.id === id);
    return acc + (r?.weight ?? 0);
  }, base);
  const risk = Math.min(99, Math.max(2, weighted));
  const coherence = Math.max(1, Math.min(99, 100 - Math.round(risk * 0.8)));
  const fraud = Math.min(99, Math.max(1, Math.round(risk * 0.65 + (100 - coherence) * 0.35)));
  return { risk, coherence, fraud };
}

const STAGES: { id: string; label: string; baseLatency: number }[] = [
  { id: "login", label: "Login", baseLatency: 42 },
  { id: "geo", label: "Geo Intelligence", baseLatency: 64 },
  { id: "customer", label: "Customer Context", baseLatency: 88 },
  { id: "device", label: "Device Intelligence", baseLatency: 112 },
  { id: "reputation", label: "Device Reputation", baseLatency: 76 },
  { id: "fraud", label: "Identity Fraud", baseLatency: 134 },
  { id: "policy", label: "Policy Scoring", baseLatency: 38 },
  { id: "decision", label: "Decision", baseLatency: 18 },
];

function buildTimeline(s: LoginSession, rules: ReplayRule[], fired: string[], risk: number, ruleSet: RuleSet): ReplayTimelineEvent[] {
  const base = new Date(s.loginTime).getTime();
  let cumLatency = 0;
  return STAGES.map((stage, i) => {
    const jitter = (ruleSet === "experimental" ? -4 : ruleSet === "previous" ? +6 : 0) + ((i * 7) % 9) - 4;
    const latency = Math.max(8, stage.baseLatency + jitter);
    cumLatency += latency;
    const stageRules = fired.filter((id) => {
      if (stage.id === "geo" && id === "R-117") return true;
      if (stage.id === "device" && (id === "R-203" || id === "R-700")) return true;
      if (stage.id === "reputation" && id === "R-089") return true;
      if (stage.id === "fraud" && (id === "R-310" || id === "R-621")) return true;
      if (stage.id === "policy" && (id === "R-041" || id === "R-512" || id === "R-155")) return true;
      return false;
    });
    const isLast = i === STAGES.length - 1;
    const decision: Decision | "pending" = isLast ? decide(risk) : "pending";
    const riskDelta = isLast ? risk : Math.round((stage.baseLatency / 600) * risk);
    return {
      t: new Date(base + cumLatency).toISOString(),
      stage: stage.id,
      label: stage.label,
      riskDelta,
      rulesFired: stageRules,
      decision,
      latencyMs: latency,
    };
  });
}

function buildEvidence(s: LoginSession, risk: number): ReplayEvidence[] {
  const high = risk >= 60;
  return [
    { id: "ev-device", kind: "device", title: "Device Evidence", risk: s.newDevice ? 68 : 14, confidence: s.newDevice ? 0.62 : 0.94 },
    { id: "ev-ip", kind: "ip", title: "IP Evidence", risk: s.vpn ? 71 : 12, confidence: 0.97 },
    { id: "ev-location", kind: "location", title: "Location Evidence", risk: high ? 78 : 18, confidence: 0.91 },
    { id: "ev-behavior", kind: "behavior", title: "Behavior Evidence", risk: s.coherenceScore < 50 ? 58 : 22, confidence: 0.83 },
    { id: "ev-graph", kind: "graph", title: "Graph Evidence", risk: high ? 64 : 20, confidence: 0.86 },
    { id: "ev-temporal", kind: "temporal", title: "Temporal Evidence", risk: s.velocityEvents > 10 ? 67 : 15, confidence: 0.88 },
  ];
}

export function runReplay(s: LoginSession, ruleSet: RuleSet): ReplayResult {
  const rules = RULE_SETS[ruleSet];
  const fired = fireRules(s, rules);
  const { risk, coherence, fraud } = scoreSession(s, rules, fired);
  const timeline = buildTimeline(s, rules, fired, risk, ruleSet);
  const evidence = buildEvidence(s, risk);
  return {
    ruleSet,
    rules,
    decision: decide(risk),
    riskScore: risk,
    coherenceScore: coherence,
    fraudProbability: fraud,
    timeline,
    evidence,
    rulesFired: fired,
    totalLatencyMs: timeline.reduce((a, e) => a + e.latencyMs, 0),
  };
}

export function diffReplays(a: ReplayResult, b: ReplayResult): ReplayDiff {
  const rulesAdded = b.rulesFired.filter((r) => !a.rulesFired.includes(r));
  const rulesRemoved = a.rulesFired.filter((r) => !b.rulesFired.includes(r));
  const evidenceChanges = b.evidence.map((e) => {
    const prev = a.evidence.find((x) => x.id === e.id);
    return { id: e.id, title: e.title, riskDelta: e.risk - (prev?.risk ?? e.risk) };
  });
  const timelineChanges = b.timeline.map((e) => {
    const prev = a.timeline.find((x) => x.stage === e.stage);
    return { stage: e.stage, latencyDelta: e.latencyMs - (prev?.latencyMs ?? e.latencyMs) };
  });
  return {
    decisionChanged: a.decision !== b.decision,
    riskDelta: b.riskScore - a.riskScore,
    coherenceDelta: b.coherenceScore - a.coherenceScore,
    fraudDelta: b.fraudProbability - a.fraudProbability,
    rulesAdded,
    rulesRemoved,
    evidenceChanges,
    timelineChanges,
  };
}

export const RULESET_LABEL: Record<RuleSet, string> = {
  current: "Current Rules",
  previous: "Previous Rules",
  experimental: "Experimental Rules",
};

export const RULESET_TONE: Record<RuleSet, "success" | "muted" | "default"> = {
  current: "success",
  previous: "muted",
  experimental: "default",
};

export function sampleRequestJson(): string {
  return JSON.stringify(
    {
      sessionId: "S-10042",
      username: "eleanor.voss",
      customerId: "C-58213",
      channel: "Web",
      application: "Retail Banking",
      ip: "196.41.142.22",
      fingerprint: "a1f3c2b8e9d4071f6c5a2b9e3d4f0c1e",
      userAgent: "Mozilla/5.0 (macOS 14.5) AppleWebKit/605.1.15 Chrome/131.0",
      loginTime: iso(5 * 60 * 1000),
      newDevice: true,
      vpn: true,
      mfaUsed: false,
      failedAttempts: 4,
      velocityEvents: 14,
      coherenceScore: 38,
      previousCountry: "United Kingdom",
      previousCity: "London",
      country: "Nigeria",
      city: "Lagos",
    },
    null,
    2,
  );
}

export function parseRequestJson(json: string): Partial<LoginSession> | null {
  try {
    const o = JSON.parse(json) as Record<string, unknown>;
    return o as unknown as Partial<LoginSession>;
  } catch {
    return null;
  }
}

export function buildSessionFromRequest(o: Partial<LoginSession>): LoginSession {
  return {
    sessionId: o.sessionId ?? "S-REPLAY",
    customer: o.customer ?? "Eleanor Voss",
    username: o.username ?? "eleanor.voss",
    customerId: o.customerId ?? "C-00000",
    device: o.device ?? "MacBook Pro 16\"",
    deviceType: o.deviceType ?? "Desktop",
    browser: o.browser ?? "Chrome 131",
    os: o.os ?? "macOS 14.5",
    country: o.country ?? "Nigeria",
    countryCode: o.countryCode ?? "NG",
    city: o.city ?? "Lagos",
    ip: o.ip ?? "196.41.142.22",
    riskScore: 0,
    coherenceScore: o.coherenceScore ?? 38,
    fraudProbability: 0,
    decision: "Allow",
    application: o.application ?? "Retail Banking",
    channel: (o.channel as LoginSession["channel"]) ?? "Web",
    loginTime: o.loginTime ?? new Date().toISOString(),
    duration: o.duration ?? 240,
    latency: 0,
    newDevice: o.newDevice ?? false,
    vpn: o.vpn ?? false,
    mfaUsed: o.mfaUsed ?? false,
    mfaType: o.mfaType ?? "—",
    authMethod: o.authMethod ?? "Password + OTP",
    asn: o.asn ?? "AS29091",
    isp: o.isp ?? "MTN Nigeria",
    timezone: o.timezone ?? "UTC+1",
    latitude: o.latitude ?? 6.52,
    longitude: o.longitude ?? 3.37,
    userAgent: o.userAgent ?? "Mozilla/5.0",
    fingerprint: o.fingerprint ?? Array.from({ length: 32 }, () => "a").join(""),
    previousLoginTime: o.previousLoginTime ?? null,
    previousCountry: o.previousCountry ?? null,
    previousCity: o.previousCity ?? null,
    velocityEvents: o.velocityEvents ?? 0,
    failedAttempts: o.failedAttempts ?? 0,
    evidenceCount: o.evidenceCount ?? 7,
    triggeredRules: [],
    pluginHits: [],
    status: "Success",
  };
}
