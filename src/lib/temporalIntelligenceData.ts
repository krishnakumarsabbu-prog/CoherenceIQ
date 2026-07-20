import type { LoginSession } from "@/types";

export type TemporalSignalKind =
  | "Behavior Drift" | "Impossible Travel" | "Velocity" | "Session Progression";
export type EventKind =
  | "Password Reset" | "New Device" | "VPN" | "Location Change"
  | "Failed Login" | "Successful Login" | "Transfer";

export type RiskBand = "low" | "medium" | "high" | "critical";

export interface TemporalEvent {
  id: string;
  kind: EventKind;
  label: string;
  timestamp: string;
  offsetMin: number;
  risk: number;
  band: RiskBand;
  detail: string;
  actor: string;
  channel: string;
  location: string;
  metadata: { key: string; value: string }[];
}

export interface TemporalSignal {
  id: string;
  kind: TemporalSignalKind;
  label: string;
  detected: boolean;
  severity: RiskBand;
  confidence: number;
  score: number;
  weight: number;
  baseline: number;
  current: number;
  unit: string;
  window: string;
  description: string;
  evidence: string[];
  trend: { t: string; value: number; baseline: number }[];
}

export interface TemporalData {
  events: TemporalEvent[];
  signals: TemporalSignal[];
  timeline: { t: string; risk: number; velocity: number; coherence: number }[];
  stats: {
    eventCount: number;
    windowHours: number;
    anomalies: number;
    behaviorDrift: number;
    impossibleTravel: number;
    velocity: number;
    sessionProgression: number;
  };
}

const iso = (offsetMin: number) => new Date(Date.now() - offsetMin * 60 * 1000).toISOString();

function band(score: number): RiskBand {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  return "low";
}

export function buildTemporal(session: LoginSession): TemporalData {
  const high = session.riskScore >= 60;
  const baseT = new Date(session.loginTime).getTime();
  const t = (offsetMs: number) => new Date(baseT - offsetMs).toISOString();

  // Chronological event sequence: Password Reset → New Device → VPN → Location Change → Failed Login → Successful Login → Transfer
  const events: TemporalEvent[] = [
    {
      id: "evt-1", kind: "Password Reset", label: "Password Reset Requested",
      timestamp: t(72 * 60 * 1000), offsetMin: 72,
      risk: 38, band: "medium", actor: session.username, channel: "Web",
      location: `${session.previousCity ?? session.city}, ${session.previousCountry ?? session.country}`,
      detail: "Out-of-band password reset initiated via email link.",
      metadata: [
        { key: "method", value: "email-link" },
        { key: "ip", value: session.ip },
        { key: "verified", value: String(!high) },
        { key: "latency", value: "142ms" },
      ],
    },
    {
      id: "evt-2", kind: "New Device", label: "New Device Enrolled",
      timestamp: t(48 * 60 * 1000), offsetMin: 48,
      risk: session.newDevice ? 68 : 22, band: band(session.newDevice ? 68 : 22),
      actor: session.username, channel: session.channel,
      location: `${session.city}, ${session.country}`,
      detail: session.newDevice ? "First-seen fingerprint enrolled with no trusted history." : "Known device enrolled.",
      metadata: [
        { key: "device", value: session.device },
        { key: "fingerprint", value: `${session.fingerprint.slice(0, 12)}…` },
        { key: "firstSeen", value: session.newDevice ? "true" : "false" },
        { key: "trust", value: session.newDevice ? "untrusted" : "trusted" },
      ],
    },
    {
      id: "evt-3", kind: "VPN", label: "VPN Connection Detected",
      timestamp: t(24 * 60 * 1000), offsetMin: 24,
      risk: session.vpn ? 71 : 14, band: band(session.vpn ? 71 : 14),
      actor: session.username, channel: session.channel,
      location: `${session.city}, ${session.country}`,
      detail: session.vpn ? "Anonymizing VPN exit node detected on ASN." : "No VPN detected — clean residential IP.",
      metadata: [
        { key: "vpn", value: String(session.vpn) },
        { key: "asn", value: session.asn },
        { key: "isp", value: session.isp },
        { key: "proxy", value: String(session.vpn) },
      ],
    },
    {
      id: "evt-4", kind: "Location Change", label: "Geographic Location Change",
      timestamp: t(6 * 60 * 1000), offsetMin: 6,
      risk: high ? 78 : 18, band: band(high ? 78 : 18),
      actor: session.username, channel: session.channel,
      location: `${session.city}, ${session.country}`,
      detail: high
        ? `Impossible travel: ${session.previousCity ?? "—"} → ${session.city} in 4.2h (8412km).`
        : `Location change within baseline radius.`,
      metadata: [
        { key: "distanceKm", value: high ? "8412" : "14" },
        { key: "travelHours", value: high ? "4.2" : "96" },
        { key: "previous", value: `${session.previousCity ?? "—"}, ${session.previousCountry ?? "—"}` },
        { key: "current", value: `${session.city}, ${session.country}` },
      ],
    },
    {
      id: "evt-5", kind: "Failed Login", label: `${session.failedAttempts} Failed Login Attempt${session.failedAttempts === 1 ? "" : "s"}`,
      timestamp: t(2 * 60 * 1000), offsetMin: 2,
      risk: Math.min(80, session.failedAttempts * 14), band: band(Math.min(80, session.failedAttempts * 14)),
      actor: session.username, channel: session.channel,
      location: `${session.city}, ${session.country}`,
      detail: session.failedAttempts > 0
        ? `${session.failedAttempts} failed attempts in a 1h window — credential stuffing pattern.`
        : "No failed attempts recorded.",
      metadata: [
        { key: "attempts", value: String(session.failedAttempts) },
        { key: "window", value: "1h" },
        { key: "threshold", value: "3" },
        { key: "lockout", value: String(session.failedAttempts >= 4) },
      ],
    },
    {
      id: "evt-6", kind: "Successful Login", label: "Successful Login",
      timestamp: t(0), offsetMin: 0,
      risk: session.riskScore, band: band(session.riskScore),
      actor: session.username, channel: session.channel,
      location: `${session.city}, ${session.country}`,
      detail: `Session ${session.sessionId} authenticated with ${session.authMethod}.`,
      metadata: [
        { key: "sessionId", value: session.sessionId },
        { key: "authMethod", value: session.authMethod },
        { key: "mfa", value: session.mfaUsed ? session.mfaType : "none" },
        { key: "decision", value: session.decision },
      ],
    },
    {
      id: "evt-7", kind: "Transfer", label: "Outbound Transfer Initiated",
      timestamp: t(-3 * 60 * 1000), offsetMin: -3,
      risk: high ? 84 : 24, band: band(high ? 84 : 24),
      actor: session.username, channel: session.channel,
      location: `${session.city}, ${session.country}`,
      detail: high ? "Outbound transfer to new external payee post-login." : "Routine transfer to trusted payee.",
      metadata: [
        { key: "amount", value: high ? "$4,820" : "$120" },
        { key: "payee", value: high ? "new-external" : "trusted" },
        { key: "currency", value: "USD" },
        { key: "status", value: session.decision === "Deny" ? "blocked" : "pending" },
      ],
    },
  ];

  // Signals
  const signals: TemporalSignal[] = [
    {
      id: "sig-behavior", kind: "Behavior Drift", label: "Behavior Drift",
      detected: session.coherenceScore < 60, severity: band(100 - session.coherenceScore),
      confidence: 0.83, score: 100 - session.coherenceScore, weight: 0.22,
      baseline: 14, current: 100 - session.coherenceScore, unit: "drift score", window: "30d rolling",
      description: session.coherenceScore < 60
        ? "Keystroke cadence and mouse dynamics deviate significantly from the 30-day behavioral baseline."
        : "Behavioral biometrics align with the established baseline.",
      evidence: [
        `Keystroke cadence: ${session.coherenceScore < 60 ? "anomalous" : "nominal"}`,
        `Mouse dynamics: ${session.coherenceScore < 60 ? "erratic" : "smooth"}`,
        `Navigation pattern: ${session.coherenceScore < 60 ? "non-linear" : "linear"}`,
      ],
      trend: Array.from({ length: 12 }, (_, i) => ({
        t: iso(60 * (12 - i)), value: 14 + (session.coherenceScore < 60 ? Math.round(Math.sin(i / 2) * 8 + i * 1.5) : 0),
        baseline: 14,
      })),
    },
    {
      id: "sig-travel", kind: "Impossible Travel", label: "Impossible Travel",
      detected: high, severity: high ? "critical" : "low",
      confidence: 0.91, score: high ? 88 : 8, weight: 0.31,
      baseline: 14, current: high ? 8412 : 14, unit: "km", window: "since last login",
      description: high
        ? `Distance of 8412km covered in 4.2h exceeds any commercial travel capability.`
        : `Distance 14km from baseline — within normal commute radius.`,
      evidence: [
        `Distance: ${high ? "8412 km" : "14 km"}`,
        `Travel time: ${high ? "4.2h" : "96h"}`,
        `Velocity: ${high ? "2003 km/h" : "0.15 km/h"}`,
      ],
      trend: Array.from({ length: 12 }, (_, i) => ({
        t: iso(60 * 24 * (12 - i)), value: high ? (i > 8 ? 14 : 8412) : 14, baseline: 14,
      })),
    },
    {
      id: "sig-velocity", kind: "Velocity", label: "Velocity Spike",
      detected: session.velocityEvents > 10, severity: band(session.velocityEvents * 6),
      confidence: 0.88, score: Math.min(100, session.velocityEvents * 6), weight: 0.27,
      baseline: 4, current: session.velocityEvents, unit: "events/1h", window: "1h sliding",
      description: session.velocityEvents > 10
        ? `${session.velocityEvents} events in a 1h window exceed the baseline of 4 — bursty cadence.`
        : `${session.velocityEvents} events within the baseline range.`,
      evidence: [
        `Events: ${session.velocityEvents} / 1h`,
        `Baseline: 4 / 1h`,
        `Failed: ${session.failedAttempts}`,
      ],
      trend: Array.from({ length: 12 }, (_, i) => ({
        t: iso(5 * (12 - i)), value: session.velocityEvents > 10 ? Math.round(session.velocityEvents * (0.3 + i * 0.06)) : 4,
        baseline: 4,
      })),
    },
    {
      id: "sig-session", kind: "Session Progression", label: "Session Progression",
      detected: high, severity: high ? "high" : "low",
      confidence: 0.79, score: high ? 72 : 18, weight: 0.2,
      baseline: 0, current: high ? 7 : 1, unit: "stages", window: "pre-login → post-login",
      description: high
        ? "Risk-ordered sequence detected: reset → new device → VPN → location change → failures → login → transfer."
        : "Normal session progression without risk-ordered pattern.",
      evidence: [
        `Stages: ${high ? "7 sequential" : "1"}`,
        `Pattern: ${high ? "ATO signature" : "benign"}`,
        `Risk-ordered: ${high ? "true" : "false"}`,
      ],
      trend: Array.from({ length: 12 }, (_, i) => ({
        t: iso(10 * (12 - i)), value: high ? Math.min(7, i + 1) : 1, baseline: 1,
      })),
    },
  ];

  // Timeline series
  const timeline = Array.from({ length: 24 }, (_, h) => {
    const isPeak = h === 23 || h === 22;
    return {
      t: `${h.toString().padStart(2, "0")}:00`,
      risk: isPeak && high ? session.riskScore : Math.max(5, session.riskScore - 30 + Math.round(Math.sin(h / 3) * 12)),
      velocity: isPeak && high ? session.velocityEvents : Math.max(0, session.velocityEvents - 8 + Math.round(Math.cos(h / 4) * 5)),
      coherence: isPeak && high ? session.coherenceScore : Math.min(99, session.coherenceScore + 10 - Math.round(Math.sin(h / 5) * 8)),
    };
  });

  return {
    events, signals, timeline,
    stats: {
      eventCount: events.length, windowHours: 72,
      anomalies: signals.filter(s => s.detected).length,
      behaviorDrift: signals[0].score, impossibleTravel: signals[1].score,
      velocity: signals[2].score, sessionProgression: signals[3].score,
    },
  };
}
