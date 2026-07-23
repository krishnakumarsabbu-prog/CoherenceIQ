from __future__ import annotations
from typing import List, Dict
from models import Rule, EngineeredFeature
from intelligence.features import CompositeFeatureEngineeringEngine
from intelligence.graph import GraphEngine


def engineer_features(rules: List[Rule]) -> List[EngineeredFeature]:
    """Engineers composite features from rule signals using CompositeFeatureEngineeringEngine."""
    engine = CompositeFeatureEngineeringEngine()
    return engine.engineer(rules)


def feature_dependency_graph(rules: List[Rule], features: List[EngineeredFeature]) -> Dict:
    """Computes dependency network links using PageRank and NetworkX GraphEngine."""
    engine = GraphEngine()
    engine.build_dependency_graph(rules, features)
    return engine.export_graph_json()
