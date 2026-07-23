from __future__ import annotations
import re
from abc import ABC, abstractmethod
from typing import List, Dict, Any
from models import Rule


class BaseParser(ABC):
    """Strategy interface for rule file parsers. New formats plug in here."""

    extensions: List[str] = []

    @abstractmethod
    def parse(self, filename: str, content: str) -> List[Rule]:
        ...


# ---------------------------------------------------------------------------
# Keyword / threshold / time-window / decision-word extraction heuristics
# ---------------------------------------------------------------------------

STOPWORDS = {
    "the", "a", "an", "is", "are", "was", "were", "and", "or", "of", "in", "on",
    "to", "for", "from", "by", "with", "that", "this", "it", "as", "at", "be",
    "has", "have", "had", "not", "but", "if", "then", "else", "when", "than",
    "rule", "description", "parameter", "count", "parameters", "found", "indicating",
    "occurred", "past", "days", "customer", "profile", "fraud", "login", "rule name",
}

THRESHOLD_RE = re.compile(
    r"(?:[<>]=?|>=?|<=?|equals?|greater than|less than|at least|at most|exceeds?|above|below|more than|fewer than)\s*[\d.]+",
    re.IGNORECASE,
)
NUMBER_THRESHOLD_RE = re.compile(r"\b\d+\s*(?:days?|hours?|minutes?|seconds?|times?|attempts?|events?)\b", re.IGNORECASE)
TIME_WINDOW_RE = re.compile(
    r"(?:last|past|within|over|in the)\s+\d+\s*(?:day|days|hour|hours|minute|minutes|second|seconds|week|weeks|month|months|year|years)",
    re.IGNORECASE,
)
DECISION_WORDS = {
    "allow": "Allow", "approve": "Allow", "accept": "Allow", "permit": "Allow",
    "challenge": "Challenge", "step-up": "Challenge", "step up": "Challenge", "review": "Challenge", "verify": "Challenge",
    "deny": "Deny", "block": "Deny", "reject": "Deny", "rejected": "Deny", "decline": "Deny", "fraud": "Deny",
    "alert": "Challenge", "flag": "Challenge", "suspicious": "Challenge",
}


def extract_keywords(*texts: str) -> List[str]:
    tokens: List[str] = []
    for text in texts:
        if not text:
            continue
        lowered = text.lower()
        for match in re.findall(r"[a-z][a-z0-9_\-]+", lowered):
            if match in STOPWORDS or len(match) < 3:
                continue
            tokens.append(match)
    seen: List[str] = []
    for t in tokens:
        if t not in seen:
            seen.append(t)
    return seen


def extract_thresholds(text: str) -> List[str]:
    found = THRESHOLD_RE.findall(text)
    found += NUMBER_THRESHOLD_RE.findall(text)
    deduped: List[str] = []
    for f in found:
        f = f.strip()
        if f and f not in deduped:
            deduped.append(f)
    return deduped


def extract_time_windows(text: str) -> List[str]:
    found = TIME_WINDOW_RE.findall(text)
    deduped: List[str] = []
    for f in found:
        f = f.strip()
        if f and f not in deduped:
            deduped.append(f)
    return deduped


def extract_decision_words(text: str) -> List[str]:
    lowered = text.lower()
    found: List[str] = []
    for word, decision in DECISION_WORDS.items():
        if word in lowered and decision not in found:
            found.append(decision)
    return found


def infer_risk_level(rule_name: str, description: str, decision_words: List[str]) -> str:
    text = f"{rule_name} {description}".lower()
    if "fraud" in text or "Deny" in decision_words or "fraudulent" in text:
        return "Critical"
    if "alert" in text or "high risk" in text or "Challenge" in decision_words:
        return "High"
    if "review" in text or "verify" in text:
        return "Medium"
    return "Low"


def infer_rule_id(filename: str, rule_name: str, index: int) -> str:
    alnum = re.sub(r"[^A-Za-z0-9]+", "_", rule_name).strip("_").upper()
    if alnum:
        return f"R-{alnum[:24]}"
    return f"R-FILE-{index:04d}"


# ---------------------------------------------------------------------------
# Markdown parser
# ---------------------------------------------------------------------------

class MarkdownParser(BaseParser):
    extensions = [".md", ".markdown"]

    def parse(self, filename: str, content: str) -> List[Rule]:
        # Split on lines that look like "Rule Name" headers. We treat the first
        # non-empty line as the rule name and then parse the labelled sections.
        blocks = self._split_blocks(content)
        rules: List[Rule] = []
        for i, block in enumerate(blocks):
            rule = self._parse_block(filename, block, i)
            if rule:
                rules.append(rule)
        return rules

    @staticmethod
    def _split_blocks(content: str) -> List[List[str]]:
        lines = content.splitlines()
        blocks: List[List[str]] = []
        current: List[str] = []
        for line in lines:
            stripped = line.strip()
            is_header = bool(re.match(r"^#{0,3}\s*Rule Name\s*$", stripped, re.IGNORECASE)) or (
                stripped and not current and not stripped.lower().startswith(("rule description", "parameter count", "parameters"))
            )
            if is_header and current:
                blocks.append(current)
                current = []
            current.append(line)
        if current:
            blocks.append(current)
        return blocks

    @staticmethod
    def _parse_block(filename: str, lines: List[str], index: int) -> Rule | None:
        rule_name = ""
        description = ""
        param_count = 0
        parameters: List[str] = []

        section: str | None = None
        for raw in lines:
            line = raw.strip()
            if not line:
                continue
            low = line.lower().rstrip(":").strip()
            if low.startswith("rule name"):
                section = "name"
                remainder = line.split(":", 1)
                if len(remainder) > 1 and remainder[1].strip():
                    rule_name = remainder[1].strip()
                continue
            if low.startswith("rule description"):
                section = "description"
                remainder = line.split(":", 1)
                if len(remainder) > 1 and remainder[1].strip():
                    description = remainder[1].strip()
                continue
            if low.startswith("parameter count"):
                section = "count"
                remainder = line.split(":", 1)
                if len(remainder) > 1:
                    digits = re.findall(r"\d+", remainder[1])
                    if digits:
                        param_count = int(digits[0])
                continue
            if low.startswith("parameters"):
                section = "parameters"
                continue
            # accumulate by section
            if section == "name" and not rule_name:
                rule_name = line
            elif section == "description" and not description:
                description = line
            elif section == "count" and not param_count:
                digits = re.findall(r"\d+", line)
                if digits:
                    param_count = int(digits[0])
            elif section == "parameters":
                cleaned = line.lstrip("-*\u2022 ").strip()
                if cleaned:
                    parameters.append(cleaned)

        if not rule_name:
            return None
        if not description:
            description = rule_name
        if param_count == 0 and parameters:
            param_count = len(parameters)
        if param_count == 0:
            param_count = 0

        keywords = extract_keywords(rule_name, description, " ".join(parameters))
        thresholds = extract_thresholds(f"{rule_name} {description}")
        time_windows = extract_time_windows(f"{rule_name} {description}")
        decision_words = extract_decision_words(f"{rule_name} {description}")
        risk_level = infer_risk_level(rule_name, description, decision_words)
        rule_id = infer_rule_id(filename, rule_name, index)

        return Rule(
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
        )


# ---------------------------------------------------------------------------
# Registry / factory
# ---------------------------------------------------------------------------

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
