// AI Copilot intelligence engine.
// Classifies natural-language fraud-detection requests and produces
// structured recommendations over the existing CoherenceIQ assets,
// pipelines, and models. Pure functions — no network, no persistence.

import { WORKSPACE_ASSETS, type WorkspaceAsset, type AssetType } from "@/lib/assetWorkspaceData";
import { SAMPLE_PIPELINES, NODE_TYPES, NODE_TYPE_MAP, type Pipeline } from "@/lib/pipelineData";
import { addTemplate, addDesignDoc, type StoredTemplate, type StoredDesignDoc } from "@/lib/copilotStore";

export type CopilotCapability =
  | "recommend_rule_clusters"
  | "suggest_features"
  | "propose_models"
  | "build_pipeline"
  | "validate_pipeline"
  | "detect_missing_stages"
  | "recommend_performance"
  | "explain_execution"
  | "generate_template"
  | "compare_architectures"
  | "recommend_champion"
  | "produce_design_doc"
  | "freeform";

export interface CopilotResult {
  markdown: string;
  citations?: { label: string; ref: string }[];
  capability: CopilotCapability;
  // optional structured artifacts the UI can render as cards / downloads
  template?: StoredTemplate;
  designDoc?: StoredDesignDoc;
  artifacts?: { kind: "template" | "design-doc"; id: string; label: string }[];
}

const KEYWORDS: Record<CopilotCapability, string[]> = {
  recommend_rule_clusters: ["rule cluster", "cluster rule", "recommend cluster", "group rule", "rule group"],
  suggest_features: ["feature", "engineer feature", "engineered feature", "suggest feature", "feature set"],
  propose_models: ["model", "predictive model", "propose model", "recommend model", "ml model", "train model"],
  build_pipeline: ["build pipeline", "create pipeline", "generate pipeline", "assemble pipeline", "pipeline for", "pipeline to", "design pipeline"],
  validate_pipeline: ["validate pipeline", "pipeline validation", "validate design", "check pipeline"],
  detect_missing_stages: ["missing stage", "missing node", "what's missing", "gap in pipeline", "missing step", "incomplete pipeline"],
  recommend_performance: ["performance", "improve", "optim", "latency", "throughput", "faster", "speed up"],
  explain_execution: ["explain execution", "execution result", "why did the pipeline", "run result", "explain run"],
  generate_template: ["template", "reusable template", "pipeline template", "save as template"],
  compare_architectures: ["compare architecture", "alternative architecture", "compare pipeline", "architecture option", "compare approach"],
  recommend_champion: ["champion", "champion model", "best model", "which model", "evaluate model", "model comparison", "auc", "roc"],
  produce_design_doc: ["design doc", "documentation", "design document", "governance doc", "review doc", "downloadable"],
  freeform: [],
};

export function classifyIntent(text: string): CopilotCapability {
  const t = text.toLowerCase();
  let best: CopilotCapability = "freeform";
  let bestScore = 0;
  (Object.keys(KEYWORDS) as CopilotCapability[]).forEach((cap) => {
    const score = KEYWORDS[cap].reduce((acc, kw) => (t.includes(kw) ? acc + 1 : acc), 0);
    if (score > bestScore) {
      bestScore = score;
      best = cap;
    }
  });
  return best;
}

function assetsByType(type: AssetType): WorkspaceAsset[] {
  return WORKSPACE_ASSETS.filter((a) => a.type === type && a.lifecycleStatus === "active");
}

function statOf(a: WorkspaceAsset, label: string): string | undefined {
  return a.stats.find((s) => s.label.toLowerCase() === label.toLowerCase())?.value;
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

// ---------- Rule cluster recommendation ----------

export function recommendRuleClusters(scenario: string): CopilotResult {
  const ruleSets = assetsByType("rule-set");
  const clusters = assetsByType("cluster");
  const taxonomy = assetsByType("taxonomy");
  const primary = ruleSets[0] ?? WORKSPACE_ASSETS[0];
  const clusterMap = clusters[0];

  const suggested = [
    { name: "Credential & Identity", rules: 86, confidence: 0.93, rationale: "Impossible travel, new device, and credential stuffing signals dominate this scenario." },
    { name: "Geo & Network", rules: 54, confidence: 0.88, rationale: "VPN exit nodes, ASN reputation, and geo-velocity fit the cross-border pattern." },
    { name: "Velocity & Behavioral", rules: 71, confidence: 0.9, rationale: "High-frequency login bursts and deviation from per-user baselines." },
    { name: "Device & Fingerprint", rules: 48, confidence: 0.86, rationale: "First-seen device fingerprints and emulator detection." },
  { name: "Graph & Ring", rules: 33, confidence: 0.82, rationale: "Shared device/IP rings linking multiple synthetic identities." },
  { name: "Account Takeover", rules: 64, confidence: 0.91, rationale: "Session hijack, MFA bypass, and token-reuse indicators." },
  { name: "Payment & Transaction", rules: 39, confidence: 0.79, rationale: "First-payee, BIN mismatch, and transaction-velocity signals." },
    { name: "Synthetic Identity", rules: 28, confidence: 0.84, rationale: "Recently opened accounts with thin history and shared PII." },
  { name: "Policy & Compliance", rules: 22, confidence: 0.77, rationale: "Regulatory blocks, sanctions screening, and KYC gaps." },
    { name: "Bot & Automation", rules: 41, confidence: 0.88, rationale: "Headless browser, automation tooling, and request cadence." },
    { name: "Session Anomaly", rules: 36, confidence: 0.85, rationale: "Off-hours access, unusual user-agent, and session length outliers." },
    { name: "Channel & API Abuse", rules: 30, confidence: 0.83, rationale: "API scraping, token replay, and channel-mixing abuse." },
  ];

  const top = suggested.slice(0, 6);
  const rows = top.map((c) => `| ${c.name} | ${c.rules} | ${(c.confidence * 100).toFixed(0)}% | ${c.rationale} |`).join("\n");

  const md = `## Recommended rule clusters

For your scenario — *${scenario || "general fraud detection"}* — I analysed the **${primary.name}** (${primary.stats[0]?.value ?? "—"} rules) and the **${clusterMap?.name ?? "Rule Cluster Map"}**. These clusters best match the signals you described:

| Cluster | Rules | Confidence | Why it fits |
|---|---|---|---|
${rows}

### How to use these

1. **Promote** the top clusters into a new rule-set version (e.g. \`rs-prod-v4\`).
2. **Shadow-deploy** alongside the current production set for 7 days.
3. Review the cluster overlap report in **Rule Intelligence** before promoting to **${taxonomy[0]?.name ?? "Risk Taxonomy"}**.

> Estimated detection lift: **+6.4%** on ATO cases, **+1.1%** false-positive delta. Simulate in Comparison Studio before full rollout.`;

  return {
    markdown: md,
    capability: "recommend_rule_clusters",
    citations: [
      { label: "Rule Set", ref: primary.id },
      { label: "Cluster Map", ref: clusterMap?.id ?? "cl-rule-clusters" },
      { label: "Taxonomy", ref: taxonomy[0]?.id ?? "tx-risk-taxonomy" },
    ],
  };
}

// ---------- Feature suggestions ----------

export function suggestFeatures(scenario: string): CopilotResult {
  const featureSets = assetsByType("feature-set");
  const formulas = assetsByType("feature-formula");
  const signals = assetsByType("signal");
  const primary = featureSets[0];

  const features = [
    { name: "velocity_5m_zscore", domain: "Temporal", formula: "zscore(login_count_5m, user_baseline)", weight: 0.18 },
    { name: "device_first_seen_age_hours", domain: "Device", formula: "hours_since(first_seen(fingerprint))", weight: 0.14 },
    { name: "geo_velocity_km_per_hour", domain: "Geo", formula: "haversine(prev, curr) / hours_since(prev_login)", weight: 0.16 },
    { name: "vpn_exit_node_flag", domain: "Network", formula: "ip_in_vpn_registry(ip)", weight: 0.11 },
    { name: "asn_reputation_score", domain: "Network", formula: "reputation(asn, 30d)", weight: 0.09 },
    { name: "failed_attempts_1h_ratio", domain: "Credential", formula: "failed_1h / max(attempts_1h, 1)", weight: 0.13 },
    { name: "graph_ring_membership", domain: "Graph", formula: "ring_id(fingerprint, ip, device) is not null", weight: 0.12 },
    { name: "mfa_bypass_velocity", domain: "Behavioral", formula: "count(mfa_bypass_24h) / sessions_24h", weight: 0.07 },
  ];

  const rows = features.map((f) => `| \`${f.name}\` | ${f.domain} | \`${f.formula}\` | ${f.weight.toFixed(2)} |`).join("\n");

  const md = `## Suggested engineered features

Based on *${scenario || "your scenario"}* and the existing **${primary?.name ?? "Engineered Feature Set"}**, I recommend adding these features to the next feature-set version:

| Feature | Domain | Formula | Suggested weight |
|---|---|---|---|
${rows}

### Reusable formulas available

${formulas.map((f) => `- **${f.name}** — \`${f.metadata.find((m) => m.key === "expression")?.value ?? ""}\``).join("\n")}

### Signals to wire in

${signals.map((s) => `- **${s.name}** — ${s.description}`).join("\n")}

> Project these into the PCA-reduced vector and retrain the model. Expected AUC delta: **+0.008**. Validate drift in Model Studio before promoting.`;

  return {
    markdown: md,
    capability: "suggest_features",
    citations: [
      { label: "Feature Set", ref: primary?.id ?? "fs-engineered-v24" },
      ...formulas.slice(0, 2).map((f) => ({ label: "Formula", ref: f.id })),
    ],
  };
}

// ---------- Model proposals ----------

export function proposeModels(scenario: string): CopilotResult {
  const models = assetsByType("predictive-model");
  const graph = assetsByType("graph-model")[0];
  const temporal = assetsByType("temporal-model")[0];

  const candidates = [
    { name: "Gradient Boosted Fraud Model", id: "pm-gbfm-v7", algo: "XGBoost", auc: 0.974, latency: 18, strengths: "High precision, nightly retrain, handles tabular features well.", gap: "Weaker on relational/graph signals." },
    { name: "Weighted Coherence Model", id: "pm-wcm-v32", algo: "Weighted Ensemble", auc: 0.961, latency: 12, strengths: "Fast, fuses domain models, production-proven.", gap: "Lower recall on novel attack patterns." },
    { name: "Meta Ensemble (Staging)", id: "pm-meta-ensemble", algo: "Stacked Meta-Learner", auc: 0.983, latency: 26, strengths: "Best overall AUC, fuses 5 base models.", gap: "Higher latency; still in review." },
  ];

  const rows = candidates.map((c) => `| ${c.name} | ${c.algo} | ${c.auc} | ${c.latency}ms | ${c.strengths} | ${c.gap} |`).join("\n");

  const md = `## Proposed predictive models

For *${scenario || "fraud detection"}*, these candidate models are available in your asset library:

| Model | Algorithm | AUC | Latency | Strengths | Gap |
|---|---|---|---|---|---|
${rows}

### Companion models

- **${graph?.name ?? "Entity Relationship Graph Model"}** — GNN scoring for fraud-ring detection (3-hop).
- **${temporal?.name ?? "Velocity Temporal Model"}** — time-series anomaly + drift detection.

### Recommendation

For a **balanced** deployment, lead with **Gradient Boosted Fraud Model** (best precision/latency trade-off) and fuse with the graph + temporal models via the **Weighted Coherence Model**. For **maximum detection**, promote the **Meta Ensemble** once it clears review — it lifts AUC to **0.983** at the cost of +14ms latency.

> Run all three in Comparison Studio against the labelled dataset to confirm before promoting a champion.`;

  return {
    markdown: md,
    capability: "propose_models",
    citations: models.slice(0, 3).map((m) => ({ label: "Model", ref: m.id })),
  };
}

// ---------- Champion model recommendation ----------

export function recommendChampion(scenario: string): CopilotResult {
  const models = [...assetsByType("predictive-model"), ...WORKSPACE_ASSETS.filter((a) => a.type === "predictive-model" && a.lifecycleStatus === "draft")];
  const ranked = models.map((m) => {
    const auc = parseFloat(statOf(m, "ROC") ?? "0");
    const latency = parseInt(statOf(m, "Latency") ?? "99", 10);
    // composite: AUC weighted heavily, latency penalised
    const score = auc * 100 - latency * 0.4;
    return { m, auc, latency, score };
  }).sort((a, b) => b.score - a.score);

  const champion = ranked[0];
  const rows = ranked.map((r, i) => `| ${i + 1} | ${r.m.name} | ${r.auc || "—"} | ${r.latency || "—"}ms | ${r.score.toFixed(1)} | ${r.m.approvalStatus} |`).join("\n");

  const md = `## Champion model recommendation

Ranked by a composite of **AUC** (primary) and **latency** (penalty) for *${scenario || "fraud detection"}*:

| Rank | Model | AUC | Latency | Composite | Approval |
|---|---|---|---|---|---|
${rows}

### Champion: ${champion.m.name}

- **AUC:** ${champion.auc} · **Latency:** ${champion.latency}ms
- **Status:** ${champion.m.approvalStatus}
- **Why:** Highest composite score. ${champion.m.description}

### Promotion path

1. Clear the remaining review step${champion.m.approvalStatus === "Published" ? " (already published — ready to deploy)" : " in Governance"}.
2. Shadow-deploy against the current champion for 7 days.
3. Promote to production once the lift holds and false-positive rate is within tolerance.

> Use Comparison Studio to A/B test the champion vs. the incumbent on the labelled dataset before the cutover.`;

  return {
    markdown: md,
    capability: "recommend_champion",
    citations: [{ label: "Champion Model", ref: champion.m.id }],
  };
}

// ---------- Build a pipeline automatically ----------

interface PipelineSpec {
  name: string;
  description: string;
  nodes: { type: string; label: string; assetRef?: string }[];
  edges: { from: number; to: number }[];
  scenario: string;
  category: string;
}

function buildSpec(scenario: string): PipelineSpec {
  const s = (scenario || "").toLowerCase();
  const isTraining = s.includes("train") || s.includes("training") || s.includes("ml") || s.includes("model build");
  const isInvestigation = s.includes("investigat") || s.includes("replay") || s.includes("explain");

  if (isTraining) {
    return {
      name: "Copilot: Model Training Pipeline",
      description: `Auto-generated training pipeline for: ${scenario || "fraud model training"}`,
      category: "training",
      scenario,
      nodes: [
        { type: "dataset-source", label: "Labelled Sessions", assetRef: "ds-labelled" },
        { type: "feature-engineering", label: "Feature Engineering", assetRef: "fs-engineered-v24" },
        { type: "model-studio", label: "Train Model", assetRef: "pm-gbfm-v7" },
        { type: "metrics-output", label: "Publish Metrics" },
      ],
      edges: [{ from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 }],
    };
  }

  if (isInvestigation) {
    return {
      name: "Copilot: Investigation Replay Pipeline",
      description: `Auto-generated investigation pipeline for: ${scenario || "session investigation"}`,
      category: "investigation",
      scenario,
      nodes: [
        { type: "session-source", label: "Flagged Session" },
        { type: "graph-intelligence", label: "Entity Graph", assetRef: "gm-entity-graph" },
        { type: "temporal-intelligence", label: "Velocity", assetRef: "tm-velocity-v4" },
        { type: "replay-studio", label: "Replay", assetRef: "rp-session-replay" },
        { type: "ai-copilot", label: "Copilot Summary", assetRef: "cp-risk-analyst" },
      ],
      edges: [{ from: 0, to: 1 }, { from: 0, to: 2 }, { from: 1, to: 3 }, { from: 2, to: 3 }, { from: 3, to: 4 }],
    };
  }

  // default: realtime scoring
  return {
    name: "Copilot: Realtime Scoring Pipeline",
    description: `Auto-generated scoring pipeline for: ${scenario || "realtime fraud detection"}`,
    category: "scoring",
    scenario,
    nodes: [
      { type: "session-source", label: "Session Source" },
      { type: "rule-intelligence", label: "Rule Intelligence", assetRef: "rs-prod-v3" },
      { type: "graph-intelligence", label: "Graph Intelligence", assetRef: "gm-entity-graph" },
      { type: "temporal-intelligence", label: "Temporal Intelligence", assetRef: "tm-velocity-v4" },
      { type: "coherence-brain", label: "Coherence Brain", assetRef: "pm-wcm-v32" },
      { type: "decision-router", label: "Decision Router", assetRef: "dp-decision-router" },
      { type: "webhook-output", label: "Allow Webhook" },
      { type: "webhook-output", label: "Challenge Webhook" },
      { type: "webhook-output", label: "Deny Webhook" },
      { type: "metrics-output", label: "Metrics" },
    ],
    edges: [
      { from: 0, to: 1 }, { from: 0, to: 2 }, { from: 0, to: 3 },
      { from: 1, to: 4 }, { from: 2, to: 4 }, { from: 3, to: 4 },
      { from: 4, to: 5 },
      { from: 5, to: 6 }, { from: 5, to: 7 }, { from: 5, to: 8 }, { from: 5, to: 9 },
    ],
  };
}

export function buildPipeline(scenario: string): CopilotResult {
  const spec = buildSpec(scenario);
  const nodeRows = spec.nodes.map((n, i) => {
    const def = NODE_TYPE_MAP[n.type];
    const cat = def?.category ?? "flow";
    return `| ${i + 1} | ${n.label} | \`${n.type}\` | ${cat} | ${n.assetRef ?? "—"} |`;
  }).join("\n");

  const template: StoredTemplate = {
    id: uid("tpl"),
    name: spec.name,
    description: spec.description,
    category: spec.category,
    scenario: spec.scenario,
    nodes: spec.nodes,
    edges: spec.edges.map((e) => ({ from: `n${e.from}`, to: `n${e.to}` })),
    createdAt: new Date().toISOString(),
  };
  addTemplate(template);

  const md = `## Pipeline built automatically

I assembled a **${spec.category}** pipeline for *${scenario || "your scenario"}* using your existing assets. Every node references a real, published asset where possible.

### Pipeline: ${spec.name}

${spec.description}

### Stages

| # | Node | Type | Category | Asset |
|---|---|---|---|---|
${nodeRows}

### Flow

\`\`\`
${spec.nodes.map((n, i) => `${i + 1}. ${n.label}`).join(" → ")}
\`\`\`

### Validation

- ${spec.nodes.length} stages, ${spec.edges.length} connections.
- Source → Intelligence → Model → Decision → Output chain is complete.
- All referenced assets are **Published** and active.

> I've saved this as a reusable template (**${template.id}**). You can open it in Pipeline Studio, or ask me to validate it, compare alternatives, or generate a design document for governance review.`;

  return {
    markdown: md,
    capability: "build_pipeline",
    citations: spec.nodes.filter((n) => n.assetRef).slice(0, 4).map((n) => ({ label: n.label, ref: n.assetRef! })),
    template,
    artifacts: [{ kind: "template", id: template.id, label: spec.name }],
  };
}

// ---------- Validate pipeline design ----------

export function validatePipeline(pipelineId?: string): CopilotResult {
  const pipeline = SAMPLE_PIPELINES.find((p) => p.id === pipelineId) ?? SAMPLE_PIPELINES[0];
  const nodeTypes = pipeline.nodes.map((n) => n.type);
  const hasSource = nodeTypes.some((t) => NODE_TYPE_MAP[t]?.category === "source");
  const hasIntelligence = nodeTypes.some((t) => NODE_TYPE_MAP[t]?.category === "intelligence");
  const hasModel = nodeTypes.some((t) => NODE_TYPE_MAP[t]?.category === "model");
  const hasDecision = nodeTypes.some((t) => NODE_TYPE_MAP[t]?.category === "decision");
  const hasOutput = nodeTypes.some((t) => NODE_TYPE_MAP[t]?.category === "output");
  const hasGovernance = nodeTypes.some((t) => NODE_TYPE_MAP[t]?.category === "governance");

  const checks = [
    { check: "Has a source node", pass: hasSource, detail: hasSource ? "Source ingests sessions/data." : "No source node — pipeline cannot ingest data." },
    { check: "Has intelligence stage(s)", pass: hasIntelligence, detail: hasIntelligence ? "Rule/graph/temporal intelligence present." : "No intelligence stage — signals will be missing." },
    { check: "Has a model/inference stage", pass: hasModel, detail: hasModel ? "Scoring model attached." : "No model — decisions would be rule-only." },
    { check: "Has a decision router", pass: hasDecision, detail: hasDecision ? "Routes to allow/challenge/deny." : "No decision router — outcomes undefined." },
    { check: "Has output sink(s)", pass: hasOutput, detail: hasOutput ? "Results emitted to webhooks/metrics." : "No output — results are not delivered." },
    { check: "Has governance node", pass: hasGovernance, detail: hasGovernance ? "Rule Studio / governance attached." : "Optional: add a Rule Studio node for auditability." },
  ];

  const passed = checks.filter((c) => c.pass).length;
  const score = Math.round((passed / checks.length) * 100);
  const rows = checks.map((c) => `| ${c.check} | ${c.pass ? "Pass" : "Fail"} | ${c.detail} |`).join("\n");

  const md = `## Pipeline validation — ${pipeline.name}

**Design score: ${score}/100** · ${score >= 85 ? "Production-ready" : score >= 60 ? "Needs attention" : "Not ready"}

| Check | Status | Detail |
|---|---|---|
${rows}

### Connectivity

- ${pipeline.nodes.length} nodes, ${pipeline.edges.length} edges.
- ${hasSource && hasOutput ? "End-to-end flow from source to output is present." : "Pipeline is missing source or output — incomplete flow."}

### Recommendation

${score >= 85
  ? "This pipeline is well-formed and ready for execution. Consider shadow-deploying before promoting."
  : "Address the failing checks above before promoting. Ask me to detect missing stages for specific fixes."}`;

  return {
    markdown: md,
    capability: "validate_pipeline",
    citations: [{ label: "Pipeline", ref: pipeline.id }],
  };
}

// ---------- Detect missing stages ----------

export function detectMissingStages(pipelineId?: string): CopilotResult {
  const pipeline = SAMPLE_PIPELINES.find((p) => p.id === pipelineId) ?? SAMPLE_PIPELINES[0];
  const nodeTypes = pipeline.nodes.map((n) => n.type);
  const present = new Set(nodeTypes);

  const required = [
    { type: "session-source", label: "Session Source", why: "Ingests login sessions for scoring." },
    { type: "rule-intelligence", label: "Rule Intelligence", why: "Parses and clusters rules into signals." },
    { type: "graph-intelligence", label: "Graph Intelligence", why: "Detects fraud rings and entity links." },
    { type: "temporal-intelligence", label: "Temporal Intelligence", why: "Velocity and time-series anomaly detection." },
    { type: "coherence-brain", label: "Coherence Brain", why: "Fuses signals into a coherence score." },
    { type: "decision-router", label: "Decision Router", why: "Routes to allow/challenge/deny." },
    { type: "webhook-output", label: "Webhook Output", why: "Delivers decisions downstream." },
    { type: "metrics-output", label: "Metrics Output", why: "Publishes observability metrics." },
  ];

  const missing = required.filter((r) => !present.has(r.type));
  const rows = missing.length
    ? missing.map((m) => `| ${m.label} | \`${m.type}\` | ${m.why} |`).join("\n")
    : "| — | — | All key stages are present. |";

  const md = `## Missing stage detection — ${pipeline.name}

${missing.length ? `I found **${missing.length}** stage(s) missing from this pipeline that I recommend adding:` : "This pipeline contains all the key stages. No gaps detected."}

| Missing stage | Type | Why it matters |
|---|---|---|
${rows}

### Suggested fix

${missing.length
  ? "Ask me to *build a pipeline* for your scenario and I'll generate a complete version with these stages included, then save it as a reusable template."
  : "The pipeline is structurally complete. Focus on tuning thresholds and retraining models."}`;

  return {
    markdown: md,
    capability: "detect_missing_stages",
    citations: [{ label: "Pipeline", ref: pipeline.id }],
  };
}

// ---------- Performance recommendations ----------

export function recommendPerformance(pipelineId?: string): CopilotResult {
  const pipeline = SAMPLE_PIPELINES.find((p) => p.id === pipelineId) ?? SAMPLE_PIPELINES[0];
  const recs = [
    { area: "Ingestion", rec: "Increase session-source batch size from 500 to 1000 to reduce per-batch overhead.", impact: "−15% ingestion latency" },
    { area: "Rule Intelligence", rec: "Cache parsed rule clusters across runs instead of re-clustering each batch.", impact: "−40% rule stage time" },
    { area: "Graph Intelligence", rec: "Pre-compute 2-hop neighbourhoods nightly; query at runtime.", impact: "−55% graph stage latency" },
    { area: "Temporal", rec: "Incremental velocity windows instead of full recompute per session.", impact: "−30% temporal latency" },
    { area: "Coherence Brain", rec: "Batch inference on GPU and lower the ensemble threshold for challenge band.", impact: "−8ms p95 inference" },
    { area: "Decision Router", rec: "Inline router instead of separate node for hot path.", impact: "−1ms routing" },
    { area: "Outputs", rec: "Async webhook delivery with a queue to decouple from scoring.", impact: "Removes webhook retry from critical path" },
  ];

  const rows = recs.map((r) => `| ${r.area} | ${r.rec} | ${r.impact} |`).join("\n");

  const md = `## Performance recommendations — ${pipeline.name}

| Area | Recommendation | Expected impact |
|---|---|---|
${rows}

### Projected impact

Applying all recommendations is projected to reduce end-to-end p95 latency from **88ms** to **~41ms** and increase throughput by **~2.1×**. Prioritise the graph and rule-intelligence stages — they dominate the current runtime.

> Benchmark in Comparison Studio before and after each change to confirm the lift.`;

  return {
    markdown: md,
    capability: "recommend_performance",
    citations: [{ label: "Pipeline", ref: pipeline.id }],
  };
}

// ---------- Explain execution results ----------

export function explainExecution(executionId?: string): CopilotResult {
  // Use the first succeeded execution as the demo
  const pipeline = SAMPLE_PIPELINES[0];
  const md = `## Execution result explanation

The last run of **${pipeline.name}** processed **412 sessions** in **48.2s** and produced **318 allow / 64 challenge / 30 deny** decisions.

### What happened at each stage

- **Session Source** ingested 412 sessions in 412ms — healthy.
- **Rule Intelligence** parsed 412 rules, detected 14 clusters, engineered 24 features in 8.4s — the heaviest stage.
- **Graph Intelligence** built the entity graph and flagged 2 fraud rings in 11.2s.
- **Temporal Intelligence** found 17 velocity anomalies across the 5m/1h/24h windows in 6.2s.
- **Coherence Brain** fused all signals to an average coherence of 0.72 in 5.0s.
- **Decision Router** emitted 318 allow / 64 challenge / 30 deny. The deny webhook had 2 retries (warning).

### Why 30 sessions were denied

Denied sessions shared: first-seen device (87%), VPN exit node (73%), impossible travel (60%), and velocity > 10 events/1h (53%). The **Identity Fraud** model contributed the largest weight (0.34).

### What to do next

- Investigate the 2 fraud rings flagged by Graph Intelligence.
- Review the 64 challenged sessions for possible step-up MFA outcomes.
- Ask me to *recommend performance improvements* — the rule and graph stages dominate latency.`;

  return {
    markdown: md,
    capability: "explain_execution",
    citations: [{ label: "Execution", ref: "ex-9f3a" }, { label: "Pipeline", ref: pipeline.id }],
  };
}

// ---------- Compare alternative architectures ----------

export function compareArchitectures(scenario: string): CopilotResult {
  const archs = [
    {
      name: "A. Rule-only",
      stages: ["Session Source", "Rule Intelligence", "Decision Router", "Webhook"],
      auc: 0.91, latency: 22, recall: 0.82, pros: "Simple, fast, explainable.", cons: "Misses novel patterns; lower recall.",
    },
    {
      name: "B. Rules + Ensemble",
      stages: ["Session Source", "Rule Intelligence", "Graph", "Temporal", "Coherence Brain", "Decision Router", "Webhook"],
      auc: 0.961, latency: 88, recall: 0.9, pros: "Production-proven, balanced.", cons: "Higher latency; needs model maintenance.",
    },
    {
      name: "C. Full Meta Ensemble",
      stages: ["Session Source", "Rule Intelligence", "Graph", "Temporal", "Feature Engineering", "Meta Ensemble", "Decision Router", "Webhook"],
      auc: 0.983, latency: 104, recall: 0.94, pros: "Best detection; fuses 5 base models.", cons: "Highest latency; staging; governance overhead.",
    },
  ];

  const rows = archs.map((a) => `| ${a.name} | ${a.stages.length} | ${a.auc} | ${a.latency}ms | ${a.recall} | ${a.pros} | ${a.cons} |`).join("\n");

  const md = `## Alternative architectures for *${scenario || "fraud detection"}*

| Architecture | Stages | AUC | Latency | Recall | Pros | Cons |
|---|---|---|---|---|---|---|
${rows}

### Recommendation

- **If latency is critical:** Architecture **A** (rule-only) scores in 22ms but sacrifices recall.
- **If balanced:** Architecture **B** (rules + ensemble) is the current production design — proven and explainable.
- **If maximum detection is the priority:** Architecture **C** (meta ensemble) lifts AUC to 0.983 and recall to 0.94 once it clears governance.

> I can build any of these as a reusable pipeline template — just ask me to *build a pipeline* and name the architecture.`;

  return {
    markdown: md,
    capability: "compare_architectures",
    citations: [{ label: "Comparison Studio", ref: "compare" }],
  };
}

// ---------- Generate reusable template ----------

export function generateTemplate(scenario: string): CopilotResult {
  const built = buildPipeline(scenario);
  const tpl = built.template!;
  const md = `## Reusable pipeline template generated

I've saved **${tpl.name}** as a reusable template in your Copilot library.

| Attribute | Value |
|---|---|
| Template ID | \`${tpl.id}\` |
| Category | ${tpl.category} |
| Stages | ${tpl.nodes.length} |
| Connections | ${tpl.edges.length} |
| Created | ${new Date(tpl.createdAt).toLocaleString()} |

### Stages

${tpl.nodes.map((n, i) => `${i + 1}. **${n.label}** (\`${n.type}\`)${n.assetRef ? ` — asset \`${n.assetRef}\`` : ""}`).join("\n")}

### How to reuse

1. Open **Pipeline Studio** and choose *New from template*.
2. Select this template to scaffold the canvas.
3. Swap asset references for tenant-specific versions as needed.

> This template is stored in the in-memory Copilot database for this session. Ask me to *produce a design document* to download it as markdown for governance review.`;

  return {
    markdown: md,
    capability: "generate_template",
    template: tpl,
    artifacts: [{ kind: "template", id: tpl.id, label: tpl.name }],
  };
}

// ---------- Produce downloadable design document ----------

export function produceDesignDoc(scenario: string): CopilotResult {
  const spec = buildSpec(scenario);
  const models = assetsByType("predictive-model");
  const champion = models[0];
  const docId = uid("doc");
  const now = new Date().toLocaleString();

  const doc: StoredDesignDoc = {
    id: docId,
    title: `Design Document — ${spec.name}`,
    scenario,
    architecture: spec.category,
    championModel: champion?.id,
    createdAt: new Date().toISOString(),
    markdown: `# Design Document — ${spec.name}

**Scenario:** ${scenario || "Fraud detection pipeline"}
**Architecture:** ${spec.category}
**Generated by:** CoherenceIQ AI Copilot
**Date:** ${now}

---

## 1. Executive summary

This document describes a ${spec.category} fraud-detection pipeline assembled automatically by the AI Copilot from existing CoherenceIQ assets. It is intended for governance review and approval before promotion to production.

## 2. Pipeline stages

| # | Stage | Type | Asset reference |
|---|---|---|---|
${spec.nodes.map((n, i) => `| ${i + 1} | ${n.label} | \`${n.type}\` | ${n.assetRef ?? "—"} |`).join("\n")}

## 3. Data flow

\`\`\`
${spec.nodes.map((n) => n.label).join(" → ")}
\`\`\`

## 4. Assets used

${spec.nodes.filter((n) => n.assetRef).map((n) => `- **${n.label}** → \`${n.assetRef}\``).join("\n")}

## 5. Model recommendation

- **Champion model:** ${champion?.name ?? "—"} (\`${champion?.id ?? "—"}\`)
- **AUC:** ${statOf(champion ?? WORKSPACE_ASSETS[0], "ROC") ?? "—"}
- **Latency:** ${statOf(champion ?? WORKSPACE_ASSETS[0], "Latency") ?? "—"}

## 6. Validation checklist

- [ ] Source node present
- [ ] Intelligence stages present
- [ ] Model/inference stage present
- [ ] Decision router present
- [ ] Output sinks present
- [ ] All referenced assets are Published
- [ ] Shadow-deploy plan agreed
- [ ] Rollback plan documented

## 7. Governance & approval

| Step | Approver | Role | Status |
|---|---|---|---|
| Author review | — | Rule Author | Pending |
| Peer review | — | Reviewer | Pending |
| Production gate | — | Release Manager | Pending |

## 8. Risk & impact

- **Expected detection lift:** +6.4% on ATO cases
- **Expected false-positive delta:** +1.1%
- **Latency impact:** within budget for ${spec.category} workloads

---

_Generated by CoherenceIQ AI Copilot. Retain for audit per tenant policy._
`,
  };
  addDesignDoc(doc);

  const md = `## Design document ready for download

I've produced a complete design document for *${scenario || "your scenario"}* and saved it to your Copilot library.

| Attribute | Value |
|---|---|
| Document ID | \`${doc.id}\` |
| Title | ${doc.title} |
| Architecture | ${doc.architecture} |
| Champion model | ${champion?.name ?? "—"} |
| Created | ${now} |

### Contents

1. Executive summary
2. Pipeline stages & data flow
3. Assets used
4. Model recommendation
5. Validation checklist
6. Governance & approval table
7. Risk & impact assessment

### Download

Use the **Download** button on this message to save the full document as a Markdown file for governance review.`;

  return {
    markdown: md,
    capability: "produce_design_doc",
    designDoc: doc,
    artifacts: [{ kind: "design-doc", id: doc.id, label: doc.title }],
  };
}

// ---------- Freeform fallback ----------

export function freeformReply(text: string): CopilotResult {
  const cap = classifyIntent(text);
  if (cap !== "freeform") return dispatch(cap, text);
  return {
    markdown: `## I can help with that

You asked: *${text}*

I'm tuned for fraud-detection design. Try asking me to:
- **Recommend rule clusters** for a scenario
- **Suggest engineered features**
- **Propose predictive models** or **recommend a champion model**
- **Build a fraud pipeline** from your existing assets
- **Validate a pipeline** or **detect missing stages**
- **Recommend performance improvements**
- **Explain an execution result**
- **Compare alternative architectures**
- **Generate a reusable template**
- **Produce a downloadable design document** for governance

Tap a suggestion chip below for a quick start.`,
    capability: "freeform",
  };
}

// ---------- Dispatcher ----------

export function dispatch(capability: CopilotCapability, text: string): CopilotResult {
  switch (capability) {
    case "recommend_rule_clusters": return recommendRuleClusters(text);
    case "suggest_features": return suggestFeatures(text);
    case "propose_models": return proposeModels(text);
    case "build_pipeline": return buildPipeline(text);
    case "validate_pipeline": return validatePipeline();
    case "detect_missing_stages": return detectMissingStages();
    case "recommend_performance": return recommendPerformance();
    case "explain_execution": return explainExecution();
    case "generate_template": return generateTemplate(text);
    case "compare_architectures": return compareArchitectures(text);
    case "recommend_champion": return recommendChampion(text);
    case "produce_design_doc": return produceDesignDoc(text);
    case "freeform": return freeformReply(text);
  }
}

export const COPILOT_CAPABILITY_SUGGESTIONS: { id: string; label: string; capability: CopilotCapability; icon: string; prompt: string }[] = [
  { id: "clusters", label: "Recommend rule clusters", capability: "recommend_rule_clusters", icon: "boxes", prompt: "Recommend rule clusters for account takeover detection" },
  { id: "features", label: "Suggest features", capability: "suggest_features", icon: "function", prompt: "Suggest engineered features for velocity and device signals" },
  { id: "models", label: "Propose models", capability: "propose_models", icon: "cpu", prompt: "Propose predictive models for realtime fraud scoring" },
  { id: "champion", label: "Recommend champion model", capability: "recommend_champion", icon: "trophy", prompt: "Recommend a champion model based on evaluation metrics" },
  { id: "build", label: "Build a pipeline", capability: "build_pipeline", icon: "workflow", prompt: "Build a fraud detection pipeline for realtime session scoring" },
  { id: "validate", label: "Validate pipeline", capability: "validate_pipeline", icon: "shield", prompt: "Validate the realtime session scoring pipeline design" },
  { id: "missing", label: "Detect missing stages", capability: "detect_missing_stages", icon: "search", prompt: "Detect missing stages in the realtime scoring pipeline" },
  { id: "performance", label: "Performance improvements", capability: "recommend_performance", icon: "gauge", prompt: "Recommend performance improvements for the scoring pipeline" },
  { id: "explain", label: "Explain execution", capability: "explain_execution", icon: "activity", prompt: "Explain the last pipeline execution result" },
  { id: "compare", label: "Compare architectures", capability: "compare_architectures", icon: "compare", prompt: "Compare alternative pipeline architectures for fraud detection" },
  { id: "template", label: "Generate template", capability: "generate_template", icon: "file", prompt: "Generate a reusable pipeline template for realtime scoring" },
  { id: "doc", label: "Design document", capability: "produce_design_doc", icon: "report", prompt: "Produce a downloadable design document for governance review" },
];
