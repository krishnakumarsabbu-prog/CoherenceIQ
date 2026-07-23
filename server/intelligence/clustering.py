from __future__ import annotations
import re
from typing import List, Dict, Tuple, Any, Optional
from models import Rule, Cluster
from intelligence.similarity import SimilarityEngine

DEFAULT_TAXONOMY: Dict[str, List[str]] = {
    "Device Intelligence": [
        "device", "fingerprint", "device age", "online device", "browser", "ios",
        "android", "desktop", "mobile", "device id", "device trust", "new device",
        "trusted device", "device reputation"
    ],
    "Network Intelligence": [
        "isp", "carrier", "proxy", "vpn", "tor", "asn", "network", "ip", "ip address",
        "ip carrier", "online device first seen"
    ],
    "Location Intelligence": [
        "country", "city", "latitude", "longitude", "gps", "geo", "travel",
        "geo distance", "location", "geolocation"
    ],
    "Credential Intelligence": [
        "password", "credential", "failed login", "reset", "authentication",
        "credential health", "auth", "login attempt"
    ],
    "Behavior Intelligence": [
        "velocity", "frequency", "pattern", "sequence", "history", "behavior",
        "historical login", "behavior consistency"
    ],
    "Customer Intelligence": [
        "customer", "risk", "segment", "high risk", "customer type", "risk flag",
        "previous fraud", "customer risk"
    ],
    "Transaction Intelligence": [
        "transaction", "payment", "transfer", "reject", "rejected", "reject type",
        "transaction type", "rejected transaction", "transaction risk"
    ],
    "Temporal Intelligence": [
        "date", "hour", "days", "minutes", "history", "time", "temporal", "trx date",
        "timestamp", "window"
    ]
}

class TaxonomyEngine:
    """Manages the intelligence taxonomy classification configuration."""
    
    def __init__(self, taxonomy: Optional[Dict[str, List[str]]] = None) -> None:
        self._taxonomy = taxonomy or DEFAULT_TAXONOMY

    def get_taxonomy(self) -> Dict[str, List[str]]:
        return self._taxonomy

    def add_subdomain(self, domain: str, keywords: List[str]) -> None:
        if domain not in self._taxonomy:
            self._taxonomy[domain] = []
        self._taxonomy[domain] = list(set(self._taxonomy[domain] + keywords))


class HybridClusteringEngine:
    """Classifies rules into domains using taxonomy keywords and TF-IDF similarity profiles."""
    
    def __init__(self, taxonomy_engine: Optional[TaxonomyEngine] = None) -> None:
        self.taxonomy_engine = taxonomy_engine or TaxonomyEngine()
        self.similarity_engine = SimilarityEngine()

    def _get_prototype_doc(self, keywords: List[str]) -> str:
        return " ".join(keywords)

    def classify(self, rule: Rule, all_rules: List[Rule]) -> Dict[str, Any]:
        """Calculates hybrid score combining taxonomy overlap and prototype TF-IDF similarity."""
        taxonomy = self.taxonomy_engine.get_taxonomy()
        
        # 1. Compute keyword matches & overlap
        haystack = f"{rule.rule_name} {rule.description} {' '.join(rule.parameters)}".lower()
        
        scores: Dict[str, Dict[str, Any]] = {}
        for domain, keywords in taxonomy.items():
            matched_kws = []
            for kw in keywords:
                pattern = r'\b' + re.escape(kw.lower()) + r'\b'
                if re.search(pattern, haystack):
                    matched_kws.append(kw)
            
            # Param overlap
            param_overlap = 0
            rule_params = {p.lower() for p in rule.parameters}
            for kw in keywords:
                kw_low = kw.lower()
                pattern_kw = r'\b' + re.escape(kw_low) + r'\b'
                for p in rule_params:
                    pattern_p = r'\b' + re.escape(p) + r'\b'
                    if re.search(pattern_kw, p) or re.search(pattern_p, kw_low):
                        param_overlap += 1
                        break
                        
            # Description overlap
            desc_overlap = 0
            desc_low = rule.description.lower()
            for kw in keywords:
                pattern = r'\b' + re.escape(kw.lower()) + r'\b'
                if re.search(pattern, desc_low):
                    desc_overlap += 1

            scores[domain] = {
                "matched_keywords": matched_kws,
                "param_overlap": param_overlap,
                "desc_overlap": desc_overlap,
                "match_count": len(matched_kws)
            }

        # 2. Compute similarity against domain prototypes using similarity engine
        domains_list = list(taxonomy.keys())
        prototype_docs = [self._get_prototype_doc(taxonomy[d]) for d in domains_list]
        
        rule_doc = f"{rule.rule_name} {rule.description} {' '.join(rule.parameters)}"
        comparison_docs = prototype_docs + [rule_doc]
        
        cosine_matrix = self.similarity_engine.compute_tfidf_and_cosine(comparison_docs)
        rule_idx = len(comparison_docs) - 1
        
        domain_similarity_scores = {}
        for i, domain in enumerate(domains_list):
            domain_similarity_scores[domain] = float(cosine_matrix[i, rule_idx])

        # 3. Combine scores into a hybrid metric suitable for audit/model governance
        hybrid_rankings = []
        for domain in domains_list:
            meta = scores[domain]
            sim_score = domain_similarity_scores[domain]
            
            # Base confidence from keyword match ratio
            kw_ratio = meta["match_count"] / len(taxonomy[domain]) if taxonomy[domain] else 0.0
            
            # Boosts
            param_boost = min(meta["param_overlap"] * 0.05, 0.20)
            desc_boost = min(meta["desc_overlap"] * 0.04, 0.15)
            sim_boost = min(sim_score * 0.35, 0.40)
            
            confidence = min(kw_ratio + param_boost + desc_boost + sim_boost, 1.0)
            
            # Traceability logs
            reasoning = [
                f"Domain overlap: {meta['match_count']} keywords matched.",
                f"Parameter overlaps: {meta['param_overlap']}.",
                f"Description overlaps: {meta['desc_overlap']}.",
                f"Semantic domain similarity (TF-IDF Cosine): {sim_score:.3f}."
            ]
            
            if meta["match_count"] > 0 or sim_score > 0.05:
                hybrid_rankings.append({
                    "domain": domain,
                    "confidence": confidence,
                    "matched_keywords": meta["matched_keywords"],
                    "reasoning": reasoning
                })
                
        # Sort by confidence
        hybrid_rankings.sort(key=lambda x: x["confidence"], reverse=True)
        
        if not hybrid_rankings:
            return {
                "primary": "Unclustered",
                "secondary": None,
                "confidence": 0.0,
                "matched_keywords": [],
                "reasoning": ["No matching keywords or similarity features found."]
            }
            
        primary = hybrid_rankings[0]
        secondary = hybrid_rankings[1]["domain"] if len(hybrid_rankings) > 1 else None
        
        return {
            "primary": primary["domain"],
            "secondary": secondary,
            "confidence": primary["confidence"],
            "matched_keywords": primary["matched_keywords"],
            "reasoning": primary["reasoning"]
        }
