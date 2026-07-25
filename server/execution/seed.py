"""Seed the execution store with the sample pipelines mirrored from the frontend."""
from __future__ import annotations

from typing import Any, Dict, List

from execution.store import ExecutionStore, now_iso


def _node(nid: str, ntype: str, label: str, x: int, y: int,
          config: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": nid,
        "type": ntype,
        "position": {"x": x, "y": y},
        "data": {"label": label, "config": config},
    }


def _edge(eid: str, src: str, tgt: str, **kw: Any) -> Dict[str, Any]:
    e: Dict[str, Any] = {"id": eid, "source": src, "target": tgt}
    e.update(kw)
    return e


def _pipeline(pid: str, name: str, desc: str, version: str, owner: str,
              tags: List[str], nodes: List[Dict[str, Any]],
              edges: List[Dict[str, Any]]) -> Dict[str, Any]:
    return {
        "id": pid,
        "name": name,
        "description": desc,
        "version": version,
        "owner": owner,
        "tags": tags,
        "updatedAt": now_iso(),
        "nodes": nodes,
        "edges": edges,
    }


def seed_sample_pipelines(store: ExecutionStore) -> None:
    pipelines: List[Dict[str, Any]] = []

    pipelines.append(_pipeline(
        "pl-realtime-session-scoring",
        "Realtime Session Scoring",
        "Production pipeline scoring every login session through rule intelligence, graph, temporal, and the Coherence Brain.",
        "v3.2.1", "fraud-platform", ["production", "realtime", "scoring"],
        nodes=[
            _node("n1", "session-source", "Session Source", 40, 200, {"source": "session-store", "batchSize": 500}),
            _node("n2", "rule-intelligence", "Rule Intelligence", 320, 80, {"ruleSetAssetId": "rs-prod-v3", "clusterAlgorithm": "dbscan"}),
            _node("n3", "graph-intelligence", "Graph Intelligence", 320, 320, {"rings": 2}),
            _node("n4", "temporal-intelligence", "Temporal Intelligence", 600, 200, {"windows": ["5m", "1h", "24h"]}),
            _node("n5", "coherence-brain", "Coherence Brain", 880, 200, {"modelAssetId": "m-wcm-v32", "threshold": 0.5}),
            _node("n6", "decision-router", "Decision Router", 1160, 200, {"allowThreshold": 40, "challengeThreshold": 75}),
            _node("n7", "webhook-output", "Allow Webhook", 1440, 80, {"url": "/api/decisions/allow"}),
            _node("n8", "webhook-output", "Challenge Webhook", 1440, 200, {"url": "/api/decisions/challenge"}),
            _node("n9", "webhook-output", "Deny Webhook", 1440, 320, {"url": "/api/decisions/deny"}),
            _node("n10", "metrics-output", "Metrics", 1440, 440, {"sink": "prometheus"}),
        ],
        edges=[
            _edge("e1", "n1", "n2", animated=True),
            _edge("e2", "n1", "n3", animated=True),
            _edge("e3", "n2", "n4"),
            _edge("e4", "n3", "n4"),
            _edge("e5", "n4", "n5", animated=True),
            _edge("e6", "n5", "n6", animated=True),
            _edge("e7", "n6", "n7", sourceHandle="allow"),
            _edge("e8", "n6", "n8", sourceHandle="challenge"),
            _edge("e9", "n6", "n9", sourceHandle="deny"),
            _edge("e10", "n6", "n10"),
        ],
    ))

    pipelines.append(_pipeline(
        "pl-rule-intelligence-build",
        "Rule Intelligence Build",
        "Parse uploaded rule markdown, cluster, engineer features, and register a feature-set asset.",
        "v1.4.0", "governance-team", ["governance", "rules", "features"],
        nodes=[
            _node("b1", "dataset-source", "Rule Markdown", 40, 200, {"datasetAssetId": "ds-rules-md"}),
            _node("b2", "rule-intelligence", "Parse & Classify", 320, 200, {"ruleSetAssetId": "rs-inbound"}),
            _node("b3", "rule-clustering", "Cluster Rules", 600, 120, {"algorithm": "dbscan"}),
            _node("b4", "feature-engineering", "Engineer Features", 600, 300, {"pca": 24}),
            _node("b5", "rule-studio", "Publish Rule Set", 880, 200, {"environment": "staging"}),
        ],
        edges=[
            _edge("be1", "b1", "b2", animated=True),
            _edge("be2", "b2", "b3"),
            _edge("be3", "b2", "b4"),
            _edge("be4", "b3", "b5"),
            _edge("be5", "b4", "b5"),
        ],
    ))

    pipelines.append(_pipeline(
        "pl-model-training",
        "Model Training & Evaluation",
        "Train a gradient-boosted model on labelled sessions, evaluate ROC, and register the model asset.",
        "v2.0.3", "ml-ops", ["ml", "training", "evaluation"],
        nodes=[
            _node("t1", "dataset-source", "Labelled Sessions", 40, 200, {"datasetAssetId": "ds-labelled", "split": "train"}),
            _node("t2", "feature-engineering", "Feature Engineering", 320, 200, {"vectorize": True}),
            _node("t3", "model-studio", "Train Model", 600, 200, {"algorithm": "gradient-boosted", "validationSplit": 0.2}),
            _node("t4", "metrics-output", "Publish Metrics", 880, 200, {"sink": "prometheus"}),
        ],
        edges=[
            _edge("te1", "t1", "t2", animated=True),
            _edge("te2", "t2", "t3", animated=True),
            _edge("te3", "t3", "t4"),
        ],
    ))

    pipelines.append(_pipeline(
        "pl-session-investigation",
        "Session Investigation Replay",
        "Replay a flagged session through the full pipeline and surface results to the AI Copilot.",
        "v1.1.0", "investigations", ["investigation", "replay", "copilot"],
        nodes=[
            _node("i1", "session-source", "Flagged Session", 40, 200, {"filter": "decision:Deny"}),
            _node("i2", "graph-intelligence", "Entity Graph", 320, 120, {"rings": 3}),
            _node("i3", "temporal-intelligence", "Velocity", 320, 300, {"windows": ["1h"]}),
            _node("i4", "replay-studio", "Replay", 600, 200, {"speed": 1}),
            _node("i5", "ai-copilot", "Copilot Summary", 880, 200, {"model": "gpt-4o"}),
        ],
        edges=[
            _edge("ie1", "i1", "i2", animated=True),
            _edge("ie2", "i1", "i3", animated=True),
            _edge("ie3", "i2", "i4"),
            _edge("ie4", "i3", "i4"),
            _edge("ie5", "i4", "i5", animated=True),
        ],
    ))

    for p in pipelines:
        store.put_pipeline(p)
