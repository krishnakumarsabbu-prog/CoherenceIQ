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
        entity_engine = EntityExtractionEngine()

        raw_rules = parser_engine.parse_content(filename, content)
        parsed_rules: List[Rule] = []

        for i, r in enumerate(raw_rules):
            rule_name = r["name"]
            description = r["description"] or rule_name
            param_count = r["param_count"] or len(r["parameters"])
            parameters = r["parameters"]

            keywords = metadata_engine.extract_keywords(rule_name, description)
            th_data = threshold_engine.extract(description)
            thresholds = th_data["thresholds"]
            time_windows = th_data["time_windows"]

            intents = intent_engine.detect(description)
            decision_words = sorted(list(set(intents)))

            risk_level = metadata_engine.infer_risk(rule_name, description, intents)

            # Entity extraction — user/device/network/transaction identifiers + systems
            entity_data = entity_engine.extract(f"{rule_name} {description}", parameters)
            entity_keywords = [
                item
                for sublist in entity_data["entities"].values()
                for item in sublist
            ]
            # Merge entity keywords into the keyword set for richer classification signal
            keywords = sorted(list(set(keywords + [k.lower() for k in entity_keywords])))

            alnum = re.sub(r"[^A-Za-z0-9]+", "_", rule_name).strip("_").upper()
            rule_id = f"R-{alnum[:24]}" if alnum else f"R-FILE-{i:04d}"

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
