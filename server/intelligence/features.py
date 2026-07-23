from __future__ import annotations
import re
from typing import List, Dict, Any, Set
from models import Rule, EngineeredFeature

# Define static blueprints that describe the composition of features from signals
FEATURE_BLUEPRINT: List[Dict[str, Any]] = [
    {
        "feature_name": "DeviceTrustScore",
        "domain": "Device Intelligence",
        "derived_parameters": ["New Device", "Device Age", "Fingerprint", "Trusted Device", "Device Reputation"],
        "weight_base": 0.22,
        "description": "Composite trust score for the device fingerprint, age, and reputation signals.",
        "used_by": ["Coherence Brain", "ML Model", "Rule Engine"],
        "signals": ["SIG_DEVICE_AGE_CHECK", "SIG_FINGERPRINT_MATCH", "SIG_DEVICE_TRUST_STATE"],
        "formula": "0.4 * SIG_DEVICE_TRUST_STATE + 0.3 * SIG_FINGERPRINT_MATCH + 0.3 * SIG_DEVICE_AGE_CHECK"
    },
    {
        "feature_name": "NetworkTrustScore",
        "domain": "Network Intelligence",
        "derived_parameters": ["ISP", "Carrier", "VPN", "Proxy", "ASN"],
        "weight_base": 0.18,
        "description": "Trust score derived from network-level signals including VPN/proxy and ASN reputation.",
        "used_by": ["Coherence Brain", "ML Model", "Rule Engine"],
        "signals": ["SIG_VPN_PROXY_DETECT", "SIG_CARRIER_REPUTATION", "SIG_ASN_RISK"],
        "formula": "0.5 * SIG_VPN_PROXY_DETECT + 0.3 * SIG_ASN_RISK + 0.2 * SIG_CARRIER_REPUTATION"
    },
    {
        "feature_name": "CredentialHealthScore",
        "domain": "Credential Intelligence",
        "derived_parameters": ["Password Reset", "Failed Login", "Authentication Type"],
        "weight_base": 0.16,
        "description": "Health of credential usage based on resets, failed logins, and auth method.",
        "used_by": ["Coherence Brain", "ML Model", "Rule Engine"],
        "signals": ["SIG_LOGIN_FAILURES", "SIG_PASSWORD_RESET_BURST"],
        "formula": "0.6 * SIG_LOGIN_FAILURES + 0.4 * SIG_PASSWORD_RESET_BURST"
    },
    {
        "feature_name": "BehaviorConsistencyScore",
        "domain": "Behavior Intelligence",
        "derived_parameters": ["Velocity", "Historical Login", "Frequency", "Pattern"],
        "weight_base": 0.16,
        "description": "Consistency of behavioral patterns relative to historical baselines.",
        "used_by": ["Coherence Brain", "ML Model", "Rule Engine"],
        "signals": ["SIG_LOGIN_VELOCITY_ANOMALY", "SIG_HISTORICAL_DEVIATION"],
        "formula": "0.5 * SIG_LOGIN_VELOCITY_ANOMALY + 0.5 * SIG_HISTORICAL_DEVIATION"
    },
    {
        "feature_name": "LocationCoherenceScore",
        "domain": "Location Intelligence",
        "derived_parameters": ["Country", "City", "Travel", "Geo Distance"],
        "weight_base": 0.14,
        "description": "Coherence of the current location against historical travel and geo distance.",
        "used_by": ["Coherence Brain", "ML Model", "Rule Engine"],
        "signals": ["SIG_IMPOSSIBLE_TRAVEL_GEO", "SIG_NEW_LOCATION_DETECT"],
        "formula": "0.7 * SIG_IMPOSSIBLE_TRAVEL_GEO + 0.3 * SIG_NEW_LOCATION_DETECT"
    },
    {
        "feature_name": "CustomerRiskScore",
        "domain": "Customer Intelligence",
        "derived_parameters": ["Customer Type", "Risk Flag", "Previous Fraud"],
        "weight_base": 0.12,
        "description": "Risk score for the customer segment and prior fraud history.",
        "used_by": ["Coherence Brain", "ML Model", "Rule Engine"],
        "signals": ["SIG_CUSTOMER_RISK_FLAG", "SIG_HISTORIC_FRAUD_OCCURRENCE"],
        "formula": "0.6 * SIG_HISTORIC_FRAUD_OCCURRENCE + 0.4 * SIG_CUSTOMER_RISK_FLAG"
    },
    {
        "feature_name": "TransactionRiskScore",
        "domain": "Transaction Intelligence",
        "derived_parameters": ["Reject Type", "Transaction Type", "Transfer"],
        "weight_base": 0.12,
        "description": "Risk of the transaction based on reject codes, type, and transfer patterns.",
        "used_by": ["Coherence Brain", "ML Model", "Rule Engine"],
        "signals": ["SIG_TRANSACTION_REJECTION", "SIG_TRANSFER_AMOUNT_VELOCITY"],
        "formula": "0.5 * SIG_TRANSACTION_REJECTION + 0.5 * SIG_TRANSFER_AMOUNT_VELOCITY"
    }
]

class SignalGenerationEngine:
    """Discovers and parses granular fraud signals from rule parameters and descriptions."""
    
    SIGNAL_MAP = {
        "SIG_DEVICE_AGE_CHECK": ["device age", "first seen", "device first seen", "device_age"],
        "SIG_FINGERPRINT_MATCH": ["fingerprint", "browser hash", "device fingerprint"],
        "SIG_DEVICE_TRUST_STATE": ["trusted device", "device trust", "new device", "indicator"],
        "SIG_VPN_PROXY_DETECT": ["vpn", "proxy", "anonymous", "tor"],
        "SIG_CARRIER_REPUTATION": ["carrier", "isp", "isp carrier", "ip carrier"],
        "SIG_ASN_RISK": ["asn", "autonomous system"],
        "SIG_LOGIN_FAILURES": ["failed login", "failed login count", "login attempt", "resets"],
        "SIG_PASSWORD_RESET_BURST": ["password reset", "reset count"],
        "SIG_LOGIN_VELOCITY_ANOMALY": ["velocity", "burst", "frequency", "15min", "hour"],
        "SIG_HISTORICAL_DEVIATION": ["deviation", "historical login", "baseline", "exceed", "pattern score"],
        "SIG_IMPOSSIBLE_TRAVEL_GEO": ["travel", "impossible", "geo distance", "km"],
        "SIG_NEW_LOCATION_DETECT": ["previous country", "previous city", "current country", "current city"],
        "SIG_CUSTOMER_RISK_FLAG": ["customer risk", "risk flag", "customer type"],
        "SIG_HISTORIC_FRAUD_OCCURRENCE": ["previous fraud", "fraud occurred", "past 30 days"],
        "SIG_TRANSACTION_REJECTION": ["reject", "rejected", "reject type", "rejected transaction"],
        "SIG_TRANSFER_AMOUNT_VELOCITY": ["transfer amount", "wire transfer", "amount", "transfer"]
    }

    def generate_signals(self, rules: List[Rule]) -> Dict[str, Dict[str, Any]]:
        """Scans rules for parameters and metadata, mapping them to granular signals."""
        signals_discovered: Dict[str, Dict[str, Any]] = {}
        
        for rule in rules:
            text = f"{rule.rule_name} {rule.description} {' '.join(rule.parameters)}".lower()
            
            for sig_id, keywords in self.SIGNAL_MAP.items():
                matched_keywords = []
                for kw in keywords:
                    pattern = r'\b' + re.escape(kw) + r'\b'
                    if re.search(pattern, text):
                        matched_keywords.append(kw)
                        
                if matched_keywords:
                    if sig_id not in signals_discovered:
                        signals_discovered[sig_id] = {
                            "signal_id": sig_id,
                            "rules_involved": [],
                            "parameters": set(),
                            "matched_keywords": set(),
                            "confidence": 0.0
                        }
                    
                    signals_discovered[sig_id]["rules_involved"].append(rule.rule_id)
                    # Collect parameters from the rule that match this signal
                    for p in rule.parameters:
                        p_low = p.lower()
                        for kw in keywords:
                            if kw in p_low:
                                signals_discovered[sig_id]["parameters"].add(p)
                                break
                    signals_discovered[sig_id]["matched_keywords"].update(matched_keywords)

        # Calculate confidence score for each discovered signal
        for sig_id, data in signals_discovered.items():
            # More rules and more specific parameter matches yield higher confidence
            rule_factor = min(len(data["rules_involved"]) * 0.15, 0.45)
            param_factor = min(len(data["parameters"]) * 0.15, 0.45)
            kw_factor = min(len(data["matched_keywords"]) * 0.05, 0.10)
            data["confidence"] = round(rule_factor + param_factor + kw_factor, 3)
            # convert sets to lists for JSON serialization
            data["parameters"] = sorted(list(data["parameters"]))
            data["matched_keywords"] = sorted(list(data["matched_keywords"]))

        return signals_discovered


class FeatureImportanceEngine:
    """Calculates feature weights based on rule counts, rule risk levels, and PageRank."""

    def calculate_weights(self, blueprints: List[Dict[str, Any]], rules: List[Rule]) -> Dict[str, float]:
        weights: Dict[str, float] = {}
        total_rules = len(rules)
        if total_rules == 0:
            return {bp["feature_name"]: bp["weight_base"] for bp in blueprints}

        # Calculate risk weighting
        risk_scores = {"Critical": 4.0, "High": 3.0, "Medium": 2.0, "Low": 1.0}
        
        for bp in blueprints:
            feature_name = bp["feature_name"]
            # Base weight
            w = bp["weight_base"]
            
            # Find rules associated with this feature's signals
            # Look at parameters/keywords to map rules to feature domain
            domain_rules = [r for r in rules if r.primary_cluster == bp["domain"] or r.secondary_cluster == bp["domain"]]
            
            if domain_rules:
                # Scale by ratio of domain rules
                rule_ratio = len(domain_rules) / total_rules
                
                # Scale by average risk of domain rules
                avg_risk = sum(risk_scores.get(r.risk_level, 2.0) for r in domain_rules) / len(domain_rules)
                risk_factor = avg_risk / 4.0  # Normalize to [0.25, 1.0]
                
                # Adjust weight dynamically
                w = w * 0.5 + (rule_ratio * 0.3 + risk_factor * 0.2)
                
            weights[feature_name] = round(min(max(w, 0.05), 0.5), 3)

        # Normalize weights so they sum to 1.0 if desired, or keep as raw absolute scales
        return weights


class CompositeFeatureEngineeringEngine:
    """Engineers explainable features mapping to security domain scopes."""

    def __init__(self) -> None:
        self.signal_engine = SignalGenerationEngine()
        self.importance_engine = FeatureImportanceEngine()

    def engineer(self, rules: List[Rule]) -> List[EngineeredFeature]:
        signals = self.signal_engine.generate_signals(rules)
        dynamic_weights = self.importance_engine.calculate_weights(FEATURE_BLUEPRINT, rules)
        
        engineered: List[EngineeredFeature] = []
        for bp in FEATURE_BLUEPRINT:
            feature_name = bp["feature_name"]
            
            # Find which rules map to this feature's signals
            derived_rules_set: Set[str] = set()
            for sig in bp["signals"]:
                if sig in signals:
                    derived_rules_set.update(signals[sig]["rules_involved"])
            
            derived_rules = sorted(list(derived_rules_set))
            
            # Extract parameters active for this feature
            derived_parameters = sorted(list({
                p for r in rules if r.rule_id in derived_rules for p in r.parameters
            }))
            if not derived_parameters:
                derived_parameters = bp["derived_parameters"]

            # Format explainable description with formula
            gov_desc = (
                f"{bp['description']} "
                f"Governance Formula: {bp['formula']}. "
                f"Active Signals: {', '.join(bp['signals'])}."
            )

            engineered.append(EngineeredFeature(
                feature_name=feature_name,
                domain=bp["domain"],
                derived_rules=derived_rules,
                derived_parameters=derived_parameters,
                weight=dynamic_weights[feature_name],
                description=gov_desc,
                used_by=bp["used_by"]
            ))

        return engineered
