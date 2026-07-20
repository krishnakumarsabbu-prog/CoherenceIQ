import type { LoginSession } from "@/types";

export type NodeStatus = "completed" | "warning" | "failed" | "skipped";
export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface PipelineNode {
  id: string;
  label: string;
  abbr: string;
  description: string;
  status: NodeStatus;
  latencyMs: number;
  riskContribution: number;
  confidence: number;
  iconKey: string;
  request: unknown;
  response: unknown;
  headers: Record<string, string>;
  metadata: Record<string, string | number | boolean>;
  apiUrl: string;
  statusCode: number;
  executionMs: number;
  rawPayload: string;
}

export interface ReasonCode {
  code: string;
  label: string;
  severity: RiskLevel;
}

export interface FeatureImportance {
  feature: string;
  value: string;
  weight: number;
  direction: "increases" | "decreases";
}

export interface EvidenceHistoryEntry {
  t: string;
  label: string;
  delta: number;
}

export interface EvidenceCard {
  id: string;
  kind: "device" | "ip" | "location" | "cookie" | "behavior" | "graph" | "temporal";
  title: string;
  confidence: number;
  risk: number;
  riskLevel: RiskLevel;
  reasonCodes: ReasonCode[];
  evidence: string[];
  featureImportance: FeatureImportance[];
  history: EvidenceHistoryEntry[];
  timeline: { t: string; label: string; kind: NodeStatus }[];
}

export interface AiInsight {
  id: string;
  kind: "signal" | "anomaly" | "recommendation" | "context";
  title: string;
  body: string;
  severity: RiskLevel;
  weight: number;
}

export interface InvestigationCase {
  caseId: string;
  session: LoginSession;
  nodes: PipelineNode[];
  evidence: EvidenceCard[];
  insights: AiInsight[];
  narrative: string[];
  recommendedActions: { id: string; label: string; rationale: string; severity: RiskLevel }[];
  modelScores: { model: string; score: number; contribution: number }[];
  similarCases: { caseId: string; customer: string; similarity: number; decision: string; time: string }[];
}

const iso = (offsetMin: number) => new Date(Date.now() - offsetMin * 60 * 1000).toISOString();

function clamp(n: number, lo = 0, hi = 100) { return Math.max(lo, Math.min(hi, n)); }

function buildNodes(s: LoginSession): PipelineNode[] {
  const baseT = new Date(s.loginTime).getTime();
  const t = (offsetMs: number) => new Date(baseT + offsetMs).toISOString();
  const high = s.riskScore >= 60;

  return [
    {
      id: "login",
      label: "Login",
      abbr: "AUTH",
      description: "Authentication gateway received credentials and initiated session evaluation.",
      status: s.failedAttempts > 0 ? "warning" : "completed",
      latencyMs: 42,
      riskContribution: clamp(s.failedAttempts * 9),
      confidence: 0.97,
      iconKey: "login",
      apiUrl: "https://api.coherence.bank/v2/auth/login",
      statusCode: s.status === "Blocked" ? 403 : 200,
      executionMs: 41,
      rawPayload: `POST /v2/auth/login HTTP/1.1\nHost: api.coherence.bank\nContent-Type: application/json\nX-Trace-Id: ${s.sessionId}-auth\n\n{"username":"${s.username}","channel":"${s.channel}","application":"${s.application}"}`,
      headers: {
        "Content-Type": "application/json",
        "X-Trace-Id": `${s.sessionId}-auth`,
        "X-Tenant": "retail-bank-eu",
        Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.***",
      },
      metadata: {
        traceId: `${s.sessionId}-auth`,
        tenant: "retail-bank-eu",
        region: "eu-west-1",
        version: "auth-gateway@2.14.3",
        cached: false,
      },
      request: {
        username: s.username,
        customerId: s.customerId,
        channel: s.channel,
        application: s.application,
        deviceId: s.fingerprint,
        ipAddress: s.ip,
        userAgent: s.userAgent,
        timestamp: s.loginTime,
        correlationId: `${s.sessionId}-corr`,
      },
      response: {
        status: s.status === "Blocked" ? "blocked" : "authenticated",
        sessionId: s.sessionId,
        authenticatedAt: t(2),
        mfaRequired: s.decision === "Challenge",
        mfaType: s.mfaType,
        failedAttempts: s.failedAttempts,
        lockoutRisk: s.failedAttempts >= 4,
        riskTriggered: s.decision !== "Allow",
      },
    },
    {
      id: "sgs",
      label: "Geo Intelligence",
      abbr: "SGS",
      description: "Geo Service resolved IP to physical location and compared against prior logins.",
      status: high ? "warning" : "completed",
      latencyMs: 64,
      riskContribution: clamp(high ? 22 + (s.vpn ? 12 : 0) : 4),
      confidence: 0.91,
      iconKey: "geo",
      apiUrl: "https://api.coherence.bank/v2/geo/resolve",
      statusCode: 200,
      executionMs: 58,
      rawPayload: `POST /v2/geo/resolve HTTP/1.1\nX-Trace-Id: ${s.sessionId}-sgs\n\n{"ip":"${s.ip}","sessionId":"${s.sessionId}"}`,
      headers: {
        "Content-Type": "application/json",
        "X-Trace-Id": `${s.sessionId}-sgs`,
        "X-Geo-Provider": "maxmind-geoip2",
        "X-Cache": "HIT",
      },
      metadata: {
        traceId: `${s.sessionId}-sgs`,
        provider: "maxmind-geoip2",
        accuracyRadiusKm: 20,
        cached: true,
        version: "geo-service@1.9.0",
      },
      request: {
        ip: s.ip,
        sessionId: s.sessionId,
        priorCity: s.previousCity,
        priorCountry: s.previousCountry,
        priorLoginTime: s.previousLoginTime,
      },
      response: {
        resolved: { city: s.city, country: s.country, countryCode: s.countryCode, lat: s.latitude, lng: s.longitude, timezone: s.timezone },
        isp: s.isp,
        asn: s.asn,
        vpn: s.vpn,
        proxy: s.vpn,
        tor: false,
        hosting: false,
        distanceKm: high ? 8412 : 14,
        travelTimeHours: high ? 4.2 : 96,
        impossibleTravel: high,
        velocityRisk: high ? "high" : "low",
      },
    },
    {
      id: "scc",
      label: "Customer Context",
      abbr: "SCC",
      description: "Customer profile service enriched session with historical behavior baselines.",
      status: "completed",
      latencyMs: 88,
      riskContribution: clamp(s.newDevice ? 14 : 3),
      confidence: 0.95,
      iconKey: "customer",
      apiUrl: "https://api.coherence.bank/v2/customer/context",
      statusCode: 200,
      executionMs: 84,
      rawPayload: `GET /v2/customer/context/${s.customerId} HTTP/1.1\nX-Trace-Id: ${s.sessionId}-scc`,
      headers: {
        "Content-Type": "application/json",
        "X-Trace-Id": `${s.sessionId}-scc`,
        "X-Profile-Version": "2024.11",
      },
      metadata: { traceId: `${s.sessionId}-scc`, profileVersion: "2024.11", cached: true, version: "customer-context@3.2.1" },
      request: { customerId: s.customerId, sessionId: s.sessionId, depth: "full" },
      response: {
        customer: { name: s.customer, customerId: s.customerId, segment: "Retail Premium", tenureDays: 1842, kycStatus: "verified" },
        baseline: {
          typicalCountries: [s.previousCountry ?? s.country, "United Kingdom", "Singapore"],
          typicalDevices: s.newDevice ? ["MacBook Pro 16\""] : [s.device],
          typicalChannels: [s.channel],
          avgLoginHour: 9,
          failedAttempt30d: 2,
          trustedDeviceCount: 3,
        },
        deviation: {
          newCountry: s.previousCountry !== s.country && s.previousCountry !== null,
          newDevice: s.newDevice,
          offHours: false,
          channelMatch: true,
        },
      },
    },
    {
      id: "sdi",
      label: "Device Intelligence",
      abbr: "SDI",
      description: "Device fingerprint collected hardware, browser, and environment attributes.",
      status: s.newDevice ? "warning" : "completed",
      latencyMs: 112,
      riskContribution: clamp(s.newDevice ? 28 : 6),
      confidence: 0.88,
      iconKey: "device",
      apiUrl: "https://api.coherence.bank/v2/device/intelligence",
      statusCode: 200,
      executionMs: 108,
      rawPayload: `POST /v2/device/intelligence HTTP/1.1\nX-Trace-Id: ${s.sessionId}-sdi\n\n{"fingerprint":"${s.fingerprint}","userAgent":"${s.userAgent}"}`,
      headers: { "Content-Type": "application/json", "X-Trace-Id": `${s.sessionId}-sdi`, "X-Device-Lib": "fingerprintjs-pro" },
      metadata: { traceId: `${s.sessionId}-sdi`, library: "fingerprintjs-pro", confidence: 0.88, version: "device-intel@2.4.0" },
      request: { fingerprint: s.fingerprint, userAgent: s.userAgent, sessionId: s.sessionId },
      response: {
        device: { model: s.device, type: s.deviceType, os: s.os, browser: s.browser, screen: "1920x1080", language: "en-US", timezone: s.timezone },
        fingerprint: { hash: s.fingerprint, confidence: 0.92, components: 38, stable: true },
        firstSeen: s.newDevice ? iso(60) : iso(60 * 24 * 90),
        loginCount: s.newDevice ? 1 : 47,
        emulator: false,
        rooted: false,
        headless: false,
        incognito: false,
        anomalies: s.newDevice ? ["first-seen-fingerprint", "canvas-hash-mismatch"] : [],
      },
    },
    {
      id: "depm",
      label: "Device Reputation",
      abbr: "DEPM",
      description: "Device reputation service scored the device against cross-tenant history.",
      status: s.newDevice ? "warning" : "completed",
      latencyMs: 76,
      riskContribution: clamp(s.newDevice ? 18 : 4),
      confidence: 0.86,
      iconKey: "reputation",
      apiUrl: "https://api.coherence.bank/v2/device/reputation",
      statusCode: 200,
      executionMs: 72,
      rawPayload: `POST /v2/device/reputation HTTP/1.1\nX-Trace-Id: ${s.sessionId}-depm\n\n{"fingerprint":"${s.fingerprint}"}`,
      headers: { "Content-Type": "application/json", "X-Trace-Id": `${s.sessionId}-depm`, "X-Reputation-Source": "shared-graph" },
      metadata: { traceId: `${s.sessionId}-depm`, source: "shared-graph", version: "device-rep@1.4.7" },
      request: { fingerprint: s.fingerprint, tenant: "retail-bank-eu", sessionId: s.sessionId },
      response: {
        reputationScore: s.newDevice ? 34 : 82,
        seenAcrossTenants: s.newDevice ? 1 : 4,
        linkedAccounts: s.newDevice ? 1 : 3,
        abuseHistory: s.newDevice ? [] : [{ type: "account-takeover", severity: "low", resolvedAt: iso(60 * 24 * 30) }],
        riskFlags: s.newDevice ? ["first-seen", "low-reputation"] : [],
        trustLevel: s.newDevice ? "untrusted" : "trusted",
      },
    },
    {
      id: "ifm",
      label: "Identity Fraud",
      abbr: "IFM",
      description: "Identity fraud model scored credential and behavioral signals.",
      status: high ? "failed" : "completed",
      latencyMs: 134,
      riskContribution: clamp(high ? 30 + s.failedAttempts * 4 : 5),
      confidence: 0.84,
      iconKey: "identity",
      apiUrl: "https://api.coherence.bank/v2/fraud/identity",
      statusCode: 200,
      executionMs: 129,
      rawPayload: `POST /v2/fraud/identity HTTP/1.1\nX-Trace-Id: ${s.sessionId}-ifm\n\n{"username":"${s.username}","failedAttempts":${s.failedAttempts}}`,
      headers: { "Content-Type": "application/json", "X-Trace-Id": `${s.sessionId}-ifm`, "X-Model": "ifm-xgb-v7" },
      metadata: { traceId: `${s.sessionId}-ifm`, model: "ifm-xgb-v7", version: "identity-fraud@7.0.2", cached: false },
      request: { username: s.username, customerId: s.customerId, failedAttempts: s.failedAttempts, sessionId: s.sessionId, ip: s.ip, fingerprint: s.fingerprint },
      response: {
        fraudScore: s.fraudProbability,
        credentialStuffing: s.failedAttempts >= 3,
        credentialBreach: s.failedAttempts >= 4,
        accountTakeoverRisk: high ? "high" : "low",
        syntheticIdentity: false,
        mfaBypassRisk: s.mfaUsed ? "low" : "medium",
        modelVersion: "ifm-xgb-v7",
        contributions: [
          { feature: "failed_attempts", weight: clamp(s.failedAttempts * 12) },
          { feature: "new_device", weight: s.newDevice ? 22 : 0 },
          { feature: "geo_velocity", weight: high ? 18 : 2 },
          { feature: "credential_breach", weight: s.failedAttempts >= 4 ? 16 : 0 },
        ],
      },
    },
    {
      id: "slrs",
      label: "Recommendation",
      abbr: "SLRS",
      description: "Strategy and logic recommendation service synthesized an action.",
      status: s.decision === "Deny" ? "failed" : s.decision === "Challenge" ? "warning" : "completed",
      latencyMs: 54,
      riskContribution: 0,
      confidence: 0.93,
      iconKey: "recommendation",
      apiUrl: "https://api.coherence.bank/v2/slrs/recommend",
      statusCode: 200,
      executionMs: 51,
      rawPayload: `POST /v2/slrs/recommend HTTP/1.1\nX-Trace-Id: ${s.sessionId}-slrs\n\n{"sessionId":"${s.sessionId}","riskScore":${s.riskScore}}`,
      headers: { "Content-Type": "application/json", "X-Trace-Id": `${s.sessionId}-slrs`, "X-Strategy": "v2024.11" },
      metadata: { traceId: `${s.sessionId}-slrs`, strategy: "v2024.11", version: "slrs@2.1.0" },
      request: { sessionId: s.sessionId, riskScore: s.riskScore, fraudProbability: s.fraudProbability, triggeredRules: s.triggeredRules, coherenceScore: s.coherenceScore },
      response: {
        recommendation: s.decision.toLowerCase(),
        primaryReason: s.triggeredRules[0] ?? "clean-session",
        suggestedActions: s.decision === "Deny" ? ["block-session", "notify-customer", "freeze-account"] : s.decision === "Challenge" ? ["step-up-mfa", "notify-customer"] : ["allow", "log-only"],
        customerImpact: s.decision === "Deny" ? "high" : s.decision === "Challenge" ? "medium" : "none",
        overrideEligible: s.decision === "Challenge",
      },
    },
    {
      id: "sps",
      label: "Policy Scoring",
      abbr: "SPS",
      description: "Policy scoring engine applied rule weights and computed final score.",
      status: s.triggeredRules.length > 2 ? "warning" : "completed",
      latencyMs: 38,
      riskContribution: clamp(s.riskScore * 0.4),
      confidence: 0.96,
      iconKey: "policy",
      apiUrl: "https://api.coherence.bank/v2/policy/score",
      statusCode: 200,
      executionMs: 35,
      rawPayload: `POST /v2/policy/score HTTP/1.1\nX-Trace-Id: ${s.sessionId}-sps\n\n{"sessionId":"${s.sessionId}","triggeredRules":${JSON.stringify(s.triggeredRules)}}`,
      headers: { "Content-Type": "application/json", "X-Trace-Id": `${s.sessionId}-sps`, "X-Policy-Bundle": "retail-v34" },
      metadata: { traceId: `${s.sessionId}-sps`, policyBundle: "retail-v34", version: "policy-score@5.0.1" },
      request: { sessionId: s.sessionId, triggeredRules: s.triggeredRules, evidenceCount: s.evidenceCount, coherenceScore: s.coherenceScore },
      response: {
        finalScore: s.riskScore,
        policyBundle: "retail-v34",
        ruleContributions: s.triggeredRules.map((r, i) => ({ rule: r, weight: Math.round(s.riskScore / Math.max(1, s.triggeredRules.length)) + i * 3, action: s.decision === "Deny" ? "block" : s.decision === "Challenge" ? "challenge" : "log" })),
        threshold: { allow: 45, challenge: 78 },
        decision: s.decision,
        overridesApplied: 0,
      },
    },
    {
      id: "decision",
      label: "Decision",
      abbr: "DEC",
      description: "Decision orchestrator finalized the session outcome and emitted audit event.",
      status: s.decision === "Deny" ? "failed" : s.decision === "Challenge" ? "warning" : "completed",
      latencyMs: 18,
      riskContribution: 0,
      confidence: 1.0,
      iconKey: "decision",
      apiUrl: "https://api.coherence.bank/v2/decision/finalize",
      statusCode: s.status === "Blocked" ? 403 : 200,
      executionMs: 16,
      rawPayload: `POST /v2/decision/finalize HTTP/1.1\nX-Trace-Id: ${s.sessionId}-dec\n\n{"sessionId":"${s.sessionId}"}`,
      headers: { "Content-Type": "application/json", "X-Trace-Id": `${s.sessionId}-dec`, "X-Audit": "immutable" },
      metadata: { traceId: `${s.sessionId}-dec`, audit: "immutable", version: "decision@4.0.0" },
      request: { sessionId: s.sessionId, recommendation: s.decision.toLowerCase(), riskScore: s.riskScore, policyBundle: "retail-v34" },
      response: {
        decision: s.decision,
        reason: s.triggeredRules[0] ?? "clean-session",
        sessionId: s.sessionId,
        decidedAt: s.loginTime,
        latencyMs: s.latency,
        auditEventId: `audit-${s.sessionId}`,
        actionsTaken: s.decision === "Deny" ? ["blocked", "alerted"] : s.decision === "Challenge" ? ["mfa-challenged"] : ["allowed"],
      },
    },
  ];
}

function levelFromScore(score: number): RiskLevel {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  return "low";
}

function buildEvidence(s: LoginSession): EvidenceCard[] {
  const high = s.riskScore >= 60;
  const level = (n: number): RiskLevel => levelFromScore(n);

  return [
    {
      id: "ev-device",
      kind: "device",
      title: "Device Evidence",
      confidence: s.newDevice ? 0.62 : 0.94,
      risk: s.newDevice ? 68 : 14,
      riskLevel: level(s.newDevice ? 68 : 14),
      reasonCodes: [
        { code: "D-101", label: s.newDevice ? "First-seen device fingerprint" : "Known device", severity: s.newDevice ? "high" : "low" },
        { code: "D-204", label: "Canvas hash stable", severity: "low" },
        ...(s.newDevice ? [{ code: "D-318", label: "Canvas hash mismatch vs baseline", severity: "medium" as const }] : []),
      ],
      evidence: [
        `Fingerprint ${s.fingerprint.slice(0, 12)}… stable across 38 components`,
        `Device ${s.device} · ${s.os} · ${s.browser}`,
        s.newDevice ? "First observed 1h ago — no trusted history" : `Observed 47 prior logins over 90 days`,
        `Headless: false · Emulator: false · Rooted: false`,
      ],
      featureImportance: [
        { feature: "fingerprint_stability", value: "0.92", weight: 0.34, direction: "decreases" },
        { feature: "first_seen_recency", value: s.newDevice ? "1h" : "90d", weight: s.newDevice ? 0.61 : 0.08, direction: "increases" },
        { feature: "device_trust_score", value: s.newDevice ? "34" : "82", weight: 0.42, direction: s.newDevice ? "increases" : "decreases" },
        { feature: "login_count", value: s.newDevice ? "1" : "47", weight: 0.21, direction: s.newDevice ? "increases" : "decreases" },
      ],
      history: [
        { t: iso(60 * 24 * 30), label: "Trusted device baseline established", delta: -4 },
        ...(s.newDevice ? [{ t: iso(60), label: "First-seen fingerprint", delta: 28 }] : []),
        { t: iso(5), label: "Current session evaluated", delta: s.newDevice ? 24 : 2 },
      ],
      timeline: [
        { t: iso(60 * 24 * 30), label: "Device trust baseline", kind: "completed" },
        { t: iso(60 * 24 * 7), label: "Last trusted login", kind: "completed" },
        ...(s.newDevice ? [{ t: iso(60), label: "Fingerprint first observed", kind: "warning" as const }] : []),
        { t: iso(5), label: "Session evaluated", kind: s.newDevice ? "warning" : "completed" },
      ],
    },
    {
      id: "ev-ip",
      kind: "ip",
      title: "IP Evidence",
      confidence: 0.97,
      risk: s.vpn ? 71 : 12,
      riskLevel: level(s.vpn ? 71 : 12),
      reasonCodes: [
        { code: "N-201", label: s.vpn ? "VPN / proxy detected" : "Clean residential IP", severity: s.vpn ? "high" : "low" },
        { code: "N-110", label: `ASN ${s.asn}`, severity: "low" },
        ...(s.vpn ? [{ code: "N-402", label: "Anonymizing service", severity: "high" as const }] : []),
      ],
      evidence: [
        `IP ${s.ip} resolved to ${s.isp} (${s.asn})`,
        s.vpn ? "VPN/proxy exit node detected" : "No VPN, proxy, or Tor exit detected",
        `Hosting: false · Datacenter: false`,
        `ASN reputation: ${s.vpn ? "low" : "high"}`,
      ],
      featureImportance: [
        { feature: "vpn_proxy", value: s.vpn ? "true" : "false", weight: s.vpn ? 0.71 : 0.04, direction: s.vpn ? "increases" : "decreases" },
        { feature: "asn_reputation", value: s.vpn ? "low" : "high", weight: 0.38, direction: s.vpn ? "increases" : "decreases" },
        { feature: "datacenter", value: "false", weight: 0.02, direction: "decreases" },
        { feature: "tor_exit", value: "false", weight: 0.01, direction: "decreases" },
      ],
      history: [
        { t: iso(60 * 24 * 2), label: "IP reputation refreshed", delta: s.vpn ? 12 : -2 },
        { t: iso(30), label: s.vpn ? "VPN flagged on lookup" : "Clean IP confirmed", delta: s.vpn ? 18 : 1 },
        { t: iso(5), label: "Session IP scored", delta: s.vpn ? 22 : 2 },
      ],
      timeline: [
        { t: iso(60 * 24 * 2), label: "Reputation refresh", kind: "completed" },
        { t: iso(30), label: s.vpn ? "VPN detected" : "Clean IP", kind: s.vpn ? "warning" : "completed" },
        { t: iso(5), label: "IP scored", kind: s.vpn ? "warning" : "completed" },
      ],
    },
    {
      id: "ev-location",
      kind: "location",
      title: "Location Evidence",
      confidence: 0.91,
      risk: high ? 78 : 18,
      riskLevel: level(high ? 78 : 18),
      reasonCodes: [
        { code: "L-301", label: high ? "Impossible travel detected" : "Geographic consistency", severity: high ? "critical" : "low" },
        { code: "L-115", label: `Accuracy radius 20km`, severity: "low" },
      ],
      evidence: [
        `Current: ${s.city}, ${s.country} (${s.latitude.toFixed(2)}, ${s.longitude.toFixed(2)})`,
        `Previous: ${s.previousCity ?? "—"}, ${s.previousCountry ?? "—"}`,
        high ? `Distance 8412km in 4.2h — impossible by commercial travel` : `Distance 14km from baseline`,
        `Timezone ${s.timezone} matches resolved location`,
      ],
      featureImportance: [
        { feature: "distance_km", value: high ? "8412" : "14", weight: high ? 0.78 : 0.05, direction: high ? "increases" : "decreases" },
        { feature: "travel_time_h", value: high ? "4.2" : "96", weight: high ? 0.66 : 0.03, direction: high ? "increases" : "decreases" },
        { feature: "timezone_match", value: "true", weight: 0.18, direction: "decreases" },
        { feature: "accuracy_km", value: "20", weight: 0.09, direction: "decreases" },
      ],
      history: [
        { t: iso(60 * 24 * 5), label: "Baseline location established", delta: -2 },
        ...(high ? [{ t: iso(60 * 4), label: "Impossible travel flagged", delta: 42 }] : []),
        { t: iso(5), label: "Geo velocity scored", delta: high ? 28 : 3 },
      ],
      timeline: [
        { t: iso(60 * 24 * 5), label: "Baseline", kind: "completed" },
        ...(high ? [{ t: iso(60 * 4), label: "Impossible travel", kind: "failed" as const }] : []),
        { t: iso(5), label: "Velocity scored", kind: high ? "failed" : "completed" },
      ],
    },
    {
      id: "ev-cookie",
      kind: "cookie",
      title: "Cookie Evidence",
      confidence: 0.79,
      risk: s.newDevice ? 52 : 16,
      riskLevel: level(s.newDevice ? 52 : 16),
      reasonCodes: [
        { code: "C-101", label: s.newDevice ? "No trusted session cookie" : "Trusted cookie present", severity: s.newDevice ? "medium" : "low" },
        { code: "C-220", label: "Cookie age 0d (new)", severity: "low" },
      ],
      evidence: [
        s.newDevice ? "No `_cb_trust` cookie — first cookie set this session" : "`_cb_trust` cookie present, age 47d",
        "Cookie domain: coherence.bank",
        `SameSite=Lax · Secure · HttpOnly`,
        s.newDevice ? "No cross-device cookie linkage" : "Linked to 2 prior devices",
      ],
      featureImportance: [
        { feature: "trusted_cookie", value: s.newDevice ? "absent" : "present", weight: s.newDevice ? 0.52 : 0.12, direction: s.newDevice ? "increases" : "decreases" },
        { feature: "cookie_age_days", value: s.newDevice ? "0" : "47", weight: 0.31, direction: s.newDevice ? "increases" : "decreases" },
        { feature: "cross_device_link", value: s.newDevice ? "0" : "2", weight: 0.18, direction: s.newDevice ? "increases" : "decreases" },
      ],
      history: [
        ...(s.newDevice ? [{ t: iso(5), label: "First cookie set", delta: 22 }] : [{ t: iso(60 * 24 * 47), label: "Trust cookie issued", delta: -8 }]),
        { t: iso(5), label: "Cookie evaluated", delta: s.newDevice ? 18 : 2 },
      ],
      timeline: [
        { t: iso(60 * 24 * 47), label: s.newDevice ? "No prior cookie" : "Cookie issued", kind: s.newDevice ? "skipped" : "completed" },
        { t: iso(5), label: "Cookie evaluated", kind: s.newDevice ? "warning" : "completed" },
      ],
    },
    {
      id: "ev-behavior",
      kind: "behavior",
      title: "Behavior Evidence",
      confidence: 0.83,
      risk: s.coherenceScore < 50 ? 58 : 22,
      riskLevel: level(s.coherenceScore < 50 ? 58 : 22),
      reasonCodes: [
        { code: "B-401", label: s.coherenceScore < 50 ? "Low behavioral coherence" : "Behavioral coherence nominal", severity: s.coherenceScore < 50 ? "medium" : "low" },
        { code: "B-510", label: `Keystroke cadence ${s.coherenceScore < 50 ? "anomalous" : "nominal"}`, severity: s.coherenceScore < 50 ? "medium" : "low" },
      ],
      evidence: [
        `Coherence score ${s.coherenceScore}/100`,
        `Keystroke cadence: ${s.coherenceScore < 50 ? "anomalous vs baseline" : "matches baseline"}`,
        `Mouse dynamics: ${s.coherenceScore < 50 ? "erratic" : "smooth"}`,
        `Session duration ${Math.round(s.duration)}s · navigation pattern ${s.coherenceScore < 50 ? "non-linear" : "linear"}`,
      ],
      featureImportance: [
        { feature: "keystroke_cadence", value: s.coherenceScore < 50 ? "anomalous" : "nominal", weight: s.coherenceScore < 50 ? 0.58 : 0.12, direction: s.coherenceScore < 50 ? "increases" : "decreases" },
        { feature: "mouse_dynamics", value: s.coherenceScore < 50 ? "erratic" : "smooth", weight: 0.34, direction: s.coherenceScore < 50 ? "increases" : "decreases" },
        { feature: "navigation_pattern", value: s.coherenceScore < 50 ? "non-linear" : "linear", weight: 0.22, direction: s.coherenceScore < 50 ? "increases" : "decreases" },
        { feature: "session_duration", value: `${Math.round(s.duration)}s`, weight: 0.11, direction: "decreases" },
      ],
      history: [
        { t: iso(60 * 24 * 14), label: "Behavioral baseline updated", delta: -2 },
        { t: iso(5), label: "Behavioral biometrics scored", delta: s.coherenceScore < 50 ? 24 : 4 },
      ],
      timeline: [
        { t: iso(60 * 24 * 14), label: "Baseline update", kind: "completed" },
        { t: iso(5), label: "Biometrics scored", kind: s.coherenceScore < 50 ? "warning" : "completed" },
      ],
    },
    {
      id: "ev-graph",
      kind: "graph",
      title: "Graph Evidence",
      confidence: 0.86,
      risk: high ? 64 : 20,
      riskLevel: level(high ? 64 : 20),
      reasonCodes: [
        { code: "G-301", label: high ? "Device linked to flagged cluster" : "No flagged cluster linkage", severity: high ? "high" : "low" },
        { code: "G-120", label: `Entity degree ${high ? 7 : 2}`, severity: "low" },
      ],
      evidence: [
        `Device graph degree: ${high ? 7 : 2} linked entities`,
        high ? "1 linked account under ATO investigation" : "No accounts under investigation",
        `Shared IP with ${high ? 4 : 1} other accounts`,
        `Shortest path to known-bad: ${high ? 2 : 6} hops`,
      ],
      featureImportance: [
        { feature: "entity_degree", value: high ? "7" : "2", weight: high ? 0.64 : 0.08, direction: high ? "increases" : "decreases" },
        { feature: "ato_linkage", value: high ? "1" : "0", weight: high ? 0.58 : 0.02, direction: high ? "increases" : "decreases" },
        { feature: "shared_ip_accounts", value: high ? "4" : "1", weight: 0.31, direction: high ? "increases" : "decreases" },
        { feature: "path_to_bad", value: high ? "2" : "6", weight: 0.24, direction: high ? "increases" : "decreases" },
      ],
      history: [
        { t: iso(60 * 24 * 3), label: "Graph refreshed", delta: high ? 8 : 0 },
        { t: iso(5), label: "Graph traversal scored", delta: high ? 22 : 3 },
      ],
      timeline: [
        { t: iso(60 * 24 * 3), label: "Graph refresh", kind: "completed" },
        { t: iso(5), label: "Traversal scored", kind: high ? "warning" : "completed" },
      ],
    },
    {
      id: "ev-temporal",
      kind: "temporal",
      title: "Temporal Evidence",
      confidence: 0.88,
      risk: s.velocityEvents > 10 ? 67 : 15,
      riskLevel: level(s.velocityEvents > 10 ? 67 : 15),
      reasonCodes: [
        { code: "T-201", label: s.velocityEvents > 10 ? "Velocity spike detected" : "Velocity within baseline", severity: s.velocityEvents > 10 ? "high" : "low" },
        { code: "T-110", label: `${s.velocityEvents} events in 1h window`, severity: s.velocityEvents > 10 ? "medium" : "low" },
      ],
      evidence: [
        `${s.velocityEvents} events in 1h (baseline: 4)`,
        `${s.failedAttempts} failed attempts in window`,
        `Off-hours: false · Weekend: false`,
        `Session cadence ${s.velocityEvents > 10 ? "bursty" : "regular"}`,
      ],
      featureImportance: [
        { feature: "velocity_1h", value: `${s.velocityEvents}`, weight: s.velocityEvents > 10 ? 0.67 : 0.08, direction: s.velocityEvents > 10 ? "increases" : "decreases" },
        { feature: "failed_attempts", value: `${s.failedAttempts}`, weight: clamp(s.failedAttempts * 0.12), direction: s.failedAttempts > 2 ? "increases" : "decreases" },
        { feature: "off_hours", value: "false", weight: 0.04, direction: "decreases" },
        { feature: "cadence", value: s.velocityEvents > 10 ? "bursty" : "regular", weight: 0.21, direction: s.velocityEvents > 10 ? "increases" : "decreases" },
      ],
      history: [
        { t: iso(60), label: "Velocity window opened", delta: 0 },
        { t: iso(30), label: `${s.failedAttempts} failed attempts`, delta: s.failedAttempts * 6 },
        { t: iso(5), label: "Temporal scoring complete", delta: s.velocityEvents > 10 ? 22 : 3 },
      ],
      timeline: [
        { t: iso(60), label: "Window opened", kind: "completed" },
        { t: iso(30), label: `${s.failedAttempts} failures`, kind: s.failedAttempts > 2 ? "warning" : "completed" },
        { t: iso(5), label: "Scoring complete", kind: s.velocityEvents > 10 ? "warning" : "completed" },
      ],
    },
  ];
}

function buildInsights(s: LoginSession): AiInsight[] {
  const high = s.riskScore >= 60;
  const insights: AiInsight[] = [
    {
      id: "ai-1",
      kind: "signal",
      title: "Composite risk driven by geo-velocity",
      body: high
        ? `The largest contributor to this session's risk score is an impossible-travel pattern: ${s.previousCity ?? "—"} → ${s.city} in 4.2h. Combined with a first-seen device, the geo-velocity signal accounts for ~31% of the final score.`
        : `Session risk is low. Geo-velocity, device, and behavioral signals are all within the customer's established baseline.`,
      severity: high ? "critical" : "low",
      weight: high ? 0.31 : 0.04,
    },
    {
      id: "ai-2",
      kind: "anomaly",
      title: s.newDevice ? "First-seen device fingerprint" : "Device consistency confirmed",
      body: s.newDevice
        ? `Device fingerprint ${s.fingerprint.slice(0, 12)}… was first observed 1 hour ago and has no trusted history. Device reputation score is 34/100 (untrusted). This is the second-strongest risk contributor.`
        : `Device fingerprint matches a trusted profile with 47 prior logins. Reputation score 82/100 (trusted). No device-side anomalies detected.`,
      severity: s.newDevice ? "high" : "low",
      weight: s.newDevice ? 0.24 : 0.03,
    },
    {
      id: "ai-3",
      kind: "context",
      title: "Customer baseline deviation",
      body: `Customer ${s.customer} (${s.customerId}) typically logs in from ${s.previousCountry ?? s.country} on ${s.channel}. ${high ? "This session deviates on geography" : "This session is consistent with the baseline"}. Tenure: 1842 days, segment: Retail Premium.`,
      severity: high ? "medium" : "low",
      weight: high ? 0.12 : 0.02,
    },
  ];
  if (s.vpn) {
    insights.push({
      id: "ai-4",
      kind: "anomaly",
      title: "VPN / anonymizing service detected",
      body: `IP ${s.ip} resolves to a VPN exit node (${s.isp}, ${s.asn}). Anonymizing services are present in ${((s.vpn ? 1 : 0) * 100).toFixed(0)}% of confirmed account-takeover cases in this tenant over the last 30 days.`,
      severity: "high",
      weight: 0.18,
    });
  }
  if (s.failedAttempts >= 3) {
    insights.push({
      id: "ai-5",
      kind: "anomaly",
      title: "Credential stuffing pattern",
      body: `${s.failedAttempts} failed attempts in the 1h window exceed the credential-stuffing threshold (3). Combined with a new device, this pattern matches the ${s.failedAttempts >= 4 ? "credential-breach" : "credential-stuffing"} detection signature.`,
      severity: s.failedAttempts >= 4 ? "critical" : "high",
      weight: 0.22,
    });
  }
  insights.push({
    id: "ai-rec",
    kind: "recommendation",
    title: `Recommended action: ${s.decision}`,
    body:
      s.decision === "Deny"
        ? "Block the session, notify the customer via out-of-band channel, and freeze the account pending verification. Escalate to the fraud operations queue for manual review."
        : s.decision === "Challenge"
        ? "Require step-up MFA (authenticator app or hardware key). Notify the customer of the challenge. Do not block — the customer may be legitimately traveling."
        : "Allow the session. Log for audit. No further action required unless downstream monitoring flags anomalous transaction behavior.",
    severity: s.decision === "Deny" ? "critical" : s.decision === "Challenge" ? "high" : "low",
    weight: 1.0,
  });
  return insights;
}

export function buildInvestigation(session: LoginSession): InvestigationCase {
  const high = session.riskScore >= 60;
  const nodes = buildNodes(session);
  return {
    caseId: `CASE-${session.sessionId.replace("S-", "")}`,
    session,
    nodes,
    evidence: buildEvidence(session),
    insights: buildInsights(session),
    narrative: [
      `Session ${session.sessionId} for customer ${session.customer} (${session.username}) was initiated at ${new Date(session.loginTime).toLocaleString()} via ${session.channel} on ${session.application}.`,
      high
        ? `The Coherence Brain pipeline flagged this session with a composite risk score of ${session.riskScore}/100 and a fraud probability of ${session.fraudProbability}%, driven primarily by impossible travel and a first-seen device.`
        : `The Coherence Brain pipeline evaluated this session and assigned a composite risk score of ${session.riskScore}/100. No critical anomalies were detected.`,
      `${session.triggeredRules.length} policy rule${session.triggeredRules.length === 1 ? "" : "s"} fired: ${session.triggeredRules.length ? session.triggeredRules.join(", ") : "none"}.`,
      `Final decision: ${session.decision}. Total pipeline latency ${nodes.reduce((a, n) => a + n.latencyMs, 0)}ms across ${nodes.length} stages.`,
    ],
    recommendedActions: [
      { id: "ra-1", label: session.decision === "Deny" ? "Block & freeze account" : session.decision === "Challenge" ? "Require step-up MFA" : "Allow session", rationale: `Aligned with SLRS recommendation (${session.decision}) and policy bundle retail-v34.`, severity: session.decision === "Deny" ? "critical" : session.decision === "Challenge" ? "high" : "low" },
      { id: "ra-2", label: "Notify customer out-of-band", rationale: "Inform the account holder via SMS and registered email of the session event.", severity: session.decision === "Allow" ? "low" : "medium" },
      ...(high ? [{ id: "ra-3", label: "Escalate to fraud ops", rationale: "Composite risk exceeds the 60-point escalation threshold.", severity: "critical" as const }] : []),
      ...(session.newDevice ? [{ id: "ra-4", label: "Add device to watchlist", rationale: "First-seen fingerprint should be monitored for repeat appearances across accounts.", severity: "medium" as const }] : []),
    ],
    modelScores: [
      { model: "Identity Fraud (IFM-XGB-v7)", score: session.fraudProbability, contribution: 0.34 },
      { model: "Geo Velocity (GVS-v3)", score: high ? 88 : 12, contribution: 0.28 },
      { model: "Device Reputation (DEPM-v2)", score: session.newDevice ? 66 : 18, contribution: 0.21 },
      { model: "Behavioral Biometrics (BBM-v4)", score: 100 - session.coherenceScore, contribution: 0.17 },
    ],
    similarCases: [
      { caseId: "CASE-99812", customer: "Eleanor Voss", similarity: 0.91, decision: "Deny", time: iso(60 * 26) },
      { caseId: "CASE-99741", customer: "Hiroshi Tanaka", similarity: 0.84, decision: "Challenge", time: iso(60 * 50) },
      { caseId: "CASE-99603", customer: "Priya Raghunathan", similarity: 0.78, decision: "Challenge", time: iso(60 * 72) },
    ],
  };
}
