export interface ValidationSession {
  customer_id: string;
  application: string;
  channel: string;
  device: string;
  device_type: string;
  browser: string;
  os: string;
  ip_address: string;
  country: string;
  city: string;
  latitude: number;
  longitude: number;
  isp: string;
  asn: string;
  device_age_days: number;
  password_reset: number;
  failed_login_count: number;
  historical_login_count: number;
  transaction_type: string;
  timestamp: string;
  session_duration: number;
  new_device: boolean;
  vpn: boolean;
  proxy: boolean;
  velocity_events: number;
  previous_country: string | null;
  previous_city: string | null;
  geo_distance_km: number;
  trusted_device: boolean;
  customer_risk_flag: boolean;
  previous_fraud: boolean;
  reject_type_code: string | null;
  rejected_transaction: boolean;
  transfer_amount: number;
  auth_method: string;
  mfa_used: boolean;
  session_id: string;
  [key: string]: any;
}

export interface ExtractedEntity {
  entity: string;
  value: string;
  confidence: number;
  source: string;
}

export interface DomainCandidate {
  domain: string;
  candidate_rules: number;
  keyword_hits: number;
}

export interface MatchedRule {
  rule_id: string;
  rule_name: string;
  description: string;
  parameters: string[];
  thresholds: string[];
  time_windows: string[];
  risk_level: string;
  primary_cluster: string;
  secondary_cluster: string | null;
  matched: boolean;
  confidence: number;
  matched_parameters: string[];
  reason: string;
  execution_time_ms: number;
}

export interface GeneratedSignal {
  signal_id: string;
  label: string;
  value: boolean;
  confidence: number;
  derived_rules: string[];
  keywords_matched: string[];
}

export interface GeneratedFeature {
  feature_name: string;
  domain: string;
  value: number;
  formula: string;
  signals_used: string[];
  rules_used: string[];
  weight: number;
  confidence: number;
}

export interface DomainScore {
  domain: string;
  score: number;
  feature: string;
  weight: number;
  active_signals: number;
  signal_ids: string[];
}

export interface CoherenceContribution {
  domain: string;
  score: number;
  weight: number;
  contribution: number;
  formula: string;
}

export interface CoherenceResult {
  coherence_score: number;
  contributions: CoherenceContribution[];
  formula: string;
}

export interface ReasonCode {
  code: string;
  description: string;
}

export interface DecisionResult {
  decision: "ALLOW" | "CHALLENGE" | "DENY";
  confidence: number;
  risk_level: string;
  coherence_score: number;
  reason_codes: ReasonCode[];
  top_contributors: { domain: string; score: number; weight: number }[];
  top_triggered_rules: { rule_id: string; rule_name: string }[];
  top_signals: { signal_id: string; label: string }[];
  top_features: { feature_name: string; value: number }[];
  decision_path: string[];
}

export interface TimelineEntry {
  stage: string;
  execution_time: string;
  duration_ms: number;
  status: string;
  detail: string;
  rules_executed: number;
  features_generated: number;
}

export interface PerformanceStats {
  execution_time_ms: number;
  rules_evaluated: number;
  rules_matched: number;
  signals_generated: number;
  features_generated: number;
  average_rule_time_ms: number;
  pipeline_duration_ms: number;
}

export interface ValidationResult {
  session_id: string;
  timestamp: string;
  raw_input: string;
  content_type: string;
  session: ValidationSession;
  entities: ExtractedEntity[];
  domain_candidates: DomainCandidate[];
  matched_rules: MatchedRule[];
  signals: GeneratedSignal[];
  features: GeneratedFeature[];
  domain_scores: DomainScore[];
  coherence: CoherenceResult;
  decision: DecisionResult;
  performance: PerformanceStats;
  timeline: TimelineEntry[];
  pipeline_stages: string[];
}

export interface HistoryEntry {
  session_id: string;
  timestamp: string;
  decision: "ALLOW" | "CHALLENGE" | "DENY";
  coherence_score: number;
  rules_matched: number;
  signals_generated: number;
  customer_id: string;
  execution_time_ms: number;
}

export interface SamplePayload {
  label: string;
  content_type: string;
  content: string;
}

async function jsonOrThrow(res: Response): Promise<any> {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

export const sessionValidationApi = {
  async run(rawInput: string, contentType: string = "json"): Promise<ValidationResult> {
    return jsonOrThrow(
      await fetch("/api/session-validation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_input: rawInput, content_type: contentType }),
      }),
    );
  },
  async getHistory(): Promise<HistoryEntry[]> {
    return jsonOrThrow(await fetch("/api/session-validation/history"));
  },
  async getSession(sessionId: string): Promise<ValidationResult> {
    return jsonOrThrow(await fetch(`/api/session-validation/${sessionId}`));
  },
  async getReport(sessionId: string): Promise<string> {
    const res = await fetch(`/api/session-validation/report/${sessionId}`);
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.text();
  },
  async getSamples(): Promise<{ label: string; content_type: string }[]> {
    return jsonOrThrow(await fetch("/api/session-validation/samples/list"));
  },
  async getSample(index: number): Promise<SamplePayload> {
    return jsonOrThrow(await fetch(`/api/session-validation/samples/${index}`));
  },
  async getRandomSession(): Promise<SamplePayload> {
    return jsonOrThrow(await fetch("/api/session-validation/random-session"));
  },
};
