from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Dict, Optional


@dataclass
class Rule:
    rule_id: str
    rule_name: str
    description: str
    parameter_count: int
    parameters: List[str]
    keywords: List[str] = field(default_factory=list)
    thresholds: List[str] = field(default_factory=list)
    time_windows: List[str] = field(default_factory=list)
    decision_words: List[str] = field(default_factory=list)
    risk_level: str = "Medium"
    status: str = "Published"
    primary_cluster: str = "Unclustered"
    secondary_cluster: Optional[str] = None
    confidence: float = 0.0
    matched_keywords: List[str] = field(default_factory=list)
    matched_classification_rules: List[str] = field(default_factory=list)
    source_file: str = ""

    def to_dict(self) -> Dict:
        return {
            "rule_id": self.rule_id,
            "rule_name": self.rule_name,
            "description": self.description,
            "parameter_count": self.parameter_count,
            "parameters": self.parameters,
            "keywords": self.keywords,
            "thresholds": self.thresholds,
            "time_windows": self.time_windows,
            "decision_words": self.decision_words,
            "risk_level": self.risk_level,
            "status": self.status,
            "primary_cluster": self.primary_cluster,
            "secondary_cluster": self.secondary_cluster,
            "confidence": round(self.confidence, 3),
            "matched_keywords": self.matched_keywords,
            "matched_classification_rules": self.matched_classification_rules,
            "source_file": self.source_file,
        }


@dataclass
class Cluster:
    name: str
    keywords: List[str]
    rules: List[str] = field(default_factory=list)
    avg_confidence: float = 0.0
    avg_parameters: float = 0.0

    def to_dict(self) -> Dict:
        return {
            "name": self.name,
            "keywords": self.keywords,
            "rule_count": len(self.rules),
            "rule_ids": self.rules,
            "avg_confidence": round(self.avg_confidence, 3),
            "avg_parameters": round(self.avg_parameters, 2),
        }


@dataclass
class EngineeredFeature:
    feature_name: str
    domain: str
    derived_rules: List[str]
    derived_parameters: List[str]       # Observed params from actual matched rules
    blueprint_parameters: List[str]     # Static blueprint-defined theoretical params
    weight: float
    description: str
    used_by: List[str]
    is_active: bool = True              # False when no rules map to this feature

    def to_dict(self) -> Dict:
        return {
            "feature_name": self.feature_name,
            "domain": self.domain,
            "derived_rules": self.derived_rules,
            "derived_parameters": self.derived_parameters,
            "blueprint_parameters": self.blueprint_parameters,
            "weight": round(self.weight, 3),
            "description": self.description,
            "used_by": self.used_by,
            "is_active": self.is_active,
        }
