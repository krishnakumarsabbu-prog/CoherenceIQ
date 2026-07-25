"""Core pipeline execution engine.

Traverses the pipeline graph in topological order, validates node dependencies,
executes nodes in parallel where the graph allows, propagates outputs between
nodes, collects metrics, captures intermediate results, and supports replay.

Executions run on a background thread. Progress is published to an in-memory
event log that callers can poll or stream via SSE.
"""
from __future__ import annotations

import threading
import time
from collections import defaultdict, deque
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple

from execution.store import execution_store, now_iso, uid
from execution.executors import execute_node


# Statuses that map to the frontend's ExecutionStatus union
STATUS_QUEUED = "queued"
STATUS_RUNNING = "running"
STATUS_SUCCEEDED = "succeeded"
STATUS_FAILED = "failed"
STATUS_CANCELLED = "cancelled"
STATUS_SKIPPED = "skipped"
STATUS_WARNING = "warning"


class ExecutionEngine:
    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._cancel_flags: Set[str] = set()
        self._events: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        self._event_cursors: Dict[str, int] = defaultdict(int)
        self._waiters: Dict[str, List[threading.Event]] = defaultdict(list)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def create_execution(self, pipeline: Dict[str, Any], trigger: str = "manual",
                         triggered_by: str = "api") -> Dict[str, Any]:
        """Create an execution record for a pipeline without starting it."""
        eid = uid("ex")
        steps = []
        for n in pipeline.get("nodes", []):
            if n.get("type") == "comment":
                continue
            steps.append({
                "nodeId": n["id"],
                "nodeLabel": n["data"].get("label", n["id"]),
                "nodeType": n["type"],
                "status": STATUS_QUEUED,
                "startedAt": "",
                "finishedAt": "",
                "durationMs": 0,
                "rowsIn": None,
                "rowsOut": None,
                "log": [],
                "artifacts": {},
            })
        execution = {
            "id": eid,
            "pipelineId": pipeline["id"],
            "pipelineName": pipeline.get("name", pipeline["id"]),
            "pipelineSnapshot": pipeline,
            "status": STATUS_QUEUED,
            "trigger": trigger,
            "triggeredBy": triggered_by,
            "startedAt": "",
            "finishedAt": "",
            "durationMs": 0,
            "steps": steps,
            "metrics": {
                "throughput": 0,
                "decisions": {"allow": 0, "challenge": 0, "deny": 0},
                "avgLatencyMs": 0,
            },
            "intermediate": {},
            "replayOf": None,
        }
        execution_store.add_execution(execution)
        self._publish(eid, {"type": "created", "executionId": eid, "pipelineId": pipeline["id"]})
        return execution

    def start(self, execution_id: str) -> Dict[str, Any]:
        """Start an execution on a background thread. Returns the execution."""
        ex = execution_store.get_execution(execution_id)
        if ex is None:
            raise ValueError(f"Execution {execution_id} not found")
        if ex["status"] not in (STATUS_QUEUED,):
            raise ValueError(f"Execution {execution_id} already started")
        thread = threading.Thread(target=self._run, args=(execution_id,), daemon=True)
        thread.start()
        return ex

    def cancel(self, execution_id: str) -> Dict[str, Any]:
        ex = execution_store.get_execution(execution_id)
        if ex is None:
            raise ValueError(f"Execution {execution_id} not found")
        if ex["status"] in (STATUS_SUCCEEDED, STATUS_FAILED, STATUS_CANCELLED):
            return ex
        with self._lock:
            self._cancel_flags.add(execution_id)
        self._publish(execution_id, {"type": "cancel_requested", "executionId": execution_id})
        return ex

    def replay(self, execution_id: str, triggered_by: str = "api") -> Dict[str, Any]:
        """Create a new execution from the snapshot of an existing one and start it."""
        original = execution_store.get_execution(execution_id)
        if original is None:
            raise ValueError(f"Execution {execution_id} not found")
        pipeline = original["pipelineSnapshot"]
        new_ex = self.create_execution(pipeline, trigger="manual", triggered_by=triggered_by)
        new_ex["replayOf"] = execution_id
        execution_store.update_execution(new_ex["id"], {"replayOf": execution_id})
        return self.start(new_ex["id"])

    def get_events(self, execution_id: str, after: int = -1) -> List[Dict[str, Any]]:
        """Return events for an execution with index > `after`. Used for polling/SSE."""
        with self._lock:
            events = self._events.get(execution_id, [])
            return [e for i, e in enumerate(events) if i > after]

    def wait_for_event(self, execution_id: str, timeout: float = 1.0) -> Optional[Dict[str, Any]]:
        """Block until a new event arrives or timeout. Returns the event or None."""
        ev = threading.Event()
        with self._lock:
            cursor = self._event_cursors.get(execution_id, 0)
            events = self._events.get(execution_id, [])
            if cursor < len(events):
                evt = events[cursor]
                self._event_cursors[execution_id] = cursor + 1
                return evt
            self._waiters[execution_id].append(ev)
        ev.wait(timeout)
        with self._lock:
            self._waiters[execution_id] = [w for w in self._waiters[execution_id] if w is not ev]
            cursor = self._event_cursors.get(execution_id, 0)
            events = self._events.get(execution_id, [])
            if cursor < len(events):
                evt = events[cursor]
                self._event_cursors[execution_id] = cursor + 1
                return evt
        return None

    # ------------------------------------------------------------------
    # Internal execution
    # ------------------------------------------------------------------

    def _run(self, execution_id: str) -> None:
        ex = execution_store.get_execution(execution_id)
        if ex is None:
            return
        pipeline = ex["pipelineSnapshot"]
        nodes = [n for n in pipeline.get("nodes", []) if n.get("type") != "comment"]
        edges = pipeline.get("edges", [])

        start_time = time.perf_counter()
        execution_store.update_execution(execution_id, {
            "status": STATUS_RUNNING,
            "startedAt": now_iso(),
        })
        self._publish(execution_id, {"type": "started", "executionId": execution_id, "startedAt": ex["startedAt"] or now_iso()})

        # Validate graph and compute topological order
        try:
            topo_levels = self._topological_levels(nodes, edges)
        except ValueError as exc:
            self._fail_all(execution_id, ex, str(exc))
            self._finish(execution_id, ex, start_time, STATUS_FAILED)
            return

        node_map = {n["id"]: n for n in nodes}
        outputs: Dict[str, Dict[str, Any]] = {}
        step_map = {s["nodeId"]: s for s in ex["steps"]}

        total_duration = 0.0
        completed = 0

        for level_idx, level_nodes in enumerate(topo_levels):
            # Check cancellation before each level
            if self._is_cancelled(execution_id):
                self._skip_remaining(execution_id, ex, outputs)
                self._finish(execution_id, ex, start_time, STATUS_CANCELLED)
                return

            # Execute all nodes in this level in parallel
            with ThreadPoolExecutor(max_workers=max(1, len(level_nodes))) as pool:
                futures = {}
                for n in level_nodes:
                    if self._is_cancelled(execution_id):
                        break
                    upstream = [outputs[src] for src in self._sources(n["id"], edges) if src in outputs]
                    step = step_map[n["id"]]
                    step["status"] = STATUS_RUNNING
                    step["startedAt"] = now_iso()
                    step["_t0"] = time.perf_counter()
                    execution_store.update_execution(execution_id, {"steps": ex["steps"]})
                    self._publish(execution_id, {
                        "type": "node_started",
                        "executionId": execution_id,
                        "nodeId": n["id"],
                        "nodeLabel": step["nodeLabel"],
                        "nodeType": n["type"],
                        "level": level_idx,
                        "startedAt": step["startedAt"],
                    })
                    fut = pool.submit(self._exec_one, execution_id, n, upstream, step)
                    futures[fut] = (n, step)

                for fut in as_completed(futures):
                    n, step = futures[fut]
                    try:
                        result = fut.result()
                    except Exception as exc:  # pragma: no cover - defensive
                        result = {"status": STATUS_FAILED, "logs": [f"Executor error: {exc}"], "rowsOut": 0, "artifacts": {}}

                    step["finishedAt"] = now_iso()
                    step["durationMs"] = round((time.perf_counter() - self._t0_for(step)) * 1000, 2)
                    step["log"] = result.get("logs", [])
                    step["artifacts"] = result.get("artifacts", {})
                    step["rowsIn"] = result.get("rowsIn")
                    step["rowsOut"] = result.get("rowsOut")
                    status = result.get("status_override", STATUS_SUCCEEDED)
                    step["status"] = status
                    total_duration += step["durationMs"]
                    completed += 1

                    outputs[n["id"]] = {
                        "output": result,
                        "rowsOut": result.get("rowsOut", 0),
                    }
                    execution_store.update_execution(execution_id, {
                        "steps": ex["steps"],
                        "intermediate": {k: {"rowsOut": v["output"].get("rowsOut"), "logs": v["output"].get("logs", [])} for k, v in outputs.items()},
                    })

                    self._publish(execution_id, {
                        "type": "node_finished",
                        "executionId": execution_id,
                        "nodeId": n["id"],
                        "nodeLabel": step["nodeLabel"],
                        "nodeType": n["type"],
                        "status": status,
                        "durationMs": step["durationMs"],
                        "rowsIn": step["rowsIn"],
                        "rowsOut": step["rowsOut"],
                        "logs": step["log"],
                        "progress": completed,
                        "total": len(step_map),
                    })

                    if status == STATUS_FAILED:
                        self._skip_remaining(execution_id, ex, outputs)
                        self._finish(execution_id, ex, start_time, STATUS_FAILED)
                        return

        metrics = self._compute_metrics(ex, outputs)
        final_status = STATUS_SUCCEEDED
        if any(s["status"] == STATUS_WARNING for s in ex["steps"]):
            final_status = STATUS_SUCCEEDED  # warnings don't fail the run
        execution_store.update_execution(execution_id, {"metrics": metrics})
        self._finish(execution_id, ex, start_time, final_status)

    def _exec_one(self, execution_id: str, node: Dict[str, Any],
                  inputs: List[Dict[str, Any]], step: Dict[str, Any]) -> Dict[str, Any]:
        if self._is_cancelled(execution_id):
            return {"status": STATUS_CANCELLED, "logs": ["Cancelled"], "rowsOut": 0, "artifacts": {}}
        rows_in = None
        if inputs:
            rows_in = sum((i.get("output", {}).get("rowsOut", 0) or 0) for i in inputs) if len(inputs) > 1 else (inputs[0].get("output", {}).get("rowsOut") or 0)
        result = execute_node(node, inputs)
        result.setdefault("rowsIn", rows_in)
        # Simulate work so progress is visible
        time.sleep(0.25)
        return result

    # ------------------------------------------------------------------
    # Graph helpers
    # ------------------------------------------------------------------

    def _topological_levels(self, nodes: List[Dict[str, Any]],
                            edges: List[Dict[str, Any]]) -> List[List[Dict[str, Any]]]:
        """Kahn's algorithm grouped into parallel levels. Raises on cycles."""
        node_ids = {n["id"] for n in nodes}
        indeg: Dict[str, int] = {nid: 0 for nid in node_ids}
        adj: Dict[str, List[str]] = defaultdict(list)
        for e in edges:
            s, t = e["source"], e["target"]
            if s not in node_ids or t not in node_ids:
                continue
            adj[s].append(t)
            indeg[t] += 1

        levels: List[List[Dict[str, Any]]] = []
        node_map = {n["id"]: n for n in nodes}
        remaining = set(node_ids)
        while remaining:
            current = [nid for nid in remaining if indeg[nid] == 0]
            if not current:
                raise ValueError("Pipeline contains a cycle — cannot execute")
            level = [node_map[nid] for nid in current]
            levels.append(level)
            for nid in current:
                remaining.discard(nid)
                for nxt in adj[nid]:
                    indeg[nxt] -= 1
        return levels

    def _sources(self, node_id: str, edges: List[Dict[str, Any]]) -> List[str]:
        return [e["source"] for e in edges if e["target"] == node_id]

    # ------------------------------------------------------------------
    # Cancellation, metrics, finishing
    # ------------------------------------------------------------------

    def _is_cancelled(self, execution_id: str) -> bool:
        with self._lock:
            return execution_id in self._cancel_flags

    def _skip_remaining(self, execution_id: str, ex: Dict[str, Any],
                        outputs: Dict[str, Dict[str, Any]]) -> None:
        for step in ex["steps"]:
            if step["status"] in (STATUS_QUEUED,):
                step["status"] = STATUS_SKIPPED
                step["log"] = ["Skipped due to upstream failure or cancellation"]
                self._publish(execution_id, {
                    "type": "node_skipped",
                    "executionId": execution_id,
                    "nodeId": step["nodeId"],
                    "nodeLabel": step["nodeLabel"],
                    "nodeType": step["nodeType"],
                })
        execution_store.update_execution(execution_id, {"steps": ex["steps"]})

    def _fail_all(self, execution_id: str, ex: Dict[str, Any], reason: str) -> None:
        for step in ex["steps"]:
            if step["status"] in (STATUS_QUEUED,):
                step["status"] = STATUS_FAILED
                step["log"] = [reason]
        execution_store.update_execution(execution_id, {"steps": ex["steps"]})

    def _compute_metrics(self, ex: Dict[str, Any], outputs: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
        allow = challenge = deny = 0
        for step in ex["steps"]:
            art = step.get("artifacts", {})
            allow += int(art.get("allow", 0) or 0)
            challenge += int(art.get("challenge", 0) or 0)
            deny += int(art.get("deny", 0) or 0)
        durations = [s["durationMs"] for s in ex["steps"] if s["durationMs"] > 0]
        avg_lat = round(sum(durations) / len(durations), 2) if durations else 0
        total_rows = 0
        for step in ex["steps"]:
            if step.get("nodeType") in ("session-source", "dataset-source"):
                total_rows = step.get("rowsOut") or 0
                break
        throughput = round(total_rows / (ex["durationMs"] / 1000), 1) if ex.get("durationMs") else 0
        return {
            "throughput": throughput,
            "decisions": {"allow": allow, "challenge": challenge, "deny": deny},
            "avgLatencyMs": avg_lat,
        }

    def _finish(self, execution_id: str, ex: Dict[str, Any], start_time: float,
                status: str) -> None:
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        ex["durationMs"] = duration_ms
        ex["status"] = status
        ex["finishedAt"] = now_iso()
        with self._lock:
            self._cancel_flags.discard(execution_id)
        execution_store.update_execution(execution_id, {
            "status": status,
            "finishedAt": ex["finishedAt"],
            "durationMs": duration_ms,
            "metrics": ex.get("metrics", {}),
        })
        self._publish(execution_id, {
            "type": "finished",
            "executionId": execution_id,
            "status": status,
            "durationMs": duration_ms,
            "finishedAt": ex["finishedAt"],
        })
        # Wake any SSE waiters
        with self._lock:
            for w in self._waiters.get(execution_id, []):
                w.set()

    def _t0_for(self, step: Dict[str, Any]) -> float:
        return step.get("_t0", time.perf_counter())

    # ------------------------------------------------------------------
    # Event publishing
    # ------------------------------------------------------------------

    def _publish(self, execution_id: str, event: Dict[str, Any]) -> None:
        with self._lock:
            self._events[execution_id].append(event)
            for w in self._waiters.get(execution_id, []):
                w.set()


execution_engine = ExecutionEngine()
