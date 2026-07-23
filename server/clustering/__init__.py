from __future__ import annotations
from typing import List, Dict, Tuple
from models import Rule, Cluster


# ---------------------------------------------------------------------------
# Configurable taxonomy
# ---------------------------------------------------------------------------

DEFAULT_TAXONOMY: Dict[str, List[str]] = {
    "Device Intelligence": [
        "device", "fingerprint", "device age", "online device", "browser", "ios",
        "android", "desktop", "mobile", "device id", "device trust", "new device",
        "trusted device", "device reputation",
    ],
    "Network Intelligence": [
        "isp", "carrier", "proxy", "vpn", "tor", "asn", "network", "ip", "ip address",
        "ip carrier", "online device first seen",
    ],
    "Location Intelligence": [
        "country", "city", "latitude", "longitude", "gps", "geo", "travel",
        "geo distance", "location", "geolocation",
    ],
    "Credential Intelligence": [
        "password", "credential", "failed login", "reset", "authentication",
        "credential health", "auth", "login attempt",
    ],
    "Behavior Intelligence": [
        "velocity", "frequency", "pattern", "sequence", "history", "behavior",
        "historical login", "behavior consistency",
    ],
    "Customer Intelligence": [
        "customer", "risk", "segment", "high risk", "customer type", "risk flag",
        "previous fraud", "customer risk",
    ],
    "Transaction Intelligence": [
        "transaction", "payment", "transfer", "reject", "rejected", "reject type",
        "transaction type", "rejected transaction", "transaction risk",
    ],
    "Temporal Intelligence": [
        "date", "hour", "days", "minutes", "history", "time", "temporal", "trx date",
        "timestamp", "window",
    ],
}


def _normalise(text: str) -> str:
    return text.lower()


def _match_cluster(rule: Rule, cluster_name: str, keywords: List[str]) -> Tuple[int, List[str], List[str]]:
    """Return (match_count, matched_keywords, matched_classification_rules)."""
    haystack = _normalise(f"{rule.rule_name} {rule.description} {' '.join(rule.parameters)}")
    matched_keywords: List[str] = []
    matched_rules: List[str] = []
    for kw in keywords:
        kw_low = _normalise(kw)
        if kw_low in haystack:
            matched_keywords.append(kw)
            matched_rules.append(f"Keyword '{kw}' present in rule text")
    return len(matched_keywords), matched_keywords, matched_rules


def _parameter_overlap(rule: Rule, cluster_keywords: List[str]) -> int:
    rule_params = {_normalise(p) for p in rule.parameters}
    overlap = 0
    for kw in cluster_keywords:
        kw_low = _normalise(kw)
        if any(kw_low in p or p in kw_low for p in rule_params):
            overlap += 1
    return overlap


def _description_overlap(rule: Rule, cluster_keywords: List[str]) -> int:
    desc = _normalise(rule.description)
    return sum(1 for kw in cluster_keywords if _normalise(kw) in desc)


def _confidence(matched: int, param_overlap: int, desc_overlap: int, total_cluster_kw: int) -> float:
    if total_cluster_kw == 0:
        return 0.0
    base = matched / total_cluster_kw
    param_boost = min(param_overlap * 0.04, 0.15)
    desc_boost = min(desc_overlap * 0.03, 0.12)
    return min(base + param_boost + desc_boost, 1.0)


def classify_rule(rule: Rule, taxonomy: Dict[str, List[str]] = DEFAULT_TAXONOMY) -> None:
    """Assign primary_cluster, secondary_cluster, confidence, matched_keywords in place."""
    scores: List[Tuple[str, int, int, int, float, List[str], List[str]]] = []
    for cluster_name, keywords in taxonomy.items():
        matched, matched_kw, matched_rules = _match_cluster(rule, cluster_name, keywords)
        if matched == 0:
            continue
        p_overlap = _parameter_overlap(rule, keywords)
        d_overlap = _description_overlap(rule, keywords)
        conf = _confidence(matched, p_overlap, d_overlap, len(keywords))
        scores.append((cluster_name, matched, p_overlap, d_overlap, conf, matched_kw, matched_rules))

    if not scores:
        rule.primary_cluster = "Unclustered"
        rule.secondary_cluster = None
        rule.confidence = 0.0
        rule.matched_keywords = []
        rule.matched_classification_rules = []
        return

    scores.sort(key=lambda s: (s[4], s[1]), reverse=True)
    primary = scores[0]
    rule.primary_cluster = primary[0]
    rule.confidence = primary[4]
    rule.matched_keywords = primary[5]
    rule.matched_classification_rules = primary[6]
    if len(scores) > 1:
        rule.secondary_cluster = scores[1][0]
    else:
        rule.secondary_cluster = None


def build_clusters(rules: List[Rule], taxonomy: Dict[str, List[str]] = DEFAULT_TAXONOMY) -> List[Cluster]:
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
