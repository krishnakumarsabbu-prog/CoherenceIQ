from __future__ import annotations
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
import json as _json
from models import Rule
from store import RuleStore
from session_validation import session_validation_service, SAMPLE_PAYLOADS, generate_random_session


app = FastAPI(title="Coherence AI — Rule Intelligence", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

store = RuleStore()
store.seed_if_empty()

# Share the main store with the session validation service so it sees uploaded rules
session_validation_service.store = store


@app.get("/api/health")
def health() -> Dict:
    return {"status": "ok", "rules": len(store.all_rules())}


@app.post("/api/rules/upload")
async def upload_rules(files: List[UploadFile] = File(...)) -> Dict:
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    payloads: List[Dict[str, str]] = []
    for f in files:
        raw = await f.read()
        try:
            content = raw.decode("utf-8")
        except UnicodeDecodeError:
            content = raw.decode("latin-1")
        payloads.append({"filename": f.filename or "unknown.md", "content": content})
    added = store.add_files(payloads)
    return {"added": added, "total": len(store.all_rules())}


@app.post("/api/rules/clear")
def clear_rules() -> Dict:
    store.clear()
    return {"total": 0}


@app.get("/api/rules")
def get_rules() -> List[Dict]:
    return [r.to_dict() for r in store.all_rules()]


@app.get("/api/rules/{rule_id}")
def get_rule(rule_id: str) -> Dict:
    rule = store.get_rule(rule_id)
    if rule is None:
        raise HTTPException(status_code=404, detail=f"Rule '{rule_id}' not found")
    return rule.to_dict()


@app.get("/api/clusters")
def get_clusters() -> Dict:
    return store.hierarchy()


@app.get("/api/clusters/flat")
def get_clusters_flat() -> List[Dict]:
    return store.clusters()


@app.get("/api/features")
def get_features() -> List[Dict]:
    return [f.to_dict() for f in store.features()]


@app.get("/api/features/graph")
def get_feature_graph() -> Dict:
    return store.dependency_graph()


@app.get("/api/stats")
def get_stats() -> Dict:
    return store.stats()


# New Enterprise Rule Intelligence Endpoints
@app.get("/api/intelligence/signals")
def get_signals() -> Dict[str, Any]:
    return store.signals()


@app.get("/api/intelligence/similarity")
def get_similarity() -> Dict[str, Any]:
    return store.similarity()


@app.get("/api/intelligence/kg")
def get_kg() -> Dict[str, Any]:
    return store.kg()


@app.get("/api/intelligence/communities")
def get_communities() -> List[List[str]]:
    return store.communities()


class TextUpload(BaseModel):
    filename: str
    content: str


@app.post("/api/rules/upload-text")
def upload_text(payload: TextUpload) -> Dict:
    added = store.add_files([{"filename": payload.filename, "content": payload.content}])
    return {"added": added, "total": len(store.all_rules())}


@app.post("/api/rules/seed")
def seed_rules() -> Dict:
    store.clear()
    store.seed_if_empty()
    return {"total": len(store.all_rules())}


# ---------------------------------------------------------------------------
# Session Validation Studio
# ---------------------------------------------------------------------------

class ValidationRequest(BaseModel):
    raw_input: str
    content_type: str = "json"


@app.post("/api/session-validation/run")
def run_session_validation(req: ValidationRequest) -> Dict[str, Any]:
    return session_validation_service.run_validation(req.raw_input, req.content_type)


@app.get("/api/session-validation/history")
def get_validation_history() -> List[Dict[str, Any]]:
    return session_validation_service.get_history()


@app.get("/api/session-validation/{session_id}")
def get_validation_session(session_id: str) -> Dict[str, Any]:
    result = session_validation_service.get_session(session_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
    return result


@app.get("/api/session-validation/report/{session_id}", response_class=PlainTextResponse)
def get_validation_report(session_id: str) -> str:
    report = session_validation_service.get_report(session_id)
    if report is None:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
    return _json.dumps(report, indent=2, default=str)


@app.get("/api/session-validation/samples/list")
def get_sample_payloads() -> List[Dict[str, str]]:
    return [{"label": s["label"], "content_type": s["content_type"]} for s in SAMPLE_PAYLOADS]


@app.get("/api/session-validation/samples/{index}")
def get_sample_payload(index: int) -> Dict[str, str]:
    if index < 0 or index >= len(SAMPLE_PAYLOADS):
        raise HTTPException(status_code=404, detail="Sample not found")
    return SAMPLE_PAYLOADS[index]


@app.get("/api/session-validation/random-session")
def get_random_session() -> Dict[str, str]:
    return generate_random_session()
