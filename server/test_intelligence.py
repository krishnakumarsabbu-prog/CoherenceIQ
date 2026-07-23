from __future__ import annotations
import unittest
from models import Rule, EngineeredFeature
from intelligence.parser import (
    ParserEngine,
    MetadataExtractionEngine,
    ThresholdExtractionEngine,
    IntentDetectionEngine,
    EntityExtractionEngine
)
from intelligence.similarity import SimilarityEngine
from intelligence.clustering import TaxonomyEngine, HybridClusteringEngine
from intelligence.graph import GraphEngine, KnowledgeGraphBuilder
from intelligence.features import (
    SignalGenerationEngine,
    FeatureImportanceEngine,
    CompositeFeatureEngineeringEngine
)


class TestIntelligenceArchitecture(unittest.TestCase):

    def setUp(self) -> None:
        self.rules_content = """# ALERT_LOGIN_FRAUDULENT_ISP
Rule Description: Login from a proxy or VPN with IP carrier flagged. Device age is less than 30 days and transaction count > 5.
Parameter Count: 3
Parameters:
- IP Carrier
- Device Age
- Transaction Count
"""
        self.mock_rule = Rule(
            rule_id="R-ALERT_LOGIN_FRAUDULENT_ISP",
            rule_name="ALERT_LOGIN_FRAUDULENT_ISP",
            description="Login from a proxy or VPN with IP carrier flagged. Device age is less than 30 days and transaction count > 5.",
            parameter_count=3,
            parameters=["IP Carrier", "Device Age", "Transaction Count"],
            keywords=["login", "proxy", "vpn", "carrier", "device", "age"],
            status="Published"
        )
        self.mock_rule_2 = Rule(
            rule_id="R-ALERT_GEO_TRAVEL",
            rule_name="ALERT_GEO_TRAVEL",
            description="Impossible travel detected. Geo distance > 8000 km between successive logins within 2 hours.",
            parameter_count=2,
            parameters=["Geo Distance", "Time Window"],
            keywords=["travel", "geo", "distance", "login"],
            status="Published"
        )

    def test_parser_engine(self) -> None:
        engine = ParserEngine()
        parsed = engine.parse_content("test.md", self.rules_content)
        self.assertEqual(len(parsed), 1)
        self.assertEqual(parsed[0]["name"], "ALERT_LOGIN_FRAUDULENT_ISP")
        self.assertEqual(parsed[0]["param_count"], 3)
        self.assertIn("IP Carrier", parsed[0]["parameters"])

    def test_metadata_extraction(self) -> None:
        engine = MetadataExtractionEngine()
        keywords = engine.extract_keywords(self.mock_rule.rule_name, self.mock_rule.description)
        self.assertTrue(len(keywords) > 0)
        self.assertIn("proxy", keywords)

        risk = engine.infer_risk(self.mock_rule.rule_name, self.mock_rule.description, ["Deny"])
        self.assertEqual(risk, "Critical")

    def test_threshold_extraction(self) -> None:
        engine = ThresholdExtractionEngine()
        data = engine.extract(self.mock_rule.description)
        self.assertIn("> 5", data["thresholds"])
        self.assertIn("30 days", data["time_windows"])

    def test_intent_detection(self) -> None:
        engine = IntentDetectionEngine()
        intents = engine.detect("Under suspicious conditions, trigger step up verification.")
        self.assertIn("Challenge", intents)

    def test_entity_extraction(self) -> None:
        engine = EntityExtractionEngine()
        data = engine.extract(self.mock_rule.description, self.mock_rule.parameters)
        self.assertIn("IP Carrier", data["entities"]["network_identifier"])

    def test_similarity_engine(self) -> None:
        engine = SimilarityEngine()
        docs = [
            "Device fingerprint mismatch and device age is low",
            "Network IP address VPN carrier and proxy asn",
        ]
        cosine_matrix = engine.compute_tfidf_and_cosine(docs)
        self.assertEqual(cosine_matrix.shape, (2, 2))
        self.assertAlmostEqual(cosine_matrix[0, 0], 1.0, places=4)

        tokens_a = set(engine.tokenize("device fingerprint"))
        tokens_b = set(engine.tokenize("device fingerprint mismatch"))
        jaccard = engine.compute_jaccard(tokens_a, tokens_b)
        self.assertTrue(jaccard > 0.0)

        sig = engine.compute_minhash_signature(tokens_a)
        self.assertEqual(len(sig), 64)

    def test_hybrid_clustering(self) -> None:
        engine = HybridClusteringEngine()
        res = engine.classify(self.mock_rule, [self.mock_rule])
        self.assertIn(res["primary"], ["Network Intelligence", "Device Intelligence"])
        self.assertTrue(res["confidence"] > 0.0)
        self.assertTrue(len(res["reasoning"]) > 0)

    def test_graph_and_kg_engine(self) -> None:
        graph_engine = GraphEngine()
        kg_builder = KnowledgeGraphBuilder()

        features = [
            EngineeredFeature(
                feature_name="DeviceTrustScore",
                domain="Device Intelligence",
                derived_rules=[self.mock_rule.rule_id],
                derived_parameters=self.mock_rule.parameters,
                blueprint_parameters=["New Device", "Device Age", "Fingerprint"],
                weight=0.25,
                description="Custom test feature",
                used_by=["Coherence Brain"],
                is_active=True,
            )
        ]

        G = graph_engine.build_dependency_graph([self.mock_rule], features)
        self.assertTrue(len(G) > 0)

        pageranks = graph_engine.compute_pagerank()
        self.assertIn(f"rule:{self.mock_rule.rule_id}", pageranks)

        communities = graph_engine.detect_louvain_communities()
        self.assertTrue(len(communities) > 0)

        kg = kg_builder.build_kg([self.mock_rule], features)
        self.assertIn("@context", kg)
        self.assertTrue(len(kg["nodes"]) > 0)

    def test_signals_and_composite_features(self) -> None:
        sig_engine = SignalGenerationEngine()
        feat_engine = CompositeFeatureEngineeringEngine()
        
        rules = [self.mock_rule, self.mock_rule_2]
        signals = sig_engine.generate_signals(rules)
        self.assertIn("SIG_DEVICE_AGE_CHECK", signals)
        
        engineered = feat_engine.engineer(rules)
        self.assertTrue(len(engineered) > 0)
        self.assertIn("Governance Formula", engineered[0].description)


if __name__ == "__main__":
    unittest.main()
