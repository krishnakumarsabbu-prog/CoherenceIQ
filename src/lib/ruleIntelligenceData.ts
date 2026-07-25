import { projectStore, type FraudRule, type ClusterInfo, type RuleStats, type RuleSource } from "./projectStore";

// ---------------------------------------------------------------------------
// Adapter layer — exposes the same types/API as the old backend-backed version,
// but backed by the in-memory projectStore. No network calls.
// ---------------------------------------------------------------------------

export type { RuleSource };

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
  risk_level: string; // Capitalized: "Critical", "High", "Medium", "Low"
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
  parsed_rules: number;
  rule_quality: number;
  duplicate_rules: number;
  coverage: number;
  parameter_count: number;
  avg_complexity: number;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function toRuleRecord(r: FraudRule): RuleRecord {
  return {
    ...r,
    risk_level: capitalize(r.risk_level),
    matched_classification_rules: r.matched_keywords.map((k) => `Matched keyword: ${k}`),
  };
}

function toClusterNode(c: ClusterInfo): ClusterNode {
  return {
    name: c.name,
    rule_count: c.rule_count,
    avg_confidence: c.avg_confidence,
    avg_parameters: c.avg_parameters,
    keywords: c.keywords,
    rule_ids: c.rule_ids,
  };
}

export const ruleIntelligenceApi = {
  getRules: async (): Promise<RuleRecord[]> => {
    return projectStore.getRules().map(toRuleRecord);
  },
  getRule: async (ruleId: string): Promise<RuleRecord | undefined> => {
    const r = projectStore.getRule(ruleId);
    return r ? toRuleRecord(r) : undefined;
  },
  getClusters: async (): Promise<ClusterHierarchy> => {
    const clusters = projectStore.getClusters();
    return {
      name: "Rule Intelligence",
      total_rules: projectStore.getRules().length,
      children: clusters.map(toClusterNode),
    };
  },
  getClustersFlat: async (): Promise<ClusterNode[]> => {
    return projectStore.getClusters().map(toClusterNode);
  },
  getFeatures: async (): Promise<EngineeredFeatureRecord[]> => {
    return projectStore.getFeatures().map((f) => ({
      feature_name: f.feature_name,
      domain: f.domain,
      derived_rules: f.derived_rules,
      derived_parameters: f.derived_parameters,
      weight: f.weight,
      description: f.description,
      used_by: f.used_by,
    }));
  },
  getFeatureGraph: async (): Promise<DependencyGraph> => {
    const features = projectStore.getFeatures();
    const clusters = projectStore.getClusters();
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    for (const c of clusters) {
      nodes.push({ id: `domain-${c.name}`, type: "domain", label: c.name, domain: c.name });
    }
    for (const f of features) {
      nodes.push({ id: `feature-${f.feature_name}`, type: "feature", label: f.feature_name, domain: f.domain });
      edges.push({ id: `e-${f.feature_name}`, source: `feature-${f.feature_name}`, target: `domain-${f.domain}`, kind: "feature-domain" });
      for (const rid of f.derived_rules.slice(0, 3)) {
        const r = projectStore.getRule(rid);
        if (r) {
          nodes.push({ id: rid, type: "rule", label: r.rule_name, cluster: r.primary_cluster });
          edges.push({ id: `e-${rid}-${f.feature_name}`, source: rid, target: `feature-${f.feature_name}`, kind: "rule-feature" });
        }
      }
    }
    return { nodes, edges };
  },
  getStats: async (): Promise<RuleIntelligenceStats> => {
    const stats: RuleStats = projectStore.getStats();
    const clusters = projectStore.getClusters();
    const rules = projectStore.getRules();
    return {
      total_rules: stats.total_rules,
      total_clusters: stats.suggested_domains,
      avg_confidence: stats.rule_quality,
      avg_parameters: stats.avg_complexity,
      risk_distribution: Object.fromEntries(Object.entries(stats.risk_distribution).map(([k, v]) => [capitalize(k), v])),
      cluster_distribution: stats.cluster_distribution,
      parsed_rules: stats.parsed_rules,
      rule_quality: stats.rule_quality,
      duplicate_rules: stats.duplicate_rules,
      coverage: stats.coverage,
      parameter_count: stats.parameter_count,
      avg_complexity: stats.avg_complexity,
    };
  },
  uploadFiles: async (files: File[]): Promise<{ added: number; total: number }> => {
    const fileData: { name: string; content: string }[] = [];
    for (const f of files) {
      const content = await f.text();
      fileData.push({ name: f.name, content });
    }
    return projectStore.uploadFiles(fileData);
  },
  uploadText: async (filename: string, content: string): Promise<{ added: number; total: number }> => {
    return projectStore.uploadText(filename, content);
  },
  clearRules: async (): Promise<{ total: number }> => {
    projectStore.clearRules();
    return { total: 0 };
  },
  seedRules: async (): Promise<{ total: number }> => {
    projectStore.clearRules();
    projectStore.seedSampleRules();
    return { total: projectStore.getRules().length };
  },
};
