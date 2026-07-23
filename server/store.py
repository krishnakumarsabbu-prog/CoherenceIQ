from __future__ import annotations
from typing import List, Dict, Optional
from models import Rule, EngineeredFeature
from parsers import default_registry
from clustering import classify_rule, build_clusters, cluster_hierarchy
from features import engineer_features, feature_dependency_graph


class RuleStore:
    """In-memory store. No database. Re-classifies on every upload."""

    def __init__(self) -> None:
        self._rules: List[Rule] = []
        self._registry = default_registry()

    def clear(self) -> None:
        self._rules = []

    def add_files(self, files: List[Dict[str, str]]) -> int:
        """files = [{"filename": str, "content": str}, ...]. Returns count added."""
        new_rules: List[Rule] = []
        for f in files:
            parsed = self._registry.parse_file(f["filename"], f["content"])
            new_rules.extend(parsed)
        # de-dup by rule_id, keep newest
        existing_ids = {r.rule_id for r in self._rules}
        for r in new_rules:
            if r.rule_id in existing_ids:
                self._rules = [r if r.rule_id == x.rule_id else x for x in self._rules]
            else:
                self._rules.append(r)
                existing_ids.add(r.rule_id)
        self._reclassify()
        return len(new_rules)

    def _reclassify(self) -> None:
        for r in self._rules:
            classify_rule(r)

    def all_rules(self) -> List[Rule]:
        return list(self._rules)

    def get_rule(self, rule_id: str) -> Optional[Rule]:
        for r in self._rules:
            if r.rule_id == rule_id:
                return r
        return None

    def clusters(self) -> List[Dict]:
        return [c.to_dict() for c in build_clusters(self._rules)]

    def hierarchy(self) -> Dict:
        return cluster_hierarchy(self._rules)

    def features(self) -> List[EngineeredFeature]:
        return engineer_features(self._rules)

    def dependency_graph(self) -> Dict:
        return feature_dependency_graph(self._rules, self.features())

    def seed_if_empty(self) -> None:
        if self._rules:
            return
        self.add_files([{"filename": "seed.md", "content": SEED_MARKDOWN}])

    def stats(self) -> Dict:
        rules = self._rules
        clusters = self.clusters()
        return {
            "total_rules": len(rules),
            "total_clusters": len([c for c in clusters if c["rule_count"] > 0]),
            "avg_confidence": round(sum(r.confidence for r in rules) / len(rules), 3) if rules else 0.0,
            "avg_parameters": round(sum(r.parameter_count for r in rules) / len(rules), 2) if rules else 0.0,
            "risk_distribution": _risk_distribution(rules),
            "cluster_distribution": {c["name"]: c["rule_count"] for c in clusters},
        }


def _risk_distribution(rules: List[Rule]) -> Dict[str, int]:
    dist: Dict[str, int] = {}
    for r in rules:
        dist[r.risk_level] = dist.get(r.risk_level, 0) + 1
    return dist


SEED_MARKDOWN = """\
Rule Name
ALERT_LOGIN_3075_FRAUDULENT_ISP_B

Rule Description
ISP from login is found on customer profile indicating fraud occurred in past 30 days and customer device age <180 days.

Parameter Count
6

Parameters
IP Carrier
Online Device First Seen
Reject Type Code
Rejected Transaction Indication
Transaction Type
Trx Date

---

Rule Name
ALERT_DEVICE_NEW_FINGERPRINT_MISMATCH

Rule Description
New device fingerprint detected that does not match the trusted device list. Device age is less than 7 days and browser hash differs from historical login.

Parameter Count
5

Parameters
Device Fingerprint
Device Age
Browser Hash
Trusted Device Flag
New Device Indicator

---

Rule Name
ALERT_VELOCITY_LOGIN_BURST_15MIN

Rule Description
More than 10 failed login attempts from the same IP address within 15 minutes indicating credential stuffing behavior.

Parameter Count
4

Parameters
Failed Login Count
IP Address
Time Window
Velocity Events

---

Rule Name
ALERT_GEO_TRAVEL_IMPOSSIBLE_FLIGHT

Rule Description
Login occurred from a country more than 8000 km away from the previous login city within 2 hours, indicating impossible travel.

Parameter Count
5

Parameters
Previous Country
Previous City
Current Country
Current City
Geo Distance

---

Rule Name
ALERT_TXN_HIGH_RISK_TRANSFER_REJECT

Rule Description
High risk customer initiated a wire transfer that was rejected by the transaction engine. Transaction type indicates cross-border transfer.

Parameter Count
5

Parameters
Customer Risk Flag
Reject Type Code
Transaction Type
Transfer Amount
Rejected Transaction Indication

---

Rule Name
ALERT_PASSWORD_RESET_CHAIN_SUSPECT

Rule Description
Multiple password reset attempts followed by authentication from a new device within 24 hours. Credential health is degraded.

Parameter Count
4

Parameters
Password Reset Count
Authentication Type
Failed Login Count
New Device Indicator

---

Rule Name
ALERT_VPN_PROXY_ASN_HIGH_RISK

Rule Description
Login from a VPN or proxy with ASN reputation flagged as high risk network. ISP carrier is on the deny list.

Parameter Count
4

Parameters
VPN Flag
Proxy Flag
ASN
ISP Carrier

---

Rule Name
ALERT_BEHAVIOR_PATTERN_ANOMALY_HISTORY

Rule Description
Behavior pattern deviates from historical login sequence. Frequency and velocity exceed the 30 day baseline by more than 3x.

Parameter Count
4

Parameters
Velocity Events
Historical Login Count
Frequency
Pattern Score
"""
