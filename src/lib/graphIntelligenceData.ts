import type { LoginSession } from "@/types";

export type EntityKind =
  | "Customer" | "Device" | "Browser" | "Cookie" | "Phone"
  | "Email" | "Address" | "IP" | "ASN" | "Country"
  | "City" | "Merchant" | "Payee" | "Account";

export type RiskBand = "low" | "medium" | "high" | "critical";

export interface GraphNode {
  id: string;
  kind: EntityKind;
  label: string;
  sub?: string;
  risk: number;
  band: RiskBand;
  degree: number;
  firstSeen: string;
  lastSeen: string;
  flagged: boolean;
  properties: { key: string; value: string }[];
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  kind: "owns" | "uses" | "resolves" | "located" | "assigned" | "linked" | "transacted" | "trusted";
  strength: number;
  risk: number;
  flagged: boolean;
}

export interface EntityCluster {
  id: string;
  label: string;
  risk: number;
  nodeIds: string[];
  description: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  clusters: EntityCluster[];
  stats: { entities: number; edges: number; flagged: number; rings: number; avgDegree: number };
}

export interface EntityProfile {
  node: GraphNode;
  connected: { node: GraphNode; edge: GraphEdge }[];
  timeline: { t: string; label: string; kind: RiskBand }[];
  riskFactors: { label: string; value: string; weight: number; direction: "increases" | "decreases" }[];
  reasonCodes: { code: string; label: string; severity: RiskBand }[];
  summary: string;
}

const iso = (offsetMin: number) => new Date(Date.now() - offsetMin * 60 * 1000).toISOString();

function band(score: number): RiskBand {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  return "low";
}

const MERCHANTS = ["Acme Commerce", "Nimbus Digital", "Helios Travel", "Vertex Markets", "Quanta Retail"];
const PAYEES = ["James Okoro", "Lina Petrov", "Trust Escrow LLC", "Nova Treasury", "Aria Solberg"];

export function buildGraph(session: LoginSession): GraphData {
  const s = session;
  const high = s.riskScore >= 60;
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const nid = (k: EntityKind, key: string) => `${k}:${key}`.toLowerCase();

  // Customer (central)
  const custId = nid("Customer", s.customerId);
  nodes.push({
    id: custId, kind: "Customer", label: s.customer, sub: s.customerId,
    risk: s.riskScore, band: band(s.riskScore), degree: 7, firstSeen: iso(60 * 24 * 180),
    lastSeen: iso(5), flagged: high, properties: [
      { key: "customerId", value: s.customerId },
      { key: "segment", value: "Retail Premium" },
      { key: "tenure", value: "1842 days" },
      { key: "kyc", value: "verified" },
    ],
  });

  // Account
  const accId = nid("Account", `ACC-${s.customerId.slice(2)}`);
  nodes.push({
    id: accId, kind: "Account", label: `Account ${s.customerId.slice(2)}`, sub: "Checking",
    risk: s.riskScore - 4, band: band(s.riskScore - 4), degree: 3, firstSeen: iso(60 * 24 * 180),
    lastSeen: iso(5), flagged: high, properties: [
      { key: "accountId", value: `ACC-${s.customerId.slice(2)}` },
      { key: "type", value: "Checking" },
      { key: "balance", value: "$48,210" },
      { key: "status", value: high ? "watch" : "active" },
    ],
  });

  // Device
  const devId = nid("Device", s.fingerprint.slice(0, 12));
  nodes.push({
    id: devId, kind: "Device", label: s.device, sub: s.os,
    risk: s.newDevice ? 68 : 14, band: band(s.newDevice ? 68 : 14), degree: s.newDevice ? 1 : 4,
    firstSeen: s.newDevice ? iso(60) : iso(60 * 24 * 90), lastSeen: iso(5),
    flagged: s.newDevice, properties: [
      { key: "fingerprint", value: `${s.fingerprint.slice(0, 12)}…` },
      { key: "os", value: s.os },
      { key: "firstSeen", value: s.newDevice ? "1h ago" : "90d ago" },
      { key: "loginCount", value: s.newDevice ? "1" : "47" },
    ],
  });

  // Browser
  const brwId = nid("Browser", s.browser.replace(/\s+/g, "-"));
  nodes.push({
    id: brwId, kind: "Browser", label: s.browser, sub: s.userAgent.slice(0, 28),
    risk: 18, band: "low", degree: 3, firstSeen: iso(60 * 24 * 60), lastSeen: iso(5),
    flagged: false, properties: [
      { key: "browser", value: s.browser },
      { key: "ua", value: s.userAgent.slice(0, 40) + "…" },
      { key: "language", value: "en-US" },
      { key: "cookies", value: "enabled" },
    ],
  });

  // Cookie
  const cookId = nid("Cookie", s.newDevice ? "fresh-session" : "trust-47d");
  nodes.push({
    id: cookId, kind: "Cookie", label: s.newDevice ? "New Cookie" : "Trusted Cookie",
    sub: s.newDevice ? "age 0d" : "age 47d",
    risk: s.newDevice ? 52 : 16, band: band(s.newDevice ? 52 : 16), degree: 2,
    firstSeen: s.newDevice ? iso(5) : iso(60 * 24 * 47), lastSeen: iso(5),
    flagged: s.newDevice, properties: [
      { key: "name", value: "_cb_trust" },
      { key: "age", value: s.newDevice ? "0d" : "47d" },
      { key: "domain", value: "coherence.bank" },
      { key: "secure", value: "true" },
    ],
  });

  // Phone
  const phoneId = nid("Phone", `+1-555-${s.customerId.slice(-3)}`);
  nodes.push({
    id: phoneId, kind: "Phone", label: `+1 555 •••${s.customerId.slice(-3)}`, sub: "Mobile",
    risk: 22, band: "low", degree: 2, firstSeen: iso(60 * 24 * 200), lastSeen: iso(60 * 24 * 3),
    flagged: false, properties: [
      { key: "number", value: `+1 555 •••${s.customerId.slice(-3)}` },
      { key: "type", value: "Mobile" },
      { key: "verified", value: "true" },
      { key: "carrier", value: "Verizon" },
    ],
  });

  // Email
  const emailId = nid("Email", `${s.username}@coherence.bank`);
  nodes.push({
    id: emailId, kind: "Email", label: `${s.username}@coherence.bank`, sub: "Primary",
    risk: 24, band: "low", degree: 2, firstSeen: iso(60 * 24 * 200), lastSeen: iso(60 * 24 * 2),
    flagged: false, properties: [
      { key: "email", value: `${s.username}@coherence.bank` },
      { key: "type", value: "Primary" },
      { key: "verified", value: "true" },
      { key: "age", value: "200d" },
    ],
  });

  // Address
  const addrId = nid("Address", `${s.previousCity ?? s.city}-addr`);
  nodes.push({
    id: addrId, kind: "Address", label: s.previousCity ?? s.city, sub: "Billing",
    risk: 20, band: "low", degree: 2, firstSeen: iso(60 * 24 * 200), lastSeen: iso(60 * 24 * 14),
    flagged: false, properties: [
      { key: "city", value: s.previousCity ?? s.city },
      { key: "country", value: s.previousCountry ?? s.country },
      { key: "type", value: "Billing" },
      { key: "verified", value: "true" },
    ],
  });

  // IP
  const ipId = nid("IP", s.ip);
  nodes.push({
    id: ipId, kind: "IP", label: s.ip, sub: s.isp,
    risk: s.vpn ? 71 : 12, band: band(s.vpn ? 71 : 12), degree: s.vpn ? 5 : 2,
    firstSeen: s.vpn ? iso(60 * 4) : iso(60 * 24 * 30), lastSeen: iso(5),
    flagged: s.vpn, properties: [
      { key: "ip", value: s.ip },
      { key: "isp", value: s.isp },
      { key: "vpn", value: String(s.vpn) },
      { key: "hosting", value: "false" },
    ],
  });

  // ASN
  const asnId = nid("ASN", s.asn);
  nodes.push({
    id: asnId, kind: "ASN", label: s.asn, sub: s.isp,
    risk: s.vpn ? 58 : 14, band: band(s.vpn ? 58 : 14), degree: 3, firstSeen: iso(60 * 24 * 90),
    lastSeen: iso(5), flagged: s.vpn, properties: [
      { key: "asn", value: s.asn },
      { key: "isp", value: s.isp },
      { key: "reputation", value: s.vpn ? "low" : "high" },
      { key: "type", value: s.vpn ? "vpn" : "residential" },
    ],
  });

  // Country
  const ctyId = nid("Country", s.countryCode);
  nodes.push({
    id: ctyId, kind: "Country", label: s.country, sub: s.countryCode,
    risk: high ? 42 : 16, band: band(high ? 42 : 16), degree: 4, firstSeen: iso(60 * 24 * 120),
    lastSeen: iso(5), flagged: high, properties: [
      { key: "country", value: s.country },
      { key: "code", value: s.countryCode },
      { key: "risk", value: high ? "elevated" : "baseline" },
      { key: "timezone", value: s.timezone },
    ],
  });

  // City
  const cityId = nid("City", `${s.city}-${s.countryCode}`);
  nodes.push({
    id: cityId, kind: "City", label: s.city, sub: s.country,
    risk: high ? 48 : 14, band: band(high ? 48 : 14), degree: 3, firstSeen: iso(60 * 24 * 120),
    lastSeen: iso(5), flagged: high, properties: [
      { key: "city", value: s.city },
      { key: "lat", value: s.latitude.toFixed(2) },
      { key: "lng", value: s.longitude.toFixed(2) },
      { key: "timezone", value: s.timezone },
    ],
  });

  // Merchant
  const merchant = MERCHANTS[Math.floor(Math.random() * MERCHANTS.length)];
  const mercId = nid("Merchant", merchant.replace(/\s+/g, "-"));
  nodes.push({
    id: mercId, kind: "Merchant", label: merchant, sub: "E-Commerce",
    risk: 28, band: "low", degree: 2, firstSeen: iso(60 * 24 * 30), lastSeen: iso(60 * 24 * 2),
    flagged: false, properties: [
      { key: "merchant", value: merchant },
      { key: "category", value: "E-Commerce" },
      { key: "volume30d", value: "$2,140" },
      { key: "chargebacks", value: "0" },
    ],
  });

  // Payee
  const payee = PAYEES[Math.floor(Math.random() * PAYEES.length)];
  const payId = nid("Payee", payee.replace(/\s+/g, "-"));
  nodes.push({
    id: payId, kind: "Payee", label: payee, sub: "External",
    risk: high ? 55 : 20, band: band(high ? 55 : 20), degree: 2, firstSeen: iso(60 * 24 * 5),
    lastSeen: iso(60 * 24), flagged: high, properties: [
      { key: "payee", value: payee },
      { key: "type", value: "External" },
      { key: "firstSeen", value: high ? "5d ago" : "180d ago" },
      { key: "risk", value: high ? "new-payee" : "trusted" },
    ],
  });

  // Edges
  const addEdge = (e: Omit<GraphEdge, "id" | "risk" | "flagged">) => {
    edges.push({
      ...e, id: `e:${e.source}->${e.target}`,
      risk: Math.max(0, Math.min(100, Math.round((nodes.find(n => n.id === e.source)?.risk ?? 0) * 0.4 + (nodes.find(n => n.id === e.target)?.risk ?? 0) * 0.4 + e.strength * 10))),
      flagged: (nodes.find(n => n.id === e.source)?.flagged ?? false) && (nodes.find(n => n.id === e.target)?.flagged ?? false),
    });
  };

  addEdge({ source: custId, target: accId, label: "owns", kind: "owns", strength: 0.95 });
  addEdge({ source: custId, target: devId, label: "uses", kind: "uses", strength: s.newDevice ? 0.4 : 0.85 });
  addEdge({ source: custId, target: emailId, label: "owns", kind: "owns", strength: 0.9 });
  addEdge({ source: custId, target: phoneId, label: "owns", kind: "owns", strength: 0.9 });
  addEdge({ source: custId, target: addrId, label: "resides", kind: "located", strength: 0.85 });
  addEdge({ source: devId, target: brwId, label: "runs", kind: "uses", strength: 0.8 });
  addEdge({ source: devId, target: cookId, label: "holds", kind: "linked", strength: s.newDevice ? 0.3 : 0.78 });
  addEdge({ source: brwId, target: ipId, label: "from", kind: "uses", strength: 0.7 });
  addEdge({ source: ipId, target: asnId, label: "belongs to", kind: "assigned", strength: 0.9 });
  addEdge({ source: ipId, target: ctyId, label: "resolves to", kind: "resolves", strength: 0.85 });
  addEdge({ source: ctyId, target: cityId, label: "contains", kind: "located", strength: 0.8 });
  addEdge({ source: custId, target: cityId, label: "located", kind: "located", strength: 0.7 });
  addEdge({ source: accId, target: mercId, label: "transacted", kind: "transacted", strength: 0.6 });
  addEdge({ source: accId, target: payId, label: "transferred", kind: "transacted", strength: high ? 0.45 : 0.7 });
  addEdge({ source: accId, target: emailId, label: "linked", kind: "linked", strength: 0.6 });

  // Clusters
  const clusters: EntityCluster[] = [
    {
      id: "cl-device", label: "Device & Browser Cluster",
      risk: s.newDevice ? 68 : 14, nodeIds: [devId, brwId, cookId],
      description: s.newDevice ? "First-seen device with no established trust baseline." : "Trusted device cluster with 90-day history.",
    },
    {
      id: "cl-network", label: "Network Origin Cluster",
      risk: s.vpn ? 71 : 12, nodeIds: [ipId, asnId, ctyId, cityId],
      description: s.vpn ? "VPN / anonymizing exit node detected on ASN." : "Clean residential network origin.",
    },
    {
      id: "cl-identity", label: "Identity Cluster",
      risk: s.riskScore, nodeIds: [custId, emailId, phoneId, addrId],
      description: "Verified identity primitives linked to the customer profile.",
    },
    {
      id: "cl-funds", label: "Funds Flow Cluster",
      risk: high ? 55 : 20, nodeIds: [accId, mercId, payId],
      description: high ? "New external payee added within 5 days." : "Established funds flow counterparties.",
    },
  ];

  const avgDegree = nodes.reduce((a, n) => a + n.degree, 0) / nodes.length;
  return {
    nodes, edges, clusters,
    stats: {
      entities: nodes.length, edges: edges.length,
      flagged: nodes.filter(n => n.flagged).length, rings: high ? 2 : 0,
      avgDegree: parseFloat(avgDegree.toFixed(1)),
    },
  };
}

export function buildProfile(node: GraphNode, graph: GraphData): EntityProfile {
  const connected = graph.edges
    .filter(e => e.source === node.id || e.target === node.id)
    .map(e => {
      const otherId = e.source === node.id ? e.target : e.source;
      return { node: graph.nodes.find(n => n.id === otherId)!, edge: e };
    })
    .filter(c => c.node);

  const factorForKind: Record<EntityKind, { label: string; value: string; weight: number; direction: "increases" | "decreases" }[]> = {
    Customer: [
      { label: "tenure_days", value: "1842", weight: 0.2, direction: "decreases" },
      { label: "baseline_deviation", value: node.flagged ? "high" : "low", weight: node.flagged ? 0.5 : 0.08, direction: node.flagged ? "increases" : "decreases" },
    ],
    Device: [
      { label: "first_seen_recency", value: node.properties.find(p => p.key === "firstSeen")?.value ?? "—", weight: node.flagged ? 0.61 : 0.08, direction: node.flagged ? "increases" : "decreases" },
      { label: "login_count", value: node.properties.find(p => p.key === "loginCount")?.value ?? "0", weight: node.flagged ? 0.42 : 0.21, direction: node.flagged ? "increases" : "decreases" },
    ],
    Browser: [{ label: "ua_match", value: "true", weight: 0.12, direction: "decreases" }],
    Cookie: [
      { label: "trusted_cookie", value: node.flagged ? "absent" : "present", weight: node.flagged ? 0.52 : 0.12, direction: node.flagged ? "increases" : "decreases" },
      { label: "cookie_age_days", value: node.properties.find(p => p.key === "age")?.value ?? "0", weight: 0.31, direction: node.flagged ? "increases" : "decreases" },
    ],
    Phone: [{ label: "verified", value: "true", weight: 0.08, direction: "decreases" }],
    Email: [{ label: "verified", value: "true", weight: 0.08, direction: "decreases" }],
    Address: [{ label: "verified", value: "true", weight: 0.08, direction: "decreases" }],
    IP: [
      { label: "vpn_proxy", value: node.flagged ? "true" : "false", weight: node.flagged ? 0.71 : 0.04, direction: node.flagged ? "increases" : "decreases" },
      { label: "asn_reputation", value: node.flagged ? "low" : "high", weight: 0.38, direction: node.flagged ? "increases" : "decreases" },
    ],
    ASN: [
      { label: "asn_type", value: node.flagged ? "vpn" : "residential", weight: node.flagged ? 0.58 : 0.05, direction: node.flagged ? "increases" : "decreases" },
    ],
    Country: [{ label: "country_risk", value: node.flagged ? "elevated" : "baseline", weight: node.flagged ? 0.4 : 0.08, direction: node.flagged ? "increases" : "decreases" }],
    City: [{ label: "distance_km", value: node.flagged ? "8412" : "14", weight: node.flagged ? 0.78 : 0.05, direction: node.flagged ? "increases" : "decreases" }],
    Merchant: [{ label: "chargeback_rate", value: "0%", weight: 0.05, direction: "decreases" }],
    Payee: [
      { label: "payee_recency", value: node.flagged ? "5d" : "180d", weight: node.flagged ? 0.55 : 0.1, direction: node.flagged ? "increases" : "decreases" },
    ],
    Account: [
      { label: "account_status", value: node.flagged ? "watch" : "active", weight: node.flagged ? 0.4 : 0.08, direction: node.flagged ? "increases" : "decreases" },
    ],
  };

  const reasonsForKind: Record<EntityKind, { code: string; label: string; severity: RiskBand }[]> = {
    Customer: [{ code: "C-001", label: node.flagged ? "Profile deviation detected" : "Profile consistent", severity: node.flagged ? "high" : "low" }],
    Device: [
      { code: "D-101", label: node.flagged ? "First-seen fingerprint" : "Known device", severity: node.flagged ? "high" : "low" },
      ...(node.flagged ? [{ code: "D-318", label: "Canvas hash mismatch", severity: "medium" as RiskBand }] : []),
    ],
    Browser: [{ code: "B-100", label: "Browser signature nominal", severity: "low" }],
    Cookie: [{ code: "C-101", label: node.flagged ? "No trusted session cookie" : "Trusted cookie present", severity: node.flagged ? "medium" : "low" }],
    Phone: [{ code: "P-100", label: "Verified phone", severity: "low" }],
    Email: [{ code: "E-100", label: "Verified email", severity: "low" }],
    Address: [{ code: "A-100", label: "Verified address", severity: "low" }],
    IP: [
      { code: "N-201", label: node.flagged ? "VPN / proxy detected" : "Clean residential IP", severity: node.flagged ? "high" : "low" },
      ...(node.flagged ? [{ code: "N-402", label: "Anonymizing service", severity: "high" as RiskBand }] : []),
    ],
    ASN: [{ code: "N-110", label: node.flagged ? "Low-reputation ASN" : "Residential ASN", severity: node.flagged ? "medium" : "low" }],
    Country: [{ code: "L-200", label: node.flagged ? "Elevated country risk" : "Baseline country risk", severity: node.flagged ? "medium" : "low" }],
    City: [{ code: "L-301", label: node.flagged ? "Impossible travel" : "Geographic consistency", severity: node.flagged ? "critical" : "low" }],
    Merchant: [{ code: "M-100", label: "No chargebacks", severity: "low" }],
    Payee: [{ code: "P-200", label: node.flagged ? "New external payee" : "Trusted payee", severity: node.flagged ? "medium" : "low" }],
    Account: [{ code: "A-300", label: node.flagged ? "Account under watch" : "Account active", severity: node.flagged ? "medium" : "low" }],
  };

  const summary = node.flagged
    ? `${node.kind} "${node.label}" is flagged with a ${node.band} risk band (${node.risk}). ${node.degree} connected entities. Reason: ${reasonsForKind[node.kind][0].label}.`
    : `${node.kind} "${node.label}" is within baseline. Risk ${node.risk} (${node.band}). ${node.degree} connected entities.`;

  return {
    node,
    connected,
    timeline: [
      { t: node.firstSeen, label: "First observed", kind: "low" as RiskBand },
      ...(node.flagged ? [{ t: iso(60), label: "Flagged in session", kind: "high" as RiskBand }] : []),
      { t: node.lastSeen, label: "Current session", kind: node.band },
    ],
    riskFactors: factorForKind[node.kind],
    reasonCodes: reasonsForKind[node.kind],
    summary,
  };
}
