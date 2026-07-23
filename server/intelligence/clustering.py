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
    # "history" removed — previously caused domain collision with Behavior Intelligence
    "Temporal Intelligence": [
        "date", "hour", "days", "minutes", "time", "temporal", "trx date",
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
    """Classifies rules into domains using taxonomy keywords and full-corpus TF-IDF similarity.

    Key design: classify_batch() builds TF-IDF over the ENTIRE rule corpus + domain prototypes,
    giving IDF weights that genuinely discriminate terms across rules. classify() is available
    for single-rule use and internally uses a minimal corpus (acceptable for ad-hoc calls).
    """

    def __init__(self, taxonomy_engine: Optional[TaxonomyEngine] = None) -> None:
        self.taxonomy_engine = taxonomy_engine or TaxonomyEngine()
        self.similarity_engine = SimilarityEngine()

    def _get_prototype_doc(self, keywords: List[str]) -> str:
        return " ".join(keywords)

    def _keyword_scores(
        self,
        rule: Rule,
        taxonomy: Dict[str, List[str]],
    ) -> Dict[str, Dict[str, Any]]:
        """Computes keyword, parameter, and description overlap scores per domain."""
        haystack = f"{rule.rule_name} {rule.description} {' '.join(rule.parameters)}".lower()
        rule_params = {p.lower() for p in rule.parameters}
        scores: Dict[str, Dict[str, Any]] = {}

        for domain, keywords in taxonomy.items():
            matched_kws: List[str] = []
            for kw in keywords:
                if re.search(r'\b' + re.escape(kw.lower()) + r'\b', haystack):
                    matched_kws.append(kw)

            param_overlap = 0
            for kw in keywords:
                kw_low = kw.lower()
                for p in rule_params:
                    if re.search(r'\b' + re.escape(kw_low) + r'\b', p) or \
                       re.search(r'\b' + re.escape(p) + r'\b', kw_low):
                        param_overlap += 1
                        break

            desc_low = rule.description.lower()
            desc_overlap = sum(
                1 for kw in keywords
                if re.search(r'\b' + re.escape(kw.lower()) + r'\b', desc_low)
            )

            scores[domain] = {
                "matched_keywords": matched_kws,
                "param_overlap": param_overlap,
                "desc_overlap": desc_overlap,
                "match_count": len(matched_kws),
            }

        return scores

    def _build_result(
        self,
        rule: Rule,
        taxonomy: Dict[str, List[str]],
        domains_list: List[str],
        domain_similarity_scores: Dict[str, float],
        kw_scores: Dict[str, Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Assembles hybrid rankings and returns the primary/secondary classification."""
        haystack = f"{rule.rule_name} {rule.description} {' '.join(rule.parameters)}".lower()
        # Unique significant words in the rule text for precision calculation
        rule_words = set(re.findall(r'\b\w{2,}\b', haystack))

        hybrid_rankings: List[Dict[str, Any]] = []
        for domain in domains_list:
            keywords = taxonomy[domain]
            meta = kw_scores[domain]
            sim_score = domain_similarity_scores.get(domain, 0.0)
            match_count = meta["match_count"]

            if match_count == 0 and sim_score < 0.05:
                continue

            # --- F1-like keyword score (balances recall vs precision) ---
            kw_recall = match_count / len(keywords) if keywords else 0.0
            kw_precision = match_count / max(len(rule_words), 1)
            if (kw_recall + kw_precision) > 0:
                kw_f1 = (2 * kw_recall * kw_precision) / (kw_recall + kw_precision)
            else:
                kw_f1 = 0.0

            # Structural boosts
            param_boost = min(meta["param_overlap"] * 0.04, 0.16)
            desc_boost = min(meta["desc_overlap"] * 0.03, 0.12)

            # Semantic similarity — now the dominant signal when corpus is full
            # cap at 0.55 so keyword evidence can always break ties
            sim_boost = min(sim_score * 0.55, 0.55)

            confidence = min(kw_f1 * 0.30 + param_boost + desc_boost + sim_boost, 1.0)

            reasoning = [
                f"Keyword recall: {match_count}/{len(keywords)} ({kw_recall:.2f}).",
                f"Keyword precision: {match_count}/{max(len(rule_words),1)} terms ({kw_precision:.3f}).",
                f"F1 keyword score: {kw_f1:.3f}.",
                f"Parameter overlaps: {meta['param_overlap']} (boost +{param_boost:.3f}).",
                f"Description overlaps: {meta['desc_overlap']} (boost +{desc_boost:.3f}).",
                f"Semantic TF-IDF cosine similarity: {sim_score:.3f} (boost +{sim_boost:.3f}).",
            ]

            hybrid_rankings.append({
                "domain": domain,
                "confidence": confidence,
                "matched_keywords": meta["matched_keywords"],
                "reasoning": reasoning,
            })

        hybrid_rankings.sort(key=lambda x: x["confidence"], reverse=True)

        if not hybrid_rankings:
            return {
                "primary": "Unclustered",
                "secondary": None,
                "confidence": 0.0,
                "matched_keywords": [],
                "reasoning": ["No matching keywords or similarity features found."],
            }

        primary = hybrid_rankings[0]
        secondary = hybrid_rankings[1]["domain"] if len(hybrid_rankings) > 1 else None
        return {
            "primary": primary["domain"],
            "secondary": secondary,
            "confidence": primary["confidence"],
            "matched_keywords": primary["matched_keywords"],
            "reasoning": primary["reasoning"],
        }

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def classify_batch(self, rules: List[Rule]) -> List[Dict[str, Any]]:
        """Batch-classifies all rules with FULL-CORPUS TF-IDF for accurate semantic similarity.

        Builds TF-IDF over (domain prototypes + every rule doc) so IDF weights genuinely
        discriminate terms that appear across many rules vs domain-specific terms.
        """
        if not rules:
            return []

        taxonomy = self.taxonomy_engine.get_taxonomy()
        domains_list = list(taxonomy.keys())
        prototype_docs = [self._get_prototype_doc(taxonomy[d]) for d in domains_list]
        rule_docs = [
            f"{r.rule_name} {r.description} {' '.join(r.parameters)}"
            for r in rules
        ]

        # Full corpus: prototypes first, then all rule docs
        all_docs = prototype_docs + rule_docs
        cosine_matrix = self.similarity_engine.compute_tfidf_and_cosine(all_docs)
        num_prototypes = len(prototype_docs)

        results: List[Dict[str, Any]] = []
        for rule_idx, rule in enumerate(rules):
            doc_idx = num_prototypes + rule_idx
            domain_sim_scores = {
                domains_list[i]: float(cosine_matrix[i, doc_idx])
                for i in range(len(domains_list))
            }
            kw_scores = self._keyword_scores(rule, taxonomy)
            result = self._build_result(rule, taxonomy, domains_list, domain_sim_scores, kw_scores)
            results.append(result)

        return results

    def classify(self, rule: Rule, all_rules: List[Rule]) -> Dict[str, Any]:
        """Classifies a single rule. Uses full corpus when all_rules is provided."""
        # Delegate to batch for a single rule — ensures corpus always includes context
        corpus = all_rules if all_rules else [rule]
        # Find index of this rule in results
        results = self.classify_batch(corpus)
        for r, res in zip(corpus, results):
            if r.rule_id == rule.rule_id:
                return res
        # Fallback: classify just the rule alone
        return self.classify_batch([rule])[0]
