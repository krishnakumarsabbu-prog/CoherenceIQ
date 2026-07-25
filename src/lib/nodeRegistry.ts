import type { LucideIcon } from "lucide-react";
import {
  Database, FileJson, Globe, Radio, FileSpreadsheet, History, Layers3,
  Boxes, Workflow, Tags, ScanText, BrainCircuit, GitCompareArrows, Activity,
  Cpu, Brain, Share2, Clock, Gavel, ShieldCheck, GitBranch, FileOutput,
  Gauge, LayoutDashboard, FileText, Webhook, Network, TreePine, Spline,
  Boxes as BoxesIcon, Sparkles,
} from "lucide-react";

export type RegistryCategory =
  | "input" | "rule" | "signal" | "feature" | "ml"
  | "graph" | "temporal" | "decision" | "output";

export type FieldType = "string" | "number" | "boolean" | "select" | "array" | "object" | "code";

export interface SchemaField {
  name: string;
  type: FieldType;
  required?: boolean;
  description?: string;
  enum?: string[];
  default?: unknown;
  unit?: string;
}

export interface PortSchema {
  name: string;
  kind: "input" | "output";
  fields: SchemaField[];
  description?: string;
}

export interface ConfigFieldDef {
  key: string;
  label: string;
  type: FieldType;
  description?: string;
  required?: boolean;
  default: unknown;
  enum?: string[];
  min?: number;
  max?: number;
  unit?: string;
  group?: string;
}

export interface ValidationRule {
  field: string;
  rule: string;
  message: string;
}

export interface MetricDef {
  key: string;
  label: string;
  unit: string;
  description: string;
}

export interface ExplainabilityDef {
  method: string;
  description: string;
  outputs: string[];
}

export interface NodeRegistryEntry {
  id: string;
  type: string;
  label: string;
  category: RegistryCategory;
  icon: LucideIcon;
  color: string;
  description: string;
  tags: string[];
  ports: PortSchema[];
  config: ConfigFieldDef[];
  validation: ValidationRule[];
  metrics: MetricDef[];
  explainability: ExplainabilityDef;
  version: string;
  author: string;
  updatedAt: string;
  status: "stable" | "beta" | "experimental";
}

export const REGISTRY_CATEGORY_META: Record<RegistryCategory, { label: string; color: string; description: string }> = {
  input: { label: "Input Nodes", color: "#0ea5e9", description: "Ingest data from external sources into the pipeline" },
  rule: { label: "Rule Nodes", color: "#8b5cf6", description: "Parse, cluster, and reason over fraud rules" },
  signal: { label: "Signal Nodes", color: "#ec4899", description: "Derive risk signals and indicators from raw events" },
  feature: { label: "Feature Engineering Nodes", color: "#d946ef", description: "Transform, encode, and reduce features for models" },
  ml: { label: "ML Nodes", color: "#f59e0b", description: "Train and infer with supervised and unsupervised models" },
  graph: { label: "Graph Nodes", color: "#10b981", description: "Entity relationship graphs and fraud ring detection" },
  temporal: { label: "Temporal Nodes", color: "#14b8a6", description: "Time-series, velocity, and temporal anomaly detection" },
  decision: { label: "Decision Nodes", color: "#ef4444", description: "Combine scores into final allow/challenge/deny decisions" },
  output: { label: "Output Nodes", color: "#84cc16", description: "Emit decisions, metrics, and reports to downstream systems" },
};

const sessionFields: SchemaField[] = [
  { name: "sessionId", type: "string", required: true, description: "Unique session identifier" },
  { name: "customerId", type: "string", required: true },
  { name: "device", type: "object", description: "Device fingerprint and metadata" },
  { name: "ip", type: "string" },
  { name: "riskScore", type: "number", unit: "0-100" },
  { name: "timestamp", type: "string" },
];

const ruleFields: SchemaField[] = [
  { name: "ruleId", type: "string", required: true },
  { name: "name", type: "string", required: true },
  { name: "category", type: "string" },
  { name: "parameters", type: "object", description: "Rule parameters and thresholds" },
  { name: "weight", type: "number", default: 1 },
];

const featureFields: SchemaField[] = [
  { name: "featureVector", type: "array", description: "Numeric feature vector", required: true },
  { name: "featureNames", type: "array", description: "Ordered feature names" },
  { name: "dimensions", type: "number", unit: "dims" },
];

const scoreFields: SchemaField[] = [
  { name: "score", type: "number", required: true, unit: "0-1" },
  { name: "confidence", type: "number", unit: "0-1" },
  { name: "reasonCodes", type: "array", description: "Top contributing reason codes" },
];

const decisionFields: SchemaField[] = [
  { name: "decision", type: "string", required: true, enum: ["Allow", "Challenge", "Deny"] },
  { name: "riskScore", type: "number", required: true },
  { name: "reasonCodes", type: "array" },
  { name: "modelId", type: "string" },
];

const iso = (min: number) => new Date(Date.now() - min * 60_000).toISOString();

export const NODE_REGISTRY: NodeRegistryEntry[] = [
  // ─── Input Nodes ──────────────────────────────────────────────
  {
    id: "nr-json-input",
    type: "json-input",
    label: "JSON Input",
    category: "input",
    icon: FileJson,
    color: "#0ea5e9",
    description: "Ingest raw JSON payloads from a file, paste, or HTTP body. Validates against a provided schema before emitting.",
    tags: ["input", "json", "ingest"],
    ports: [
      { name: "out", kind: "output", fields: [{ name: "records", type: "array", required: true, description: "Parsed JSON records" }], description: "Validated JSON records" },
    ],
    config: [
      { key: "source", label: "Source", type: "select", default: "paste", enum: ["paste", "file", "url"], group: "Source" },
      { key: "rawJson", label: "Raw JSON", type: "code", default: "", description: "Inline JSON when source = paste", group: "Source" },
      { key: "url", label: "URL", type: "string", default: "", description: "Fetch URL when source = url", group: "Source" },
      { key: "schemaPath", label: "Schema Path", type: "string", default: "", description: "JSON path to validation schema", group: "Validation" },
      { key: "batchSize", label: "Batch Size", type: "number", default: 500, min: 1, max: 10000, unit: "rows", group: "Throughput" },
    ],
    validation: [
      { field: "rawJson", rule: "valid-json", message: "Raw JSON must parse successfully when source is paste" },
      { field: "url", rule: "required-when", message: "URL is required when source is url" },
    ],
    metrics: [
      { key: "rows_in", label: "Rows Ingested", unit: "rows", description: "Total records parsed and emitted" },
      { key: "parse_errors", label: "Parse Errors", unit: "count", description: "Records failing schema validation" },
      { key: "ingest_ms", label: "Ingest Latency", unit: "ms", description: "Time to parse and validate the batch" },
    ],
    explainability: { method: "schema-validation", description: "Reports which fields failed validation and why", outputs: ["parse_errors", "rejected_records"] },
    version: "1.2.0", author: "platform-team", updatedAt: iso(240), status: "stable",
  },
  {
    id: "nr-rest-input",
    type: "rest-input",
    label: "REST Input",
    category: "input",
    icon: Globe,
    color: "#0284c7",
    description: "Poll a REST endpoint on a schedule and emit the response payload as records.",
    tags: ["input", "rest", "http", "polling"],
    ports: [
      { name: "out", kind: "output", fields: [{ name: "records", type: "array", required: true }, { name: "responseMeta", type: "object", description: "HTTP status, headers, latency" }] },
    ],
    config: [
      { key: "url", label: "Endpoint URL", type: "string", required: true, default: "", group: "Endpoint" },
      { key: "method", label: "Method", type: "select", default: "GET", enum: ["GET", "POST"], group: "Endpoint" },
      { key: "headers", label: "Headers", type: "object", default: {}, description: "JSON header map", group: "Endpoint" },
      { key: "authType", label: "Auth Type", type: "select", default: "none", enum: ["none", "bearer", "apikey", "basic"], group: "Auth" },
      { key: "pollIntervalSec", label: "Poll Interval", type: "number", default: 30, min: 5, max: 3600, unit: "s", group: "Schedule" },
      { key: "timeoutMs", label: "Timeout", type: "number", default: 10000, min: 100, max: 60000, unit: "ms", group: "Schedule" },
    ],
    validation: [
      { field: "url", rule: "required", message: "Endpoint URL is required" },
      { field: "url", rule: "url-format", message: "Must be a valid http(s) URL" },
      { field: "pollIntervalSec", rule: "min:5", message: "Poll interval must be at least 5 seconds" },
    ],
    metrics: [
      { key: "requests", label: "Requests", unit: "count", description: "Total HTTP requests made" },
      { key: "success_rate", label: "Success Rate", unit: "%", description: "Percentage of 2xx responses" },
      { key: "p95_latency", label: "p95 Latency", unit: "ms", description: "95th percentile response latency" },
    ],
    explainability: { method: "response-tracing", description: "Logs each request/response with status code and duration", outputs: ["request_log", "error_bodies"] },
    version: "1.1.0", author: "platform-team", updatedAt: iso(180), status: "stable",
  },
  {
    id: "nr-kafka-input",
    type: "kafka-input",
    label: "Kafka Input",
    category: "input",
    icon: Radio,
    color: "#0369a1",
    description: "Consume events from a Kafka topic with consumer group support and offset management.",
    tags: ["input", "kafka", "streaming"],
    ports: [
      { name: "out", kind: "output", fields: [{ name: "records", type: "array", required: true }, { name: "partition", type: "number" }, { name: "offset", type: "number" }] },
    ],
    config: [
      { key: "brokers", label: "Brokers", type: "string", required: true, default: "", description: "Comma-separated broker list", group: "Connection" },
      { key: "topic", label: "Topic", type: "string", required: true, default: "", group: "Connection" },
      { key: "consumerGroup", label: "Consumer Group", type: "string", default: "fraud-pipeline", group: "Connection" },
      { key: "autoOffsetReset", label: "Auto Offset Reset", type: "select", default: "latest", enum: ["earliest", "latest"], group: "Consumption" },
      { key: "maxPollRecords", label: "Max Poll Records", type: "number", default: 500, min: 1, max: 10000, group: "Consumption" },
      { key: "tls", label: "TLS", type: "boolean", default: true, group: "Security" },
    ],
    validation: [
      { field: "brokers", rule: "required", message: "At least one broker is required" },
      { field: "topic", rule: "required", message: "Topic name is required" },
    ],
    metrics: [
      { key: "messages_consumed", label: "Messages Consumed", unit: "count", description: "Total records consumed from the topic" },
      { key: "lag", label: "Consumer Lag", unit: "records", description: "Current lag behind the latest offset" },
      { key: "rebalance_count", label: "Rebalances", unit: "count", description: "Consumer group rebalance events" },
    ],
    explainability: { method: "offset-tracking", description: "Tracks partition offsets and lag per consumer", outputs: ["offset_map", "lag_report"] },
    version: "1.0.1", author: "platform-team", updatedAt: iso(90), status: "stable",
  },
  {
    id: "nr-csv-input",
    type: "csv-input",
    label: "CSV Input",
    category: "input",
    icon: FileSpreadsheet,
    color: "#0891b2",
    description: "Parse CSV files with configurable delimiter, header detection, and type inference.",
    tags: ["input", "csv", "file"],
    ports: [
      { name: "out", kind: "output", fields: [{ name: "records", type: "array", required: true }, { name: "columns", type: "array", description: "Detected column names" }] },
    ],
    config: [
      { key: "filePath", label: "File Path", type: "string", required: true, default: "", group: "Source" },
      { key: "delimiter", label: "Delimiter", type: "select", default: ",", enum: [",", ";", "\t", "|"], group: "Parsing" },
      { key: "hasHeader", label: "Has Header", type: "boolean", default: true, group: "Parsing" },
      { key: "inferTypes", label: "Infer Types", type: "boolean", default: true, description: "Convert numeric and boolean strings", group: "Parsing" },
      { key: "batchSize", label: "Batch Size", type: "number", default: 1000, min: 1, max: 50000, unit: "rows", group: "Throughput" },
    ],
    validation: [
      { field: "filePath", rule: "required", message: "File path is required" },
      { field: "delimiter", rule: "single-char", message: "Delimiter must be a single character" },
    ],
    metrics: [
      { key: "rows_parsed", label: "Rows Parsed", unit: "rows", description: "Total rows successfully parsed" },
      { key: "parse_errors", label: "Parse Errors", unit: "count", description: "Malformed rows skipped" },
      { key: "parse_ms", label: "Parse Time", unit: "ms", description: "Total parse duration" },
    ],
    explainability: { method: "schema-inference", description: "Reports inferred column types and detected header", outputs: ["column_schema", "type_guesses"] },
    version: "1.0.0", author: "platform-team", updatedAt: iso(320), status: "stable",
  },
  {
    id: "nr-replay-input",
    type: "replay-input",
    label: "Replay Input",
    category: "input",
    icon: History,
    color: "#0e7490",
    description: "Replay a recorded session or event stream from a replay pack asset at adjustable speed.",
    tags: ["input", "replay", "investigation"],
    ports: [
      { name: "out", kind: "output", fields: [{ name: "records", type: "array", required: true }, { name: "replayMeta", type: "object", description: "Pack ID, speed, current step" }] },
    ],
    config: [
      { key: "replayAssetId", label: "Replay Pack Asset", type: "string", required: true, default: "", group: "Source" },
      { key: "speed", label: "Speed", type: "number", default: 1, min: 0.1, max: 100, unit: "x", group: "Playback" },
      { key: "breakpoints", label: "Breakpoints", type: "array", default: [], description: "Step indices to pause at", group: "Playback" },
      { key: "loop", label: "Loop", type: "boolean", default: false, group: "Playback" },
    ],
    validation: [
      { field: "replayAssetId", rule: "required", message: "A replay pack asset must be selected" },
      { field: "speed", rule: "min:0.1", message: "Speed must be at least 0.1x" },
    ],
    metrics: [
      { key: "events_replayed", label: "Events Replayed", unit: "count", description: "Events emitted from the pack" },
      { key: "current_step", label: "Current Step", unit: "index", description: "Position within the replay pack" },
      { key: "wall_time", label: "Wall Time", unit: "s", description: "Elapsed real time during replay" },
    ],
    explainability: { method: "step-tracing", description: "Each emitted event carries its original timestamp and source", outputs: ["event_timeline", "breakpoint_hits"] },
    version: "1.0.0", author: "investigations", updatedAt: iso(45), status: "stable",
  },
  {
    id: "nr-dataset-input",
    type: "dataset-input",
    label: "Dataset Input",
    category: "input",
    icon: Database,
    color: "#06b6d4",
    description: "Load a labelled dataset asset for training, backtesting, or batch scoring.",
    tags: ["input", "dataset", "training"],
    ports: [
      { name: "out", kind: "output", fields: [{ name: "records", type: "array", required: true }, { name: "schema", type: "object", description: "Dataset column schema" }, { name: "split", type: "string", enum: ["train", "test", "validation"] }] },
    ],
    config: [
      { key: "datasetAssetId", label: "Dataset Asset", type: "string", required: true, default: "", group: "Source" },
      { key: "split", label: "Split", type: "select", default: "train", enum: ["train", "test", "validation"], group: "Source" },
      { key: "limit", label: "Row Limit", type: "number", default: 0, description: "0 = all rows", group: "Throughput" },
      { key: "shuffle", label: "Shuffle", type: "boolean", default: false, group: "Throughput" },
    ],
    validation: [
      { field: "datasetAssetId", rule: "required", message: "A dataset asset must be selected" },
    ],
    metrics: [
      { key: "rows_loaded", label: "Rows Loaded", unit: "rows", description: "Total rows read from the dataset" },
      { key: "load_ms", label: "Load Time", unit: "ms", description: "Dataset load duration" },
    ],
    explainability: { method: "provenance", description: "Records dataset ID, version, and split for reproducibility", outputs: ["dataset_lineage"] },
    version: "1.0.0", author: "ml-ops", updatedAt: iso(5760), status: "stable",
  },

  // ─── Rule Nodes ───────────────────────────────────────────────
  {
    id: "nr-rule-parser",
    type: "rule-parser",
    label: "Rule Parser",
    category: "rule",
    icon: Layers3,
    color: "#8b5cf6",
    description: "Parse raw rule definitions (markdown, YAML, DSL) into structured rule objects with parameters and thresholds.",
    tags: ["rule", "parse", "dsl"],
    ports: [
      { name: "in", kind: "input", fields: [{ name: "rawRules", type: "array", required: true, description: "Raw rule text or files" }] },
      { name: "rules", kind: "output", fields: ruleFields, description: "Structured rule objects" },
      { name: "errors", kind: "output", fields: [{ name: "parseErrors", type: "array", description: "Unparseable rule fragments" }] },
    ],
    config: [
      { key: "format", label: "Input Format", type: "select", default: "markdown", enum: ["markdown", "yaml", "dsl", "json"], group: "Parsing" },
      { key: "strictMode", label: "Strict Mode", type: "boolean", default: false, description: "Fail on any parse error", group: "Parsing" },
      { key: "extractThresholds", label: "Extract Thresholds", type: "boolean", default: true, group: "Extraction" },
    ],
    validation: [
      { field: "format", rule: "required", message: "Input format must be specified" },
    ],
    metrics: [
      { key: "rules_parsed", label: "Rules Parsed", unit: "count", description: "Successfully structured rules" },
      { key: "parse_errors", label: "Parse Errors", unit: "count", description: "Rules that failed to parse" },
      { key: "parse_ms", label: "Parse Time", unit: "ms", description: "Total parse duration" },
    ],
    explainability: { method: "source-mapping", description: "Each parsed rule retains its source span and line number", outputs: ["source_spans", "parse_errors"] },
    version: "2.1.0", author: "governance-team", updatedAt: iso(180), status: "stable",
  },
  {
    id: "nr-cluster-engine",
    type: "cluster-engine",
    label: "Cluster Engine",
    category: "rule",
    icon: Boxes,
    color: "#a855f7",
    description: "Group similar rules into clusters using DBSCAN, k-means, or agglomerative clustering for governance and deduplication.",
    tags: ["rule", "clustering", "dbscan"],
    ports: [
      { name: "in", kind: "input", fields: ruleFields },
      { name: "clusters", kind: "output", fields: [{ name: "clusterId", type: "string", required: true }, { name: "rules", type: "array", required: true }, { name: "centroid", type: "array", description: "Cluster centroid vector" }, { name: "cohesion", type: "number", unit: "0-1" }] },
    ],
    config: [
      { key: "algorithm", label: "Algorithm", type: "select", default: "dbscan", enum: ["dbscan", "kmeans", "agglomerative"], group: "Algorithm" },
      { key: "minSamples", label: "Min Samples", type: "number", default: 3, min: 1, max: 50, group: "Algorithm" },
      { key: "eps", label: "Epsilon", type: "number", default: 0.5, min: 0.01, max: 2, description: "DBSCAN neighborhood radius", group: "Algorithm" },
      { key: "k", label: "K (clusters)", type: "number", default: 10, min: 1, max: 200, description: "For k-means", group: "Algorithm" },
    ],
    validation: [
      { field: "algorithm", rule: "required", message: "Clustering algorithm is required" },
      { field: "minSamples", rule: "min:1", message: "Min samples must be at least 1" },
    ],
    metrics: [
      { key: "clusters_found", label: "Clusters Found", unit: "count", description: "Number of distinct clusters" },
      { key: "noise_points", label: "Noise Points", unit: "count", description: "Rules not assigned to any cluster" },
      { key: "silhouette", label: "Silhouette Score", unit: "0-1", description: "Cluster separation quality" },
    ],
    explainability: { method: "centroid-analysis", description: "Each cluster reports its centroid, top members, and cohesion score", outputs: ["centroids", "member_rules", "cohesion"] },
    version: "1.3.0", author: "governance-team", updatedAt: iso(120), status: "stable",
  },
  {
    id: "nr-taxonomy",
    type: "taxonomy",
    label: "Taxonomy",
    category: "rule",
    icon: Tags,
    color: "#9333ea",
    description: "Classify rules into a hierarchical taxonomy of fraud categories and sub-categories.",
    tags: ["rule", "taxonomy", "classification"],
    ports: [
      { name: "in", kind: "input", fields: ruleFields },
      { name: "classified", kind: "output", fields: [...ruleFields, { name: "taxonomyPath", type: "string", description: "e.g. identity > account-takeover > new-device" }, { name: "confidence", type: "number", unit: "0-1" }] },
    ],
    config: [
      { key: "taxonomyAssetId", label: "Taxonomy Asset", type: "string", default: "", description: "Custom taxonomy; defaults to built-in", group: "Taxonomy" },
      { key: "depth", label: "Max Depth", type: "number", default: 3, min: 1, max: 6, group: "Taxonomy" },
      { key: "multiLabel", label: "Multi-label", type: "boolean", default: false, description: "Allow multiple category paths", group: "Taxonomy" },
    ],
    validation: [
      { field: "depth", rule: "min:1", message: "Depth must be at least 1" },
    ],
    metrics: [
      { key: "rules_classified", label: "Rules Classified", unit: "count", description: "Rules assigned a taxonomy path" },
      { key: "avg_confidence", label: "Avg Confidence", unit: "0-1", description: "Mean classification confidence" },
      { key: "unclassified", label: "Unclassified", unit: "count", description: "Rules with no matching category" },
    ],
    explainability: { method: "path-tracing", description: "Shows the full taxonomy path and confidence for each rule", outputs: ["taxonomy_paths", "confidence_scores"] },
    version: "1.0.0", author: "governance-team", updatedAt: iso(200), status: "beta",
  },
  {
    id: "nr-entity-extraction",
    type: "entity-extraction",
    label: "Entity Extraction",
    category: "rule",
    icon: ScanText,
    color: "#7c3aed",
    description: "Extract entities (devices, IPs, accounts, locations) from rule text and session payloads.",
    tags: ["rule", "ner", "entities"],
    ports: [
      { name: "in", kind: "input", fields: [{ name: "text", type: "string", required: true }] },
      { name: "entities", kind: "output", fields: [{ name: "entityId", type: "string", required: true }, { name: "entityType", type: "string", enum: ["device", "ip", "account", "location", "card"] }, { name: "value", type: "string" }, { name: "confidence", type: "number", unit: "0-1" }] },
    ],
    config: [
      { key: "entityTypes", label: "Entity Types", type: "array", default: ["device", "ip", "account"], description: "Which entity types to extract", group: "Extraction" },
      { key: "model", label: "Model", type: "select", default: "spacy", enum: ["spacy", "transformer", "regex"], group: "Model" },
      { key: "minConfidence", label: "Min Confidence", type: "number", default: 0.7, min: 0, max: 1, group: "Filtering" },
    ],
    validation: [
      { field: "entityTypes", rule: "non-empty", message: "At least one entity type must be selected" },
    ],
    metrics: [
      { key: "entities_found", label: "Entities Found", unit: "count", description: "Total extracted entities" },
      { key: "by_type", label: "By Type", unit: "map", description: "Count per entity type" },
      { key: "extraction_ms", label: "Extraction Time", unit: "ms", description: "Total extraction duration" },
    ],
    explainability: { method: "span-highlighting", description: "Each entity carries its character span and source text", outputs: ["entity_spans", "confidence_scores"] },
    version: "1.0.0", author: "governance-team", updatedAt: iso(150), status: "beta",
  },
  {
    id: "nr-intent-detection",
    type: "intent-detection",
    label: "Intent Detection",
    category: "rule",
    icon: BrainCircuit,
    color: "#6d28d9",
    description: "Detect the likely intent behind a session or event (login, payment, account-change) and flag suspicious intents.",
    tags: ["rule", "intent", "classification"],
    ports: [
      { name: "in", kind: "input", fields: sessionFields },
      { name: "intents", kind: "output", fields: [{ name: "intent", type: "string", required: true, enum: ["login", "payment", "account-change", "unknown"] }, { name: "suspicious", type: "boolean" }, { name: "confidence", type: "number", unit: "0-1" }] },
    ],
    config: [
      { key: "model", label: "Model", type: "select", default: "gradient-boosted", enum: ["gradient-boosted", "logistic", "transformer"], group: "Model" },
      { key: "suspiciousThreshold", label: "Suspicious Threshold", type: "number", default: 0.6, min: 0, max: 1, group: "Thresholds" },
    ],
    validation: [
      { field: "model", rule: "required", message: "A model must be selected" },
    ],
    metrics: [
      { key: "intents_detected", label: "Intents Detected", unit: "count", description: "Total classified intents" },
      { key: "suspicious_rate", label: "Suspicious Rate", unit: "%", description: "Percentage flagged suspicious" },
    ],
    explainability: { method: "feature-attribution", description: "Top features driving each intent label and suspicious flag", outputs: ["feature_weights", "top_features"] },
    version: "1.0.0", author: "fraud-platform", updatedAt: iso(75), status: "experimental",
  },
  {
    id: "nr-similarity-engine",
    type: "similarity-engine",
    label: "Similarity Engine",
    category: "rule",
    icon: GitCompareArrows,
    color: "#5b21b6",
    description: "Compute pairwise similarity between rules or sessions using cosine, Jaccard, or learned embeddings.",
    tags: ["rule", "similarity", "embedding"],
    ports: [
      { name: "in", kind: "input", fields: ruleFields },
      { name: "pairs", kind: "output", fields: [{ name: "ruleA", type: "string", required: true }, { name: "ruleB", type: "string", required: true }, { name: "similarity", type: "number", required: true, unit: "0-1" }, { name: "method", type: "string" }] },
    ],
    config: [
      { key: "method", label: "Similarity Method", type: "select", default: "cosine", enum: ["cosine", "jaccard", "euclidean", "learned"], group: "Method" },
      { key: "threshold", label: "Min Similarity", type: "number", default: 0.7, min: 0, max: 1, description: "Only emit pairs above this", group: "Filtering" },
      { key: "embeddingDim", label: "Embedding Dim", type: "number", default: 64, min: 8, max: 512, description: "For learned embeddings", group: "Method" },
    ],
    validation: [
      { field: "method", rule: "required", message: "Similarity method is required" },
    ],
    metrics: [
      { key: "pairs_emitted", label: "Pairs Emitted", unit: "count", description: "Similarity pairs above threshold" },
      { key: "comparisons", label: "Comparisons", unit: "count", description: "Total pairwise comparisons computed" },
      { key: "compute_ms", label: "Compute Time", unit: "ms", description: "Total similarity computation time" },
    ],
    explainability: { method: "pair-attribution", description: "Each pair reports which features contributed most to similarity", outputs: ["contributing_features", "similarity_scores"] },
    version: "1.0.0", author: "governance-team", updatedAt: iso(110), status: "stable",
  },

  // ─── Signal Nodes ─────────────────────────────────────────────
  {
    id: "nr-velocity-signal",
    type: "velocity-signal",
    label: "Velocity Signal",
    category: "signal",
    icon: Activity,
    color: "#ec4899",
    description: "Compute event velocity (events per time window) and flag bursts above a threshold.",
    tags: ["signal", "velocity", "realtime"],
    ports: [
      { name: "in", kind: "input", fields: sessionFields },
      { name: "signals", kind: "output", fields: [{ name: "entityId", type: "string", required: true }, { name: "window", type: "string", description: "e.g. 5m, 1h" }, { name: "count", type: "number", required: true }, { name: "burst", type: "boolean" }] },
    ],
    config: [
      { key: "windows", label: "Windows", type: "array", default: ["5m", "1h", "24h"], description: "Time windows to track", group: "Windows" },
      { key: "entityKey", label: "Entity Key", type: "string", default: "customerId", group: "Grouping" },
      { key: "burstThreshold", label: "Burst Threshold", type: "number", default: 10, min: 1, description: "Events per window to flag", group: "Thresholds" },
    ],
    validation: [
      { field: "windows", rule: "non-empty", message: "At least one window must be specified" },
      { field: "entityKey", rule: "required", message: "Entity key is required" },
    ],
    metrics: [
      { key: "signals_emitted", label: "Signals Emitted", unit: "count", description: "Velocity signals produced" },
      { key: "bursts_detected", label: "Bursts Detected", unit: "count", description: "Entities exceeding the burst threshold" },
    ],
    explainability: { method: "window-breakdown", description: "Shows per-window counts and which window triggered the burst flag", outputs: ["window_counts", "burst_flags"] },
    version: "1.0.0", author: "fraud-platform", updatedAt: iso(60), status: "stable",
  },
  {
    id: "nr-anomaly-signal",
    type: "anomaly-signal",
    label: "Anomaly Signal",
    category: "signal",
    icon: Sparkles,
    color: "#db2777",
    description: "Detect statistical anomalies in session features using z-score, IQR, or isolation methods.",
    tags: ["signal", "anomaly", "statistics"],
    ports: [
      { name: "in", kind: "input", fields: sessionFields },
      { name: "signals", kind: "output", fields: [{ name: "entityId", type: "string", required: true }, { name: "feature", type: "string", required: true }, { name: "score", type: "number", required: true, unit: "z-score" }, { name: "anomalous", type: "boolean" }] },
    ],
    config: [
      { key: "method", label: "Method", type: "select", default: "zscore", enum: ["zscore", "iqr", "isolation"], group: "Method" },
      { key: "threshold", label: "Anomaly Threshold", type: "number", default: 3, min: 1, max: 10, description: "Z-score or IQR multiplier", group: "Thresholds" },
      { key: "features", label: "Features", type: "array", default: ["riskScore", "failedAttempts"], description: "Which features to monitor", group: "Features" },
    ],
    validation: [
      { field: "method", rule: "required", message: "Anomaly method is required" },
      { field: "features", rule: "non-empty", message: "At least one feature must be monitored" },
    ],
    metrics: [
      { key: "anomalies_found", label: "Anomalies Found", unit: "count", description: "Features flagged anomalous" },
      { key: "avg_score", label: "Avg Score", unit: "z-score", description: "Mean anomaly score across all checks" },
    ],
    explainability: { method: "score-breakdown", description: "Reports the raw value, mean, and std-dev used for each anomaly", outputs: ["value_stats", "anomaly_scores"] },
    version: "1.0.0", author: "fraud-platform", updatedAt: iso(50), status: "stable",
  },

  // ─── Feature Engineering Nodes ────────────────────────────────
  {
    id: "nr-feature-vectorizer",
    type: "feature-vectorizer",
    label: "Feature Vectorizer",
    category: "feature",
    icon: Workflow,
    color: "#d946ef",
    description: "Convert rule parameters and session fields into a numeric feature vector with encoding.",
    tags: ["feature", "vectorize", "encoding"],
    ports: [
      { name: "in", kind: "input", fields: ruleFields },
      { name: "features", kind: "output", fields: featureFields },
    ],
    config: [
      { key: "encoding", label: "Encoding", type: "select", default: "onehot", enum: ["onehot", "label", "target", "hash"], group: "Encoding" },
      { key: "hashDim", label: "Hash Dimensions", type: "number", default: 128, min: 16, max: 1024, description: "For hash encoding", group: "Encoding" },
      { key: "scale", label: "Scale", type: "select", default: "standard", enum: ["none", "standard", "minmax", "robust"], group: "Scaling" },
    ],
    validation: [
      { field: "encoding", rule: "required", message: "Encoding method is required" },
    ],
    metrics: [
      { key: "features_built", label: "Features Built", unit: "count", description: "Total features in the output vector" },
      { key: "vectorize_ms", label: "Vectorize Time", unit: "ms", description: "Total vectorization duration" },
    ],
    explainability: { method: "feature-mapping", description: "Maps each output feature index back to its source field and encoding", outputs: ["feature_map", "encoding_log"] },
    version: "1.0.0", author: "ml-ops", updatedAt: iso(140), status: "stable",
  },
  {
    id: "nr-feature-pca",
    type: "feature-pca",
    label: "PCA Reducer",
    category: "feature",
    icon: Spline,
    color: "#c026d3",
    description: "Reduce high-dimensional feature vectors to principal components using PCA.",
    tags: ["feature", "pca", "reduction"],
    ports: [
      { name: "in", kind: "input", fields: featureFields },
      { name: "reduced", kind: "output", fields: featureFields },
    ],
    config: [
      { key: "nComponents", label: "Components", type: "number", default: 24, min: 2, max: 256, group: "Reduction" },
      { key: "whiten", label: "Whiten", type: "boolean", default: false, group: "Reduction" },
      { key: "explainedVariance", label: "Target Variance", type: "number", default: 0.95, min: 0.1, max: 1, description: "Auto-select components if set", group: "Reduction" },
    ],
    validation: [
      { field: "nComponents", rule: "min:2", message: "Need at least 2 components" },
    ],
    metrics: [
      { key: "variance_retained", label: "Variance Retained", unit: "%", description: "Cumulative explained variance" },
      { key: "output_dims", label: "Output Dims", unit: "dims", description: "Final number of components" },
    ],
    explainability: { method: "component-weights", description: "Shows top contributing original features per principal component", outputs: ["component_loadings", "variance_curve"] },
    version: "1.0.0", author: "ml-ops", updatedAt: iso(140), status: "stable",
  },

  // ─── ML Nodes ─────────────────────────────────────────────────
  {
    id: "nr-xgboost",
    type: "xgboost",
    label: "XGBoost",
    category: "ml",
    icon: Cpu,
    color: "#f59e0b",
    description: "Train or infer with XGBoost gradient-boosted trees for risk scoring and classification.",
    tags: ["ml", "xgboost", "gradient-boosting"],
    ports: [
      { name: "features", kind: "input", fields: featureFields },
      { name: "labels", kind: "input", fields: [{ name: "label", type: "string", enum: ["Allow", "Challenge", "Deny"] }], description: "Required for training mode" },
      { name: "predictions", kind: "output", fields: scoreFields },
    ],
    config: [
      { key: "mode", label: "Mode", type: "select", default: "infer", enum: ["train", "infer"], group: "Mode" },
      { key: "modelAssetId", label: "Model Asset", type: "string", default: "", description: "Required for inference", group: "Mode" },
      { key: "nEstimators", label: "Estimators", type: "number", default: 200, min: 10, max: 2000, group: "Hyperparameters" },
      { key: "maxDepth", label: "Max Depth", type: "number", default: 6, min: 1, max: 20, group: "Hyperparameters" },
      { key: "learningRate", label: "Learning Rate", type: "number", default: 0.1, min: 0.001, max: 1, group: "Hyperparameters" },
      { key: "subsample", label: "Subsample", type: "number", default: 0.8, min: 0.1, max: 1, group: "Hyperparameters" },
      { key: "validationSplit", label: "Validation Split", type: "number", default: 0.2, min: 0, max: 0.5, group: "Training" },
    ],
    validation: [
      { field: "modelAssetId", rule: "required-when", message: "Model asset is required in infer mode" },
      { field: "nEstimators", rule: "min:10", message: "Need at least 10 estimators" },
    ],
    metrics: [
      { key: "auc", label: "AUC", unit: "0-1", description: "Area under ROC curve" },
      { key: "train_ms", label: "Train Time", unit: "ms", description: "Total training duration" },
      { key: "infer_ms", label: "Infer Latency", unit: "ms", description: "Per-batch inference latency" },
    ],
    explainability: { method: "shap", description: "SHAP values per prediction showing feature contributions", outputs: ["shap_values", "feature_importance"] },
    version: "1.5.0", author: "ml-ops", updatedAt: iso(200), status: "stable",
  },
  {
    id: "nr-lightgbm",
    type: "lightgbm",
    label: "LightGBM",
    category: "ml",
    icon: Cpu,
    color: "#f97316",
    description: "Train or infer with LightGBM gradient-boosted trees, optimized for speed and large datasets.",
    tags: ["ml", "lightgbm", "gradient-boosting"],
    ports: [
      { name: "features", kind: "input", fields: featureFields },
      { name: "labels", kind: "input", fields: [{ name: "label", type: "string", enum: ["Allow", "Challenge", "Deny"] }] },
      { name: "predictions", kind: "output", fields: scoreFields },
    ],
    config: [
      { key: "mode", label: "Mode", type: "select", default: "infer", enum: ["train", "infer"], group: "Mode" },
      { key: "modelAssetId", label: "Model Asset", type: "string", default: "", group: "Mode" },
      { key: "nEstimators", label: "Estimators", type: "number", default: 300, min: 10, max: 5000, group: "Hyperparameters" },
      { key: "numLeaves", label: "Num Leaves", type: "number", default: 31, min: 2, max: 256, group: "Hyperparameters" },
      { key: "learningRate", label: "Learning Rate", type: "number", default: 0.05, min: 0.001, max: 1, group: "Hyperparameters" },
      { key: "boosting", label: "Boosting Type", type: "select", default: "gbdt", enum: ["gbdt", "dart", "goss"], group: "Hyperparameters" },
    ],
    validation: [
      { field: "modelAssetId", rule: "required-when", message: "Model asset is required in infer mode" },
    ],
    metrics: [
      { key: "auc", label: "AUC", unit: "0-1", description: "Area under ROC curve" },
      { key: "train_ms", label: "Train Time", unit: "ms", description: "Total training duration" },
      { key: "infer_ms", label: "Infer Latency", unit: "ms", description: "Per-batch inference latency" },
    ],
    explainability: { method: "shap", description: "SHAP values and split feature importance", outputs: ["shap_values", "split_importance"] },
    version: "1.3.0", author: "ml-ops", updatedAt: iso(180), status: "stable",
  },
  {
    id: "nr-catboost",
    type: "catboost",
    label: "CatBoost",
    category: "ml",
    icon: Cpu,
    color: "#ea580c",
    description: "Train or infer with CatBoost, handling categorical features natively without manual encoding.",
    tags: ["ml", "catboost", "categorical"],
    ports: [
      { name: "features", kind: "input", fields: featureFields },
      { name: "labels", kind: "input", fields: [{ name: "label", type: "string", enum: ["Allow", "Challenge", "Deny"] }] },
      { name: "predictions", kind: "output", fields: scoreFields },
    ],
    config: [
      { key: "mode", label: "Mode", type: "select", default: "infer", enum: ["train", "infer"], group: "Mode" },
      { key: "modelAssetId", label: "Model Asset", type: "string", default: "", group: "Mode" },
      { key: "iterations", label: "Iterations", type: "number", default: 500, min: 10, max: 5000, group: "Hyperparameters" },
      { key: "depth", label: "Tree Depth", type: "number", default: 6, min: 1, max: 16, group: "Hyperparameters" },
      { key: "learningRate", label: "Learning Rate", type: "number", default: 0.03, min: 0.001, max: 1, group: "Hyperparameters" },
      { key: "catFeatures", label: "Categorical Features", type: "array", default: [], description: "Feature names that are categorical", group: "Features" },
    ],
    validation: [
      { field: "modelAssetId", rule: "required-when", message: "Model asset is required in infer mode" },
    ],
    metrics: [
      { key: "auc", label: "AUC", unit: "0-1", description: "Area under ROC curve" },
      { key: "train_ms", label: "Train Time", unit: "ms", description: "Total training duration" },
      { key: "infer_ms", label: "Infer Latency", unit: "ms", description: "Per-batch inference latency" },
    ],
    explainability: { method: "prediction-diff", description: "Prediction values change attribution per feature", outputs: ["feature_contributions", "loss_changes"] },
    version: "1.2.0", author: "ml-ops", updatedAt: iso(160), status: "stable",
  },
  {
    id: "nr-random-forest",
    type: "random-forest",
    label: "Random Forest",
    category: "ml",
    icon: TreePine,
    color: "#d97706",
    description: "Train or infer with a random forest ensemble of decision trees with bagging.",
    tags: ["ml", "random-forest", "ensemble"],
    ports: [
      { name: "features", kind: "input", fields: featureFields },
      { name: "labels", kind: "input", fields: [{ name: "label", type: "string", enum: ["Allow", "Challenge", "Deny"] }] },
      { name: "predictions", kind: "output", fields: scoreFields },
    ],
    config: [
      { key: "mode", label: "Mode", type: "select", default: "infer", enum: ["train", "infer"], group: "Mode" },
      { key: "modelAssetId", label: "Model Asset", type: "string", default: "", group: "Mode" },
      { key: "nEstimators", label: "Trees", type: "number", default: 100, min: 1, max: 1000, group: "Hyperparameters" },
      { key: "maxDepth", label: "Max Depth", type: "number", default: 10, min: 1, max: 50, group: "Hyperparameters" },
      { key: "maxFeatures", label: "Max Features", type: "select", default: "sqrt", enum: ["sqrt", "log2", "all"], group: "Hyperparameters" },
      { key: "minSamplesSplit", label: "Min Samples Split", type: "number", default: 2, min: 2, max: 100, group: "Hyperparameters" },
    ],
    validation: [
      { field: "modelAssetId", rule: "required-when", message: "Model asset is required in infer mode" },
    ],
    metrics: [
      { key: "auc", label: "AUC", unit: "0-1", description: "Area under ROC curve" },
      { key: "oob_score", label: "OOB Score", unit: "0-1", description: "Out-of-bag accuracy" },
      { key: "train_ms", label: "Train Time", unit: "ms", description: "Total training duration" },
    ],
    explainability: { method: "gini-importance", description: "Gini impurity-based feature importance across trees", outputs: ["feature_importance", "tree_paths"] },
    version: "1.0.0", author: "ml-ops", updatedAt: iso(220), status: "stable",
  },
  {
    id: "nr-isolation-forest",
    type: "isolation-forest",
    label: "Isolation Forest",
    category: "ml",
    icon: BoxesIcon,
    color: "#ca8a04",
    description: "Unsupervised anomaly detection using isolation trees; flags outliers without labels.",
    tags: ["ml", "anomaly", "unsupervised"],
    ports: [
      { name: "features", kind: "input", fields: featureFields },
      { name: "predictions", kind: "output", fields: [{ name: "score", type: "number", required: true, unit: "0-1", description: "Anomaly score" }, { name: "anomalous", type: "boolean" }, { name: "reasonCodes", type: "array" }] },
    ],
    config: [
      { key: "mode", label: "Mode", type: "select", default: "infer", enum: ["train", "infer"], group: "Mode" },
      { key: "modelAssetId", label: "Model Asset", type: "string", default: "", group: "Mode" },
      { key: "nEstimators", label: "Trees", type: "number", default: 100, min: 1, max: 1000, group: "Hyperparameters" },
      { key: "contamination", label: "Contamination", type: "number", default: 0.05, min: 0.001, max: 0.5, description: "Expected anomaly ratio", group: "Hyperparameters" },
      { key: "maxSamples", label: "Max Samples", type: "number", default: 256, min: 16, max: 10000, group: "Hyperparameters" },
    ],
    validation: [
      { field: "modelAssetId", rule: "required-when", message: "Model asset is required in infer mode" },
      { field: "contamination", rule: "range:0.001-0.5", message: "Contamination must be between 0.001 and 0.5" },
    ],
    metrics: [
      { key: "anomalies_found", label: "Anomalies Found", unit: "count", description: "Records flagged anomalous" },
      { key: "avg_score", label: "Avg Score", unit: "0-1", description: "Mean anomaly score" },
      { key: "infer_ms", label: "Infer Latency", unit: "ms", description: "Per-batch inference latency" },
    ],
    explainability: { method: "path-length", description: "Average path length per feature used for isolation", outputs: ["path_lengths", "split_features"] },
    version: "1.0.0", author: "ml-ops", updatedAt: iso(190), status: "stable",
  },
  {
    id: "nr-logistic-regression",
    type: "logistic-regression",
    label: "Logistic Regression",
    category: "ml",
    icon: Spline,
    color: "#b45309",
    description: "Train or infer with logistic regression for interpretable, linear risk scoring.",
    tags: ["ml", "logistic", "linear", "interpretable"],
    ports: [
      { name: "features", kind: "input", fields: featureFields },
      { name: "labels", kind: "input", fields: [{ name: "label", type: "string", enum: ["Allow", "Challenge", "Deny"] }] },
      { name: "predictions", kind: "output", fields: scoreFields },
    ],
    config: [
      { key: "mode", label: "Mode", type: "select", default: "infer", enum: ["train", "infer"], group: "Mode" },
      { key: "modelAssetId", label: "Model Asset", type: "string", default: "", group: "Mode" },
      { key: "penalty", label: "Penalty", type: "select", default: "l2", enum: ["none", "l1", "l2", "elasticnet"], group: "Hyperparameters" },
      { key: "C", label: "Regularization C", type: "number", default: 1, min: 0.001, max: 100, group: "Hyperparameters" },
      { key: "maxIter", label: "Max Iterations", type: "number", default: 100, min: 10, max: 5000, group: "Hyperparameters" },
      { key: "classWeight", label: "Class Weight", type: "select", default: "balanced", enum: ["balanced", "none"], group: "Hyperparameters" },
    ],
    validation: [
      { field: "modelAssetId", rule: "required-when", message: "Model asset is required in infer mode" },
    ],
    metrics: [
      { key: "auc", label: "AUC", unit: "0-1", description: "Area under ROC curve" },
      { key: "coefficients", label: "Coefficients", unit: "count", description: "Number of learned coefficients" },
      { key: "train_ms", label: "Train Time", unit: "ms", description: "Total training duration" },
    ],
    explainability: { method: "coefficient-weights", description: "Direct coefficient weights per feature for full interpretability", outputs: ["coefficients", "odds_ratios"] },
    version: "1.0.0", author: "ml-ops", updatedAt: iso(250), status: "stable",
  },

  // ─── Graph Nodes ──────────────────────────────────────────────
  {
    id: "nr-graph-builder",
    type: "graph-builder",
    label: "Graph Builder",
    category: "graph",
    icon: Network,
    color: "#10b981",
    description: "Build an entity relationship graph (customer-device-IP) from session data for link analysis.",
    tags: ["graph", "entity", "relationships"],
    ports: [
      { name: "in", kind: "input", fields: sessionFields },
      { name: "graph", kind: "output", fields: [{ name: "nodes", type: "array", required: true, description: "Entity nodes" }, { name: "edges", type: "array", required: true, description: "Relationship edges" }, { name: "nodeCount", type: "number" }, { name: "edgeCount", type: "number" }] },
    ],
    config: [
      { key: "entityTypes", label: "Entity Types", type: "array", default: ["customer", "device", "ip", "location"], group: "Entities" },
      { key: "edgeStrength", label: "Edge Strength", type: "select", default: "co-occurrence", enum: ["co-occurrence", "frequency", "weighted"], group: "Edges" },
      { key: "minEdgeWeight", label: "Min Edge Weight", type: "number", default: 1, min: 1, max: 100, group: "Filtering" },
    ],
    validation: [
      { field: "entityTypes", rule: "non-empty", message: "At least one entity type is required" },
    ],
    metrics: [
      { key: "nodes", label: "Nodes", unit: "count", description: "Total entity nodes in the graph" },
      { key: "edges", label: "Edges", unit: "count", description: "Total relationship edges" },
      { key: "build_ms", label: "Build Time", unit: "ms", description: "Graph construction duration" },
    ],
    explainability: { method: "link-tracing", description: "Each edge records the sessions that created it", outputs: ["edge_provenance", "node_degrees"] },
    version: "1.2.0", author: "investigations", updatedAt: iso(90), status: "stable",
  },
  {
    id: "nr-fraud-ring-detector",
    type: "fraud-ring-detector",
    label: "Fraud Ring Detector",
    category: "graph",
    icon: Share2,
    color: "#059669",
    description: "Detect fraud rings and dense subgraphs in the entity graph using community detection.",
    tags: ["graph", "rings", "community"],
    ports: [
      { name: "graph", kind: "input", fields: [{ name: "nodes", type: "array", required: true }, { name: "edges", type: "array", required: true }] },
      { name: "rings", kind: "output", fields: [{ name: "ringId", type: "string", required: true }, { name: "entities", type: "array", required: true }, { name: "size", type: "number" }, { name: "density", type: "number", unit: "0-1" }, { name: "riskLevel", type: "string", enum: ["low", "medium", "high"] }] },
    ],
    config: [
      { key: "algorithm", label: "Algorithm", type: "select", default: "louvain", enum: ["louvain", "label-propagation", "triangle-counting"], group: "Algorithm" },
      { key: "minRingSize", label: "Min Ring Size", type: "number", default: 3, min: 2, max: 50, group: "Filtering" },
      { key: "minDensity", label: "Min Density", type: "number", default: 0.4, min: 0, max: 1, group: "Filtering" },
    ],
    validation: [
      { field: "minRingSize", rule: "min:2", message: "Ring size must be at least 2" },
    ],
    metrics: [
      { key: "rings_found", label: "Rings Found", unit: "count", description: "Detected fraud rings" },
      { key: "max_ring_size", label: "Largest Ring", unit: "entities", description: "Size of the biggest detected ring" },
      { key: "detect_ms", label: "Detection Time", unit: "ms", description: "Ring detection duration" },
    ],
    explainability: { method: "subgraph-isolation", description: "Each ring reports its member entities, density, and connecting edges", outputs: ["ring_members", "edge_subgraphs"] },
    version: "1.1.0", author: "investigations", updatedAt: iso(80), status: "stable",
  },

  // ─── Temporal Nodes ───────────────────────────────────────────
  {
    id: "nr-temporal-anomaly",
    type: "temporal-anomaly",
    label: "Temporal Anomaly",
    category: "temporal",
    icon: Clock,
    color: "#14b8a6",
    description: "Time-series anomaly detection over event streams using seasonal decomposition and forecasting.",
    tags: ["temporal", "anomaly", "time-series"],
    ports: [
      { name: "in", kind: "input", fields: sessionFields },
      { name: "anomalies", kind: "output", fields: [{ name: "timestamp", type: "string", required: true }, { name: "expected", type: "number" }, { name: "observed", type: "number" }, { name: "deviation", type: "number", unit: "z-score" }, { name: "anomalous", type: "boolean" }] },
    ],
    config: [
      { key: "method", label: "Method", type: "select", default: "seasonal", enum: ["seasonal", "arima", "ewma", "prophet"], group: "Method" },
      { key: "seasonality", label: "Seasonality", type: "select", default: "daily", enum: ["hourly", "daily", "weekly"], group: "Method" },
      { key: "sensitivity", label: "Sensitivity", type: "number", default: 0.7, min: 0.1, max: 1, group: "Thresholds" },
      { key: "windowSize", label: "Window Size", type: "number", default: 60, min: 5, max: 1440, unit: "min", group: "Method" },
    ],
    validation: [
      { field: "method", rule: "required", message: "Detection method is required" },
      { field: "sensitivity", rule: "range:0.1-1", message: "Sensitivity must be between 0.1 and 1" },
    ],
    metrics: [
      { key: "anomalies_found", label: "Anomalies Found", unit: "count", description: "Time points flagged anomalous" },
      { key: "avg_deviation", label: "Avg Deviation", unit: "z-score", description: "Mean deviation score" },
      { key: "detect_ms", label: "Detection Time", unit: "ms", description: "Total detection duration" },
    ],
    explainability: { method: "forecast-comparison", description: "Shows expected vs observed values and the seasonal baseline", outputs: ["expected_values", "deviation_scores"] },
    version: "1.0.0", author: "fraud-platform", updatedAt: iso(70), status: "stable",
  },
  {
    id: "nr-velocity-window",
    type: "velocity-window",
    label: "Velocity Window",
    category: "temporal",
    icon: Activity,
    color: "#0d9488",
    description: "Sliding-window velocity computation across multiple time horizons with configurable aggregation.",
    tags: ["temporal", "velocity", "windowing"],
    ports: [
      { name: "in", kind: "input", fields: sessionFields },
      { name: "windows", kind: "output", fields: [{ name: "entityId", type: "string", required: true }, { name: "window", type: "string", required: true }, { name: "count", type: "number", required: true }, { name: "rate", type: "number", unit: "events/min" }] },
    ],
    config: [
      { key: "windows", label: "Windows", type: "array", default: ["5m", "1h", "24h"], group: "Windows" },
      { key: "aggregation", label: "Aggregation", type: "select", default: "count", enum: ["count", "sum", "avg", "max"], group: "Aggregation" },
      { key: "entityKey", label: "Entity Key", type: "string", default: "customerId", group: "Grouping" },
    ],
    validation: [
      { field: "windows", rule: "non-empty", message: "At least one window is required" },
    ],
    metrics: [
      { key: "windows_computed", label: "Windows Computed", unit: "count", description: "Total entity-window aggregates" },
      { key: "compute_ms", label: "Compute Time", unit: "ms", description: "Window computation duration" },
    ],
    explainability: { method: "window-breakdown", description: "Per-window counts and rates for each entity", outputs: ["window_counts", "rates"] },
    version: "1.0.0", author: "fraud-platform", updatedAt: iso(55), status: "stable",
  },

  // ─── Decision Nodes ────────────────────────────────────────────
  {
    id: "nr-coherence-brain",
    type: "coherence-brain",
    label: "Coherence Brain",
    category: "decision",
    icon: Brain,
    color: "#f59e0b",
    description: "Core ML inference engine combining all signals into a coherence score and risk assessment.",
    tags: ["decision", "coherence", "ensemble"],
    ports: [
      { name: "signals", kind: "input", fields: [{ name: "scores", type: "array", required: true, description: "Signal scores from upstream nodes" }] },
      { name: "assessment", kind: "output", fields: [{ name: "coherenceScore", type: "number", required: true, unit: "0-1" }, { name: "riskScore", type: "number", required: true, unit: "0-100" }, { name: "confidence", type: "number", unit: "0-1" }, { name: "reasonCodes", type: "array" }] },
    ],
    config: [
      { key: "modelAssetId", label: "Model Asset", type: "string", required: true, default: "", group: "Model" },
      { key: "threshold", label: "Decision Threshold", type: "number", default: 0.5, min: 0, max: 1, group: "Thresholds" },
      { key: "weightSignals", label: "Weight Signals", type: "boolean", default: true, description: "Apply learned signal weights", group: "Model" },
      { key: "emitReasonCodes", label: "Emit Reason Codes", type: "boolean", default: true, group: "Output" },
    ],
    validation: [
      { field: "modelAssetId", rule: "required", message: "A model asset is required" },
      { field: "threshold", rule: "range:0-1", message: "Threshold must be between 0 and 1" },
    ],
    metrics: [
      { key: "avg_coherence", label: "Avg Coherence", unit: "0-1", description: "Mean coherence score across batch" },
      { key: "infer_ms", label: "Infer Latency", unit: "ms", description: "Per-batch inference latency" },
      { key: "reason_codes", label: "Reason Codes", unit: "count", description: "Unique reason codes emitted" },
    ],
    explainability: { method: "signal-attribution", description: "Decomposes the coherence score into per-signal contributions", outputs: ["signal_weights", "reason_codes"] },
    version: "3.2.0", author: "fraud-platform", updatedAt: iso(30), status: "stable",
  },
  {
    id: "nr-policy-engine",
    type: "policy-engine",
    label: "Policy Engine",
    category: "decision",
    icon: Gavel,
    color: "#dc2626",
    description: "Apply business policies and regulatory rules to override or constrain ML decisions.",
    tags: ["decision", "policy", "governance"],
    ports: [
      { name: "assessment", kind: "input", fields: [{ name: "riskScore", type: "number", required: true }, { name: "coherenceScore", type: "number" }] },
      { name: "decision", kind: "output", fields: decisionFields },
    ],
    config: [
      { key: "policyAssetId", label: "Policy Asset", type: "string", default: "", description: "Policy rule set; defaults to active", group: "Policy" },
      { key: "strictMode", label: "Strict Mode", type: "boolean", default: true, description: "Policy violations force Deny", group: "Policy" },
      { key: "allowOverride", label: "Allow Override", type: "boolean", default: false, description: "Permit policy overrides with reason", group: "Policy" },
    ],
    validation: [
      { field: "policyAssetId", rule: "required-when", message: "Policy asset required when not using default" },
    ],
    metrics: [
      { key: "overrides", label: "Overrides", unit: "count", description: "ML decisions overridden by policy" },
      { key: "violations", label: "Policy Violations", unit: "count", description: "Sessions violating policy rules" },
      { key: "evaluate_ms", label: "Evaluate Time", unit: "ms", description: "Policy evaluation latency" },
    ],
    explainability: { method: "rule-firing", description: "Logs which policy rules fired and their override decisions", outputs: ["fired_rules", "override_log"] },
    version: "2.0.0", author: "governance-team", updatedAt: iso(100), status: "stable",
  },
  {
    id: "nr-ensemble",
    type: "ensemble",
    label: "Ensemble",
    category: "decision",
    icon: Layers3,
    color: "#b91c1c",
    description: "Combine multiple model predictions using weighted averaging, stacking, or voting.",
    tags: ["decision", "ensemble", "voting"],
    ports: [
      { name: "predictions", kind: "input", fields: [{ name: "modelId", type: "string", required: true }, { name: "score", type: "number", required: true }] },
      { name: "ensemble", kind: "output", fields: scoreFields },
    ],
    config: [
      { key: "method", label: "Method", type: "select", default: "weighted-avg", enum: ["weighted-avg", "mean", "max", "voting", "stacking"], group: "Method" },
      { key: "weights", label: "Model Weights", type: "object", default: {}, description: "Model ID to weight map", group: "Method" },
      { key: "threshold", label: "Decision Threshold", type: "number", default: 0.5, min: 0, max: 1, group: "Thresholds" },
    ],
    validation: [
      { field: "method", rule: "required", message: "Ensemble method is required" },
    ],
    metrics: [
      { key: "models_combined", label: "Models Combined", unit: "count", description: "Number of models in the ensemble" },
      { key: "agreement", label: "Agreement", unit: "%", description: "Percentage of models agreeing" },
      { key: "combine_ms", label: "Combine Time", unit: "ms", description: "Ensemble computation latency" },
    ],
    explainability: { method: "model-contribution", description: "Shows each model's contribution to the final ensemble score", outputs: ["model_contributions", "agreement_score"] },
    version: "1.1.0", author: "ml-ops", updatedAt: iso(130), status: "stable",
  },

  // ─── Output Nodes ─────────────────────────────────────────────
  {
    id: "nr-decision-output",
    type: "decision-output",
    label: "Decision Output",
    category: "output",
    icon: GitBranch,
    color: "#84cc16",
    description: "Emit final allow/challenge/deny decisions with reason codes to the decision API.",
    tags: ["output", "decision", "api"],
    ports: [
      { name: "decision", kind: "input", fields: decisionFields },
    ],
    config: [
      { key: "endpoint", label: "Endpoint", type: "string", default: "/api/decisions", group: "Destination" },
      { key: "format", label: "Format", type: "select", default: "json", enum: ["json", "protobuf", "avro"], group: "Destination" },
      { key: "includeReasonCodes", label: "Include Reason Codes", type: "boolean", default: true, group: "Content" },
      { key: "asyncEmit", label: "Async Emit", type: "boolean", default: false, description: "Fire-and-forget without waiting for ack", group: "Delivery" },
    ],
    validation: [
      { field: "endpoint", rule: "required", message: "Endpoint is required" },
    ],
    metrics: [
      { key: "decisions_emitted", label: "Decisions Emitted", unit: "count", description: "Total decisions sent" },
      { key: "allow", label: "Allow", unit: "count", description: "Allow decisions" },
      { key: "challenge", label: "Challenge", unit: "count", description: "Challenge decisions" },
      { key: "deny", label: "Deny", unit: "count", description: "Deny decisions" },
    ],
    explainability: { method: "decision-log", description: "Full decision audit trail with reason codes and model IDs", outputs: ["decision_log", "reason_codes"] },
    version: "1.0.0", author: "fraud-platform", updatedAt: iso(40), status: "stable",
  },
  {
    id: "nr-json-output",
    type: "json-output",
    label: "JSON Output",
    category: "output",
    icon: FileOutput,
    color: "#65a30d",
    description: "Serialize pipeline results to JSON and write to a file, stream, or HTTP sink.",
    tags: ["output", "json", "serialize"],
    ports: [
      { name: "data", kind: "input", fields: [{ name: "records", type: "array", required: true }] },
    ],
    config: [
      { key: "destination", label: "Destination", type: "select", default: "file", enum: ["file", "stream", "http"], group: "Destination" },
      { key: "path", label: "Path / URL", type: "string", default: "", group: "Destination" },
      { key: "prettyPrint", label: "Pretty Print", type: "boolean", default: false, group: "Format" },
      { key: "batchSize", label: "Batch Size", type: "number", default: 1000, min: 1, max: 100000, unit: "rows", group: "Throughput" },
    ],
    validation: [
      { field: "path", rule: "required", message: "Path or URL is required" },
    ],
    metrics: [
      { key: "rows_written", label: "Rows Written", unit: "rows", description: "Total records serialized" },
      { key: "bytes_written", label: "Bytes Written", unit: "bytes", description: "Total output size" },
      { key: "write_ms", label: "Write Time", unit: "ms", description: "Serialization and write duration" },
    ],
    explainability: { method: "write-log", description: "Records destination, batch count, and any write errors", outputs: ["write_log", "error_log"] },
    version: "1.0.0", author: "platform-team", updatedAt: iso(120), status: "stable",
  },
  {
    id: "nr-dashboard-output",
    type: "dashboard-output",
    label: "Dashboard Output",
    category: "output",
    icon: LayoutDashboard,
    color: "#4d7c0f",
    description: "Publish pipeline results to a live dashboard widget for real-time monitoring.",
    tags: ["output", "dashboard", "monitoring"],
    ports: [
      { name: "data", kind: "input", fields: [{ name: "metrics", type: "object", required: true }] },
    ],
    config: [
      { key: "dashboardId", label: "Dashboard ID", type: "string", required: true, default: "", group: "Destination" },
      { key: "widgetType", label: "Widget Type", type: "select", default: "gauge", enum: ["gauge", "chart", "table", "counter"], group: "Display" },
      { key: "refreshMs", label: "Refresh Interval", type: "number", default: 5000, min: 500, max: 60000, unit: "ms", group: "Display" },
    ],
    validation: [
      { field: "dashboardId", rule: "required", message: "Dashboard ID is required" },
    ],
    metrics: [
      { key: "updates_sent", label: "Updates Sent", unit: "count", description: "Dashboard updates published" },
      { key: "publish_ms", label: "Publish Latency", unit: "ms", description: "Time to push an update" },
    ],
    explainability: { method: "metric-lineage", description: "Maps each dashboard metric to its source node and field", outputs: ["metric_sources", "update_log"] },
    version: "1.0.0", author: "fraud-platform", updatedAt: iso(35), status: "stable",
  },
  {
    id: "nr-report-output",
    type: "report-output",
    label: "Report Output",
    category: "output",
    icon: FileText,
    color: "#3f6212",
    description: "Generate a formatted investigation report (PDF, HTML, Markdown) from pipeline results.",
    tags: ["output", "report", "pdf"],
    ports: [
      { name: "data", kind: "input", fields: [{ name: "results", type: "object", required: true }] },
    ],
    config: [
      { key: "format", label: "Format", type: "select", default: "pdf", enum: ["pdf", "html", "markdown"], group: "Format" },
      { key: "template", label: "Template", type: "string", default: "investigation", description: "Report template name", group: "Format" },
      { key: "includeCharts", label: "Include Charts", type: "boolean", default: true, group: "Content" },
      { key: "outputPath", label: "Output Path", type: "string", default: "", group: "Destination" },
    ],
    validation: [
      { field: "format", rule: "required", message: "Report format is required" },
    ],
    metrics: [
      { key: "reports_generated", label: "Reports Generated", unit: "count", description: "Total reports produced" },
      { key: "pages", label: "Total Pages", unit: "pages", description: "Sum of pages across reports" },
      { key: "generate_ms", label: "Generation Time", unit: "ms", description: "Report rendering duration" },
    ],
    explainability: { method: "template-mapping", description: "Maps each report section to its data source", outputs: ["section_sources", "template_log"] },
    version: "1.0.0", author: "investigations", updatedAt: iso(85), status: "stable",
  },
  {
    id: "nr-webhook-output",
    type: "webhook-output",
    label: "Webhook Output",
    category: "output",
    icon: Webhook,
    color: "#4ade80",
    description: "Emit pipeline results to an external webhook with retry and authentication support.",
    tags: ["output", "webhook", "integration"],
    ports: [
      { name: "data", kind: "input", fields: [{ name: "payload", type: "object", required: true }] },
    ],
    config: [
      { key: "url", label: "Webhook URL", type: "string", required: true, default: "", group: "Endpoint" },
      { key: "method", label: "Method", type: "select", default: "POST", enum: ["POST", "PUT", "PATCH"], group: "Endpoint" },
      { key: "authType", label: "Auth Type", type: "select", default: "none", enum: ["none", "bearer", "hmac", "basic"], group: "Auth" },
      { key: "retries", label: "Max Retries", type: "number", default: 3, min: 0, max: 10, group: "Reliability" },
      { key: "timeoutMs", label: "Timeout", type: "number", default: 10000, min: 100, max: 60000, unit: "ms", group: "Reliability" },
    ],
    validation: [
      { field: "url", rule: "required", message: "Webhook URL is required" },
      { field: "url", rule: "url-format", message: "Must be a valid http(s) URL" },
    ],
    metrics: [
      { key: "webhooks_sent", label: "Webhooks Sent", unit: "count", description: "Total webhook deliveries" },
      { key: "success_rate", label: "Success Rate", unit: "%", description: "Percentage of successful deliveries" },
      { key: "retries_used", label: "Retries Used", unit: "count", description: "Total retry attempts" },
    ],
    explainability: { method: "delivery-log", description: "Full delivery log with request/response status and retry history", outputs: ["delivery_log", "retry_history"] },
    version: "1.0.0", author: "platform-team", updatedAt: iso(25), status: "stable",
  },
];

export const REGISTRY_CATEGORY_ORDER: RegistryCategory[] = [
  "input", "rule", "signal", "feature", "ml", "graph", "temporal", "decision", "output",
];

export function searchRegistry(query: string, category: RegistryCategory | "all", status: NodeRegistryEntry["status"] | "all"): NodeRegistryEntry[] {
  const q = query.toLowerCase().trim();
  return NODE_REGISTRY.filter((n) => {
    if (category !== "all" && n.category !== category) return false;
    if (status !== "all" && n.status !== status) return false;
    if (!q) return true;
    return (
      n.label.toLowerCase().includes(q) ||
      n.type.toLowerCase().includes(q) ||
      n.description.toLowerCase().includes(q) ||
      n.tags.some((t) => t.toLowerCase().includes(q))
    );
  });
}

export function registryStats() {
  const byCategory = REGISTRY_CATEGORY_ORDER.map((cat) => ({
    category: cat,
    count: NODE_REGISTRY.filter((n) => n.category === cat).length,
  }));
  return {
    total: NODE_REGISTRY.length,
    stable: NODE_REGISTRY.filter((n) => n.status === "stable").length,
    beta: NODE_REGISTRY.filter((n) => n.status === "beta").length,
    experimental: NODE_REGISTRY.filter((n) => n.status === "experimental").length,
    categories: REGISTRY_CATEGORY_ORDER.length,
    byCategory,
  };
}
