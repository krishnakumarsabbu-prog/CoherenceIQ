from __future__ import annotations
import re
from abc import ABC, abstractmethod
from typing import List, Dict, Any
from models import Rule

from intelligence.parser import (
    ParserEngine,
    MetadataExtractionEngine,
    ThresholdExtractionEngine,
    IntentDetectionEngine,
    EntityExtractionEngine
)


class BaseParser(ABC):
    """Strategy interface for rule file parsers. New formats plug in here."""

    extensions: List[str] = []

    @abstractmethod
    def parse(self, filename: str, content: str) -> List[Rule]:
        ...


class MarkdownParser(BaseParser):
    extensions = [".md", ".markdown"]

    def parse(self, filename: str, content: str) -> List[Rule]:
        parser_engine = ParserEngine()
        metadata_engine = MetadataExtractionEngine()
        threshold_engine = ThresholdExtractionEngine()
        intent_engine = IntentDetectionEngine()
        
        raw_rules = parser_engine.parse_content(filename, content)
        parsed_rules: List[Rule] = []
        
        for i, r in enumerate(raw_rules):
            rule_name = r["name"]
            description = r["description"] or rule_name
            param_count = r["param_count"] or len(r["parameters"])
            parameters = r["parameters"]
            
            keywords = metadata_engine.extract_keywords(rule_name, description)
            # Thresholds and time windows
            th_data = threshold_engine.extract(description)
            thresholds = th_data["thresholds"]
            time_windows = th_data["time_windows"]
            
            # Intents mapping to decision words
            intents = intent_engine.detect(description)
            decision_words = intents
            
            # Risk Level
            risk_level = metadata_engine.infer_risk(rule_name, description, intents)
            
            # Rule ID
            alnum = re.sub(r"[^A-Za-z0-9]+", "_", rule_name).strip("_").upper()
            if alnum:
                rule_id = f"R-{alnum[:24]}"
            else:
                rule_id = f"R-FILE-{i:04d}"
                
            parsed_rules.append(Rule(
                rule_id=rule_id,
                rule_name=rule_name,
                description=description,
                parameter_count=param_count,
                parameters=parameters,
                keywords=keywords,
                thresholds=thresholds,
                time_windows=time_windows,
                decision_words=decision_words,
                risk_level=risk_level,
                status="Published",
                source_file=filename,
            ))
            
        return parsed_rules


class ParserRegistry:
    def __init__(self) -> None:
        self._parsers: List[BaseParser] = []

    def register(self, parser: BaseParser) -> None:
        self._parsers.append(parser)

    def for_filename(self, filename: str) -> BaseParser | None:
        lower = filename.lower()
        for parser in self._parsers:
            if any(lower.endswith(ext) for ext in parser.extensions):
                return parser
        return None

    def parse_file(self, filename: str, content: str) -> List[Rule]:
        parser = self.for_filename(filename)
        if parser is None:
            return []
        return parser.parse(filename, content)


def default_registry() -> ParserRegistry:
    registry = ParserRegistry()
    registry.register(MarkdownParser())
    return registry
