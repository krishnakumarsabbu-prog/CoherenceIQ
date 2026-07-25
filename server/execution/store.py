from __future__ import annotations

import threading
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def uid(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8].upper()}"


class ExecutionStore:
    """Thread-safe in-memory store for pipelines and executions."""

    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._pipelines: Dict[str, Dict[str, Any]] = {}
        self._executions: Dict[str, Dict[str, Any]] = {}
        self._order: List[str] = []

    # ---- Pipelines ---------------------------------------------------------

    def put_pipeline(self, pipeline: Dict[str, Any]) -> None:
        with self._lock:
            pid = pipeline["id"]
            pipeline["updatedAt"] = pipeline.get("updatedAt", now_iso())
            self._pipelines[pid] = pipeline

    def get_pipeline(self, pipeline_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            return self._pipelines.get(pipeline_id)

    def list_pipelines(self) -> List[Dict[str, Any]]:
        with self._lock:
            return list(self._pipelines.values())

    # ---- Executions --------------------------------------------------------

    def add_execution(self, execution: Dict[str, Any]) -> None:
        with self._lock:
            eid = execution["id"]
            self._executions[eid] = execution
            self._order.insert(0, eid)
            if len(self._order) > 200:
                stale = self._order[200:]
                for sid in stale:
                    self._executions.pop(sid, None)
                self._order = self._order[:200]

    def get_execution(self, execution_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            return self._executions.get(execution_id)

    def update_execution(self, execution_id: str, patch: Dict[str, Any]) -> None:
        with self._lock:
            ex = self._executions.get(execution_id)
            if ex:
                ex.update(patch)

    def list_executions(self, pipeline_id: Optional[str] = None) -> List[Dict[str, Any]]:
        with self._lock:
            ids = list(self._order)
            results = [self._executions[i] for i in ids if i in self._executions]
        if pipeline_id:
            results = [e for e in results if e.get("pipelineId") == pipeline_id]
        return results


execution_store = ExecutionStore()
