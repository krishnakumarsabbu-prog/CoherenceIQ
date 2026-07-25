"""Per-node-type executors. Each takes (node, inputs) and returns a result dict.

Executors are deterministic simulations of the real intelligence engines so the
execution engine can run any pipeline end-to-end without external dependencies.
"""
from __future__ import annotations

import hashlib
import math
import random
from typing import Any, Dict, List, Optional


def _rows(inputs: List[Dict[str, Any]]) -> int:
    """Best-effort row count from upstream outputs."""
    for inp in inputs:
        v = inp.get("output", {}).get("rowsOut")
        if isinstance(v, int):
            return v
    return 0


def _seed_from(node_id: str, salt: str = "") -> random.Random:
    h = hashlib.sha256((node_id + salt).encode()).digest()
    return random.Random(int.from_bytes(h[:8], "big"))


def _base_result(node: Dict[str, Any], rows_out: int, logs: List[str],
                 artifacts: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    return {
        "rowsOut": rows_out,
        "logs": logs,
        "artifacts": artifacts or {},
    }


def exec_session_source(node: Dict[str, Any], inputs: List[Dict[str, Any]]) -> Dict[str, Any]:
    cfg = node["data"]["config"]
    batch = int(cfg.get("batchSize", 500))
    rng = _seed_from(node["id"])
    rows = rng.randint(max(1, batch // 2), batch + rng.randint(0, 50))
    return _base_result(node, rows, [f"Ingested {rows} sessions from {cfg.get('source', 'session-store')}"])


def exec_dataset_source(node: Dict[str, Any], inputs: List[Dict[str, Any]]) -> Dict[str, Any]:
    cfg = node["data"]["config"]
    rng = _seed_from(node["id"])
    rows = rng.randint(500, 50000)
    return _base_result(node, rows, [f"Loaded {rows} rows from dataset {cfg.get('datasetAssetId', 'unknown')} (split={cfg.get('split', 'train')})"])


def exec_rule_intelligence(node: Dict[str, Any], inputs: List[Dict[str, Any]]) -> Dict[str, Any]:
    rows_in = _rows(inputs)
    rng = _seed_from(node["id"])
    rules = rng.randint(50, 500)
    clusters = rng.randint(8, 18)
    features = rng.randint(18, 28)
    return _base_result(node, rules, [
        f"Parsed {rules} rules",
        f"{clusters} clusters detected",
        f"{features} features engineered",
    ], {"rules": rules, "clusters": clusters, "features": features})


def exec_rule_clustering(node: Dict[str, Any], inputs: List[Dict[str, Any]]) -> Dict[str, Any]:
    rows_in = _rows(inputs)
    cfg = node["data"]["config"]
    rng = _seed_from(node["id"])
    clusters = rng.randint(6, 16)
    return _base_result(node, clusters, [
        f"Algorithm: {cfg.get('algorithm', 'dbscan')}",
        f"DBSCAN clusters: {clusters}",
    ], {"clusters": clusters})


def exec_feature_engineering(node: Dict[str, Any], inputs: List[Dict[str, Any]]) -> Dict[str, Any]:
    rows_in = _rows(inputs)
    cfg = node["data"]["config"]
    pca = int(cfg.get("pca", 24))
    return _base_result(node, rows_in or 50000, [
        "Vectorized input corpus",
        f"PCA reduced to {pca} dimensions",
    ], {"features": pca})


def exec_graph_intelligence(node: Dict[str, Any], inputs: List[Dict[str, Any]]) -> Dict[str, Any]:
    rows_in = _rows(inputs)
    cfg = node["data"]["config"]
    rings = int(cfg.get("rings", 2))
    rng = _seed_from(node["id"])
    flagged = rng.randint(0, max(1, rings))
    return _base_result(node, rows_in or 412, [
        f"Built {rings}-ring entity graph",
        f"{flagged} fraud ring(s) flagged",
    ], {"rings": rings, "flagged_rings": flagged})


def exec_temporal_intelligence(node: Dict[str, Any], inputs: List[Dict[str, Any]]) -> Dict[str, Any]:
    rows_in = _rows(inputs)
    cfg = node["data"]["config"]
    windows = cfg.get("windows", ["5m", "1h", "24h"])
    rng = _seed_from(node["id"])
    anomalies = rng.randint(5, 25)
    return _base_result(node, rows_in or 412, [
        f"Velocity windows: {', '.join(windows)}",
        f"{anomalies} velocity anomalies detected",
    ], {"anomalies": anomalies})


def exec_coherence_brain(node: Dict[str, Any], inputs: List[Dict[str, Any]]) -> Dict[str, Any]:
    rows_in = _rows(inputs)
    cfg = node["data"]["config"]
    threshold = float(cfg.get("threshold", 0.5))
    rng = _seed_from(node["id"])
    avg = round(rng.uniform(0.55, 0.92), 3)
    return _base_result(node, rows_in or 412, [
        "Inference complete",
        f"Average coherence {avg}",
    ], {"avg_coherence": avg, "threshold": threshold})


def exec_model_studio(node: Dict[str, Any], inputs: List[Dict[str, Any]]) -> Dict[str, Any]:
    rows_in = _rows(inputs)
    cfg = node["data"]["config"]
    mode = cfg.get("mode", "train")
    rng = _seed_from(node["id"])
    auc = round(rng.uniform(0.90, 0.97), 3)
    return _base_result(node, rows_in or 50000, [
        f"Mode: {mode}, algorithm: {cfg.get('algorithm', 'gradient-boosted')}",
        f"Training complete, AUC {auc}",
    ], {"auc": auc})


def exec_session_validation(node: Dict[str, Any], inputs: List[Dict[str, Any]]) -> Dict[str, Any]:
    rows_in = _rows(inputs)
    cfg = node["data"]["config"]
    return _base_result(node, rows_in or 412, [
        f"Strict mode: {cfg.get('strictMode', True)}",
        f"Reason codes emitted: {cfg.get('emitReasonCodes', True)}",
    ], {"validated": rows_in or 412})


def exec_rule_studio(node: Dict[str, Any], inputs: List[Dict[str, Any]]) -> Dict[str, Any]:
    rows_in = _rows(inputs)
    cfg = node["data"]["config"]
    return _base_result(node, rows_in or 14, [
        f"Environment: {cfg.get('environment', 'staging')}",
        f"Dry run: {cfg.get('dryRun', False)}",
    ], {"published": rows_in or 14})


def exec_replay_studio(node: Dict[str, Any], inputs: List[Dict[str, Any]]) -> Dict[str, Any]:
    rows_in = _rows(inputs)
    cfg = node["data"]["config"]
    speed = cfg.get("speed", 1)
    return _base_result(node, rows_in or 1, [
        f"Replay at {speed}x speed",
        "Replay complete",
    ], {"replayed": rows_in or 1})


def exec_ai_copilot(node: Dict[str, Any], inputs: List[Dict[str, Any]]) -> Dict[str, Any]:
    rows_in = _rows(inputs)
    cfg = node["data"]["config"]
    rng = _seed_from(node["id"])
    reasons = rng.randint(1, 5)
    return _base_result(node, rows_in or 1, [
        f"Model: {cfg.get('model', 'gpt-4o')}",
        f"Generated narrative summary, {reasons} reason codes surfaced",
    ], {"reason_codes": reasons})


def exec_decision_router(node: Dict[str, Any], inputs: List[Dict[str, Any]]) -> Dict[str, Any]:
    rows_in = _rows(inputs)
    cfg = node["data"]["config"]
    allow_t = int(cfg.get("allowThreshold", 40))
    chal_t = int(cfg.get("challengeThreshold", 75))
    total = rows_in or 412
    rng = _seed_from(node["id"])
    allow = int(total * rng.uniform(0.70, 0.82))
    deny = int(total * rng.uniform(0.05, 0.10))
    challenge = max(0, total - allow - deny)
    return _base_result(node, total, [
        f"Thresholds: allow<{allow_t}, challenge<{chal_t}",
        f"{allow} allow, {challenge} challenge, {deny} deny",
    ], {"allow": allow, "challenge": challenge, "deny": deny})


def exec_webhook_output(node: Dict[str, Any], inputs: List[Dict[str, Any]]) -> Dict[str, Any]:
    rows_in = _rows(inputs)
    cfg = node["data"]["config"]
    url = cfg.get("url", "")
    rng = _seed_from(node["id"])
    retries = rng.randint(0, 2)
    logs = [f"POSTed {rows_in or 0} decisions to {url}"]
    status = "warning" if retries > 0 else "success"
    if retries:
        logs.append(f"{retries} webhook(s) retried")
    return {**_base_result(node, 0, logs, {"retries": retries}), "status_override": status}


def exec_metrics_output(node: Dict[str, Any], inputs: List[Dict[str, Any]]) -> Dict[str, Any]:
    rows_in = _rows(inputs)
    cfg = node["data"]["config"]
    sink = cfg.get("sink", "prometheus")
    rng = _seed_from(node["id"])
    metrics_n = rng.randint(8, 20)
    return _base_result(node, 0, [f"Published {metrics_n} metrics to {sink}"], {"metrics": metrics_n})


def exec_condition(node: Dict[str, Any], inputs: List[Dict[str, Any]]) -> Dict[str, Any]:
    rows_in = _rows(inputs)
    cfg = node["data"]["config"]
    expr = cfg.get("expression", "score > 0.7")
    rng = _seed_from(node["id"])
    branch = "true" if rng.random() > 0.4 else "false"
    return {**_base_result(node, rows_in or 412, [
        f"Evaluating: {expr}",
        f"Routed to {branch} branch",
    ], {"branch": branch}), "route_handle": branch}


def exec_loop(node: Dict[str, Any], inputs: List[Dict[str, Any]]) -> Dict[str, Any]:
    rows_in = _rows(inputs)
    cfg = node["data"]["config"]
    iters = int(cfg.get("iterations", 5))
    return _base_result(node, rows_in or 412, [
        f"Mode: {cfg.get('mode', 'count')}",
        f"Executed {iters} iterations",
    ], {"iterations": iters})


def exec_merge(node: Dict[str, Any], inputs: List[Dict[str, Any]]) -> Dict[str, Any]:
    total = sum(_rows([i]) for i in inputs) if inputs else 0
    cfg = node["data"]["config"]
    return _base_result(node, total, [
        f"Strategy: {cfg.get('strategy', 'wait-all')}",
        f"Merged {len(inputs)} branches ({total} rows)",
    ], {"merged_branches": len(inputs)})


def exec_comment(node: Dict[str, Any], inputs: List[Dict[str, Any]]) -> Dict[str, Any]:
    return _base_result(node, 0, ["Comment node — skipped"], {})


EXECUTORS: Dict[str, Any] = {
    "session-source": exec_session_source,
    "dataset-source": exec_dataset_source,
    "rule-intelligence": exec_rule_intelligence,
    "rule-clustering": exec_rule_clustering,
    "feature-engineering": exec_feature_engineering,
    "graph-intelligence": exec_graph_intelligence,
    "temporal-intelligence": exec_temporal_intelligence,
    "coherence-brain": exec_coherence_brain,
    "model-studio": exec_model_studio,
    "session-validation": exec_session_validation,
    "rule-studio": exec_rule_studio,
    "replay-studio": exec_replay_studio,
    "ai-copilot": exec_ai_copilot,
    "decision-router": exec_decision_router,
    "webhook-output": exec_webhook_output,
    "metrics-output": exec_metrics_output,
    "condition": exec_condition,
    "loop": exec_loop,
    "merge": exec_merge,
    "comment": exec_comment,
}


def execute_node(node: Dict[str, Any], inputs: List[Dict[str, Any]]) -> Dict[str, Any]:
    ntype = node["type"]
    fn = EXECUTORS.get(ntype)
    if fn is None:
        return _base_result(node, 0, [f"Unknown node type '{ntype}' — skipped"], {})
    return fn(node, inputs)
