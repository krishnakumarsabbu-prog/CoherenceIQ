from __future__ import annotations
from typing import List, Dict
from models import Rule, EngineeredFeature


FEATURE_BLUEPRINT: List[Dict] = [
    {
        "feature_name": "DeviceTrustScore",
        "domain": "Device Intelligence",
        "derived_parameters": ["New Device", "Device Age", "Fingerprint", "Trusted Device", "Device Reputation"],
        "weight": 0.22,
        "description": "Composite trust score for the device fingerprint, age, and reputation signals.",
        "used_by": ["Coherence Brain", "ML Model", "Rule Engine"],
        "keyword_filter": ["device", "fingerprint", "device age", "new device", "trusted device", "device reputation", "browser"],
    },
    {
        "feature_name": "NetworkTrustScore",
        "domain": "Network Intelligence",
        "derived_parameters": ["ISP", "Carrier", "VPN", "Proxy", "ASN"],
        "weight": 0.18,
        "description": "Trust score derived from network-level signals including VPN/proxy and ASN reputation.",
        "used_by": ["Coherence Brain", "ML Model", "Rule Engine"],
        "keyword_filter": ["isp", "carrier", "vpn", "proxy", "asn", "network", "ip"],
    },
    {
        "feature_name": "CredentialHealthScore",
        "domain": "Credential Intelligence",
        "derived_parameters": ["Password Reset", "Failed Login", "Authentication Type"],
        "weight": 0.16,
        "description": "Health of credential usage based on resets, failed logins, and auth method.",
        "used_by": ["Coherence Brain", "ML Model", "Rule Engine"],
        "keyword_filter": ["password", "credential", "failed login", "reset", "authentication", "auth"],
    },
    {
        "feature_name": "BehaviorConsistencyScore",
        "domain": "Behavior Intelligence",
        "derived_parameters": ["Velocity", "Historical Login", "Frequency", "Pattern"],
        "weight": 0.16,
        "description": "Consistency of behavioral patterns relative to historical baselines.",
        "used_by": ["Coherence Brain", "ML Model", "Rule Engine"],
        "keyword_filter": ["velocity", "frequency", "pattern", "sequence", "history", "behavior", "historical login"],
    },
    {
        "feature_name": "LocationCoherenceScore",
        "domain": "Location Intelligence",
        "derived_parameters": ["Country", "City", "Travel", "Geo Distance"],
        "weight": 0.14,
        "description": "Coherence of the current location against historical travel and geo distance.",
        "used_by": ["Coherence Brain", "ML Model", "Rule Engine"],
        "keyword_filter": ["country", "city", "latitude", "longitude", "gps", "geo", "travel", "location", "geo distance"],
    },
    {
        "feature_name": "CustomerRiskScore",
        "domain": "Customer Intelligence",
        "derived_parameters": ["Customer Type", "Risk Flag", "Previous Fraud"],
        "weight": 0.12,
        "description": "Risk score for the customer segment and prior fraud history.",
        "used_by": ["Coherence Brain", "ML Model", "Rule Engine"],
        "keyword_filter": ["customer", "risk", "segment", "high risk", "customer type", "risk flag", "previous fraud"],
    },
    {
        "feature_name": "TransactionRiskScore",
        "domain": "Transaction Intelligence",
        "derived_parameters": ["Reject Type", "Transaction Type", "Transfer"],
        "weight": 0.12,
        "description": "Risk of the transaction based on reject codes, type, and transfer patterns.",
        "used_by": ["Coherence Brain", "ML Model", "Rule Engine"],
        "keyword_filter": ["transaction", "payment", "transfer", "reject", "rejected", "reject type", "transaction type"],
    },
]


def _rule_matches(rule: Rule, keyword_filter: List[str]) -> bool:
    haystack = f"{rule.rule_name} {rule.description} {' '.join(rule.parameters)}".lower()
    return any(kw.lower() in haystack for kw in keyword_filter)


def engineer_features(rules: List[Rule]) -> List[EngineeredFeature]:
    features: List[EngineeredFeature] = []
    for blueprint in FEATURE_BLUEPRINT:
        derived_rules = [r.rule_id for r in rules if _rule_matches(r, blueprint["keyword_filter"])]
        features.append(EngineeredFeature(
            feature_name=blueprint["feature_name"],
            domain=blueprint["domain"],
            derived_rules=derived_rules,
            derived_parameters=blueprint["derived_parameters"],
            weight=blueprint["weight"],
            description=blueprint["description"],
            used_by=blueprint["used_by"],
        ))
    return features


def feature_dependency_graph(rules: List[Rule], features: List[EngineeredFeature]) -> Dict:
    """Return nodes/edges for Rules -> Features -> Domains dependency graph."""
    nodes: List[Dict] = []
    edges: List[Dict] = []

    domains = sorted({f.domain for f in features})
    domain_nodes = {d: f"domain:{d}" for d in domains}
    for d in domains:
        nodes.append({"id": domain_nodes[d], "type": "domain", "label": d})

    feature_nodes = {f.feature_name: f"feature:{f.feature_name}" for f in features}
    for f in features:
        nodes.append({"id": feature_nodes[f.feature_name], "type": "feature", "label": f.feature_name, "domain": f.domain})
        edges.append({"id": f"e-{f.feature_name}-domain", "source": feature_nodes[f.feature_name], "target": domain_nodes[f.domain], "kind": "feature-domain"})

    for r in rules:
        rid = f"rule:{r.rule_id}"
        nodes.append({"id": rid, "type": "rule", "label": r.rule_name, "cluster": r.primary_cluster})
        for f in features:
            if r.rule_id in f.derived_rules:
                edges.append({"id": f"e-{r.rule_id}-{f.feature_name}", "source": rid, "target": feature_nodes[f.feature_name], "kind": "rule-feature"})

    return {"nodes": nodes, "edges": edges}
