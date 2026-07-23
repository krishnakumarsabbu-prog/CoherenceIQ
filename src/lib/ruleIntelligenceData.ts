export interface RuleRecord {
  rule_id: string;
  rule_name: string;
  description: string;
  parameter_count: number;
  parameters: string[];
  keywords: string[];
  thresholds: string[];
  time_windows: string[];
  decision_words: string[];
  risk_level: string;
  status: string;
  primary_cluster: string;
  secondary_cluster: string | null;
  confidence: number;
  matched_keywords: string[];
  matched_classification_rules: string[];
  source_file: string;
}

export interface ClusterNode {
  name: string;
  rule_count: number;
  avg_confidence: number;
  avg_parameters: number;
  keywords: string[];
  rule_ids: string[];
}

export interface ClusterHierarchy {
  name: string;
  total_rules: number;
  children: ClusterNode[];
}

export interface EngineeredFeatureRecord {
  feature_name: string;
  domain: string;
  derived_rules: string[];
  derived_parameters: string[];
  weight: number;
  description: string;
  used_by: string[];
}

export interface GraphNode {
  id: string;
  type: "rule" | "feature" | "domain";
  label: string;
  cluster?: string;
  domain?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  kind: "rule-feature" | "feature-domain";
}

export interface DependencyGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface RuleIntelligenceStats {
  total_rules: number;
  total_clusters: number;
  avg_confidence: number;
  avg_parameters: number;
  risk_distribution: Record<string, number>;
  cluster_distribution: Record<string, number>;
}

async function jsonOrThrow(res: Response): Promise<any> {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

export const ruleIntelligenceApi = {
  async getRules(): Promise<RuleRecord[]> {
    return jsonOrThrow(await fetch("/api/rules"));
  },
  async getRule(ruleId: string): Promise<RuleRecord> {
    return jsonOrThrow(await fetch(`/api/rules/${encodeURIComponent(ruleId)}`));
  },
  async getClusters(): Promise<ClusterHierarchy> {
    return jsonOrThrow(await fetch("/api/clusters"));
  },
  async getClustersFlat(): Promise<ClusterNode[]> {
    return jsonOrThrow(await fetch("/api/clusters/flat"));
  },
  async getFeatures(): Promise<EngineeredFeatureRecord[]> {
    return jsonOrThrow(await fetch("/api/features"));
  },
  async getFeatureGraph(): Promise<DependencyGraph> {
    return jsonOrThrow(await fetch("/api/features/graph"));
  },
  async getStats(): Promise<RuleIntelligenceStats> {
    return jsonOrThrow(await fetch("/api/stats"));
  },
  async uploadFiles(files: File[]): Promise<{ added: number; total: number }> {
    const form = new FormData();
    for (const f of files) form.append("files", f);
    return jsonOrThrow(await fetch("/api/rules/upload", { method: "POST", body: form }));
  },
  async uploadText(filename: string, content: string): Promise<{ added: number; total: number }> {
    return jsonOrThrow(await fetch("/api/rules/upload-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, content }),
    }));
  },
  async clearRules(): Promise<{ total: number }> {
    return jsonOrThrow(await fetch("/api/rules/clear", { method: "POST" }));
  },
  async seedRules(): Promise<{ total: number }> {
    return jsonOrThrow(await fetch("/api/rules/seed", { method: "POST" }));
  },
};
