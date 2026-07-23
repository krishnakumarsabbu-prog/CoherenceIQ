from __future__ import annotations
from typing import List, Dict, Tuple
from models import Rule, Cluster
from intelligence.clustering import HybridClusteringEngine, TaxonomyEngine, DEFAULT_TAXONOMY


def classify_rule(rule: Rule, taxonomy: Dict[str, List[str]] = DEFAULT_TAXONOMY) -> None:
    """Classifies a rule using the new enterprise HybridClusteringEngine."""
    tax_engine = TaxonomyEngine(taxonomy)
    engine = HybridClusteringEngine(tax_engine)
    res = engine.classify(rule, [rule])
    
    rule.primary_cluster = res["primary"]
    rule.secondary_cluster = res["secondary"]
    rule.confidence = res["confidence"]
    rule.matched_keywords = res["matched_keywords"]
    rule.matched_classification_rules = res["reasoning"]


def build_clusters(rules: List[Rule], taxonomy: Dict[str, List[str]] = DEFAULT_TAXONOMY) -> List[Cluster]:
    """Aggregates classified rules into cluster metrics."""
    clusters: List[Cluster] = []
    for name, keywords in taxonomy.items():
        cluster_rules = [r for r in rules if r.primary_cluster == name]
        avg_conf = sum(r.confidence for r in cluster_rules) / len(cluster_rules) if cluster_rules else 0.0
        avg_params = sum(r.parameter_count for r in cluster_rules) / len(cluster_rules) if cluster_rules else 0.0
        clusters.append(Cluster(
            name=name,
            keywords=keywords,
            rules=[r.rule_id for r in cluster_rules],
            avg_confidence=avg_conf,
            avg_parameters=avg_params,
        ))
    return clusters


def cluster_hierarchy(rules: List[Rule], taxonomy: Dict[str, List[str]] = DEFAULT_TAXONOMY) -> Dict:
    """Builds hierarchical tree structures suitable for cluster visualizations."""
    clusters = build_clusters(rules, taxonomy)
    children = []
    for c in clusters:
        children.append({
            "name": c.name,
            "rule_count": len(c.rules),
            "avg_confidence": round(c.avg_confidence, 3),
            "avg_parameters": round(c.avg_parameters, 2),
            "keywords": c.keywords,
            "rule_ids": c.rules,
        })
    return {
        "name": "Rule Intelligence",
        "children": children,
        "total_rules": len(rules),
    }
