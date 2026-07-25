import { useCallback, useMemo, useState } from "react";
import {
  SEED_ARTEFACTS, ARTEFACT_KINDS, bumpSemVer, compareSemVer, now, uid,
  type Artefact, type ArtefactKind, type AuditAction, type AuditEntry,
  type LifecycleState, type SemVer, type ShadowRun,
} from "./governanceData";

export type NewArtefactInput = {
  name: string;
  kind: ArtefactKind;
  description: string;
  owner: string;
  team: string;
  tags: string[];
  color: string;
};

function auditEntry(action: AuditAction, actor: string, detail: string, from?: SemVer, to?: SemVer): AuditEntry {
  return { id: uid("au"), action, actor, timestamp: now(), detail, fromVersion: from, toVersion: to };
}

export function useGovernanceStore() {
  const [artefacts, setArtefacts] = useState<Artefact[]>(SEED_ARTEFACTS);

  const create = useCallback((input: NewArtefactInput) => {
    const id = `art-${input.kind}-${Date.now().toString(36).slice(-4)}`;
    const ts = now();
    const version = "0.1.0";
    const art: Artefact = {
      id, name: input.name, kind: input.kind, description: input.description,
      version, owner: input.owner, team: input.team, createdAt: ts, updatedAt: ts,
      tags: input.tags, lifecycle: "Draft", color: input.color,
      approvals: [{ id: uid("ap"), step: "Author Review", approver: input.owner, role: "Author", status: "Pending", date: null, comment: "" }],
      versions: [{ version, author: input.owner, date: ts.slice(0, 10), change: "Initial draft", state: "Draft" }],
      audit: [auditEntry("created", input.owner, "Artefact created", undefined, version)],
      dependencies: [], champion: false, challenger: false, shadowMode: false, shadowRuns: [],
      usage: [], drift: [], stats: [{ label: "Version", value: version }, { label: "State", value: "Draft" }],
    };
    setArtefacts((prev) => [art, ...prev]);
    return art;
  }, []);

  const bump = useCallback((id: string, actor: string, kind: "major" | "minor" | "patch", change: string) => {
    setArtefacts((prev) => prev.map((a) => {
      if (a.id !== id) return a;
      const newVersion = bumpSemVer(a.version, kind);
      const ts = now();
      return {
        ...a,
        version: newVersion,
        updatedAt: ts,
        lifecycle: a.lifecycle === "Approved" ? "Approved" : "Draft",
        versions: [{ version: newVersion, author: actor, date: ts.slice(0, 10), change, state: a.lifecycle === "Approved" ? "Approved" : "Draft" }, ...a.versions],
        audit: [auditEntry("version-bumped", actor, change, a.version, newVersion), ...a.audit],
      };
    }));
  }, []);

  const setLifecycle = useCallback((id: string, actor: string, state: LifecycleState, comment: string) => {
    setArtefacts((prev) => prev.map((a) => {
      if (a.id !== id) return a;
      const action: AuditAction = state === "Deprecated" ? "deprecated" : state === "Approved" ? "promoted" : "submitted-review";
      return {
        ...a,
        lifecycle: state,
        updatedAt: now(),
        audit: [auditEntry(action, actor, comment || `Lifecycle set to ${state}`, a.version, a.version), ...a.audit],
      };
    }));
  }, []);

  const approve = useCallback((id: string, actor: string, stepId: string, decision: "Approved" | "Rejected", comment: string) => {
    setArtefacts((prev) => prev.map((a) => {
      if (a.id !== id) return a;
      const approvals = a.approvals.map((s) => s.id === stepId ? { ...s, status: decision, date: now().slice(0, 10), comment } : s);
      const allApproved = approvals.every((s) => s.status === "Approved");
      const ts = now();
      return {
        ...a,
        approvals,
        lifecycle: allApproved && a.lifecycle === "Review" ? "Approved" : a.lifecycle,
        updatedAt: ts,
        audit: [auditEntry(decision === "Approved" ? "approved" : "rejected", actor, `${decision}: ${comment || "no comment"}`, a.version, a.version), ...a.audit],
      };
    }));
  }, []);

  const rollback = useCallback((id: string, actor: string, targetVersion: SemVer) => {
    setArtefacts((prev) => prev.map((a) => {
      if (a.id !== id) return a;
      const target = a.versions.find((v) => v.version === targetVersion);
      if (!target) return a;
      const ts = now();
      return {
        ...a,
        version: targetVersion,
        lifecycle: target.state,
        updatedAt: ts,
        audit: [auditEntry("rolled-back", actor, `Rolled back to ${targetVersion}`, a.version, targetVersion), ...a.audit],
      };
    }));
  }, []);

  const setChampion = useCallback((id: string, actor: string, champion: boolean) => {
    setArtefacts((prev) => prev.map((a) => {
      if (a.id !== id) return a;
      return {
        ...a, champion,
        audit: [auditEntry(champion ? "champion-set" : "champion-set", actor, champion ? "Designated as champion" : "Removed champion designation", a.version, a.version), ...a.audit],
      };
    }));
  }, []);

  const setChallenger = useCallback((id: string, actor: string, challenger: boolean) => {
    setArtefacts((prev) => prev.map((a) => {
      if (a.id !== id) return a;
      return {
        ...a, challenger,
        audit: [auditEntry("challenger-set", actor, challenger ? "Designated as challenger" : "Removed challenger designation", a.version, a.version), ...a.audit],
      };
    }));
  }, []);

  const toggleShadow = useCallback((id: string, actor: string, on: boolean) => {
    setArtefacts((prev) => prev.map((a) => {
      if (a.id !== id) return a;
      let shadowRuns = a.shadowRuns;
      if (on) {
        const run: ShadowRun = { id: uid("sr"), startedAt: now(), endedAt: null, status: "running", samples: 0, agreements: 0, disagreements: 0, drift: 0 };
        shadowRuns = [run, ...shadowRuns];
      } else {
        shadowRuns = shadowRuns.map((r) => r.status === "running" ? { ...r, status: "completed", endedAt: now() } : r);
      }
      return {
        ...a, shadowMode: on, shadowRuns,
        audit: [auditEntry(on ? "shadow-started" : "shadow-stopped", actor, on ? "Shadow mode enabled" : "Shadow mode stopped", a.version, a.version), ...a.audit],
      };
    }));
  }, []);

  const changeOwner = useCallback((id: string, actor: string, newOwner: string) => {
    setArtefacts((prev) => prev.map((a) => {
      if (a.id !== id) return a;
      return {
        ...a, owner: newOwner, updatedAt: now(),
        audit: [auditEntry("owner-changed", actor, `Ownership transferred to ${newOwner}`, a.version, a.version), ...a.audit],
      };
    }));
  }, []);

  return {
    artefacts,
    create, bump, setLifecycle, approve, rollback,
    setChampion, setChallenger, toggleShadow, changeOwner,
  };
}

export type GovernanceStore = ReturnType<typeof useGovernanceStore>;

export function useGovernanceStats(items: Artefact[]) {
  return useMemo(() => {
    const total = items.length;
    const byKind = (k: ArtefactKind) => items.filter((a) => a.kind === k).length;
    const approved = items.filter((a) => a.lifecycle === "Approved").length;
    const review = items.filter((a) => a.lifecycle === "Review").length;
    const draft = items.filter((a) => a.lifecycle === "Draft").length;
    const deprecated = items.filter((a) => a.lifecycle === "Deprecated").length;
    const shadowing = items.filter((a) => a.shadowMode).length;
    const champions = items.filter((a) => a.champion).length;
    const challengers = items.filter((a) => a.challenger).length;
    const drifters = items.filter((a) => a.drift.some((d) => d.psi > d.threshold)).length;
    const pendingApprovals = items.reduce((n, a) => n + a.approvals.filter((x) => x.status === "Pending").length, 0);
    const totalExec = items.reduce((n, a) => n + a.usage.reduce((s, u) => s + u.executions, 0), 0);
    const avgLatency = (() => {
      const flat = items.flatMap((a) => a.usage);
      if (!flat.length) return 0;
      return Math.round(flat.reduce((s, u) => s + u.avgLatencyMs, 0) / flat.length);
    })();
    const totalApprovals = items.reduce((n, a) => n + a.approvals.length, 0);
    const score = Math.max(0, Math.min(100, Math.round(
      (approved / Math.max(total, 1)) * 40 +
      (1 - pendingApprovals / Math.max(totalApprovals, 1)) * 25 +
      (champions / Math.max(ARTEFACT_KINDS.length, 1)) * 20 +
      (1 - drifters / Math.max(total, 1)) * 15,
    )));
    return { total, approved, review, draft, deprecated, shadowing, champions, challengers, drifters, pendingApprovals, totalExec, avgLatency, score, byKind };
  }, [items]);
}

export { compareSemVer };
