// Rule Studio domain types and in-memory mock data (no backend).

export type LogicalOp = "AND" | "OR";
export type ConditionOp =
  | "equals" | "not_equals" | "greater_than" | "less_than"
  | "greater_or_equal" | "less_or_equal" | "in" | "not_in"
  | "contains" | "matches" | "is_true" | "is_false";

export type ActionKind = "Risk Increase" | "Risk Reduction" | "Challenge" | "Allow" | "Block";
export type RuleStatus = "Draft" | "In Review" | "Approved" | "Published" | "Archived" | "Rejected";
export type RiskTier = "Low" | "Medium" | "High" | "Critical";

export interface ConditionNode {
  id: string;
  variable: string;
  op: ConditionOp;
  value: string;
  plugin?: string;
}

export interface GroupNode {
  id: string;
  op: LogicalOp;
  negated: boolean;
  children: TreeNode[];
}

export type TreeNode = ConditionNode | GroupNode;

export interface RuleAction {
  id: string;
  kind: ActionKind;
  amount?: number;
  reason: string;
}

export interface RuleVersion {
  version: number;
  author: string;
  date: string;
  change: string;
  status: RuleStatus;
}

export interface RuleApproval {
  id: string;
  step: string;
  approver: string;
  role: string;
  status: "Pending" | "Approved" | "Rejected" | "Skipped";
  date: string | null;
  comment: string;
}

export interface RiskRule {
  id: string;
  name: string;
  description: string;
  status: RuleStatus;
  tier: RiskTier;
  channel: string;
  owner: string;
  updated: string;
  version: number;
  root: GroupNode;
  actions: RuleAction[];
  versions: RuleVersion[];
  approvals: RuleApproval[];
  simulation: { passed: number; failed: number; flagged: number; samples: number };
  tags: string[];
}

export interface Plugin {
  id: string;
  name: string;
  category: string;
  provider: string;
  version: string;
  status: "Enabled" | "Disabled" | "Degraded" | "Maintenance";
  health: "Healthy" | "Degraded" | "Down";
  latency: number;
  uptime: number;
  owner: string;
  description: string;
  calls24h: number;
  hitRate: number;
  lastLog: string;
  installed: string;
}

export interface PluginLogEntry {
  ts: string;
  level: "INFO" | "WARN" | "ERROR";
  message: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "Active" | "Suspended" | "Invited";
  lastLogin: string;
  mfa: boolean;
  team: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  members: number;
  permissions: number;
  system: boolean;
}

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  enabled: boolean;
  environment: "Production" | "Staging" | "Development";
  owner: string;
  updated: string;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  created: string;
  lastUsed: string;
  owner: string;
  status: "Active" | "Revoked";
}

export interface Secret {
  id: string;
  name: string;
  type: string;
  updated: string;
  rotatedIn: string;
  owner: string;
}

export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  target: string;
  ip: string;
  ts: string;
  result: "Success" | "Failure";
}

export interface VariableDef {
  key: string;
  label: string;
  type: "number" | "string" | "boolean" | "enum" | "geo" | "time";
  plugin: string;
  unit?: string;
  example?: string;
  enumValues?: string[];
}

export const uid = (p = "n") => `${p}-${Math.random().toString(36).slice(2, 9)}`;

export const VARIABLES: VariableDef[] = [
  { key: "session.riskScore", label: "Risk Score", type: "number", plugin: "Coherence Brain", unit: "0-100", example: "62" },
  { key: "session.coherenceScore", label: "Coherence Score", type: "number", plugin: "Coherence Brain", unit: "0-100", example: "48" },
  { key: "session.fraudProbability", label: "Fraud Probability", type: "number", plugin: "ML Plugin", unit: "%", example: "71" },
  { key: "device.isNew", label: "New Device", type: "boolean", plugin: "Device Plugin", example: "true" },
  { key: "device.fingerprint", label: "Device Fingerprint", type: "string", plugin: "Device Plugin", example: "a1b2c3…" },
  { key: "device.emulator", label: "Emulator Detected", type: "boolean", plugin: "Device Plugin", example: "false" },
  { key: "geo.country", label: "Country", type: "geo", plugin: "Geo Plugin", enumValues: ["US", "GB", "DE", "SG", "JP", "IN", "BR", "NG", "AE"], example: "NG" },
  { key: "geo.distanceKm", label: "Geo Distance", type: "number", plugin: "Geo Plugin", unit: "km", example: "8420" },
  { key: "geo.impossibleTravel", label: "Impossible Travel", type: "boolean", plugin: "Geo Plugin", example: "true" },
  { key: "velocity.events5m", label: "Events (5m)", type: "number", plugin: "Velocity Plugin", unit: "count", example: "14" },
  { key: "velocity.failedAttempts", label: "Failed Attempts", type: "number", plugin: "Velocity Plugin", unit: "count", example: "6" },
  { key: "velocity.ipCount1h", label: "Distinct IPs (1h)", type: "number", plugin: "Velocity Plugin", unit: "count", example: "9" },
  { key: "behavior.typingRhythm", label: "Typing Rhythm Score", type: "number", plugin: "Behavior Plugin", unit: "0-100", example: "31" },
  { key: "behavior.mouseAnomaly", label: "Mouse Anomaly", type: "number", plugin: "Behavior Plugin", unit: "0-100", example: "77" },
  { key: "graph.ringMember", label: "Fraud Ring Member", type: "boolean", plugin: "Graph Plugin", example: "true" },
  { key: "graph.sharedDeviceUsers", label: "Shared Device Users", type: "number", plugin: "Graph Plugin", unit: "count", example: "5" },
  { key: "threat.ipReputation", label: "IP Reputation", type: "enum", plugin: "Threat Intelligence Plugin", enumValues: ["clean", "suspicious", "malicious", "proxy", "tor"], example: "malicious" },
  { key: "threat.asnRisk", label: "ASN Risk Score", type: "number", plugin: "Threat Intelligence Plugin", unit: "0-100", example: "88" },
  { key: "policy.allowlistCountry", label: "Allowlisted Country", type: "boolean", plugin: "Policy Plugin", example: "true" },
  { key: "session.vpn", label: "VPN / Proxy", type: "boolean", plugin: "Geo Plugin", example: "true" },
  { key: "session.hourOfDay", label: "Hour of Day", type: "number", plugin: "Coherence Brain", unit: "0-23", example: "3" },
  { key: "session.mfaUsed", label: "MFA Used", type: "boolean", plugin: "Policy Plugin", example: "false" },
];

export const OPERATORS: { value: ConditionOp; label: string; symbol: string }[] = [
  { value: "equals", label: "equals", symbol: "==" },
  { value: "not_equals", label: "not equals", symbol: "!=" },
  { value: "greater_than", label: "greater than", symbol: ">" },
  { value: "less_than", label: "less than", symbol: "<" },
  { value: "greater_or_equal", label: "≥", symbol: ">=" },
  { value: "less_or_equal", label: "≤", symbol: "<=" },
  { value: "in", label: "in", symbol: "∈" },
  { value: "not_in", label: "not in", symbol: "∉" },
  { value: "contains", label: "contains", symbol: "⊃" },
  { value: "matches", label: "matches regex", symbol: "=~" },
  { value: "is_true", label: "is true", symbol: "⊤" },
  { value: "is_false", label: "is false", symbol: "⊥" },
];

export const ACTIONS: { kind: ActionKind; desc: string; color: string }[] = [
  { kind: "Risk Increase", desc: "Add to session risk score", color: "warning" },
  { kind: "Risk Reduction", desc: "Subtract from session risk score", color: "primary" },
  { kind: "Challenge", desc: "Force step-up authentication", color: "warning" },
  { kind: "Allow", desc: "Permit the session", color: "success" },
  { kind: "Block", desc: "Deny the session immediately", color: "destructive" },
];

function grp(op: LogicalOp, children: TreeNode[], negated = false): GroupNode {
  return { id: uid("g"), op, negated, children };
}
function cond(variable: string, op: ConditionOp, value: string, plugin?: string): ConditionNode {
  return { id: uid("c"), variable, op, value, plugin };
}
function act(kind: ActionKind, amount?: number, reason = ""): RuleAction {
  return { id: uid("a"), kind, amount, reason };
}

export const SEED_RULES: RiskRule[] = [
  {
    id: "R-117",
    name: "Impossible Travel Velocity",
    description: "Block sessions crossing >8000km in under 2h with a new device.",
    status: "Published",
    tier: "Critical",
    channel: "All",
    owner: "Maya Chen",
    updated: "2026-07-18T14:22:00Z",
    version: 7,
    tags: ["geo", "velocity", "takeover"],
    root: grp("AND", [
      cond("geo.impossibleTravel", "is_true", "true", "Geo Plugin"),
      grp("OR", [
        cond("device.isNew", "is_true", "true", "Device Plugin"),
        cond("device.emulator", "is_true", "true", "Device Plugin"),
      ]),
      cond("session.mfaUsed", "is_false", "false", "Policy Plugin"),
    ]),
    actions: [
      act("Risk Increase", 35, "Impossible travel + new device"),
      act("Block", undefined, "Block — critical takeover signal"),
    ],
    versions: [
      { version: 7, author: "Maya Chen", date: "2026-07-18", change: "Tightened MFA predicate", status: "Published" },
      { version: 6, author: "James Okafor", date: "2026-07-02", change: "Raised distance threshold to 8000km", status: "Archived" },
      { version: 5, author: "Maya Chen", date: "2026-06-10", change: "Added emulator branch", status: "Archived" },
    ],
    approvals: [
      { id: "ap1", step: "Author Review", approver: "Maya Chen", role: "Rule Author", status: "Approved", date: "2026-07-17", comment: "Ready for review" },
      { id: "ap2", step: "Risk Officer", approver: "Eleanor Voss", role: "Risk Officer", status: "Approved", date: "2026-07-18", comment: "Approved — aligns with takeover policy" },
      { id: "ap3", step: "Compliance Sign-off", approver: "Hiroshi Tanaka", role: "Compliance Lead", status: "Approved", date: "2026-07-18", comment: "Compliant" },
    ],
    simulation: { passed: 18420, failed: 142, flagged: 318, samples: 18880 },
  },
  {
    id: "R-203",
    name: "New Device from High-Risk ASN",
    description: "Challenge new-device logins originating from malicious ASNs.",
    status: "Published",
    tier: "High",
    channel: "Web",
    owner: "James Okafor",
    updated: "2026-07-15T09:10:00Z",
    version: 4,
    tags: ["device", "threat"],
    root: grp("AND", [
      cond("device.isNew", "is_true", "true", "Device Plugin"),
      cond("threat.ipReputation", "in", "malicious,proxy,tor", "Threat Intelligence Plugin"),
    ]),
    actions: [
      act("Risk Increase", 20, "New device + bad reputation"),
      act("Challenge", undefined, "Step-up required"),
    ],
    versions: [
      { version: 4, author: "James Okafor", date: "2026-07-15", change: "Added proxy to reputation set", status: "Published" },
      { version: 3, author: "James Okafor", date: "2026-06-20", change: "Initial publish", status: "Archived" },
    ],
    approvals: [
      { id: "bp1", step: "Author Review", approver: "James Okafor", role: "Rule Author", status: "Approved", date: "2026-07-14", comment: "" },
      { id: "bp2", step: "Risk Officer", approver: "Eleanor Voss", role: "Risk Officer", status: "Approved", date: "2026-07-15", comment: "Good" },
    ],
    simulation: { passed: 15230, failed: 88, flagged: 410, samples: 15728 },
  },
  {
    id: "R-310",
    name: "Credential Stuffing Velocity",
    description: "Flag burst of failed logins across multiple IPs in 5 minutes.",
    status: "In Review",
    tier: "High",
    channel: "All",
    owner: "Priya Raghunathan",
    updated: "2026-07-19T11:45:00Z",
    version: 2,
    tags: ["velocity", "credstuffing"],
    root: grp("AND", [
      cond("velocity.failedAttempts", "greater_or_equal", "5", "Velocity Plugin"),
      cond("velocity.ipCount1h", "greater_than", "3", "Velocity Plugin"),
      cond("session.mfaUsed", "is_false", "false", "Policy Plugin"),
    ]),
    actions: [
      act("Risk Increase", 25, "Credential stuffing pattern"),
      act("Challenge", undefined, "Force MFA"),
    ],
    versions: [
      { version: 2, author: "Priya Raghunathan", date: "2026-07-19", change: "Lowered failed-attempt threshold to 5", status: "In Review" },
      { version: 1, author: "Priya Raghunathan", date: "2026-07-05", change: "Drafted", status: "Archived" },
    ],
    approvals: [
      { id: "cp1", step: "Author Review", approver: "Priya Raghunathan", role: "Rule Author", status: "Approved", date: "2026-07-19", comment: "Submit" },
      { id: "cp2", step: "Risk Officer", approver: "Eleanor Voss", role: "Risk Officer", status: "Pending", date: null, comment: "" },
      { id: "cp3", step: "Compliance Sign-off", approver: "Hiroshi Tanaka", role: "Compliance Lead", status: "Pending", date: null, comment: "" },
    ],
    simulation: { passed: 12010, failed: 220, flagged: 540, samples: 12770 },
  },
  {
    id: "R-512",
    name: "Low Coherence Allow",
    description: "Permit low-risk coherent sessions with MFA.",
    status: "Published",
    tier: "Low",
    channel: "All",
    owner: "Maya Chen",
    updated: "2026-06-28T16:00:00Z",
    version: 3,
    tags: ["coherence", "allow"],
    root: grp("AND", [
      cond("session.coherenceScore", "greater_or_equal", "80", "Coherence Brain"),
      cond("session.riskScore", "less_than", "20", "Coherence Brain"),
      cond("session.mfaUsed", "is_true", "true", "Policy Plugin"),
    ]),
    actions: [act("Allow", undefined, "Low-risk coherent session")],
    versions: [
      { version: 3, author: "Maya Chen", date: "2026-06-28", change: "Raised coherence floor to 80", status: "Published" },
    ],
    approvals: [
      { id: "dp1", step: "Author Review", approver: "Maya Chen", role: "Rule Author", status: "Approved", date: "2026-06-27", comment: "" },
      { id: "dp2", step: "Risk Officer", approver: "Eleanor Voss", role: "Risk Officer", status: "Approved", date: "2026-06-28", comment: "Approved" },
    ],
    simulation: { passed: 21040, failed: 30, flagged: 12, samples: 21082 },
  },
  {
    id: "R-041",
    name: "Fraud Ring Linkage",
    description: "Block sessions tied to a known fraud ring via graph linkage.",
    status: "Draft",
    tier: "Critical",
    channel: "All",
    owner: "Diego Hernández",
    updated: "2026-07-20T08:30:00Z",
    version: 1,
    tags: ["graph", "fraudring"],
    root: grp("AND", [
      cond("graph.ringMember", "is_true", "true", "Graph Plugin"),
      cond("graph.sharedDeviceUsers", "greater_than", "4", "Graph Plugin"),
    ]),
    actions: [act("Block", undefined, "Fraud ring linkage")],
    versions: [
      { version: 1, author: "Diego Hernández", date: "2026-07-20", change: "Initial draft", status: "Draft" },
    ],
    approvals: [
      { id: "ep1", step: "Author Review", approver: "Diego Hernández", role: "Rule Author", status: "Pending", date: null, comment: "" },
    ],
    simulation: { passed: 9820, failed: 12, flagged: 64, samples: 9896 },
  },
];

export const PLUGINS: Plugin[] = [
  { id: "geo", name: "Geo Plugin", category: "Geolocation", provider: "MaxMind + Google", version: "3.4.1", status: "Enabled", health: "Healthy", latency: 64, uptime: 99.99, owner: "Platform Team", description: "IP geolocation, distance, impossible-travel, VPN/proxy detection.", calls24h: 184200, hitRate: 99.2, lastLog: "2026-07-20T08:42:11Z", installed: "2025-11-02" },
  { id: "device", name: "Device Plugin", category: "Device Intelligence", provider: "FingerprintJS", version: "2.8.0", status: "Enabled", health: "Healthy", latency: 88, uptime: 99.97, owner: "Platform Team", description: "Device fingerprinting, emulator & root detection, new-device tracking.", calls24h: 162800, hitRate: 97.6, lastLog: "2026-07-20T08:41:55Z", installed: "2025-11-02" },
  { id: "behavior", name: "Behavior Plugin", category: "Behavioral Biometrics", provider: "BioCatch", version: "4.1.2", status: "Enabled", health: "Healthy", latency: 142, uptime: 99.91, owner: "Risk Team", description: "Typing rhythm, mouse dynamics, gesture anomaly scoring.", calls24h: 88400, hitRate: 94.1, lastLog: "2026-07-20T08:40:02Z", installed: "2025-12-10" },
  { id: "velocity", name: "Velocity Plugin", category: "Velocity", provider: "CoherenceIQ", version: "1.9.3", status: "Enabled", health: "Healthy", latency: 38, uptime: 100, owner: "Platform Team", description: "Sliding-window event counters across IPs, devices, accounts.", calls24h: 240100, hitRate: 100, lastLog: "2026-07-20T08:42:30Z", installed: "2025-11-02" },
  { id: "graph", name: "Graph Plugin", category: "Graph Intelligence", provider: "Neo4j", version: "5.3.0", status: "Enabled", health: "Degraded", latency: 312, uptime: 99.41, owner: "Risk Team", description: "Entity-relationship graph, fraud-ring detection, shortest-path queries.", calls24h: 42100, hitRate: 92.4, lastLog: "2026-07-20T08:38:18Z", installed: "2026-01-22" },
  { id: "ml", name: "ML Plugin", category: "Machine Learning", provider: "CoherenceIQ Brain", version: "3.2.0", status: "Enabled", health: "Healthy", latency: 118, uptime: 99.95, owner: "ML Team", description: "Ensemble inference, fraud probability, SHAP attribution.", calls24h: 188900, hitRate: 99.0, lastLog: "2026-07-20T08:42:25Z", installed: "2025-11-02" },
  { id: "policy", name: "Policy Plugin", category: "Policy", provider: "CoherenceIQ", version: "1.4.0", status: "Enabled", health: "Healthy", latency: 22, uptime: 100, owner: "Platform Team", description: "Tenant allowlists, channel policy, MFA gating.", calls24h: 312400, hitRate: 100, lastLog: "2026-07-20T08:42:31Z", installed: "2025-11-02" },
  { id: "threat", name: "Threat Intelligence Plugin", category: "Threat Intel", provider: "Recorded Future", version: "6.0.4", status: "Enabled", health: "Healthy", latency: 96, uptime: 99.88, owner: "SecOps", description: "IP reputation, ASN risk, Tor/proxy feeds, malware linkage.", calls24h: 142700, hitRate: 98.3, lastLog: "2026-07-20T08:42:00Z", installed: "2025-12-01" },
  { id: "actimize", name: "Actimize Connector", category: "Case Management", provider: "NICE Actimize", version: "2.2.1", status: "Disabled", health: "Healthy", latency: 240, uptime: 99.7, owner: "Fraud Ops", description: "Bi-directional case sync with Actimize investigative workflow.", calls24h: 0, hitRate: 0, lastLog: "2026-07-19T17:12:40Z", installed: "2026-03-14" },
  { id: "emailage", name: "Email Age", category: "Identity", provider: "LexisNexis", version: "1.7.0", status: "Maintenance", health: "Degraded", latency: 540, uptime: 98.2, owner: "SecOps", description: "Email age, fraudster reputation, identity verification.", calls24h: 18200, hitRate: 91.0, lastLog: "2026-07-20T08:30:00Z", installed: "2026-02-18" },
];

export const PLUGIN_LOGS: Record<string, PluginLogEntry[]> = {
  geo: [
    { ts: "08:42:11", level: "INFO", message: "Resolved 84.12.44.8 → Frankfurt, DE (AS3320)" },
    { ts: "08:42:08", level: "INFO", message: "Impossible-travel check: 4120km → OK" },
    { ts: "08:41:59", level: "WARN", message: "VPN exit node flagged for 102.89.0.4" },
    { ts: "08:41:40", level: "INFO", message: "MaxMind DB loaded (v2026.07)" },
  ],
  device: [
    { ts: "08:41:55", level: "INFO", message: "Fingerprint match: a1b2c3… → known" },
    { ts: "08:41:48", level: "WARN", message: "Emulator signals detected on session S-09912" },
    { ts: "08:41:30", level: "INFO", message: "New device enrolled: Pixel 9 Pro" },
  ],
  graph: [
    { ts: "08:38:18", level: "ERROR", message: "Query timeout (>300ms) — ring lookup retried" },
    { ts: "08:38:02", level: "WARN", message: "Node write lag: 1.8s behind primary" },
    { ts: "08:37:40", level: "INFO", message: "Ring R-204 flagged 3 new sessions" },
  ],
  actimize: [
    { ts: "17:12:40", level: "INFO", message: "Connector disabled by Fraud Ops" },
    { ts: "17:12:10", level: "INFO", message: "Last case sync: CASE-8842 → closed" },
  ],
};

export const ADMIN_USERS: AdminUser[] = [
  { id: "U-1001", name: "Maya Chen", email: "maya.chen@coherence.ai", role: "Rule Author", status: "Active", lastLogin: "2026-07-20T07:41:00Z", mfa: true, team: "Risk Engineering" },
  { id: "U-1002", name: "James Okafor", email: "james.okafor@coherence.ai", role: "Risk Officer", status: "Active", lastLogin: "2026-07-20T08:12:00Z", mfa: true, team: "Fraud Operations" },
  { id: "U-1003", name: "Eleanor Voss", email: "eleanor.voss@coherence.ai", role: "Risk Officer", status: "Active", lastLogin: "2026-07-19T18:30:00Z", mfa: true, team: "Fraud Operations" },
  { id: "U-1004", name: "Hiroshi Tanaka", email: "hiroshi.tanaka@coherence.ai", role: "Compliance Lead", status: "Active", lastLogin: "2026-07-19T16:02:00Z", mfa: true, team: "Compliance" },
  { id: "U-1005", name: "Priya Raghunathan", email: "priya.r@coherence.ai", role: "Rule Author", status: "Active", lastLogin: "2026-07-20T07:55:00Z", mfa: true, team: "Risk Engineering" },
  { id: "U-1006", name: "Diego Hernández", email: "diego.h@coherence.ai", role: "Rule Author", status: "Active", lastLogin: "2026-07-20T08:20:00Z", mfa: false, team: "Risk Engineering" },
  { id: "U-1007", name: "Sofia Kowalski", email: "sofia.k@coherence.ai", role: "Analyst", status: "Suspended", lastLogin: "2026-07-10T11:00:00Z", mfa: false, team: "Fraud Operations" },
  { id: "U-1008", name: "Liang Wei", email: "liang.wei@coherence.ai", role: "Platform Admin", status: "Invited", lastLogin: "—", mfa: false, team: "Platform" },
];

export const ROLES: Role[] = [
  { id: "role-admin", name: "Platform Admin", description: "Full system access including configuration and secrets.", members: 3, permissions: 64, system: true },
  { id: "role-officer", name: "Risk Officer", description: "Approve, publish, and retire risk rules; view audit logs.", members: 6, permissions: 38, system: true },
  { id: "role-author", name: "Rule Author", description: "Author, simulate, and submit rules for approval.", members: 14, permissions: 22, system: false },
  { id: "role-compliance", name: "Compliance Lead", description: "Sign off on rules with regulatory impact.", members: 4, permissions: 18, system: false },
  { id: "role-analyst", name: "Analyst", description: "Read-only access to sessions and investigations.", members: 142, permissions: 9, system: false },
  { id: "role-secops", name: "SecOps", description: "Manage threat-intel plugins and respond to alerts.", members: 9, permissions: 28, system: false },
];

export const PERMISSIONS: { key: string; label: string; category: string }[] = [
  { key: "rule.read", label: "View rules", category: "Rules" },
  { key: "rule.write", label: "Create / edit rules", category: "Rules" },
  { key: "rule.simulate", label: "Run simulations", category: "Rules" },
  { key: "rule.approve", label: "Approve rules", category: "Rules" },
  { key: "rule.publish", label: "Publish rules", category: "Rules" },
  { key: "session.read", label: "View sessions", category: "Sessions" },
  { key: "session.investigate", label: "Investigate sessions", category: "Sessions" },
  { key: "plugin.read", label: "View plugins", category: "Plugins" },
  { key: "plugin.configure", label: "Configure plugins", category: "Plugins" },
  { key: "plugin.install", label: "Install / disable plugins", category: "Plugins" },
  { key: "admin.users", label: "Manage users", category: "Admin" },
  { key: "admin.roles", label: "Manage roles", category: "Admin" },
  { key: "admin.secrets", label: "Manage secrets", category: "Admin" },
  { key: "admin.audit", label: "View audit logs", category: "Admin" },
];

export const FEATURE_FLAGS: FeatureFlag[] = [
  { id: "ff-1", key: "rule.studio.v2", name: "Rule Studio v2 Canvas", enabled: true, environment: "Production", owner: "Maya Chen", updated: "2026-07-18" },
  { id: "ff-2", key: "plugin.graph.v2", name: "Graph Plugin v2 Engine", enabled: false, environment: "Staging", owner: "Diego Hernández", updated: "2026-07-15" },
  { id: "ff-3", key: "simulation.parallel", name: "Parallel Simulation", enabled: true, environment: "Production", owner: "Priya Raghunathan", updated: "2026-07-12" },
  { id: "ff-4", key: "approval.slas", name: "Approval SLA Tracking", enabled: true, environment: "Production", owner: "Eleanor Voss", updated: "2026-07-09" },
  { id: "ff-5", key: "ml.shadow", name: "ML Shadow Mode", enabled: false, environment: "Development", owner: "ML Team", updated: "2026-07-01" },
  { id: "ff-6", key: "copilot.beta", name: "AI Copilot (Beta)", enabled: false, environment: "Staging", owner: "Maya Chen", updated: "2026-06-28" },
];

export const API_KEYS: ApiKey[] = [
  { id: "key-1", name: "Retail Banking Webhook", prefix: "ck_live_8f2a", scopes: ["sessions:write", "decisions:read"], created: "2026-05-12", lastUsed: "2026-07-20T08:42:00Z", owner: "Platform Team", status: "Active" },
  { id: "key-2", name: "Risk Engine Service", prefix: "ck_live_2d71", scopes: ["rules:read", "rules:execute"], created: "2026-04-02", lastUsed: "2026-07-20T08:42:30Z", owner: "Platform Team", status: "Active" },
  { id: "key-3", name: "Actimize Sync", prefix: "ck_live_aa19", scopes: ["cases:write", "cases:read"], created: "2026-03-14", lastUsed: "2026-07-19T17:12:00Z", owner: "Fraud Ops", status: "Active" },
  { id: "key-4", name: "Legacy Export (revoked)", prefix: "ck_live_0c5b", scopes: ["export:read"], created: "2025-12-01", lastUsed: "2026-02-18T10:00:00Z", owner: "Compliance", status: "Revoked" },
];

export const SECRETS: Secret[] = [
  { id: "sec-1", name: "MAXMIND_LICENSE_KEY", type: "API Key", updated: "2026-06-01", rotatedIn: "88 days", owner: "Platform Team" },
  { id: "sec-2", name: "RECORDED_FUTURE_TOKEN", type: "Token", updated: "2026-05-22", rotatedIn: "69 days", owner: "SecOps" },
  { id: "sec-3", name: "ACTIMIZE_CLIENT_SECRET", type: "OAuth Secret", updated: "2026-07-10", rotatedIn: "10 days", owner: "Fraud Ops" },
  { id: "sec-4", name: "BIOCATCH_API_KEY", type: "API Key", updated: "2026-04-18", rotatedIn: "94 days", owner: "Risk Team" },
  { id: "sec-5", name: "NEO4J_PASSWORD", type: "Password", updated: "2026-06-30", rotatedIn: "20 days", owner: "Risk Team" },
];

export const AUDIT_LOGS: AuditEntry[] = [
  { id: "a1", actor: "maya.chen@coherence.ai", action: "rule.publish", target: "R-117 v7", ip: "10.4.2.11", ts: "2026-07-18T14:22:00Z", result: "Success" },
  { id: "a2", actor: "eleanor.voss@coherence.ai", action: "rule.approve", target: "R-117 v7", ip: "10.4.2.18", ts: "2026-07-18T14:10:00Z", result: "Success" },
  { id: "a3", actor: "priya.r@coherence.ai", action: "rule.submit", target: "R-310 v2", ip: "10.4.2.22", ts: "2026-07-19T11:45:00Z", result: "Success" },
  { id: "a4", actor: "sofia.k@coherence.ai", action: "user.suspend", target: "U-1007", ip: "10.4.3.40", ts: "2026-07-10T11:02:00Z", result: "Success" },
  { id: "a5", actor: "platform@coherence.ai", action: "plugin.disable", target: "Actimize Connector", ip: "10.4.1.2", ts: "2026-07-19T17:12:40Z", result: "Success" },
  { id: "a6", actor: "diego.h@coherence.ai", action: "rule.create", target: "R-041 v1", ip: "10.4.2.31", ts: "2026-07-20T08:30:00Z", result: "Success" },
  { id: "a7", actor: "unknown", action: "session.investigate", target: "S-09912", ip: "203.0.113.5", ts: "2026-07-20T03:11:00Z", result: "Failure" },
  { id: "a8", actor: "james.okafor@coherence.ai", action: "plugin.configure", target: "Threat Intelligence Plugin", ip: "10.4.2.14", ts: "2026-07-15T09:10:00Z", result: "Success" },
];
