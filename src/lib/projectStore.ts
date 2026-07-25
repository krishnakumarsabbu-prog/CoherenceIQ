import { pipelineStore, type PipelineDocument } from "./pipelineStore";
import { listDatasets, listModels, type Dataset, type TrainedModel } from "./datasetBuilderStore";

// ---------------------------------------------------------------------------
// Centralized project store — the single source of truth connecting
// Rules → Clusters → Features → Datasets → Models → Pipelines → Executions
// Everything is in-memory. No backend, no Supabase.
// ---------------------------------------------------------------------------

export type RuleSource = "markdown" | "text" | "json" | "xml" | "csv";
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type RuleStatus = "active" | "draft" | "deprecated";

export interface FraudRule {
  rule_id: string;
  rule_name: string;
  description: string;
  parameter_count: number;
  parameters: string[];
  keywords: string[];
  thresholds: string[];
  time_windows: string[];
  decision_words: string[];
  risk_level: RiskLevel;
  status: RuleStatus;
  primary_cluster: string;
  secondary_cluster: string | null;
  confidence: number;
  matched_keywords: string[];
  source_file: string;
  raw_text?: string;
}

export interface ClusterInfo {
  name: string;
  rule_count: number;
  avg_confidence: number;
  avg_parameters: number;
  keywords: string[];
  rule_ids: string[];
  color: string;
}

export interface EngineeredFeature {
  feature_name: string;
  domain: string;
  derived_rules: string[];
  derived_parameters: string[];
  weight: number;
  description: string;
  used_by: string[];
  importance: number;
  formula: string;
}

export interface RuleGraph {
  nodes: { id: string; type: "rule" | "cluster"; label: string; cluster?: string }[];
  edges: { id: string; source: string; target: string }[];
}

export interface RuleStats {
  total_rules: number;
  parsed_rules: number;
  suggested_domains: number;
  rule_quality: number;
  duplicate_rules: number;
  coverage: number;
  parameter_count: number;
  avg_complexity: number;
  risk_distribution: Record<RiskLevel, number>;
  cluster_distribution: Record<string, number>;
}

export interface ComparisonRecord {
  id: string;
  pipelineId: string;
  pipelineName: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  rocAuc: number;
  latency: number;
  memory: number;
  falsePositives: number;
  falseNegatives: number;
  fraudDetectionRate: number;
  rank: number;
}

// ---------------------------------------------------------------------------
// Domain catalogue
// ---------------------------------------------------------------------------

export const DOMAIN_CATALOGUE: { name: string; color: string; keywords: string[] }[] = [
  { name: "Device Intelligence", color: "#6366f1", keywords: ["device", "fingerprint", "browser", "user-agent", "hardware", "screen", "canvas", "webgl"] },
  { name: "Network Intelligence", color: "#f59e0b", keywords: ["ip", "network", "asn", "proxy", "vpn", "tor", "datacenter", "isp", "connection"] },
  { name: "Location Intelligence", color: "#14b8a6", keywords: ["geo", "location", "country", "city", "latitude", "longitude", "distance", "travel", "geolocation"] },
  { name: "Credential Intelligence", color: "#ec4899", keywords: ["credential", "password", "username", "login", "authentication", "breach", "compromised", "credential-stuffing"] },
  { name: "Behavior Intelligence", color: "#8b5cf6", keywords: ["behavior", "pattern", "anomaly", "coherence", "typing", "navigation", "session", "biometric"] },
  { name: "Customer Intelligence", color: "#0ea5e9", keywords: ["customer", "account", "profile", "kyc", "identity", "age", "tenure", "history"] },
  { name: "Transaction Intelligence", color: "#f97316", keywords: ["transaction", "amount", "transfer", "payment", "card", "merchant", "purchase"] },
  { name: "Temporal Intelligence", color: "#06b6d4", keywords: ["time", "velocity", "frequency", "window", "burst", "cadence", "temporal", "hour"] },
  { name: "Identity Intelligence", color: "#10b981", keywords: ["identity", "ssn", "document", "verification", "face", "biometric", "match", "synthetic"] },
  { name: "Policy Intelligence", color: "#ef4444", keywords: ["policy", "compliance", "regulation", "blocklist", "sanction", "aml", "kyc"] },
  { name: "Velocity Intelligence", color: "#d946ef", keywords: ["velocity", "rate", "limit", "threshold", "count", "attempt", "frequency"] },
  { name: "Graph Intelligence", color: "#84cc16", keywords: ["graph", "link", "ring", "cluster", "network", "connection", "entity", "relationship"] },
];

const DOMAIN_BY_NAME = new Map(DOMAIN_CATALOGUE.map((d) => [d.name, d]));

// ---------------------------------------------------------------------------
// Pub/sub
// ---------------------------------------------------------------------------

type Listener = () => void;
const listeners = new Set<Listener>();
function bump() { for (const l of listeners) l(); }

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let rules: FraudRule[] = [];
let clusterOverrides: Record<string, { name?: string; ruleIds?: string[]; deleted?: boolean }> = {};
let customClusters: { name: string; color: string; ruleIds: string[] }[] = [];
let features: EngineeredFeature[] = [];
let featureOverrides: Record<string, Partial<EngineeredFeature>> = {};
let comparisons: ComparisonRecord[] = [];

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`;
const now = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Rule parser — handles Markdown, Text, JSON, XML, CSV
// ---------------------------------------------------------------------------

const RISK_KEYWORDS: Record<RiskLevel, string[]> = {
  critical: ["block", "deny", "freeze", "critical", "severe", "mandatory"],
  high: ["high", "alert", "flag", "review", "escalate", "suspend"],
  medium: ["medium", "monitor", "challenge", "verify", "step-up"],
  low: ["low", "allow", "log", "observe", "informational"],
};

const DECISION_WORDS = ["allow", "challenge", "deny", "block", "review", "flag", "freeze", "suspend", "verify", "step-up"];

function classifyRisk(text: string): RiskLevel {
  const lower = text.toLowerCase();
  for (const level of ["critical", "high", "medium", "low"] as RiskLevel[]) {
    if (RISK_KEYWORDS[level].some((k) => lower.includes(k))) return level;
  }
  return "medium";
}

function extractThresholds(text: string): string[] {
  const matches = text.match(/[><=]+\s*[\d.]+|threshold\s*[:=]?\s*[\d.]+|>=?\s*\d+|<=?\s*\d+/gi);
  return matches ? [...new Set(matches.map((m) => m.trim()))] : [];
}

function extractTimeWindows(text: string): string[] {
  const matches = text.match(/\d+\s*(?:s|sec|second|m|min|minute|h|hr|hour|d|day|w|week)\b/gi);
  return matches ? [...new Set(matches.map((m) => m.trim()))] : [];
}

function extractParameters(text: string): string[] {
  const params = new Set<string>();
  // Look for parameter-like patterns: "if X > threshold", "when Y is", variable references
  const paramPatterns = [
    /\b(?:if|when|where)\s+(\w+)/gi,
    /\b(\w+)\s*[><=]/gi,
    /\b(\w+)\s+(?:is|equals|exceeds|below|above|greater|less)\b/gi,
  /\bcount\s*\(?\s*(\w+)/gi,
  /\b(\w+)_count\b/gi,
    /\b(\w+)_score\b/gi,
    /\b(\w+)_rate\b/gi,
  ];
  for (const p of paramPatterns) {
    let m;
    while ((m = p.exec(text)) !== null) {
      const word = m[1].toLowerCase();
      if (word.length > 2 && !["the", "and", "for", "not", "but", "any", "all", "this", "that"].includes(word)) {
        params.add(word);
      }
    }
  }
  return [...params].slice(0, 12);
}

function extractKeywords(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const domain of DOMAIN_CATALOGUE) {
    for (const kw of domain.keywords) {
      if (lower.includes(kw)) found.add(kw);
    }
  }
  return [...found];
}

function suggestCluster(keywords: string[], text: string): { primary: string; secondary: string | null } {
  const scores = new Map<string, number>();
  const lower = text.toLowerCase();
  for (const domain of DOMAIN_CATALOGUE) {
    let score = 0;
    for (const kw of domain.keywords) {
      if (lower.includes(kw)) score += 1;
    }
    if (score > 0) scores.set(domain.name, score);
  }
  // Also match by extracted keywords
  for (const kw of keywords) {
    for (const domain of DOMAIN_CATALOGUE) {
      if (domain.keywords.includes(kw)) {
        scores.set(domain.name, (scores.get(domain.name) ?? 0) + 1);
      }
    }
  }
  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  return {
    primary: sorted[0]?.[0] ?? "Policy Intelligence",
    secondary: sorted[1]?.[0] ?? null,
  };
}

function parseMarkdown(content: string, filename: string): FraudRule[] {
  const out: FraudRule[] = [];
  // Split by headings (## or ###) or numbered rules
  const sections = content.split(/^#{2,3}\s+/m).filter((s) => s.trim());
  if (sections.length <= 1) {
    // Try splitting by numbered list or "Rule:" markers
    const altSections = content.split(/^(?:\d+\.|Rule\s*:|RULE\s*:)\s+/m).filter((s) => s.trim());
    if (altSections.length > 1) {
      return altSections.map((s, i) => parseRuleBlock(s, filename, i));
    }
  }
  for (let i = 0; i < sections.length; i++) {
    const block = sections[i].trim();
    if (block.length < 10) continue;
    out.push(parseRuleBlock(block, filename, i));
  }
  return out;
}

function parseRuleBlock(block: string, filename: string, index: number): FraudRule {
  const lines = block.split("\n").filter((l) => l.trim());
  const ruleName = lines[0]?.replace(/^#+\s*/, "").replace(/^\d+\.\s*/, "").trim() || `Rule ${index + 1}`;
  const description = block.trim();
  const parameters = extractParameters(description);
  const keywords = extractKeywords(description);
  const thresholds = extractThresholds(description);
  const timeWindows = extractTimeWindows(description);
  const decisionWords = DECISION_WORDS.filter((d) => description.toLowerCase().includes(d));
  const riskLevel = classifyRisk(description);
  const clusters = suggestCluster(keywords, description);
  const matchedKeywords = keywords.slice(0, 6);

  return {
    rule_id: `R-${String(index + 1).padStart(4, "0")}`,
    rule_name: ruleName,
    description: description.slice(0, 500),
    parameter_count: parameters.length,
    parameters,
    keywords,
    thresholds,
    time_windows: timeWindows,
    decision_words: decisionWords,
    risk_level: riskLevel,
    status: "active",
    primary_cluster: clusters.primary,
    secondary_cluster: clusters.secondary,
    confidence: Math.min(0.98, 0.6 + keywords.length * 0.05 + parameters.length * 0.02),
    matched_keywords: matchedKeywords,
    source_file: filename,
    raw_text: block,
  };
}

function parsePlainText(content: string, filename: string): FraudRule[] {
  // Split by blank lines or numbered rules
  const blocks = content.split(/\n\s*\n/).filter((b) => b.trim().length > 15);
  if (blocks.length <= 1) {
    const numbered = content.split(/^\d+\.\s+/m).filter((b) => b.trim().length > 15);
    if (numbered.length > 1) return numbered.map((b, i) => parseRuleBlock(b, filename, i));
  }
  return blocks.map((b, i) => parseRuleBlock(b, filename, i));
}

function parseJson(content: string, filename: string): FraudRule[] {
  try {
    const data = JSON.parse(content);
    const arr = Array.isArray(data) ? data : data.rules ?? data.items ?? [];
    return arr.map((item: any, i: number) => {
      const text = item.description ?? item.text ?? item.rule ?? JSON.stringify(item);
      const keywords = extractKeywords(text);
      const parameters = item.parameters ?? extractParameters(text);
      const clusters = suggestCluster(keywords, text);
      return {
        rule_id: item.rule_id ?? item.id ?? `R-${String(i + 1).padStart(4, "0")}`,
        rule_name: item.rule_name ?? item.name ?? item.title ?? `Rule ${i + 1}`,
        description: text.slice(0, 500),
        parameter_count: parameters.length,
        parameters,
        keywords,
        thresholds: item.thresholds ?? extractThresholds(text),
        time_windows: item.time_windows ?? extractTimeWindows(text),
        decision_words: DECISION_WORDS.filter((d) => text.toLowerCase().includes(d)),
        risk_level: (item.risk_level as RiskLevel) ?? classifyRisk(text),
        status: (item.status as RuleStatus) ?? "active",
        primary_cluster: item.primary_cluster ?? clusters.primary,
        secondary_cluster: item.secondary_cluster ?? clusters.secondary,
        confidence: item.confidence ?? Math.min(0.98, 0.6 + keywords.length * 0.05),
        matched_keywords: keywords.slice(0, 6),
        source_file: filename,
        raw_text: text,
      } as FraudRule;
    });
  } catch {
    return parsePlainText(content, filename);
  }
}

function parseXml(content: string, filename: string): FraudRule[] {
  const out: FraudRule[] = [];
  const ruleMatches = content.match(/<rule[\s\S]*?<\/rule>/gi) ?? [];
  if (ruleMatches.length === 0) {
    return parsePlainText(content, filename);
  }
  ruleMatches.forEach((block, i) => {
    const name = block.match(/<name>([\s\S]*?)<\/name>/i)?.[1]?.trim() ?? `Rule ${i + 1}`;
    const desc = block.match(/<description>([\s\S]*?)<\/description>/i)?.[1]?.trim() ?? block;
    const text = `${name}. ${desc}`;
    const keywords = extractKeywords(text);
    const parameters = extractParameters(text);
    const clusters = suggestCluster(keywords, text);
    out.push({
      rule_id: block.match(/id="([^"]+)"/i)?.[1] ?? `R-${String(i + 1).padStart(4, "0")}`,
      rule_name: name,
      description: desc.slice(0, 500),
      parameter_count: parameters.length,
      parameters,
      keywords,
      thresholds: extractThresholds(text),
      time_windows: extractTimeWindows(text),
      decision_words: DECISION_WORDS.filter((d) => text.toLowerCase().includes(d)),
      risk_level: classifyRisk(text),
      status: "active",
      primary_cluster: clusters.primary,
      secondary_cluster: clusters.secondary,
      confidence: Math.min(0.98, 0.6 + keywords.length * 0.05),
      matched_keywords: keywords.slice(0, 6),
      source_file: filename,
      raw_text: block,
    });
  });
  return out;
}

function parseCsv(content: string, filename: string): FraudRule[] {
  const lines = content.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
  const out: FraudRule[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, j) => { row[h] = (cols[j] ?? "").trim(); });
    const text = row.description ?? row.rule ?? row.text ?? row.name ?? Object.values(row).join(" ");
    if (text.trim().length < 5) continue;
    const keywords = extractKeywords(text);
    const parameters = extractParameters(text);
    const clusters = suggestCluster(keywords, text);
    out.push({
      rule_id: row.rule_id ?? row.id ?? `R-${String(i).padStart(4, "0")}`,
      rule_name: row.rule_name ?? row.name ?? row.title ?? `Rule ${i}`,
      description: text.slice(0, 500),
      parameter_count: parameters.length,
      parameters,
      keywords,
      thresholds: extractThresholds(text),
      time_windows: extractTimeWindows(text),
      decision_words: DECISION_WORDS.filter((d) => text.toLowerCase().includes(d)),
      risk_level: (row.risk_level as RiskLevel) ?? classifyRisk(text),
      status: (row.status as RuleStatus) ?? "active",
      primary_cluster: row.primary_cluster ?? clusters.primary,
      secondary_cluster: row.secondary_cluster ?? clusters.secondary,
      confidence: row.confidence ? parseFloat(row.confidence) : Math.min(0.98, 0.6 + keywords.length * 0.05),
      matched_keywords: keywords.slice(0, 6),
      source_file: filename,
    });
  }
  return out;
}

function parseCsvLine(line: string): string[] {
  const cols: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQuotes = !inQuotes; continue; }
    if (c === "," && !inQuotes) { cols.push(cur); cur = ""; continue; }
    cur += c;
  }
  cols.push(cur);
  return cols;
}

export function parseRules(content: string, filename: string, source: RuleSource): FraudRule[] {
  switch (source) {
    case "json": return parseJson(content, filename);
    case "xml": return parseXml(content, filename);
    case "csv": return parseCsv(content, filename);
    case "markdown": return parseMarkdown(content, filename);
    case "text": return parsePlainText(content, filename);
  }
}

export function detectSource(filename: string): RuleSource {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "json") return "json";
  if (ext === "xml") return "xml";
  if (ext === "csv") return "csv";
  if (ext === "md" || ext === "markdown") return "markdown";
  return "text";
}

// ---------------------------------------------------------------------------
// Cluster derivation
// ---------------------------------------------------------------------------

export function deriveClusters(rs: FraudRule[]): ClusterInfo[] {
  const map = new Map<string, FraudRule[]>();
  for (const r of rs) {
    const key = r.primary_cluster;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  const clusters: ClusterInfo[] = [];
  for (const [name, rs2] of map) {
    const domain = DOMAIN_BY_NAME.get(name);
    clusters.push({
      name,
      rule_count: rs2.length,
      avg_confidence: rs2.reduce((a, r) => a + r.confidence, 0) / rs2.length,
      avg_parameters: rs2.reduce((a, r) => a + r.parameter_count, 0) / rs2.length,
      keywords: [...new Set(rs2.flatMap((r) => r.keywords))].slice(0, 10),
      rule_ids: rs2.map((r) => r.rule_id),
      color: domain?.color ?? "#64748b",
    });
  }
  return clusters.sort((a, b) => b.rule_count - a.rule_count);
}

// ---------------------------------------------------------------------------
// Feature derivation from clusters
// ---------------------------------------------------------------------------

const FEATURE_TEMPLATES: Record<string, { name: string; formula: string; desc: string }[]> = {
  "Device Intelligence": [
    { name: "DeviceTrustScore", formula: "weighted(device_age, fingerprint_match, known_device)", desc: "Composite trust score for the device fingerprint and history." },
    { name: "DeviceAnomalyScore", formula: "1 - fingerprint_match_rate", desc: "Anomaly score based on device fingerprint deviation from baseline." },
  ],
  "Network Intelligence": [
    { name: "IPRiskScore", formula: "weighted(asn_reputation, datacenter_flag, proxy_flag)", desc: "Risk score for the originating IP address and network context." },
    { name: "NetworkTrustScore", formula: "1 - proxy_vpn_datacenter_penalty", desc: "Trust score for the network connection quality." },
  ],
  "Location Intelligence": [
    { name: "LocationCoherenceScore", formula: "1 - impossible_travel_penalty", desc: "Coherence of the login location with historical patterns." },
    { name: "TravelRiskScore", formula: "geo_velocity / max_speed", desc: "Risk score based on impossible travel detection." },
  ],
  "Credential Intelligence": [
    { name: "CredentialHealthScore", formula: "1 - breach_compromised_penalty", desc: "Health of credentials against breach databases." },
    { name: "CredentialStuffingScore", formula: "failed_attempts * new_device_flag", desc: "Score for credential stuffing attack patterns." },
  ],
  "Behavior Intelligence": [
    { name: "BehaviorConsistencyScore", formula: "1 - behavioral_deviation", desc: "Consistency of session behavior with user baseline." },
    { name: "BehaviorAnomalyScore", formula: "coherence_deviation_from_baseline", desc: "Anomaly score for behavioral biometric patterns." },
  ],
  "Customer Intelligence": [
    { name: "CustomerTrustScore", formula: "weighted(tenure, kyc_status, history)", desc: "Trust score based on customer profile and history." },
    { name: "AccountRiskScore", formula: "weighted(account_age, privilege_level, recent_changes)", desc: "Risk score for the customer account profile." },
  ],
  "Transaction Intelligence": [
    { name: "TransactionRiskScore", formula: "weighted(amount, merchant_risk, frequency)", desc: "Risk score for transaction amount and context." },
  ],
  "Temporal Intelligence": [
    { name: "TemporalRiskScore", formula: "off_hours_flag + cadence_deviation", desc: "Risk score based on temporal patterns and timing." },
  ],
  "Identity Intelligence": [
    { name: "IdentityConfidenceScore", formula: "weighted(id_verification, biometric_match, synthetic_check)", desc: "Confidence in the claimed identity." },
  ],
  "Policy Intelligence": [
    { name: "PolicyComplianceScore", formula: "sanction_screen + aml_check + kyc_status", desc: "Compliance score against regulatory policies." },
  ],
  "Velocity Intelligence": [
    { name: "VelocityScore", formula: "event_count / time_window", desc: "Velocity of events within time windows." },
  ],
  "Graph Intelligence": [
    { name: "GraphRiskScore", formula: "weighted(entity_degree, ring_membership, path_to_bad)", desc: "Risk score from entity relationship graph analysis." },
  ],
};

export function deriveFeatures(clusters: ClusterInfo[], rs: FraudRule[]): EngineeredFeature[] {
  const out: EngineeredFeature[] = [];
  for (const cluster of clusters) {
    const templates = FEATURE_TEMPLATES[cluster.name] ?? [];
    const clusterRules = rs.filter((r) => cluster.rule_ids.includes(r.rule_id));
    const params = [...new Set(clusterRules.flatMap((r) => r.parameters))].slice(0, 8);
    for (const t of templates) {
      out.push({
        feature_name: t.name,
        domain: cluster.name,
        derived_rules: cluster.rule_ids.slice(0, 5),
        derived_parameters: params,
        weight: cluster.rule_count / Math.max(1, rs.length),
        description: t.desc,
        used_by: [],
        importance: Math.min(1, cluster.avg_confidence * (cluster.rule_count / 10)),
        formula: t.formula,
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export function computeStats(rs: FraudRule[], clusters: ClusterInfo[]): RuleStats {
  const riskDist: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const r of rs) riskDist[r.risk_level]++;
  const clusterDist: Record<string, number> = {};
  for (const c of clusters) clusterDist[c.name] = c.rule_count;
  const totalParams = rs.reduce((a, r) => a + r.parameter_count, 0);
  const duplicates = rs.length - new Set(rs.map((r) => r.rule_name.toLowerCase())).size;
  return {
    total_rules: rs.length,
    parsed_rules: rs.filter((r) => r.parameters.length > 0 || r.keywords.length > 0).length,
    suggested_domains: clusters.length,
    rule_quality: rs.length > 0 ? rs.reduce((a, r) => a + r.confidence, 0) / rs.length : 0,
    duplicate_rules: duplicates,
    coverage: rs.length > 0 ? rs.filter((r) => r.keywords.length > 0).length / rs.length : 0,
    parameter_count: totalParams,
    avg_complexity: rs.length > 0 ? totalParams / rs.length : 0,
    risk_distribution: riskDist,
    cluster_distribution: clusterDist,
  };
}

// ---------------------------------------------------------------------------
// Graph
// ---------------------------------------------------------------------------

export function buildRuleGraph(rs: FraudRule[], clusters: ClusterInfo[]): RuleGraph {
  const nodes: RuleGraph["nodes"] = [];
  const edges: RuleGraph["edges"] = [];
  for (const c of clusters) {
    nodes.push({ id: `cluster-${c.name}`, type: "cluster", label: c.name, cluster: c.name });
  }
  for (const r of rs.slice(0, 50)) {
    nodes.push({ id: r.rule_id, type: "rule", label: r.rule_name, cluster: r.primary_cluster });
    edges.push({ id: `e-${r.rule_id}`, source: `cluster-${r.primary_cluster}`, target: r.rule_id });
  }
  return { nodes, edges };
}

// ---------------------------------------------------------------------------
// Sample fraud rules — realistic banking fraud detection rules
// ---------------------------------------------------------------------------

const SAMPLE_RULES_TEXT = `# Fraud Detection Rule Set — Global Bank v3

## Impossible Travel Detection
If the login location distance from the previous login exceeds 800 km/h travel velocity, flag as impossible travel. Deny the session and require step-up authentication. The geo velocity threshold is 800 km/h based on haversine distance between consecutive login coordinates within a 2h time window.

## New Device Credential Stuffing
When a new device fingerprint is detected and failed login attempts exceed 3 within a 5m time window, block the session immediately. This indicates credential stuffing from an unknown device. The device fingerprint must not match any previously seen fingerprint for this account.

## VPN Proxy Datacenter Login
If the IP address is flagged as VPN, proxy, or datacenter ASN and the login occurs from a new country within 1h, challenge the user with MFA. The ASN reputation score must be above 0.7 for the connection to be allowed. Block if the ASN is on the known bad actor list.

## Velocity Burst Attack
When velocity events exceed 10 login attempts within a 1h time window from the same IP address, deny the session and freeze the account for 24h. The velocity threshold is 10 events per hour. Flag for review if the velocity exceeds 5 events per hour.

## Off-Hours High-Risk Login
If the login occurs between 02:00 and 06:00 local time and the risk score exceeds 70, challenge the user with step-up authentication. The off-hours window is defined as 02:00-06:00 local time. Deny if the risk score exceeds 85 during off-hours.

## Device Fingerprint Mismatch
When the device fingerprint hash does not match the stored fingerprint for a known device, flag as device fingerprint mismatch. The fingerprint mismatch threshold is 0.3 similarity score. Block the session if the mismatch exceeds 0.5 similarity score.

## Account Takeover via Session Hijacking
If the session token is used from a new IP address and a new device within 15m of the previous session, deny the session. This indicates potential session hijacking. The session token reuse window is 15m. Flag for investigation if the IP changed but device remained the same.

## Synthetic Identity Detection
When the identity confidence score is below 0.5 and the account was created within 7d, flag as synthetic identity. The identity verification threshold is 0.5 confidence score. Block the account if the synthetic identity score exceeds 0.8.

## Graph Ring Detection
If the device or IP is linked to more than 5 accounts in the entity relationship graph and 2 or more of those accounts are flagged, deny the session. The graph ring detection threshold is 5 linked accounts. The entity degree threshold is 5 connections.

## Behavioral Biometric Anomaly
When the behavioral coherence score drops below 40 and the typing pattern deviates more than 2 standard deviations from the user baseline, challenge the user. The behavioral anomaly threshold is 40 coherence score. The typing deviation threshold is 2 standard deviations.

## Credential Breach Exposure
If the username appears in a known credential breach database and the password has not been changed within 30d, force password reset. The breach exposure threshold is 30d since last password change. Deny login until password is reset.

## High-Value Transaction Anomaly
When a transaction amount exceeds 10000 and the customer has no history of transactions above 5000 within 90d, challenge with step-up authentication. The high-value threshold is 10000. The historical baseline window is 90d.

## MFA Bypass Attempt
If the user attempts to bypass MFA more than 2 times within a 1h time window, deny the session and freeze the account. The MFA bypass threshold is 2 attempts per hour. Flag for review if the bypass attempts exceed 1.

## Geographic Anomaly via ASN
When the ASN country does not match the login country and the ASN reputation is below 0.5, flag as geographic anomaly. The ASN reputation threshold is 0.5. Deny if the ASN country mismatch occurs with a new device.

## Policy Compliance Block
If the customer is on the sanctions blocklist or the AML risk score exceeds 0.8, block the transaction immediately. The AML threshold is 0.8 risk score. The sanction screening is mandatory for all transactions above 5000.

## Repeated Failed Authentication
When failed authentication attempts exceed 5 within a 30m time window from any source, freeze the account for 1h. The failed authentication threshold is 5 attempts per 30m. Flag for review if the attempts exceed 3.

## Unusual Channel Switch
If the login channel switches from web to mobile or API within 5m and the device is new, challenge the user. The channel switch window is 5m. Deny if the channel switch occurs from a flagged IP address.

## Temporal Cadence Deviation
When the login cadence deviates more than 3 standard deviations from the user 30d baseline, flag as temporal anomaly. The cadence deviation threshold is 3 standard deviations. The baseline window is 30d.

## IP Geolocation Mismatch
If the IP geolocation country does not match the account profile country and the login is from a new device, deny the session. The geolocation mismatch threshold is country-level. Challenge if the mismatch occurs with a known device.

## Account Age Risk Factor
When the account age is less than 7d and the transaction amount exceeds 2000, challenge with MFA. The account age threshold is 7d. The transaction amount threshold is 2000 for new accounts.

## Known Bad Device Block
If the device fingerprint matches a device on the known bad device blocklist, deny the session immediately. The device blocklist is maintained by the fraud operations team. Flag for investigation if the device is on the watchlist.

## Velocity Limit per Customer
When the customer exceeds 20 transactions within a 1h time window, flag for review. The velocity limit threshold is 20 transactions per hour. Deny if the velocity exceeds 50 transactions per hour.

## Session Duration Anomaly
If the session duration is less than 3s and the login is from a new device, flag as bot behavior. The session duration threshold is 3s. Block if the session duration is less than 1s with a new device.

## Cross-Device Account Access
When the same account is accessed from more than 3 unique devices within a 24h time window, challenge the user. The cross-device threshold is 3 unique devices per 24h. Flag for review if the devices exceed 2.

## API Key Abuse Detection
If the API key is used from more than 10 unique IP addresses within a 1h time window, revoke the API key. The API abuse threshold is 10 unique IPs per hour. Flag if the IP count exceeds 5.`;

// ---------------------------------------------------------------------------
// Store API
// ---------------------------------------------------------------------------

export const projectStore = {
  subscribe(l: Listener) { listeners.add(l); return () => listeners.delete(l); },

  // Rules
  getRules(): FraudRule[] { return rules; },
  getRule(id: string): FraudRule | undefined { return rules.find((r) => r.rule_id === id); },

  addRules(newRules: FraudRule[]) {
    rules = [...rules, ...newRules];
    this.recompute();
    bump();
  },

  uploadText(filename: string, content: string): { added: number; total: number } {
    const source = detectSource(filename);
    const parsed = parseRules(content, filename, source);
    rules = [...rules, ...parsed];
    this.recompute();
    bump();
    return { added: parsed.length, total: rules.length };
  },

  uploadFiles(files: { name: string; content: string }[]): { added: number; total: number } {
    let added = 0;
    for (const f of files) {
      const source = detectSource(f.name);
      const parsed = parseRules(f.content, f.name, source);
      rules = [...rules, ...parsed];
      added += parsed.length;
    }
    this.recompute();
    bump();
    return { added, total: rules.length };
  },

  clearRules() {
    rules = [];
    clusterOverrides = {};
    customClusters = [];
    features = [];
    featureOverrides = {};
    bump();
  },

  seedSampleRules() {
    if (rules.length > 0) return;
    const parsed = parseRules(SAMPLE_RULES_TEXT, "sample-fraud-rules-v3.md", "markdown");
    rules = parsed;
    this.recompute();
    bump();
  },

  // Clusters
  getClusters(): ClusterInfo[] {
    const base = deriveClusters(rules);
    // Apply overrides
    return base.filter((c) => !clusterOverrides[c.name]?.deleted).map((c) => {
      const ov = clusterOverrides[c.name];
      if (ov?.name) return { ...c, name: ov.name };
      if (ov?.ruleIds) return { ...c, rule_ids: ov.ruleIds, rule_count: ov.ruleIds.length };
      return c;
    }).concat(customClusters.map((c): ClusterInfo => ({
      name: c.name,
      color: c.color,
      rule_count: c.ruleIds.length,
      rule_ids: c.ruleIds,
      avg_confidence: 0.75,
      avg_parameters: 3,
      keywords: [],
    })));
  },

  renameCluster(oldName: string, newName: string) {
    clusterOverrides[oldName] = { ...clusterOverrides[oldName], name: newName };
    // Update rules
    rules = rules.map((r) => r.primary_cluster === oldName ? { ...r, primary_cluster: newName } : r);
    bump();
  },

  deleteCluster(name: string) {
    clusterOverrides[name] = { ...clusterOverrides[name], deleted: true };
    bump();
  },

  createCluster(name: string, color: string = "#64748b", ruleIds: string[] = []) {
    customClusters.push({ name, color, ruleIds });
    bump();
  },

  moveRuleToCluster(ruleId: string, targetCluster: string) {
    rules = rules.map((r) => r.rule_id === ruleId ? { ...r, primary_cluster: targetCluster } : r);
    this.recompute();
    bump();
  },

  mergeClusters(nameA: string, nameB: string, newName: string) {
    rules = rules.map((r) => {
      if (r.primary_cluster === nameA || r.primary_cluster === nameB) {
        return { ...r, primary_cluster: newName };
      }
      return r;
    });
    clusterOverrides[nameA] = { deleted: true };
    clusterOverrides[nameB] = { deleted: true };
    this.recompute();
    bump();
  },

  splitCluster(name: string, newClusterName: string, ruleIds: string[]) {
    customClusters.push({ name: newClusterName, color: "#64748b", ruleIds });
    rules = rules.map((r) => ruleIds.includes(r.rule_id) ? { ...r, primary_cluster: newClusterName } : r);
    this.recompute();
    bump();
  },

  // Features
  getFeatures(): EngineeredFeature[] {
    return features.map((f) => {
      const ov = featureOverrides[f.feature_name];
      return ov ? { ...f, ...ov } : f;
    });
  },

  updateFeature(name: string, patch: Partial<EngineeredFeature>) {
    featureOverrides[name] = { ...featureOverrides[name], ...patch };
    bump();
  },

  createFeature(f: EngineeredFeature) {
    features.push(f);
    bump();
  },

  deleteFeature(name: string) {
    features = features.filter((f) => f.feature_name !== name);
    bump();
  },

  // Stats
  getStats(): RuleStats {
    return computeStats(rules, this.getClusters());
  },

  // Graph
  getGraph(): RuleGraph {
    return buildRuleGraph(rules, this.getClusters());
  },

  // Recompute derived data
  recompute() {
    const clusters = deriveClusters(rules);
    features = deriveFeatures(clusters, rules);
  },

  // Comparisons
  getComparisons(): ComparisonRecord[] { return comparisons; },
  addComparison(c: ComparisonRecord) { comparisons.push(c); bump(); },
  clearComparisons() { comparisons = []; bump(); },

  // Connected data — bridges to other stores
  getDatasets(): Dataset[] { return listDatasets(); },
  getModels(): TrainedModel[] { return listModels(); },
  getPipelines(): PipelineDocument[] { return pipelineStore.list(); },
  getPipeline(id: string): PipelineDocument | undefined { return pipelineStore.get(id); },

  // Flow status — which stages have data
  getFlowStatus() {
    return {
      rules: rules.length,
      clusters: this.getClusters().length,
      features: features.length,
      datasets: listDatasets().length,
      models: listModels().length,
      pipelines: pipelineStore.list().length,
      executions: 0,
      comparisons: comparisons.length,
    };
  },
};

// Seed on module load
projectStore.seedSampleRules();
