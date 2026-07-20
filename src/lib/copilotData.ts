import type { LoginSession } from "@/types";
import { buildInvestigation } from "@/lib/investigationData";

export type CopilotIntent =
  | "why_blocked"
  | "summarize_session"
  | "explain_evidence"
  | "recommend_rule"
  | "investigation_report"
  | "compare_sessions"
  | "suggest_policy"
  | "freeform";

export interface CopilotSuggestion {
  id: string;
  label: string;
  intent: CopilotIntent;
  icon: "shield" | "file" | "evidence" | "gavel" | "report" | "compare" | "policy";
}

export const COPILOT_SUGGESTIONS: CopilotSuggestion[] = [
  { id: "why-blocked", label: "Why was this session blocked?", intent: "why_blocked", icon: "shield" },
  { id: "summarize", label: "Summarize this session", intent: "summarize_session", icon: "file" },
  { id: "explain-evidence", label: "Explain the evidence", intent: "explain_evidence", icon: "evidence" },
  { id: "recommend-rule", label: "Recommend a rule", intent: "recommend_rule", icon: "gavel" },
  { id: "report", label: "Generate investigation report", intent: "investigation_report", icon: "report" },
  { id: "compare", label: "Compare two sessions", intent: "compare_sessions", icon: "compare" },
  { id: "policy", label: "Suggest a policy", intent: "suggest_policy", icon: "policy" },
];

export interface CopilotMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  intent?: CopilotIntent;
  ts: number;
  citations?: { label: string; ref: string }[];
}

export interface CopilotContext {
  session?: LoginSession;
  compareSession?: LoginSession;
}

const bullets = (items: string[]) => items.map((i) => `- ${i}`).join("\n");

function topRules(s: LoginSession, n = 3): string[] {
  return [...s.triggeredRules].slice(0, n);
}

function whyBlocked(s: LoginSession): { markdown: string; citations: { label: string; ref: string }[] } {
  const blocked = s.decision === "Deny";
  const rules = topRules(s);
  const reasons: string[] = [];
  if (s.newDevice) reasons.push(`**First-seen device** — fingerprint \`${s.fingerprint.slice(0, 12)}\` has no trusted history (reputation 34/100).`);
  if (s.vpn) reasons.push(`**VPN / anonymizing IP** — ${s.ip} (${s.isp}, ${s.asn}) is a known VPN exit node.`);
  if (s.failedAttempts >= 3) reasons.push(`**Credential stuffing** — ${s.failedAttempts} failed attempts in the 1h window exceed the threshold of 3.`);
  if (s.velocityEvents > 10) reasons.push(`**Velocity spike** — ${s.velocityEvents} events in 1h vs a baseline of 4.`);
  if (s.previousCountry && s.previousCountry !== s.country) reasons.push(`**Impossible travel** — ${s.previousCity ?? "—"}, ${s.previousCountry} → ${s.city}, ${s.country} in 4.2h.`);
  if (reasons.length === 0) reasons.push(`Composite risk score ${s.riskScore}/100 crossed the **Deny** threshold (78).`);

  const md = `## ${blocked ? "Session blocked" : "Decision: " + s.decision}

Session **${s.sessionId}** for *${s.customer}* (\`${s.username}\`) was **${blocked ? "blocked" : "actioned"}** with a composite risk score of **${s.riskScore}/100** and fraud probability **${s.fraudProbability}%**.

### Contributing signals

${bullets(reasons)}

### Triggered rules

${bullets(rules.length ? rules.map((r) => `\`${r}\``) : ["No rules fired"])}

> The **Identity Fraud** model contributed the largest weight (0.34), followed by **Geo Velocity** (0.28). Step-up MFA was ${s.mfaUsed ? "used" : "not used"}.
`;
  return {
    markdown: md,
    citations: [
      { label: "Identity Fraud Model", ref: "ifm-xgb-v7" },
      { label: "Policy Bundle", ref: "retail-v34" },
    ],
  };
}

function summarizeSession(s: LoginSession): { markdown: string; citations: { label: string; ref: string }[] } {
  const md = `## Session summary — ${s.sessionId}

| Attribute | Value |
|---|---|
| Customer | ${s.customer} (\`${s.customerId}\`) |
| Channel | ${s.channel} · ${s.application} |
| Device | ${s.device} (${s.os}, ${s.browser}) |
| Location | ${s.city}, ${s.country} |
| IP / ASN | \`${s.ip}\` · ${s.asn} (${s.isp}) |
| Login time | ${new Date(s.loginTime).toLocaleString()} |
| Risk score | **${s.riskScore}/100** |
| Coherence | **${s.coherenceScore}/100** |
| Fraud probability | **${s.fraudProbability}%** |
| Decision | **${s.decision}** |
| MFA | ${s.mfaUsed ? s.mfaType : "not used"} |

### Narrative

- Session evaluated across **9 pipeline stages** in **${s.latency}ms** total.
- **${s.triggeredRules.length}** rule${s.triggeredRules.length === 1 ? "" : "s"} fired; **${s.pluginHits.length}** plugin${s.pluginHits.length === 1 ? "" : "s"} contributed signals.
- ${s.newDevice ? "Device is **first-seen** with no trusted history." : "Device matches a trusted profile (47 prior logins)."}
- ${s.vpn ? "IP is a **VPN exit node**." : "IP is a clean residential address."}
`;
  return { markdown: md, citations: [{ label: "Investigation case", ref: `CASE-${s.sessionId.replace("S-", "")}` }] };
}

function explainEvidence(s: LoginSession): { markdown: string; citations: { label: string; ref: string }[] } {
  const inv = buildInvestigation(s);
  const cards = inv.evidence.slice(0, 4);
  const sections = cards.map((c) => {
    const fi = c.featureImportance.slice(0, 3).map((f) => `| \`${f.feature}\` | ${f.value} | ${f.weight.toFixed(2)} | ${f.direction === "increases" ? "↑ risk" : "↓ risk"} |`).join("\n");
    return `### ${c.title}

- **Confidence:** ${(c.confidence * 100).toFixed(0)}% · **Risk:** ${c.risk}/100 · **Severity:** \`${c.riskLevel}\`
- **Reason codes:** ${c.reasonCodes.map((r) => `\`${r.code}\``).join(", ")}

#### Key features

| Feature | Value | Weight | Direction |
|---|---|---|---|
${fi}

${bullets(c.evidence.slice(0, 2))}
`;
  });
  const md = `## Evidence explanation — ${s.sessionId}

The investigation gathered **${inv.evidence.length} evidence cards**. The most influential are:

${sections.join("\n")}`;
  return { markdown: md, citations: [{ label: "Evidence vault", ref: "evidence-explorer" }] };
}

function recommendRule(s: LoginSession): { markdown: string; citations: { label: string; ref: string }[] } {
  const isNewDevice = s.newDevice;
  const isVpn = s.vpn;
  const isImpossible = s.previousCountry !== null && s.previousCountry !== s.country;
  const tier = s.riskScore >= 78 ? "Critical" : s.riskScore >= 45 ? "High" : "Medium";
  const conditions: string[] = [];
  if (isImpossible) conditions.push("session.impossibleTravel = true");
  if (isNewDevice) conditions.push("device.firstSeen = true");
  if (isVpn) conditions.push("ip.vpn = true");
  conditions.push(`session.riskScore > ${Math.max(40, s.riskScore - 10)}`);

  const md = `## Recommended rule

Based on the signals in **${s.sessionId}**, the following rule would catch this pattern:

\`\`\`yaml
id: R-${Math.floor(200 + Math.random() * 700)}
name: "${[isImpossible ? "Impossible Travel" : null, isNewDevice ? "New Device" : null, isVpn ? "VPN" : null].filter(Boolean).join(" + ")}"
tier: ${tier}
channel: All
status: Draft
\`\`\`

### Condition (DSL)

\`\`\`dsl
match session where
  ${conditions.join("\n  AND ")}
\`\`\`

### Action

\`\`\`json
{ "action": "${s.decision === "Deny" ? "block" : "step-up-mfa"}", "reason": "Copilot-recommended from ${s.sessionId}" }
\`\`\`

### Rationale

- ${isImpossible ? "Impossible travel is present in **31%** of confirmed ATO cases in this tenant." : "Geo-velocity is within baseline."}
- ${isNewDevice ? "First-seen devices account for **24%** of risk weight in this session." : "Device is trusted."}
- ${isVpn ? "VPN exit nodes appear in **18%** of ATO cases over the last 30 days." : "IP is clean."}

> Simulate this rule against the last 90 days before promoting. Estimated **+${Math.round(s.riskScore * 0.08)}%** detection lift with **+${Math.max(0.2, (100 - s.riskScore) * 0.004).toFixed(1)}%** false-positive increase.
`;
  return { markdown: md, citations: [{ label: "Rule Studio", ref: "rule-studio" }] };
}

function investigationReport(s: LoginSession): { markdown: string; citations: { label: string; ref: string }[] } {
  const inv = buildInvestigation(s);
  const nodeRows = inv.nodes.map((n) => `| ${n.abbr} | ${n.label} | ${n.status} | ${n.latencyMs}ms | ${n.riskContribution} |`).join("\n");
  const actions = inv.recommendedActions.map((a) => `- **${a.label}** — ${a.rationale} _(severity: ${a.severity})_`).join("\n");
  const md = `# Investigation report

**Case:** \`${inv.caseId}\` · **Session:** \`${s.sessionId}\` · **Generated:** ${new Date().toLocaleString()}

---

## 1. Executive summary

${inv.narrative.join(" ")}

**Final decision:** **${s.decision}** · **Risk:** ${s.riskScore}/100 · **Fraud probability:** ${s.fraudProbability}%

## 2. Pipeline execution

| Stage | Label | Status | Latency | Risk contribution |
|---|---|---|---|---|
${nodeRows}

## 3. Model scores

${inv.modelScores.map((m) => `- **${m.model}** — score ${m.score}, contribution ${(m.contribution * 100).toFixed(0)}%`).join("\n")}

## 4. Recommended actions

${actions}

## 5. Similar cases

${inv.similarCases.map((c) => `- \`${c.caseId}\` — ${c.customer} (similarity ${(c.similarity * 100).toFixed(0)}%, ${c.decision}, ${new Date(c.time).toLocaleDateString()})`).join("\n")}

---

_Report generated by CoherenceIQ AI Copilot. Retain for audit per tenant policy._
`;
  return { markdown: md, citations: [{ label: "Audit log", ref: `audit-${s.sessionId}` }] };
}

function compareSessions(ctx: CopilotContext): { markdown: string; citations: { label: string; ref: string }[] } {
  const a = ctx.session;
  const b = ctx.compareSession;
  if (!a) {
    return { markdown: `## Compare sessions\n\nSelect a session in the Session Explorer, then ask again. I need at least one session to compare.`, citations: [] };
  }
  if (!b) {
    return {
      markdown: `## Compare sessions\n\nI have **${a.sessionId}** (${a.customer}). Select a second session to compare against, or ask me to pick a similar one.`,
      citations: [{ label: "Session Explorer", ref: "sessions" }],
    };
  }
  const rows: [string, string, string][] = [
    ["Customer", a.customer, b.customer],
    ["Decision", a.decision, b.decision],
    ["Risk score", `${a.riskScore}`, `${b.riskScore}`],
    ["Coherence", `${a.coherenceScore}`, `${b.coherenceScore}`],
    ["Fraud probability", `${a.fraudProbability}%`, `${b.fraudProbability}%`],
    ["Device", a.device, b.device],
    ["New device", a.newDevice ? "yes" : "no", b.newDevice ? "yes" : "no"],
    ["VPN", a.vpn ? "yes" : "no", b.vpn ? "yes" : "no"],
    ["Country", a.country, b.country],
    ["Failed attempts", `${a.failedAttempts}`, `${b.failedAttempts}`],
    ["Velocity events", `${a.velocityEvents}`, `${b.velocityEvents}`],
    ["Triggered rules", a.triggeredRules.join(", ") || "—", b.triggeredRules.join(", ") || "—"],
  ];
  const md = `## Session comparison

| Attribute | **${a.sessionId}** | **${b.sessionId}** |
|---|---|---|
${rows.map((r) => `| ${r[0]} | ${r[1]} | ${r[2]} |`).join("\n")}

### Key differences

- Risk delta: **${a.riskScore - b.riskScore > 0 ? "+" : ""}${a.riskScore - b.riskScore}** points
- Decision: ${a.decision === b.decision ? "_same_" : `**${a.decision}** vs **${b.decision}**`}
- ${a.newDevice && !b.newDevice ? `${a.sessionId} used a first-seen device; ${b.sessionId} did not.` : !a.newDevice && b.newDevice ? `${b.sessionId} used a first-seen device; ${a.sessionId} did not.` : "Both sessions share the same device-trust state."}
`;
  return { markdown: md, citations: [{ label: "Session Explorer", ref: "sessions" }] };
}

function suggestPolicy(s: LoginSession): { markdown: string; citations: { label: string; ref: string }[] } {
  const md = `## Suggested policy

Given the patterns observed in **${s.sessionId}**, consider the following policy adjustments:

### 1. Tighten impossible-travel handling

\`\`\`dsl
policy "Impossible Travel + New Device" {
  when session.impossibleTravel = true AND device.firstSeen = true
  then { action = "deny", notify = "customer,oob", escalate = "fraud-ops" }
}
\`\`\`

### 2. Step-up for VPN + new device

\`\`\`dsl
policy "VPN New Device Step-Up" {
  when ip.vpn = true AND device.firstSeen = true
  then { action = "challenge", mfa = "hardware-key" }
}
\`\`\`

### 3. Velocity-based soft challenge

\`\`\`dsl
policy "Velocity Soft Challenge" {
  when session.velocity1h > 10
  then { action = "challenge", mfa = "authenticator-app" }
}
\`\`\`

### Expected impact

- **Detection lift:** +4.2% on ATO cases
- **False-positive delta:** +0.8%
- **Customer friction:** +1.1% challenge rate

> Promote to the **retail-v35** bundle and shadow-deploy for 7 days before full rollout.
`;
  return { markdown: md, citations: [{ label: "Administration", ref: "administration" }] };
}

export function generateCopilotResponse(
  intent: CopilotIntent,
  ctx: CopilotContext,
  freeformText?: string,
): { markdown: string; citations?: { label: string; ref: string }[] } {
  const s = ctx.session;
  switch (intent) {
    case "why_blocked": {
      if (!s) return { markdown: "## Why blocked?\n\nSelect a session first — I'll explain the blocking signals." };
      return whyBlocked(s);
    }
    case "summarize_session": {
      if (!s) return { markdown: "## Summarize session\n\nOpen a session investigation and I'll summarize it." };
      return summarizeSession(s);
    }
    case "explain_evidence": {
      if (!s) return { markdown: "## Explain evidence\n\nSelect a session to explain its evidence cards." };
      return explainEvidence(s);
    }
    case "recommend_rule": {
      if (!s) return { markdown: "## Recommend rule\n\nSelect a session and I'll draft a rule to catch its pattern." };
      return recommendRule(s);
    }
    case "investigation_report": {
      if (!s) return { markdown: "## Investigation report\n\nSelect a session to generate a full report." };
      return investigationReport(s);
    }
    case "compare_sessions":
      return compareSessions(ctx);
    case "suggest_policy": {
      if (!s) return { markdown: "## Suggest policy\n\nSelect a session and I'll suggest policy adjustments." };
      return suggestPolicy(s);
    }
    case "freeform": {
      const text = (freeformText ?? "").trim();
      if (!text) return { markdown: "I'm CoherenceIQ Copilot. Ask me about any session, rule, or policy." };
      return {
        markdown: `## You asked\n\n> ${text}\n\nI can give you a precise answer once you select a session. Try one of the suggested prompts above for structured analysis — *why blocked*, *summarize session*, *explain evidence*, *recommend rule*, *investigation report*, *compare sessions*, or *suggest policy*.`,
        citations: [],
      };
    }
  }
}

export function uid(prefix = "msg"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}
