from __future__ import annotations
import re
from typing import List, Dict, Any, Optional, Protocol
from models import Rule

class ParserStrategy(Protocol):
    def parse(self, filename: str, content: str) -> List[Dict[str, Any]]:
        ...

class MarkdownParserStrategy:
    """Strategy to parse standard hierarchical markdown rules."""
    
    def parse(self, filename: str, content: str) -> List[Dict[str, Any]]:
        lines = content.splitlines()
        raw_rules: List[Dict[str, Any]] = []
        current_rule = None
        current_section = None

        def is_rule_header(text: str) -> bool:
            clean_text = text.strip()
            if not clean_text:
                return False
            # Exclude table headers or overview text
            if re.search(r'rule\s*->\s*parameter|overview|introduction|document', clean_text, re.I):
                return False
            if re.search(r'\b(ALERT|RISK|RULE)_[A-Z0-9_]+\b', clean_text):
                return True
            if re.match(r'^[A-Z0-9_]{5,}$', clean_text):
                return True
            return False

        def clean_prefix(line: str) -> str:
            return re.sub(r'^[\s\-*\u2022\d+\.\)]+', '', line).strip()

        for raw_line in lines:
            line = raw_line.strip()
            if not line:
                continue

            if line == '---':
                if current_rule and current_rule.get("name"):
                    raw_rules.append(current_rule)
                current_rule = None
                current_section = None
                continue

            if line.startswith('#'):
                header_text = line.lstrip('#').strip()
                if is_rule_header(header_text):
                    if current_rule and current_rule.get("name"):
                        raw_rules.append(current_rule)
                    current_rule = {
                        "name": header_text,
                        "description": "",
                        "param_count": 0,
                        "parameters": []
                    }
                    current_section = None
                    continue
                else:
                    continue

            if line.lower() == 'rule name':
                if current_rule and current_rule.get("name"):
                    raw_rules.append(current_rule)
                current_rule = {
                    "name": "",
                    "description": "",
                    "param_count": 0,
                    "parameters": []
                }
                current_section = "name"
                continue

            clean_line = clean_prefix(line)
            low_clean = clean_line.lower()

            if low_clean.startswith("rule description"):
                current_section = "description"
                if ":" in clean_line:
                    desc = clean_line.split(":", 1)[1].strip()
                    if current_rule is not None:
                        current_rule["description"] = desc
                continue

            if low_clean.startswith("parameter count"):
                current_section = "count"
                if ":" in clean_line:
                    count_str = clean_line.split(":", 1)[1].strip()
                    digits = re.findall(r'\d+', count_str)
                    if digits and current_rule is not None:
                        current_rule["param_count"] = int(digits[0])
                continue

            if low_clean.startswith("parameters"):
                current_section = "parameters"
                continue

            if current_section == "name":
                if current_rule is not None:
                    if not current_rule["name"]:
                        current_rule["name"] = line
                    else:
                        current_rule["name"] += " " + line
            elif current_section == "description":
                if current_rule is not None:
                    if not current_rule["description"]:
                        current_rule["description"] = clean_line
                    else:
                        current_rule["description"] += " " + clean_line
            elif current_section == "count":
                if current_rule is not None and current_rule["param_count"] == 0:
                    digits = re.findall(r'\d+', line)
                    if digits:
                        current_rule["param_count"] = int(digits[0])
            elif current_section == "parameters":
                cleaned_param = clean_prefix(line)
                if cleaned_param and current_rule is not None:
                    current_rule["parameters"].append(cleaned_param)

        if current_rule and current_rule.get("name"):
            raw_rules.append(current_rule)

        return raw_rules


class ParserEngine:
    """Facade coordinating rule file parsing across different strategies."""
    
    def __init__(self, strategy: Optional[ParserStrategy] = None) -> None:
        self.strategy = strategy or MarkdownParserStrategy()

    def parse_content(self, filename: str, content: str) -> List[Dict[str, Any]]:
        return self.strategy.parse(filename, content)


class ThresholdExtractionEngine:
    """Extracts mathematical comparisons, thresholds, and time windows."""
    
    COMPARISON_PATTERNS = [
        r'(?:>=|<=|>|<|==|!=|=)\s*\d+(?:\.\d+)?',
        r'at least \d+',
        r'more than \d+',
        r'less than \d+',
        r'exceed the \d+ day baseline by more than \d+x',
    ]
    
    TIME_PATTERNS = [
        r'\b\d+\s*(?:day|hour|minute|sec|ms)s?\b',
        r'past \d+\s*(?:day|hour|minute|sec|ms)s?',
        r'\b\d+\s*min\b',
    ]

    def extract(self, text: str) -> Dict[str, List[str]]:
        thresholds: List[str] = []
        for pat in self.COMPARISON_PATTERNS:
            matches = re.findall(pat, text, re.I)
            thresholds.extend([m.strip() for m in matches])
            
        time_windows: List[str] = []
        for pat in self.TIME_PATTERNS:
            matches = re.findall(pat, text, re.I)
            time_windows.extend([m.strip() for m in matches])

        return {
            "thresholds": sorted(list(set(thresholds))),
            "time_windows": sorted(list(set(time_windows)))
        }


class IntentDetectionEngine:
    """Classifies risk governance intentions from rule text."""
    
    INTENT_KEYWORDS = {
        "Deny": ["deny", "reject", "block", "blacklist", "deny list"],
        "Challenge": ["challenge", "mfa", "otp", "step up", "biocatch", "verification"],
        "Review": ["review", "investigate", "manual review", "flag for review"],
        "Advisory": ["advisory", "warn", "informational", "notify", "recommendation"],
        "Log": ["log", "audit", "record", "monitor"]
    }

    def detect(self, text: str) -> List[str]:
        intents = []
        low_text = text.lower()
        for intent, kws in self.INTENT_KEYWORDS.items():
            for kw in kws:
                pattern = r'\b' + re.escape(kw) + r'\b'
                if re.search(pattern, low_text):
                    intents.append(intent)
                    break
        return intents if intents else ["Advisory"]


class EntityExtractionEngine:
    """Identifies and classifies core entities, platforms, and variables."""
    
    SYSTEMS = ["biocatch", "wf dvc_id", "auth", "profile", "baseline"]
    
    ENTITY_PATTERNS = {
        "user_identifier": [r'\becns?\b', r'\bcustomers?\b', r'\busers?\b'],
        "device_identifier": [r'\bdevice id\b', r'\bfingerprint\b', r'\bbrowser hash\b', r'\bdvc_id\b'],
        "network_identifier": [r'\bip address\b', r'\bip carrier\b', r'\basn\b', r'\bisp\b', r'\bproxy\b', r'\bvpn\b'],
        "transaction_field": [r'\btransfer amount\b', r'\btrx date\b', r'\breject type code\b', r'\btransaction type\b']
    }

    def extract(self, text: str, parameters: List[str]) -> Dict[str, Any]:
        extracted_entities: Dict[str, List[str]] = {k: [] for k in self.ENTITY_PATTERNS.keys()}
        low_text = text.lower()
        
        # Scan parameters for entity mapping
        for param in parameters:
            low_param = param.lower()
            for entity_type, regexes in self.ENTITY_PATTERNS.items():
                for reg in regexes:
                    if re.search(reg, low_param):
                        extracted_entities[entity_type].append(param)
                        break
                        
        # Scan text for systems mentioned
        detected_systems = []
        for sys in self.SYSTEMS:
            if re.search(r'\b' + re.escape(sys) + r'\b', low_text):
                detected_systems.append(sys.capitalize())

        return {
            "entities": {k: sorted(list(set(v))) for k, v in extracted_entities.items()},
            "systems": sorted(list(set(detected_systems)))
        }


class MetadataExtractionEngine:
    """Coordinates overall rule metadata extraction (Keywords, Risk, Status)."""
    
    STOPWORDS = {
        "is", "from", "on", "in", "and", "the", "a", "of", "to", "for", "with", "by", 
        "at", "an", "this", "that", "be", "has", "been", "was", "were", "or", "but",
        "if", "then", "within", "indicating", "occurred", "which"
    }

    def __init__(self) -> None:
        self.threshold_engine = ThresholdExtractionEngine()
        self.intent_engine = IntentDetectionEngine()

    def extract_keywords(self, name: str, description: str) -> List[str]:
        raw_words = re.findall(r'\b[a-zA-Z]{3,}\b', f"{name} {description}")
        keywords = []
        for w in raw_words:
            w_low = w.lower()
            if w_low not in self.STOPWORDS:
                keywords.append(w_low)
        return sorted(list(set(keywords)))

    def infer_risk(self, name: str, description: str, intents: List[str]) -> str:
        text = f"{name} {description}".lower()
        if "critical" in text or "fraud" in text or "deny" in intents:
            return "Critical"
        if "high" in text or "impossible travel" in text or "at least 4" in text or "Challenge" in intents:
            return "High"
        if "medium" in text or "velocity" in text or "reset" in text or "Review" in intents:
            return "Medium"
        return "Low"
