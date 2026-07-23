from __future__ import annotations

import json
import time
import uuid
import math
import re
import random
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple

from models import Rule
from store import RuleStore
from intelligence.clustering import HybridClusteringEngine, TaxonomyEngine, DEFAULT_TAXONOMY
from intelligence.features import SignalGenerationEngine, FEATURE_BLUEPRINT
from intelligence.parser import EntityExtractionEngine
from intelligence.similarity import SimilarityEngine


# ---------------------------------------------------------------------------
# Domain weights for the Coherence Brain (must sum to 1.0)
# ---------------------------------------------------------------------------
DOMAIN_WEIGHTS: Dict[str, float] = {
    "Device Intelligence": 0.30,
    "Network Intelligence": 0.20,
    "Credential Intelligence": 0.15,
    "Behavior Intelligence": 0.15,
    "Location Intelligence": 0.10,
    "Customer Intelligence": 0.05,
    "Transaction Intelligence": 0.05,
}

# Map domain -> the engineered feature that represents it
DOMAIN_FEATURE_MAP: Dict[str, str] = {
    "Device Intelligence": "DeviceTrustScore",
    "Network Intelligence": "NetworkTrustScore",
    "Credential Intelligence": "CredentialHealthScore",
    "Behavior Intelligence": "BehaviorConsistencyScore",
    "Location Intelligence": "LocationCoherenceScore",
    "Customer Intelligence": "CustomerRiskScore",
    "Transaction Intelligence": "TransactionRiskScore",
}

# Map domain -> the signal IDs that feed its feature
DOMAIN_SIGNAL_MAP: Dict[str, List[str]] = {
    "Device Intelligence": ["SIG_DEVICE_AGE_CHECK", "SIG_FINGERPRINT_MATCH", "SIG_DEVICE_TRUST_STATE"],
    "Network Intelligence": ["SIG_VPN_PROXY_DETECT", "SIG_CARRIER_REPUTATION", "SIG_ASN_RISK"],
    "Credential Intelligence": ["SIG_LOGIN_FAILURES", "SIG_PASSWORD_RESET_BURST"],
    "Behavior Intelligence": ["SIG_LOGIN_VELOCITY_ANOMALY", "SIG_HISTORICAL_DEVIATION"],
    "Location Intelligence": ["SIG_IMPOSSIBLE_TRAVEL_GEO", "SIG_NEW_LOCATION_DETECT"],
    "Customer Intelligence": ["SIG_CUSTOMER_RISK_FLAG", "SIG_HISTORIC_FRAUD_OCCURRENCE"],
    "Transaction Intelligence": ["SIG_TRANSACTION_REJECTION", "SIG_TRANSFER_AMOUNT_VELOCITY"],
}

PIPELINE_STAGES = [
    "Session Received",
    "Session Parser",
    "Entity Extraction",
    "Rule Discovery",
    "Rule Matching",
    "Signal Generation",
    "Feature Engineering",
    "Domain Score Calculation",
    "Coherence Brain",
    "Decision Engine",
]


class SessionParser:
    """Extracts a normalized Session object from raw JSON / XML / Markdown / API payload."""

    FIELD_ALIASES: Dict[str, List[str]] = {
        "customer_id": ["customer_id", "customerid", "customer", "ecid", "ecn", "customer_id_", "cust_id"],
        "application": ["application", "app", "app_name", "application_name"],
        "channel": ["channel", "login_channel"],
        "device": ["device", "device_id", "device_id_", "device_fingerprint", "fingerprint", "dvc_id", "wf_dvc_id"],
        "device_type": ["device_type", "devicetype"],
        "browser": ["browser", "browser_hash", "user_agent", "useragent", "ua"],
        "os": ["os", "operating_system", "platform"],
        "ip_address": ["ip_address", "ip", "ipaddress", "client_ip", "source_ip"],
        "country": ["country", "country_code", "countrycode", "curr_country", "current_country"],
        "city": ["city", "curr_city", "current_city"],
        "latitude": ["latitude", "lat"],
        "longitude": ["longitude", "lng", "lon", "long"],
        "isp": ["isp", "isp_carrier", "carrier", "ip_carrier"],
        "asn": ["asn", "as_number", "autonomous_system"],
        "device_age_days": ["device_age", "device_age_days", "online_device_first_seen", "first_seen_days"],
        "password_reset": ["password_reset", "password_reset_count", "reset_count", "resets"],
        "failed_login_count": ["failed_login_count", "failed_attempts", "failed_logins", "login_failures"],
        "historical_login_count": ["historical_login_count", "historical_logins", "hist_login_count", "login_history"],
        "transaction_type": ["transaction_type", "txn_type", "trx_type"],
        "timestamp": ["timestamp", "login_time", "login_timestamp", "trx_date", "time"],
        "session_duration": ["session_duration", "duration", "session_length"],
        "new_device": ["new_device", "new_device_indicator", "new_device_flag"],
        "vpn": ["vpn", "vpn_flag", "is_vpn"],
        "proxy": ["proxy", "proxy_flag", "is_proxy"],
        "velocity_events": ["velocity_events", "velocity", "events"],
        "previous_country": ["previous_country", "prev_country", "last_country"],
        "previous_city": ["previous_city", "prev_city", "last_city"],
        "geo_distance_km": ["geo_distance", "geo_distance_km", "distance_km"],
        "trusted_device": ["trusted_device", "trusted_device_flag", "device_trust"],
        "customer_risk_flag": ["customer_risk_flag", "customer_risk", "risk_flag"],
        "previous_fraud": ["previous_fraud", "fraud_occurred", "prior_fraud"],
        "reject_type_code": ["reject_type_code", "reject_type", "rejection_code"],
        "rejected_transaction": ["rejected_transaction", "rejected_transaction_indication", "rejected"],
        "transfer_amount": ["transfer_amount", "amount", "txn_amount"],
        "auth_method": ["auth_method", "authentication_type", "auth_type"],
        "mfa_used": ["mfa_used", "mfa", "mfa_flag"],
    }

    def parse(self, raw_text: str, content_type: str = "json") -> Dict[str, Any]:
        """Parse raw input and return a normalized session dict."""
        raw_text = raw_text.strip()
        parsed: Dict[str, Any] = {}

        if content_type == "json":
            try:
                parsed = json.loads(raw_text)
                if not isinstance(parsed, dict):
                    parsed = {"data": parsed}
            except json.JSONDecodeError:
                parsed = self._parse_kv_text(raw_text)
        elif content_type == "xml":
            parsed = self._parse_xml(raw_text)
        elif content_type == "markdown":
            parsed = self._parse_markdown(raw_text)
        else:
            # API payload — try JSON first, fall back to key-value
            try:
                parsed = json.loads(raw_text)
                if not isinstance(parsed, dict):
                    parsed = {"data": parsed}
            except json.JSONDecodeError:
                parsed = self._parse_kv_text(raw_text)

        session = self._normalize(parsed)
        return session

    def _parse_kv_text(self, text: str) -> Dict[str, Any]:
        result: Dict[str, Any] = {}
        for line in text.splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if ":" in line:
                key, _, val = line.partition(":")
            elif "=" in line:
                key, _, val = line.partition("=")
            else:
                continue
            key = key.strip().strip("-*• ")
            val = val.strip()
            if key:
                result[key] = val
        return result

    def _parse_xml(self, text: str) -> Dict[str, Any]:
        result: Dict[str, Any] = {}
        for match in re.finditer(r'<(\w+)[^>]*>(.*?)</\1>', text, re.S):
            tag, val = match.group(1), match.group(2).strip()
            result[tag] = val
        return result

    def _parse_markdown(self, text: str) -> Dict[str, Any]:
        result: Dict[str, Any] = {}
        for line in text.splitlines():
            line = line.strip().lstrip("#").strip()
            if not line or line.startswith("---"):
                continue
            if ":" in line:
                key, _, val = line.partition(":")
                key = key.strip().strip("-*• ")
                val = val.strip()
                if key:
                    result[key] = val
        return result

    def _normalize(self, parsed: Dict[str, Any]) -> Dict[str, Any]:
        normalized: Dict[str, Any] = {}
        lower_parsed = {k.lower(): v for k, v in parsed.items()}

        for field, aliases in self.FIELD_ALIASES.items():
            value: Any = None
            for alias in aliases:
                if alias in lower_parsed:
                    value = lower_parsed[alias]
                    break
            if value is not None:
                normalized[field] = self._coerce(field, value)

        # Defaults for missing fields
        normalized.setdefault("customer_id", "UNKNOWN")
        normalized.setdefault("application", "OnlineBanking")
        normalized.setdefault("channel", "Web")
        normalized.setdefault("device", "unknown-fingerprint")
        normalized.setdefault("device_type", "Desktop")
        normalized.setdefault("browser", "Chrome")
        normalized.setdefault("os", "Windows")
        normalized.setdefault("ip_address", "0.0.0.0")
        normalized.setdefault("country", "United States")
        normalized.setdefault("city", "New York")
        normalized.setdefault("latitude", 40.7128)
        normalized.setdefault("longitude", -74.0060)
        normalized.setdefault("isp", "Comcast")
        normalized.setdefault("asn", "AS7922")
        normalized.setdefault("device_age_days", 365)
        normalized.setdefault("password_reset", 0)
        normalized.setdefault("failed_login_count", 0)
        normalized.setdefault("historical_login_count", 100)
        normalized.setdefault("transaction_type", "Login")
        normalized.setdefault("timestamp", datetime.now(timezone.utc).isoformat())
        normalized.setdefault("session_duration", 0)
        normalized.setdefault("new_device", False)
        normalized.setdefault("vpn", False)
        normalized.setdefault("proxy", False)
        normalized.setdefault("velocity_events", 0)
        normalized.setdefault("previous_country", None)
        normalized.setdefault("previous_city", None)
        normalized.setdefault("geo_distance_km", 0)
        normalized.setdefault("trusted_device", True)
        normalized.setdefault("customer_risk_flag", False)
        normalized.setdefault("previous_fraud", False)
        normalized.setdefault("reject_type_code", None)
        normalized.setdefault("rejected_transaction", False)
        normalized.setdefault("transfer_amount", 0)
        normalized.setdefault("auth_method", "Password")
        normalized.setdefault("mfa_used", False)

        return normalized

    def _coerce(self, field: str, value: Any) -> Any:
        if isinstance(value, str):
            value = value.strip()
        bool_fields = {"new_device", "vpn", "proxy", "trusted_device", "customer_risk_flag", "previous_fraud", "rejected_transaction", "mfa_used"}
        int_fields = {"device_age_days", "password_reset", "failed_login_count", "historical_login_count", "session_duration", "velocity_events"}
        float_fields = {"latitude", "longitude", "geo_distance_km", "transfer_amount"}

        if field in bool_fields:
            if isinstance(value, bool):
                return value
            return str(value).lower() in ("true", "1", "yes", "y")
        if field in int_fields:
            try:
                return int(float(value))
            except (ValueError, TypeError):
                return 0
        if field in float_fields:
            try:
                return float(value)
            except (ValueError, TypeError):
                return 0.0
        return value


class EntityExtractor:
    """Extracts entities from the normalized session."""

    def extract(self, session: Dict[str, Any]) -> List[Dict[str, Any]]:
        entities: List[Dict[str, Any]] = []

        def add(entity: str, value: Any, confidence: float, source: str) -> None:
            if value is not None and value != "" and value != "UNKNOWN":
                entities.append({
                    "entity": entity,
                    "value": str(value),
                    "confidence": round(confidence, 3),
                    "source": source,
                })

        add("Customer", session.get("customer_id"), 0.98, "customer_id field")
        add("Account", session.get("customer_id"), 0.85, "customer_id field")
        add("Device", session.get("device"), 0.95, "device field")
        add("Browser", session.get("browser"), 0.90, "browser field")
        add("IP", session.get("ip_address"), 0.99, "ip_address field")
        add("Carrier", session.get("isp"), 0.88, "isp field")
        add("Country", session.get("country"), 0.92, "country field")
        add("Location", f"{session.get('latitude')},{session.get('longitude')}", 0.80, "lat/lng fields")
        add("Credential", session.get("auth_method"), 0.75, "auth_method field")
        add("Transaction", session.get("transaction_type"), 0.70, "transaction_type field")
        add("Session", session.get("session_id", "current"), 1.0, "session context")

        return entities


class RuleMatcher:
    """Evaluates candidate rules against the session and determines matches."""

    def evaluate(self, rules: List[Rule], session: Dict[str, Any]) -> List[Dict[str, Any]]:
        results: List[Dict[str, Any]] = []
        for rule in rules:
            start = time.perf_counter()
            matched, matched_params, reason = self._match_rule(rule, session)
            elapsed = (time.perf_counter() - start) * 1000

            results.append({
                "rule_id": rule.rule_id,
                "rule_name": rule.rule_name,
                "description": rule.description,
                "parameters": rule.parameters,
                "thresholds": rule.thresholds,
                "time_windows": rule.time_windows,
                "risk_level": rule.risk_level,
                "primary_cluster": rule.primary_cluster,
                "secondary_cluster": rule.secondary_cluster,
                "matched": matched,
                "confidence": round(self._rule_confidence(rule, matched, matched_params), 3),
                "matched_parameters": matched_params,
                "reason": reason,
                "execution_time_ms": round(elapsed, 3),
            })
        return results

    def _match_rule(self, rule: Rule, session: Dict[str, Any]) -> Tuple[bool, List[str], str]:
        matched_params: List[str] = []
        reasons: List[str] = []
        session_text = self._session_to_text(session)

        for param in rule.parameters:
            param_low = param.lower()
            session_value = self._get_param_value(param_low, session)
            if session_value is not None:
                matched_params.append(param)
                if self._param_matches_session(param_low, session, session_value):
                    reasons.append(f"Parameter '{param}' matched session value: {session_value}")
                else:
                    reasons.append(f"Parameter '{param}' present but condition not met")
            else:
                # Check if the parameter keyword appears in session text
                if param_low and re.search(r'\b' + re.escape(param_low) + r'\b', session_text):
                    matched_params.append(param)
                    reasons.append(f"Parameter '{param}' keyword found in session context")

        # Also check description keywords against session
        desc_low = rule.description.lower()
        desc_hits: List[str] = []
        for kw in ["vpn", "proxy", "new device", "failed login", "password reset", "impossible travel",
                   "high risk", "fraud", "reject", "velocity", "fingerprint", "device age", "asn", "isp"]:
            if kw in desc_low and kw in session_text:
                desc_hits.append(kw)

        matched = len(matched_params) >= 1 or len(desc_hits) >= 1

        if matched:
            reason = "; ".join(reasons[:3]) if reasons else f"Rule keywords matched: {', '.join(desc_hits)}"
        else:
            reason = f"No parameters or keywords matched the session. Rule requires: {', '.join(rule.parameters[:3])}"

        return matched, matched_params, reason

    def _session_to_text(self, session: Dict[str, Any]) -> str:
        parts: List[str] = []
        for k, v in session.items():
            if v is not None and v != "":
                parts.append(f"{k}: {v}")
        return " ".join(parts).lower()

    def _get_param_value(self, param_low: str, session: Dict[str, Any]) -> Optional[Any]:
        direct_map = {
            "ip address": "ip_address", "ip carrier": "isp", "online device first seen": "device_age_days",
            "reject type code": "reject_type_code", "rejected transaction indication": "rejected_transaction",
            "transaction type": "transaction_type", "trx date": "timestamp",
            "device fingerprint": "device", "device age": "device_age_days", "browser hash": "browser",
            "trusted device flag": "trusted_device", "new device indicator": "new_device",
            "failed login count": "failed_login_count", "time window": "session_duration",
            "velocity events": "velocity_events", "previous country": "previous_country",
            "previous city": "previous_city", "current country": "country", "current city": "city",
            "geo distance": "geo_distance_km", "customer risk flag": "customer_risk_flag",
            "transfer amount": "transfer_amount", "password reset count": "password_reset",
            "authentication type": "auth_method", "vpn flag": "vpn", "proxy flag": "proxy",
            "asn": "asn", "isp carrier": "isp", "historical login count": "historical_login_count",
            "frequency": "velocity_events", "pattern score": "velocity_events",
        }
        field = direct_map.get(param_low)
        if field and field in session:
            val = session[field]
            if val is not None and val != "" and val != 0 and val is not False:
                return val
        return None

    def _param_matches_session(self, param_low: str, session: Dict[str, Any], value: Any) -> bool:
        # Simplified matching: if we have a value, the parameter is relevant
        return True

    def _rule_confidence(self, rule: Rule, matched: bool, matched_params: List[str]) -> float:
        if not matched:
            return round(rule.confidence * 0.3, 3)
        param_ratio = len(matched_params) / max(rule.parameter_count, 1)
        return round(min(rule.confidence * 0.5 + param_ratio * 0.5, 1.0), 3)


class SignalGenerator:
    """Converts matched rules into normalized fraud signals."""

    SIGNAL_LABELS: Dict[str, str] = {
        "SIG_DEVICE_AGE_CHECK": "NEW_DEVICE",
        "SIG_FINGERPRINT_MATCH": "DEVICE_REPUTATION",
        "SIG_DEVICE_TRUST_STATE": "DEVICE_BOUND",
        "SIG_VPN_PROXY_DETECT": "VPN_USAGE",
        "SIG_CARRIER_REPUTATION": "DEVICE_SHARING",
        "SIG_ASN_RISK": "VPN_USAGE",
        "SIG_LOGIN_FAILURES": "FAILED_LOGIN",
        "SIG_PASSWORD_RESET_BURST": "PASSWORD_RESET",
        "SIG_LOGIN_VELOCITY_ANOMALY": "VELOCITY_ANOMALY",
        "SIG_HISTORICAL_DEVIATION": "BEHAVIOR_ANOMALY",
        "SIG_IMPOSSIBLE_TRAVEL_GEO": "IMPOSSIBLE_TRAVEL",
        "SIG_NEW_LOCATION_DETECT": "COUNTRY_CHANGE",
        "SIG_CUSTOMER_RISK_FLAG": "HIGH_RISK_CUSTOMER",
        "SIG_HISTORIC_FRAUD_OCCURRENCE": "PRIOR_FRAUD",
        "SIG_TRANSACTION_REJECTION": "TXN_REJECTED",
        "SIG_TRANSFER_AMOUNT_VELOCITY": "HIGH_VALUE_TRANSFER",
        "SIG_TEMPORAL_WINDOW_RISK": "TEMPORAL_RISK",
    }

    def generate(self, matched_rules: List[Dict[str, Any]], session: Dict[str, Any]) -> List[Dict[str, Any]]:
        signals: List[Dict[str, Any]] = []
        signal_map: Dict[str, Dict[str, Any]] = {}

        for rule_result in matched_rules:
            if not rule_result["matched"]:
                continue
            rule_id = rule_result["rule_id"]
            rule_name = rule_result["rule_name"].lower()
            rule_desc = rule_result["description"].lower()
            combined = f"{rule_name} {rule_desc}"

            for sig_id, keywords in SignalGenerationEngine.SIGNAL_MAP.items():
                for kw in keywords:
                    if re.search(r'\b' + re.escape(kw) + r'\b', combined):
                        if sig_id not in signal_map:
                            signal_map[sig_id] = {
                                "signal_id": sig_id,
                                "label": self.SIGNAL_LABELS.get(sig_id, sig_id),
                                "value": True,
                                "confidence": 0.0,
                                "derived_rules": [],
                                "keywords_matched": set(),
                            }
                        signal_map[sig_id]["derived_rules"].append(rule_id)
                        signal_map[sig_id]["keywords_matched"].add(kw)

        # Also check session directly for signal triggers
        self._check_session_signals(session, signal_map)

        for sig_id, data in signal_map.items():
            num_rules = len(data["derived_rules"])
            num_kws = len(data["keywords_matched"])
            kw_total = max(len(SignalGenerationEngine.SIGNAL_MAP.get(sig_id, [])), 1)
            rule_factor = min(math.log1p(num_rules) / math.log1p(10) * 0.50, 0.50)
            kw_factor = min((num_kws / kw_total) * 0.50, 0.50)
            data["confidence"] = round(min(rule_factor + kw_factor, 1.0), 3)
            data["keywords_matched"] = sorted(list(data["keywords_matched"]))
            signals.append(data)

        signals.sort(key=lambda s: s["confidence"], reverse=True)
        return signals

    def _check_session_signals(self, session: Dict[str, Any], signal_map: Dict[str, Dict[str, Any]]) -> None:
        def trigger(sig_id: str, kw: str) -> None:
            if sig_id not in signal_map:
                signal_map[sig_id] = {
                    "signal_id": sig_id,
                    "label": self.SIGNAL_LABELS.get(sig_id, sig_id),
                    "value": True,
                    "confidence": 0.0,
                    "derived_rules": [],
                    "keywords_matched": set(),
                }
            signal_map[sig_id]["keywords_matched"].add(kw)

        if session.get("new_device"):
            trigger("SIG_DEVICE_AGE_CHECK", "new device")
            trigger("SIG_DEVICE_TRUST_STATE", "new device")
        if session.get("vpn"):
            trigger("SIG_VPN_PROXY_DETECT", "vpn")
        if session.get("proxy"):
            trigger("SIG_VPN_PROXY_DETECT", "proxy")
        if session.get("failed_login_count", 0) > 3:
            trigger("SIG_LOGIN_FAILURES", "failed login")
        if session.get("password_reset", 0) > 0:
            trigger("SIG_PASSWORD_RESET_BURST", "password reset")
        if session.get("velocity_events", 0) > 5:
            trigger("SIG_LOGIN_VELOCITY_ANOMALY", "velocity")
        if session.get("geo_distance_km", 0) > 8000:
            trigger("SIG_IMPOSSIBLE_TRAVEL_GEO", "impossible")
        elif session.get("geo_distance_km", 0) > 500:
            trigger("SIG_NEW_LOCATION_DETECT", "geo distance")
        if session.get("previous_country") and session.get("previous_country") != session.get("country"):
            trigger("SIG_NEW_LOCATION_DETECT", "previous country")
        if session.get("customer_risk_flag"):
            trigger("SIG_CUSTOMER_RISK_FLAG", "customer risk")
        if session.get("previous_fraud"):
            trigger("SIG_HISTORIC_FRAUD_OCCURRENCE", "previous fraud")
        if session.get("rejected_transaction"):
            trigger("SIG_TRANSACTION_REJECTION", "rejected")
        if session.get("transfer_amount", 0) > 10000:
            trigger("SIG_TRANSFER_AMOUNT_VELOCITY", "transfer amount")
        if session.get("device_age_days", 365) < 7:
            trigger("SIG_DEVICE_AGE_CHECK", "device age")
        if not session.get("trusted_device"):
            trigger("SIG_DEVICE_TRUST_STATE", "trusted device")


class FeatureEngineer:
    """Generates engineered features from signals and matched rules."""

    def engineer(self, signals: List[Dict[str, Any]], matched_rules: List[Dict[str, Any]], session: Dict[str, Any]) -> List[Dict[str, Any]]:
        signal_map = {s["signal_id"]: s for s in signals}
        features: List[Dict[str, Any]] = []

        for bp in FEATURE_BLUEPRINT:
            sig_ids = bp["signals"]
            active_sigs = [signal_map[s] for s in sig_ids if s in signal_map]
            derived_rules = sorted(list(set(
                rid for sig in active_sigs for rid in sig["derived_rules"]
            )))

            # Compute feature value from signal confidences using formula weights
            formula = bp["formula"]
            value = self._compute_value(bp, active_sigs, session)

            features.append({
                "feature_name": bp["feature_name"],
                "domain": bp["domain"],
                "value": round(value, 3),
                "formula": formula,
                "signals_used": sig_ids,
                "rules_used": derived_rules,
                "weight": bp["weight_base"],
                "confidence": round(min(len(active_sigs) / max(len(sig_ids), 1), 1.0), 3),
            })

        return features

    def _compute_value(self, bp: Dict[str, Any], active_sigs: List[Dict[str, Any]], session: Dict[str, Any]) -> float:
        if not active_sigs:
            # Base value from session heuristics
            return self._heuristic_value(bp["feature_name"], session)

        # Weighted average of signal confidences
        total_conf = sum(s["confidence"] for s in active_sigs)
        avg_conf = total_conf / len(active_sigs) if active_sigs else 0

        # The feature value represents risk: higher signals = lower trust score
        # For trust-type scores, invert; for risk-type scores, direct
        risk_features = {"CustomerRiskScore", "TransactionRiskScore"}
        if bp["feature_name"] in risk_features:
            return min(avg_conf, 1.0)
        else:
            return max(1.0 - avg_conf, 0.0)

    def _heuristic_value(self, feature_name: str, session: Dict[str, Any]) -> float:
        defaults = {
            "DeviceTrustScore": 0.85,
            "NetworkTrustScore": 0.80,
            "CredentialHealthScore": 0.90,
            "BehaviorConsistencyScore": 0.85,
            "LocationCoherenceScore": 0.88,
            "CustomerRiskScore": 0.15,
            "TransactionRiskScore": 0.20,
            "TemporalAnomalyScore": 0.25,
        }
        return defaults.get(feature_name, 0.80)


class DomainScoreCalculator:
    """Calculates domain intelligence scores from features."""

    def calculate(self, features: List[Dict[str, Any]], signals: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        domain_scores: List[Dict[str, Any]] = []
        signal_map = {s["signal_id"]: s for s in signals}

        for domain, feature_name in DOMAIN_FEATURE_MAP.items():
            feature = next((f for f in features if f["feature_name"] == feature_name), None)
            if feature:
                # Domain score = feature value (trust) — invert for risk domains
                value = feature["value"]
                risk_domains = {"Customer Intelligence", "Transaction Intelligence"}
                if domain in risk_domains:
                    score = value  # already a risk score
                else:
                    score = value  # trust score

                domain_signals = DOMAIN_SIGNAL_MAP.get(domain, [])
                active_signals = [signal_map[s] for s in domain_signals if s in signal_map]
            else:
                score = 0.5
                active_signals = []

            domain_scores.append({
                "domain": domain,
                "score": round(score, 3),
                "feature": feature_name,
                "weight": DOMAIN_WEIGHTS.get(domain, 0.0),
                "active_signals": len(active_signals),
                "signal_ids": [s["signal_id"] for s in active_signals],
            })

        return domain_scores


class CoherenceBrain:
    """Combines all domain scores into a final coherence score."""

    def calculate(self, domain_scores: List[Dict[str, Any]]) -> Dict[str, Any]:
        contributions: List[Dict[str, Any]] = []
        total = 0.0

        for ds in domain_scores:
            weight = ds["weight"]
            score = ds["score"]
            contribution = score * weight
            total += contribution
            contributions.append({
                "domain": ds["domain"],
                "score": score,
                "weight": weight,
                "contribution": round(contribution, 4),
                "formula": f"{score:.2f} × {int(weight * 100)}%",
            })

        coherence_score = round(total, 4)

        return {
            "coherence_score": coherence_score,
            "contributions": contributions,
            "formula": "Σ(domain_score × domain_weight)",
        }


class DecisionEngine:
    """Maps coherence score to ALLOW / CHALLENGE / DENY."""

    def decide(self, coherence_score: float, domain_scores: List[Dict[str, Any]],
               matched_rules: List[Dict[str, Any]], signals: List[Dict[str, Any]],
               features: List[Dict[str, Any]]) -> Dict[str, Any]:
        if coherence_score > 0.85:
            decision = "ALLOW"
            risk_level = "Low"
        elif coherence_score >= 0.60:
            decision = "CHALLENGE"
            risk_level = "Medium"
        else:
            decision = "DENY"
            risk_level = "High"

        confidence = round(min(coherence_score if decision == "ALLOW" else (1.0 - coherence_score) if decision == "DENY" else 0.75, 1.0), 3)

        # Reason codes
        reason_codes = self._generate_reason_codes(matched_rules, signals, domain_scores)

        # Top contributors (domains with lowest scores)
        top_contributors = sorted(domain_scores, key=lambda d: d["score"])[:3]

        # Top triggered rules
        top_rules = [r for r in matched_rules if r["matched"]][:5]

        # Top signals
        top_signals = signals[:5]

        # Top features
        top_features = sorted(features, key=lambda f: f["confidence"], reverse=True)[:3]

        return {
            "decision": decision,
            "confidence": confidence,
            "risk_level": risk_level,
            "coherence_score": coherence_score,
            "reason_codes": reason_codes,
            "top_contributors": [{"domain": c["domain"], "score": c["score"], "weight": c["weight"]} for c in top_contributors],
            "top_triggered_rules": [{"rule_id": r["rule_id"], "rule_name": r["rule_name"]} for r in top_rules],
            "top_signals": [{"signal_id": s["signal_id"], "label": s["label"]} for s in top_signals],
            "top_features": [{"feature_name": f["feature_name"], "value": f["value"]} for f in top_features],
            "decision_path": self._build_decision_path(coherence_score, decision),
        }

    def _generate_reason_codes(self, matched_rules: List[Dict[str, Any]], signals: List[Dict[str, Any]], domain_scores: List[Dict[str, Any]]) -> List[Dict[str, str]]:
        codes: List[Dict[str, str]] = []
        for signal in signals[:8]:
            codes.append({
                "code": f"RC_{signal['signal_id']}",
                "description": f"{signal['label']} signal triggered with {signal['confidence']:.0%} confidence",
            })
        for ds in sorted(domain_scores, key=lambda d: d["score"])[:3]:
            if ds["score"] < 0.6:
                codes.append({
                    "code": f"RC_LOW_{ds['domain'].upper().replace(' ', '_')}",
                    "description": f"{ds['domain']} score below threshold ({ds['score']:.2f})",
                })
        if not codes:
            codes.append({"code": "RC_NO_RISK", "description": "No significant risk signals detected"})
        return codes

    def _build_decision_path(self, score: float, decision: str) -> List[str]:
        return [
            f"Coherence Score = {score:.4f}",
            f"Score > 0.85? {'Yes' if score > 0.85 else 'No'} → {'ALLOW' if score > 0.85 else 'Continue'}",
            f"0.60 ≤ Score ≤ 0.85? {'Yes' if 0.60 <= score <= 0.85 else 'No'} → {'CHALLENGE' if 0.60 <= score <= 0.85 else 'Continue'}",
            f"Score < 0.60? {'Yes' if score < 0.60 else 'No'} → {'DENY' if score < 0.60 else 'N/A'}",
            f"Final Decision: {decision}",
        ]


class SessionValidationService:
    """Orchestrates the full session validation pipeline. Reuses all existing engines."""

    def __init__(self, store: RuleStore) -> None:
        self.store = store
        self.parser = SessionParser()
        self.entity_extractor = EntityExtractor()
        self.rule_matcher = RuleMatcher()
        self.signal_generator = SignalGenerator()
        self.feature_engineer = FeatureEngineer()
        self.domain_calculator = DomainScoreCalculator()
        self.coherence_brain = CoherenceBrain()
        self.decision_engine = DecisionEngine()
        self._history: List[Dict[str, Any]] = []

    def run_validation(self, raw_input: str, content_type: str = "json") -> Dict[str, Any]:
        session_id = f"SV-{uuid.uuid4().hex[:8].upper()}"
        pipeline_start = time.perf_counter()
        timeline: List[Dict[str, Any]] = []

        # ---- Stage 1: Session Received ----
        t0 = time.perf_counter()
        timeline.append(self._timeline_entry("Session Received", t0 - pipeline_start, "completed", "Session payload received"))
        time.sleep(0.02)

        # ---- Stage 2: Session Parser ----
        t1 = time.perf_counter()
        session = self.parser.parse(raw_input, content_type)
        session["session_id"] = session_id
        timeline.append(self._timeline_entry("Session Parser", t1 - pipeline_start, "completed",
                                              f"Parsed {len(session)} fields", rules_executed=0, features_generated=0))
        time.sleep(0.02)

        # ---- Stage 3: Entity Extraction ----
        t2 = time.perf_counter()
        entities = self.entity_extractor.extract(session)
        timeline.append(self._timeline_entry("Entity Extraction", t2 - pipeline_start, "completed",
                                              f"Extracted {len(entities)} entities"))
        time.sleep(0.02)

        # ---- Stage 4: Rule Discovery ----
        t3 = time.perf_counter()
        all_rules = self.store.all_rules()
        candidate_rules, domain_candidates = self._discover_rules(all_rules, session)
        timeline.append(self._timeline_entry("Rule Discovery", t3 - pipeline_start, "completed",
                                              f"Discovered {len(candidate_rules)} candidate rules from {len(domain_candidates)} domains",
                                              rules_executed=len(candidate_rules)))
        time.sleep(0.02)

        # ---- Stage 5: Rule Matching ----
        t4 = time.perf_counter()
        matched_results = self.rule_matcher.evaluate(candidate_rules, session)
        matched_count = sum(1 for r in matched_results if r["matched"])
        timeline.append(self._timeline_entry("Rule Matching", t4 - pipeline_start, "completed",
                                              f"Matched {matched_count}/{len(candidate_rules)} rules",
                                              rules_executed=len(candidate_rules)))
        time.sleep(0.02)

        # ---- Stage 6: Signal Generation ----
        t5 = time.perf_counter()
        signals = self.signal_generator.generate(matched_results, session)
        timeline.append(self._timeline_entry("Signal Generation", t5 - pipeline_start, "completed",
                                              f"Generated {len(signals)} signals"))
        time.sleep(0.02)

        # ---- Stage 7: Feature Engineering ----
        t6 = time.perf_counter()
        features = self.feature_engineer.engineer(signals, matched_results, session)
        timeline.append(self._timeline_entry("Feature Engineering", t6 - pipeline_start, "completed",
                                              f"Engineered {len(features)} features",
                                              features_generated=len(features)))
        time.sleep(0.02)

        # ---- Stage 8: Domain Score Calculation ----
        t7 = time.perf_counter()
        domain_scores = self.domain_calculator.calculate(features, signals)
        timeline.append(self._timeline_entry("Domain Score Calculation", t7 - pipeline_start, "completed",
                                              f"Calculated {len(domain_scores)} domain scores"))
        time.sleep(0.02)

        # ---- Stage 9: Coherence Brain ----
        t8 = time.perf_counter()
        coherence = self.coherence_brain.calculate(domain_scores)
        timeline.append(self._timeline_entry("Coherence Brain", t8 - pipeline_start, "completed",
                                              f"Coherence score: {coherence['coherence_score']:.4f}"))
        time.sleep(0.02)

        # ---- Stage 10: Decision Engine ----
        t9 = time.perf_counter()
        decision_result = self.decision_engine.decide(
            coherence["coherence_score"], domain_scores, matched_results, signals, features
        )
        timeline.append(self._timeline_entry("Decision Engine", t9 - pipeline_start, "completed",
                                              f"Decision: {decision_result['decision']}"))
        time.sleep(0.02)

        pipeline_duration = (time.perf_counter() - pipeline_start) * 1000

        # Performance stats
        avg_rule_time = sum(r["execution_time_ms"] for r in matched_results) / len(matched_results) if matched_results else 0

        performance = {
            "execution_time_ms": round(pipeline_duration, 2),
            "rules_evaluated": len(candidate_rules),
            "rules_matched": matched_count,
            "signals_generated": len(signals),
            "features_generated": len(features),
            "average_rule_time_ms": round(avg_rule_time, 3),
            "pipeline_duration_ms": round(pipeline_duration, 2),
        }

        result = {
            "session_id": session_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "raw_input": raw_input,
            "content_type": content_type,
            "session": session,
            "entities": entities,
            "domain_candidates": domain_candidates,
            "matched_rules": matched_results,
            "signals": signals,
            "features": features,
            "domain_scores": domain_scores,
            "coherence": coherence,
            "decision": decision_result,
            "performance": performance,
            "timeline": timeline,
            "pipeline_stages": PIPELINE_STAGES,
        }

        self._history.append(result)
        if len(self._history) > 100:
            self._history = self._history[-100:]

        return result

    def get_history(self) -> List[Dict[str, Any]]:
        return [
            {
                "session_id": h["session_id"],
                "timestamp": h["timestamp"],
                "decision": h["decision"]["decision"],
                "coherence_score": h["coherence"]["coherence_score"],
                "rules_matched": h["performance"]["rules_matched"],
                "signals_generated": h["performance"]["signals_generated"],
                "customer_id": h["session"].get("customer_id", "UNKNOWN"),
                "execution_time_ms": h["performance"]["execution_time_ms"],
            }
            for h in self._history
        ]

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        for h in self._history:
            if h["session_id"] == session_id:
                return h
        return None

    def get_report(self, session_id: str) -> Optional[Dict[str, Any]]:
        session = self.get_session(session_id)
        if session is None:
            return None
        return self._build_report(session)

    def _discover_rules(self, all_rules: List[Rule], session: Dict[str, Any]) -> Tuple[List[Rule], List[Dict[str, Any]]]:
        """Discover relevant rules based on session content. Only execute relevant rules."""
        session_text = " ".join(str(v) for v in session.values()).lower()

        # Determine relevant domains from session
        relevant_domains: Dict[str, int] = {}
        for domain, keywords in DEFAULT_TAXONOMY.items():
            count = 0
            for kw in keywords:
                if re.search(r'\b' + re.escape(kw) + r'\b', session_text):
                    count += 1
            if count > 0:
                relevant_domains[domain] = count

        # If no domains matched, use all (fallback)
        if not relevant_domains:
            relevant_domains = {d: 0 for d in DEFAULT_TAXONOMY}

        # Filter rules to relevant domains
        candidate_rules: List[Rule] = []
        domain_candidates: List[Dict[str, Any]] = []
        for domain in relevant_domains:
            domain_rules = [
                r for r in all_rules
                if r.primary_cluster == domain or r.secondary_cluster == domain
            ]
            candidate_rules.extend(domain_rules)
            domain_candidates.append({
                "domain": domain,
                "candidate_rules": len(domain_rules),
                "keyword_hits": relevant_domains[domain],
            })

        # Deduplicate
        seen_ids: set = set()
        unique_candidates: List[Rule] = []
        for r in candidate_rules:
            if r.rule_id not in seen_ids:
                seen_ids.add(r.rule_id)
                unique_candidates.append(r)

        # If no candidates, fall back to all rules
        if not unique_candidates:
            unique_candidates = list(all_rules)
            domain_candidates = [{"domain": "All", "candidate_rules": len(all_rules), "keyword_hits": 0}]

        return unique_candidates, domain_candidates

    def _timeline_entry(self, stage: str, exec_time: float, status: str, detail: str,
                        rules_executed: int = 0, features_generated: int = 0) -> Dict[str, Any]:
        return {
            "stage": stage,
            "execution_time": datetime.now(timezone.utc).isoformat(),
            "duration_ms": round(exec_time * 1000, 2),
            "status": status,
            "detail": detail,
            "rules_executed": rules_executed,
            "features_generated": features_generated,
        }

    def _build_report(self, session: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "report_id": f"RPT-{session['session_id']}",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "session_summary": {
                "session_id": session["session_id"],
                "customer_id": session["session"].get("customer_id"),
                "application": session["session"].get("application"),
                "channel": session["session"].get("channel"),
                "ip_address": session["session"].get("ip_address"),
                "country": session["session"].get("country"),
                "timestamp": session["session"].get("timestamp"),
            },
            "extracted_entities": session["entities"],
            "matched_rules": [
                {"rule_id": r["rule_id"], "rule_name": r["rule_name"], "matched": r["matched"], "confidence": r["confidence"]}
                for r in session["matched_rules"]
            ],
            "signals": [
                {"signal_id": s["signal_id"], "label": s["label"], "confidence": s["confidence"]}
                for s in session["signals"]
            ],
            "features": [
                {"feature_name": f["feature_name"], "value": f["value"], "domain": f["domain"]}
                for f in session["features"]
            ],
            "domain_scores": session["domain_scores"],
            "coherence_score": session["coherence"]["coherence_score"],
            "final_decision": session["decision"]["decision"],
            "reason_codes": session["decision"]["reason_codes"],
            "execution_statistics": session["performance"],
        }


# Shared instance — uses the same store as the rest of the app
session_validation_service = SessionValidationService(RuleStore())
# Re-seed with the shared store so rules are available
session_validation_service.store.seed_if_empty()


# Sample payloads for the UI
SAMPLE_PAYLOADS: List[Dict[str, str]] = [
    {
        "label": "Normal Login",
        "content_type": "json",
        "content": json.dumps({
            "customer_id": "CUST-10045",
            "application": "OnlineBanking",
            "channel": "Web",
            "device": "fp-a1b2c3d4e5f6",
            "device_type": "Desktop",
            "browser": "Chrome 120",
            "os": "Windows 11",
            "ip_address": "73.42.18.205",
            "country": "United States",
            "city": "New York",
            "latitude": 40.7128,
            "longitude": -74.0060,
            "isp": "Comcast",
            "asn": "AS7922",
            "device_age_days": 420,
            "password_reset": 0,
            "failed_login_count": 0,
            "historical_login_count": 156,
            "transaction_type": "Login",
            "timestamp": "2026-07-23T10:30:00Z",
            "session_duration": 45,
            "new_device": False,
            "vpn": False,
            "trusted_device": True,
            "auth_method": "Password",
            "mfa_used": True,
        }, indent=2),
    },
    {
        "label": "Suspicious VPN Login",
        "content_type": "json",
        "content": json.dumps({
            "customer_id": "CUST-20087",
            "application": "OnlineBanking",
            "channel": "Mobile App",
            "device": "fp-x9y8z7w6v5",
            "device_type": "Mobile",
            "browser": "Safari Mobile",
            "os": "iOS 17",
            "ip_address": "45.83.64.12",
            "country": "Russia",
            "city": "Moscow",
            "latitude": 55.7558,
            "longitude": 37.6173,
            "isp": "Unknown VPN Provider",
            "asn": "AS9001",
            "device_age_days": 3,
            "password_reset": 2,
            "failed_login_count": 5,
            "historical_login_count": 12,
            "transaction_type": "Login",
            "timestamp": "2026-07-23T03:15:00Z",
            "session_duration": 8,
            "new_device": True,
            "vpn": True,
            "proxy": True,
            "trusted_device": False,
            "previous_country": "United States",
            "previous_city": "Chicago",
            "geo_distance_km": 8500,
            "auth_method": "Password",
            "mfa_used": False,
        }, indent=2),
    },
    {
        "label": "Credential Stuffing Attack",
        "content_type": "json",
        "content": json.dumps({
            "customer_id": "CUST-30012",
            "application": "OnlineBanking",
            "channel": "Web",
            "device": "fp-burst7777",
            "device_type": "Desktop",
            "browser": "Firefox 121",
            "os": "Linux",
            "ip_address": "192.168.1.50",
            "country": "Brazil",
            "city": "Sao Paulo",
            "latitude": -23.5505,
            "longitude": -46.6333,
            "isp": "Vivo",
            "asn": "AS28571",
            "device_age_days": 1,
            "password_reset": 0,
            "failed_login_count": 14,
            "historical_login_count": 3,
            "velocity_events": 22,
            "transaction_type": "Login",
            "timestamp": "2026-07-23T08:45:00Z",
            "session_duration": 2,
            "new_device": True,
            "vpn": False,
            "trusted_device": False,
            "auth_method": "Password",
            "mfa_used": False,
        }, indent=2),
    },
]


def generate_random_session() -> Dict[str, str]:
    """Generate a random session payload for testing."""
    countries = [("United States", "New York", 40.7128, -74.0060, "Comcast", "AS7922"),
                 ("United Kingdom", "London", 51.5074, -0.1278, "BT", "AS2856"),
                 ("Germany", "Berlin", 52.5200, 13.4050, "Deutsche Telekom", "AS3320"),
                 ("Russia", "Moscow", 55.7558, 37.6173, "Unknown VPN", "AS9001"),
                 ("Brazil", "Sao Paulo", -23.5505, -46.6333, "Vivo", "AS28571"),
                 ("India", "Mumbai", 19.0760, 72.8777, "Jio", "AS55836")]
    browsers = ["Chrome 120", "Firefox 121", "Safari Mobile", "Edge 120"]
    oss = ["Windows 11", "macOS 14", "iOS 17", "Android 14", "Linux"]
    channels = ["Web", "Mobile App", "API"]
    apps = ["OnlineBanking", "WealthPortal", "MobileBanking"]

    c = random.choice(countries)
    is_suspicious = random.random() > 0.5

    payload = {
        "customer_id": f"CUST-{random.randint(10000, 99999)}",
        "application": random.choice(apps),
        "channel": random.choice(channels),
        "device": f"fp-{uuid.uuid4().hex[:12]}",
        "device_type": random.choice(["Desktop", "Mobile", "Tablet"]),
        "browser": random.choice(browsers),
        "os": random.choice(oss),
        "ip_address": f"{random.randint(1, 223)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}",
        "country": c[0],
        "city": c[1],
        "latitude": c[2],
        "longitude": c[3],
        "isp": c[4],
        "asn": c[5],
        "device_age_days": random.randint(1, 500) if is_suspicious else random.randint(180, 700),
        "password_reset": random.randint(0, 3) if is_suspicious else 0,
        "failed_login_count": random.randint(0, 15) if is_suspicious else 0,
        "historical_login_count": random.randint(5, 200),
        "velocity_events": random.randint(0, 25) if is_suspicious else random.randint(0, 3),
        "transaction_type": "Login",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "session_duration": random.randint(1, 120),
        "new_device": is_suspicious and random.random() > 0.5,
        "vpn": is_suspicious and random.random() > 0.6,
        "proxy": is_suspicious and random.random() > 0.7,
        "trusted_device": not is_suspicious,
        "auth_method": random.choice(["Password", "Biometric", "OTP"]),
        "mfa_used": not is_suspicious or random.random() > 0.5,
    }
    if is_suspicious and random.random() > 0.5:
        payload["previous_country"] = random.choice([co[0] for co in countries if co[0] != c[0]])
        payload["previous_city"] = "Previous City"
        payload["geo_distance_km"] = random.randint(500, 12000)

    return {"label": "Random Session", "content_type": "json", "content": json.dumps(payload, indent=2)}
