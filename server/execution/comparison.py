"""Multi-pipeline comparison engine.

Executes the same input (a single login request, an uploaded file, or an entire
dataset) against multiple pipelines simultaneously, then produces a comparison
summary with normalised metrics for side-by-side benchmarking.
"""
from __future__ import annotations

import threading
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from execution.store import execution_store, uid
from execution import execution_engine


class ComparisonStore:
    """Thread-safe in-memory store for comparison runs."""

    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._runs: Dict[str, Dict[str, Any]] = {}
        self._order: List[str] = []

    def add(self, run: Dict[str, Any]) -> None:
        with self._lock:
            self._runs[run["id"]] = run
            self._order.insert(0, run["id"])
            if len(self._order) > 100:
                stale = self._order[100:]
                for sid in stale:
                    self._runs.pop(sid, None)
                self._order = self._order[:100]

    def get(self, run_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            return self._runs.get(run_id)

    def update(self, run_id: str, patch: Dict[str, Any]) -> None:
        with self._lock:
            run = self._runs.get(run_id)
            if run:
                run.update(patch)

    def list(self) -> List[Dict[str, Any]]:
        with self._lock:
            return [self._runs[i] for i in self._order if i in self._runs]

    def delete(self, run_id: str) -> None:
        with self._lock:
            self._runs.pop(run_id, None)
            self._order = [i for i in self._order if i != run_id]


comparison_store = ComparisonStore()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _extract_metric(execution: Dict[str, Any], key: str) -> Any:
    """Pull a comparison metric from an execution's step artifacts."""
    steps = execution.get("steps", [])
    for step in steps:
        art = step.get("artifacts", {})
        if key in art:
            return art[key]
    return None


def _build_run_summary(executions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Produce the normalised comparison record from a list of executions."""
    results: List[Dict[str, Any]] = []
    for ex in executions:
        steps = ex.get("steps", [])
        # Collect artifacts from all steps into a flat dict
        all_artifacts: Dict[str, Any] = {}
        for s in steps:
            for k, v in (s.get("artifacts") or {}).items():
                all_artifacts[k] = v

        # Find specific metrics by node type
        decision_step = next((s for s in steps if s["nodeType"] == "decision-router"), None)
        coherence_step = next((s for s in steps if s["nodeType"] == "coherence-brain"), None)
        model_step = next((s for s in steps if s["nodeType"] == "model-studio"), None)
        rule_step = next((s for s in steps if s["nodeType"] == "rule-intelligence"), None)
        validation_step = next((s for s in steps if s["nodeType"] == "session-validation"), None)
        copilot_step = next((s for s in steps if s["nodeType"] == "ai-copilot"), None)
        graph_step = next((s for s in steps if s["nodeType"] == "graph-intelligence"), None)
        temporal_step = next((s for s in steps if s["nodeType"] == "temporal-intelligence"), None)
        feature_step = next((s for s in steps if s["nodeType"] == "feature-engineering"), None)

        decisions = ex.get("metrics", {}).get("decisions", {"allow": 0, "challenge": 0, "deny": 0})
        dominant = (decision_step.get("artifacts", {}) if decision_step else {}).get("dominant", "—")

        result = {
            "executionId": ex["id"],
            "pipelineId": ex["pipelineId"],
            "pipelineName": ex["pipelineName"],
            "status": ex["status"],
            "durationMs": ex.get("durationMs", 0),
            "throughput": ex.get("metrics", {}).get("throughput", 0),
            "avgLatencyMs": ex.get("metrics", {}).get("avgLatencyMs", 0),
            "decision": dominant,
            "decisions": decisions,
            "fraudProbability": _extract_metric(ex, "fraud_probability"),
            "coherenceScore": _extract_metric(ex, "avg_coherence"),
            "riskScore": _extract_metric(ex, "risk_score"),
            "triggeredRules": _extract_metric(ex, "triggered_rules"),
            "signals": _extract_metric(ex, "signals"),
            "engineeredFeatures": (feature_step.get("artifacts", {}).get("features") if feature_step else None)
            or _extract_metric(ex, "features"),
            "modelAuc": _extract_metric(ex, "auc"),
            "modelPrecision": _extract_metric(ex, "precision"),
            "modelRecall": _extract_metric(ex, "recall"),
            "domainScores": (validation_step.get("artifacts", {}).get("domain_scores") if validation_step else None),
            "reasonCodes": _extract_metric(ex, "reason_codes"),
            "explainability": _extract_metric(ex, "explainability"),
            "graphRings": _extract_metric(ex, "flagged_rings"),
            "temporalAnomalies": _extract_metric(ex, "anomalies"),
            "ruleCount": _extract_metric(ex, "rules"),
            "ruleClusters": _extract_metric(ex, "clusters"),
            "steps": [
                {
                    "nodeId": s["nodeId"],
                    "nodeLabel": s["nodeLabel"],
                    "nodeType": s["nodeType"],
                    "status": s["status"],
                    "durationMs": s["durationMs"],
                    "rowsIn": s["rowsIn"],
                    "rowsOut": s["rowsOut"],
                    "log": s.get("log", []),
                    "artifacts": s.get("artifacts", {}),
                }
                for s in steps
            ],
        }
        results.append(result)

    return {
        "results": results,
        "summary": _compute_benchmark(results),
    }


def _compute_benchmark(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Compute benchmarking summary: best/worst per metric, averages, rankings."""
    if not results:
        return {}

    completed = [r for r in results if r["status"] == "succeeded"]
    if not completed:
        return {"completed": 0, "total": len(results)}

    # Numeric metrics for benchmarking
    numeric_fields = [
        "durationMs", "throughput", "avgLatencyMs", "fraudProbability",
        "coherenceScore", "riskScore", "triggeredRules", "signals",
        "engineeredFeatures", "modelAuc", "modelPrecision", "modelRecall",
        "reasonCodes", "explainability", "graphRings", "temporalAnomalies",
    ]

    best: Dict[str, Any] = {}
    worst: Dict[str, Any] = {}
    averages: Dict[str, float] = {}

    for field in numeric_fields:
        values = [(r["pipelineName"], r[field]) for r in completed if r[field] is not None and isinstance(r[field], (int, float))]
        if not values:
            continue
        nums = [v for _, v in values]
        averages[field] = round(sum(nums) / len(nums), 3)
        # For latency/duration/fraud/risk, lower is better; for everything else, higher is better
        lower_better = field in ("durationMs", "avgLatencyMs", "fraudProbability", "riskScore")
        sorted_vals = sorted(values, key=lambda x: x[1], reverse=not lower_better)
        best[field] = {"pipeline": sorted_vals[0][0], "value": sorted_vals[0][1]}
        worst[field] = {"pipeline": sorted_vals[-1][0], "value": sorted_vals[-1][1]}

    # Decision distribution
    decision_dist: Dict[str, int] = {}
    for r in completed:
        d = r["decision"]
        decision_dist[d] = decision_dist.get(d, 0) + 1

    # Overall ranking: score = normalized coherence + throughput - risk - latency
    def rank_score(r: Dict[str, Any]) -> float:
        score = 0.0
        if r["coherenceScore"] is not None:
            score += float(r["coherenceScore"]) * 100
        if r["riskScore"] is not None:
            score -= float(r["riskScore"])
        if r["throughput"]:
            score += min(float(r["throughput"]) / 10, 50)
        if r["durationMs"]:
            score -= min(float(r["durationMs"]) / 1000, 20)
        if r["modelAuc"] is not None:
            score += float(r["modelAuc"]) * 50
        return round(score, 2)

    ranked = sorted(completed, key=rank_score, reverse=True)
    rankings = [
        {"rank": i + 1, "pipeline": r["pipelineName"], "score": rank_score(r)}
        for i, r in enumerate(ranked)
    ]

    return {
        "completed": len(completed),
        "total": len(results),
        "averages": averages,
        "best": best,
        "worst": worst,
        "decisionDistribution": decision_dist,
        "rankings": rankings,
    }


class ComparisonEngine:
    """Manages multi-pipeline comparison runs."""

    def create_comparison(
        self,
        pipeline_ids: List[str],
        input_type: str,
        input_payload: Optional[str] = None,
        triggered_by: str = "ui",
    ) -> Dict[str, Any]:
        """Create a comparison run: execute all selected pipelines in parallel."""
        run_id = uid("cmp")
        execution_ids: List[str] = []

        for pid in pipeline_ids:
            pipeline = execution_store.get_pipeline(pid)
            if pipeline is None:
                raise ValueError(f"Pipeline {pid} not found")
            ex = execution_engine.create_execution(
                pipeline,
                trigger="comparison",
                triggered_by=triggered_by,
            )
            execution_ids.append(ex["id"])

        run: Dict[str, Any] = {
            "id": run_id,
            "pipelineIds": pipeline_ids,
            "inputType": input_type,
            "inputPayload": input_payload,
            "triggeredBy": triggered_by,
            "createdAt": _now_iso(),
            "executionIds": execution_ids,
            "status": "running",
            "results": [],
            "summary": {},
        }
        comparison_store.add(run)

        # Start all executions in parallel
        for eid in execution_ids:
            execution_engine.start(eid)

        return run

    def get_comparison(self, run_id: str) -> Optional[Dict[str, Any]]:
        run = comparison_store.get(run_id)
        if run is None:
            return None
        self._refresh(run)
        return run

    def list_comparisons(self) -> List[Dict[str, Any]]:
        runs = comparison_store.list()
        for r in runs:
            self._refresh(r)
        return runs

    def delete_comparison(self, run_id: str) -> None:
        comparison_store.delete(run_id)

    def _refresh(self, run: Dict[str, Any]) -> None:
        """Recompute results/summary from the underlying executions."""
        executions = []
        all_done = True
        for eid in run["executionIds"]:
            ex = execution_store.get_execution(eid)
            if ex is None:
                continue
            executions.append(ex)
            if ex["status"] not in ("succeeded", "failed", "cancelled"):
                all_done = False

        summary = _build_run_summary(executions)
        run["results"] = summary["results"]
        run["summary"] = summary["summary"]
        run["status"] = "succeeded" if all_done else "running"


comparison_engine = ComparisonEngine()
