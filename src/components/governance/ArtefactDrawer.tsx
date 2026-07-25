import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, GitBranch, ShieldCheck, History, Network, Activity, Crown, Swords,
  Eye, EyeOff, RotateCcw, Plus, ChevronRight, FileCode2, CircleCheck, Circle, CircleX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, relativeTime } from "@/lib/utils";
import {
  ARTEFACT_META, LIFECYCLE_TONE, APPROVAL_TONE, compareSemVer,
  type Artefact, type LifecycleState, type VersionRecord, type ApprovalStep, type AuditEntry, type ShadowRun,
} from "@/lib/governanceData";
import { type GovernanceStore } from "@/lib/governanceStore";

type DrawerTab = "overview" | "versions" | "approvals" | "audit" | "dependencies" | "shadow";

const TABS: { id: DrawerTab; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: FileCode2 },
  { id: "versions", label: "Versions", icon: GitBranch },
  { id: "approvals", label: "Approvals", icon: ShieldCheck },
  { id: "audit", label: "Audit", icon: History },
  { id: "dependencies", label: "Dependencies", icon: Network },
  { id: "shadow", label: "Shadow & C/C", icon: Activity },
];

const LIFECYCLE_OPTIONS: LifecycleState[] = ["Draft", "Review", "Approved", "Deprecated"];

const AUDIT_LABEL: Record<string, string> = {
  created: "Created", "version-bumped": "Version Bump", "submitted-review": "Submitted Review",
  approved: "Approved", rejected: "Rejected", deprecated: "Deprecated", "rolled-back": "Rolled Back",
  promoted: "Promoted", "shadow-started": "Shadow Started", "shadow-stopped": "Shadow Stopped",
  "champion-set": "Champion Set", "challenger-set": "Challenger Set", "owner-changed": "Owner Changed",
};

export function ArtefactDrawer({
  artefact, allArtefacts, store, open, onClose,
}: {
  artefact: Artefact | null;
  allArtefacts: Artefact[];
  store: GovernanceStore;
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<DrawerTab>("overview");

  return (
    <AnimatePresence>
      {open && artefact && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[180]">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className="absolute right-0 top-0 flex h-full w-full max-w-[680px] flex-col border-l border-border bg-background shadow-2xl"
          >
            <DrawerHeader artefact={artefact} onClose={onClose} store={store} />
            <DrawerTabs tab={tab} setTab={setTab} artefact={artefact} />
            <div className="scrollbar-thin min-h-0 flex-1 overflow-auto">
              {tab === "overview" && <OverviewTab artefact={artefact} store={store} />}
              {tab === "versions" && <VersionsTab artefact={artefact} store={store} />}
              {tab === "approvals" && <ApprovalsTab artefact={artefact} store={store} />}
              {tab === "audit" && <AuditTab artefact={artefact} />}
              {tab === "dependencies" && <DependenciesTab artefact={artefact} allArtefacts={allArtefacts} />}
              {tab === "shadow" && <ShadowTab artefact={artefact} store={store} />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DrawerHeader({ artefact, onClose, store }: { artefact: Artefact; onClose: () => void; store: GovernanceStore }) {
  const meta = ARTEFACT_META[artefact.kind];
  const Icon = meta.icon;
  return (
    <div className="shrink-0 border-b border-border p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `${artefact.color}22`, color: artefact.color }}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold text-foreground">{artefact.name}</h3>
          <p className="truncate text-[11.5px] text-muted-foreground">{meta.label} · v{artefact.version} · {artefact.owner}</p>
        </div>
        <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant={LIFECYCLE_TONE[artefact.lifecycle]}>{artefact.lifecycle}</Badge>
        {artefact.champion && <Badge variant="default" className="text-[9px]"><Crown className="h-2.5 w-2.5" /> Champion</Badge>}
        {artefact.challenger && <Badge variant="warning" className="text-[9px]"><Swords className="h-2.5 w-2.5" /> Challenger</Badge>}
        {artefact.shadowMode && <Badge variant="secondary" className="text-[9px]"><Eye className="h-2.5 w-2.5" /> Shadow</Badge>}
        {artefact.tags.slice(0, 3).map((t) => <Badge key={t} variant="outline" className="text-[9px]">{t}</Badge>)}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => store.toggleShadow(artefact.id, artefact.owner, !artefact.shadowMode)}>
          {artefact.shadowMode ? <><EyeOff className="h-3.5 w-3.5" /> Stop Shadow</> : <><Eye className="h-3.5 w-3.5" /> Start Shadow</>}
        </Button>
        <Button size="sm" variant="outline" onClick={() => store.setChampion(artefact.id, artefact.owner, !artefact.champion)}>
          <Crown className="h-3.5 w-3.5" /> {artefact.champion ? "Unset Champion" : "Set Champion"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => store.setChallenger(artefact.id, artefact.owner, !artefact.challenger)}>
          <Swords className="h-3.5 w-3.5" /> {artefact.challenger ? "Unset Challenger" : "Set Challenger"}
        </Button>
      </div>
    </div>
  );
}

function DrawerTabs({ tab, setTab, artefact }: { tab: DrawerTab; setTab: (t: DrawerTab) => void; artefact: Artefact }) {
  const counts: Partial<Record<DrawerTab, number>> = {
    versions: artefact.versions.length,
    approvals: artefact.approvals.length,
    audit: artefact.audit.length,
    dependencies: artefact.dependencies.length,
    shadow: artefact.shadowRuns.length,
  };
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-border px-3 py-2">
      {TABS.map((t) => {
        const active = tab === t.id;
        const count = counts[t.id];
        return (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11.5px] font-semibold transition-all",
              active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
            {count != null && <span className="ml-0.5 rounded bg-muted/60 px-1 text-[9px] tabular-nums">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

function OverviewTab({ artefact, store }: { artefact: Artefact; store: GovernanceStore }) {
  const [bumpKind, setBumpKind] = useState<"major" | "minor" | "patch">("patch");
  const [change, setChange] = useState("");
  return (
    <div className="space-y-4 p-4">
      <p className="text-[12.5px] leading-relaxed text-foreground/85">{artefact.description}</p>
      <div className="grid grid-cols-3 gap-2">
        {artefact.stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card/40 p-2.5 text-center">
            <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
            <div className="mt-0.5 font-mono text-[14px] font-bold tabular-nums text-foreground">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-border bg-card/40 p-3 space-y-1.5 text-[12px]">
        <Row label="Artefact ID" value={artefact.id} />
        <Row label="Kind" value={ARTEFACT_META[artefact.kind].label} />
        <Row label="Version" value={`v${artefact.version}`} />
        <Row label="Owner" value={artefact.owner} />
        <Row label="Team" value={artefact.team} />
        <Row label="Created" value={relativeTime(artefact.createdAt)} />
        <Row label="Updated" value={relativeTime(artefact.updatedAt)} />
      </div>
      <div className="rounded-lg border border-border bg-card/40 p-3">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Lifecycle State</div>
        <div className="flex flex-wrap gap-1.5">
          {LIFECYCLE_OPTIONS.map((s) => (
            <button key={s} onClick={() => store.setLifecycle(artefact.id, artefact.owner, s, "")}
              className={cn("rounded-full border px-2.5 py-1 text-[10.5px] font-semibold transition-all",
                artefact.lifecycle === s ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card/40 p-3">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">New Version</div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            {(["patch", "minor", "major"] as const).map((k) => (
              <button key={k} onClick={() => setBumpKind(k)}
                className={cn("rounded-md border px-2 py-1 text-[10px] font-semibold capitalize transition-all",
                  bumpKind === k ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>
                {k}
              </button>
            ))}
          </div>
          <input value={change} onChange={(e) => setChange(e.target.value)} placeholder="Change description…"
            className="h-8 min-w-[160px] flex-1 rounded-md border border-border bg-background px-2.5 text-[12px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
          <Button size="sm" onClick={() => { store.bump(artefact.id, artefact.owner, bumpKind, change || `${bumpKind} bump`); setChange(""); }}>
            <Plus className="h-3.5 w-3.5" /> Bump
          </Button>
        </div>
      </div>
    </div>
  );
}

function VersionsTab({ artefact, store }: { artefact: Artefact; store: GovernanceStore }) {
  const sorted = [...artefact.versions].sort((a, b) => compareSemVer(b.version, a.version));
  return (
    <div className="p-4">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        <History className="h-3.5 w-3.5" /> Version History ({artefact.versions.length})
      </div>
      <div className="relative space-y-3 pl-5">
        <div className="absolute left-2 top-1 bottom-1 w-px bg-border" />
        {sorted.map((v, i) => (
          <VersionRow key={v.version + i} v={v} latest={i === 0} current={v.version === artefact.version}
            canRollback={v.version !== artefact.version} onRollback={() => store.rollback(artefact.id, artefact.owner, v.version)} />
        ))}
      </div>
    </div>
  );
}

function VersionRow({ v, latest, current, canRollback, onRollback }: { v: VersionRecord; latest: boolean; current: boolean; canRollback: boolean; onRollback: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}>
      <div className={cn("absolute -left-[14px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background", latest ? "bg-primary" : "bg-muted-foreground/50")} />
      <div className="rounded-lg border border-border bg-card/40 p-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[12px] font-bold text-foreground">v{v.version}{current && <Badge variant="default" className="ml-2 text-[8px]">current</Badge>}</span>
          <Badge variant={LIFECYCLE_TONE[v.state]} className="text-[9px]">{v.state}</Badge>
        </div>
        <div className="mt-1 text-[11.5px] text-foreground/85">{v.change}</div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{v.author} · {v.date}</span>
          {canRollback && (
            <button onClick={onRollback} className="flex items-center gap-1 rounded text-primary hover:underline">
              <RotateCcw className="h-3 w-3" /> Roll back
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ApprovalsTab({ artefact, store }: { artefact: Artefact; store: GovernanceStore }) {
  return (
    <div className="p-4">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" /> Approval Workflow ({artefact.approvals.length})
      </div>
      <div className="space-y-2">
        {artefact.approvals.map((a, i) => (
          <ApprovalRow key={a.id} a={a} index={i}
            onApprove={(dec, comment) => store.approve(artefact.id, artefact.owner, a.id, dec, comment)} />
        ))}
      </div>
    </div>
  );
}

function ApprovalRow({ a, index, onApprove }: { a: ApprovalStep; index: number; onApprove: (d: "Approved" | "Rejected", c: string) => void }) {
  const [comment, setComment] = useState("");
  const Icon = a.status === "Approved" ? CircleCheck : a.status === "Rejected" ? CircleX : Circle;
  const tone = a.status === "Approved" ? "text-success" : a.status === "Rejected" ? "text-destructive" : "text-warning";
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="rounded-lg border border-border bg-card/40 p-3">
      <div className="flex items-start gap-3">
        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", tone)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-semibold text-foreground">{a.step}</span>
            <Badge variant={APPROVAL_TONE[a.status]} className="text-[9px]">{a.status}</Badge>
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">{a.approver} · {a.role}</div>
          {a.date && <div className="mt-0.5 text-[10px] text-muted-foreground">{a.date}{a.comment ? ` · "${a.comment}"` : ""}</div>}
          {a.status === "Pending" && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comment…"
                className="h-7 min-w-[140px] flex-1 rounded-md border border-border bg-background px-2 text-[11px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
              <Button size="sm" variant="outline" className="h-7 px-2 text-[10px]" onClick={() => onApprove("Approved", comment)}><CircleCheck className="h-3 w-3" /> Approve</Button>
              <Button size="sm" variant="outline" className="h-7 px-2 text-[10px]" onClick={() => onApprove("Rejected", comment)}><CircleX className="h-3 w-3" /> Reject</Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function AuditTab({ artefact }: { artefact: Artefact }) {
  return (
    <div className="p-4">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        <History className="h-3.5 w-3.5" /> Audit Trail ({artefact.audit.length})
      </div>
      <div className="relative space-y-2.5 pl-5">
        <div className="absolute left-2 top-1 bottom-1 w-px bg-border" />
        {artefact.audit.map((e, i) => <AuditRow key={e.id} e={e} index={i} />)}
      </div>
    </div>
  );
}

function AuditRow({ e, index }: { e: AuditEntry; index: number }) {
  return (
    <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(index * 0.03, 0.3) }}>
      <div className="absolute -left-[14px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary/60" />
      <div className="rounded-lg border border-border bg-card/40 p-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11.5px] font-semibold text-foreground">{AUDIT_LABEL[e.action] ?? e.action}</span>
          <span className="text-[9.5px] text-muted-foreground">{relativeTime(e.timestamp)}</span>
        </div>
        <div className="mt-0.5 text-[11px] text-foreground/85">{e.detail}</div>
        <div className="mt-0.5 flex items-center gap-2 text-[9.5px] text-muted-foreground">
          <span>{e.actor}</span>
          {e.fromVersion && e.toVersion && <span className="font-mono">v{e.fromVersion} → v{e.toVersion}</span>}
        </div>
      </div>
    </motion.div>
  );
}

function DependenciesTab({ artefact, allArtefacts }: { artefact: Artefact; allArtefacts: Artefact[] }) {
  const dependsOn = artefact.dependencies.filter((d) => d.kind === "depends-on");
  const consumedBy = artefact.dependencies.filter((d) => d.kind === "consumed-by");
  const reverse = allArtefacts.filter((a) => a.dependencies.some((d) => d.artefactId === artefact.id));
  return (
    <div className="p-4 space-y-4">
      <DepSection title="Depends On" items={dependsOn} allArtefacts={allArtefacts} emptyText="No upstream dependencies." />
      <DepSection title="Consumed By" items={consumedBy} allArtefacts={allArtefacts} emptyText="No internal consumers declared." />
      <div>
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Reverse Dependencies ({reverse.length})</div>
        {reverse.length === 0 ? <div className="text-[11.5px] text-muted-foreground">No other artefacts depend on this one.</div> : (
          <div className="space-y-1.5">
            {reverse.map((r) => <DepRow key={r.id} a={r} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function DepSection({ title, items, allArtefacts, emptyText }: { title: string; items: Artefact["dependencies"]; allArtefacts: Artefact[]; emptyText: string }) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title} ({items.length})</div>
      {items.length === 0 ? <div className="text-[11.5px] text-muted-foreground">{emptyText}</div> : (
        <div className="space-y-1.5">
          {items.map((d, i) => {
            const a = allArtefacts.find((x) => x.id === d.artefactId);
            if (!a) return <div key={i} className="text-[11px] text-muted-foreground">{d.artefactId} (missing)</div>;
            return <DepRow key={d.artefactId + i} a={a} />;
          })}
        </div>
      )}
    </div>
  );
}

function DepRow({ a }: { a: Artefact }) {
  const meta = ARTEFACT_META[a.kind];
  const Icon = meta.icon;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card/40 p-2.5">
      <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ background: `${a.color}22`, color: a.color }}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] font-semibold text-foreground">{a.name}</div>
        <div className="text-[10px] text-muted-foreground">{meta.label} · v{a.version} · {a.lifecycle}</div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}

function ShadowTab({ artefact, store }: { artefact: Artefact; store: GovernanceStore }) {
  return (
    <div className="p-4 space-y-4">
      <div className="rounded-lg border border-border bg-card/40 p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[12.5px] font-semibold text-foreground">Shadow Mode</div>
            <div className="text-[10.5px] text-muted-foreground">Run this artefact alongside the champion without affecting live decisions.</div>
          </div>
          <Button size="sm" variant={artefact.shadowMode ? "destructive" : "default"} onClick={() => store.toggleShadow(artefact.id, artefact.owner, !artefact.shadowMode)}>
            {artefact.shadowMode ? <><EyeOff className="h-3.5 w-3.5" /> Stop</> : <><Eye className="h-3.5 w-3.5" /> Start</>}
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge variant={artefact.shadowMode ? "success" : "muted"}>{artefact.shadowMode ? "Running" : "Inactive"}</Badge>
          {artefact.champion && <Badge variant="default" className="text-[9px]"><Crown className="h-2.5 w-2.5" /> Champion</Badge>}
          {artefact.challenger && <Badge variant="warning" className="text-[9px]"><Swords className="h-2.5 w-2.5" /> Challenger</Badge>}
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card/40 p-3">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Champion / Challenger</div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={artefact.champion ? "default" : "outline"} onClick={() => store.setChampion(artefact.id, artefact.owner, !artefact.champion)}>
            <Crown className="h-3.5 w-3.5" /> {artefact.champion ? "Remove Champion" : "Mark Champion"}
          </Button>
          <Button size="sm" variant={artefact.challenger ? "default" : "outline"} onClick={() => store.setChallenger(artefact.id, artefact.owner, !artefact.challenger)}>
            <Swords className="h-3.5 w-3.5" /> {artefact.challenger ? "Remove Challenger" : "Mark Challenger"}
          </Button>
        </div>
      </div>
      <div>
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Shadow Runs ({artefact.shadowRuns.length})</div>
        {artefact.shadowRuns.length === 0 ? <div className="text-[11.5px] text-muted-foreground">No shadow runs recorded. Start shadow mode to begin.</div> : (
          <div className="space-y-2">
            {artefact.shadowRuns.map((r, i) => <ShadowRunRow key={r.id} r={r} index={i} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function ShadowRunRow({ r, index }: { r: ShadowRun; index: number }) {
  const agreementRate = r.samples > 0 ? (r.agreements / r.samples) * 100 : 0;
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="rounded-lg border border-border bg-card/40 p-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] text-muted-foreground">{r.id}</span>
        <Badge variant={r.status === "running" ? "success" : r.status === "completed" ? "default" : "muted"} className="text-[9px]">{r.status}</Badge>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-2 text-center">
        <MiniStat label="Samples" value={r.samples.toLocaleString()} />
        <MiniStat label="Agreement" value={`${agreementRate.toFixed(1)}%`} />
        <MiniStat label="Disagree" value={r.disagreements.toLocaleString()} />
        <MiniStat label="Drift" value={r.drift.toFixed(3)} />
      </div>
      {(r.championDecision || r.challengerDecision) && (
        <div className="mt-2 flex items-center gap-2 text-[10.5px] text-muted-foreground">
          <span>Champion: <span className="font-semibold text-foreground">{r.championDecision ?? "—"}</span></span>
          <span>·</span>
          <span>Challenger: <span className="font-semibold text-foreground">{r.challengerDecision ?? "—"}</span></span>
        </div>
      )}
      <div className="mt-1.5 text-[9.5px] text-muted-foreground">Started {relativeTime(r.startedAt)}{r.endedAt ? ` · ended ${relativeTime(r.endedAt)}` : ""}</div>
    </motion.div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-card/40 px-1.5 py-1 text-center">
      <div className="text-[8px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-mono text-[11px] font-bold tabular-nums text-foreground">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground">{value}</span>
    </div>
  );
}
