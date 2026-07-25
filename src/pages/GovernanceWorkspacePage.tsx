import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Filter, Crown, Swords, Eye, History, CircleCheck as CheckCircle2, Gavel, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { cn, relativeTime } from "@/lib/utils";
import {
  ARTEFACT_META, ARTEFACT_KINDS, LIFECYCLE_TONE, searchArtefacts,
  type Artefact, type ArtefactKind, type LifecycleState,
} from "@/lib/governanceData";
import { useGovernanceStore, useGovernanceStats } from "@/lib/governanceStore";
import { ArtefactDrawer } from "@/components/governance/ArtefactDrawer";
import { GovernanceDashboards } from "@/components/governance/GovernanceDashboards";

type View = "registries" | "dashboards";
const LIFECYCLES: (LifecycleState | "all")[] = ["all", "Draft", "Review", "Approved", "Deprecated"];

export function GovernanceWorkspacePage() {
  const store = useGovernanceStore();
  const [view, setView] = useState<View>("registries");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<ArtefactKind | "all">("all");
  const [lifecycle, setLifecycle] = useState<LifecycleState | "all">("all");
  const [selected, setSelected] = useState<Artefact | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const filtered = useMemo(() => searchArtefacts(store.artefacts, query, kind, lifecycle), [store.artefacts, query, kind, lifecycle]);
  const stats = useGovernanceStats(store.artefacts);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  const handleCreate = (input: { name: string; kind: ArtefactKind; description: string; owner: string; team: string; tags: string[] }) => {
    const art = store.create({ ...input, color: ARTEFACT_META[input.kind].color });
    setShowCreate(false);
    setSelected(art);
    showToast(`Created "${art.name}" as draft`);
  };

  const selectedLive = selected ? store.artefacts.find((a) => a.id === selected.id) ?? null : null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-5 pt-4 lg:px-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Governance Workspace</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {stats.total} governed artefacts across {ARTEFACT_KINDS.length} registries · versioning, approvals, audit, rollback, shadow & champion/challenger
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-border p-0.5">
            <button onClick={() => setView("registries")} className={cn("flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[11.5px] font-semibold transition-all", view === "registries" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}>
              <Gavel className="h-3.5 w-3.5" /> Registries
            </button>
            <button onClick={() => setView("dashboards")} className={cn("flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[11.5px] font-semibold transition-all", view === "dashboards" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}>
              <LayoutDashboard className="h-3.5 w-3.5" /> Dashboards
            </button>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-3.5 w-3.5" /> New Artefact</Button>
        </div>
      </div>

      {view === "dashboards" ? (
        <div className="scrollbar-thin flex-1 overflow-auto p-5 lg:p-6">
          <GovernanceDashboards artefacts={store.artefacts} />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-2.5 lg:px-6">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, tag, owner, team, version…"
                className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-3 text-[12px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
            </div>
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <button onClick={() => setKind("all")} className={cn("rounded-full border px-2.5 py-1 text-[10.5px] font-semibold transition-all", kind === "all" ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>All</button>
              {ARTEFACT_KINDS.map((k) => {
                const meta = ARTEFACT_META[k];
                const active = kind === k;
                return (
                  <button key={k} onClick={() => setKind(k)} className={cn("rounded-full border px-2.5 py-1 text-[10.5px] font-semibold transition-all", active ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>
                    <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: meta.color }} />
                    {meta.labelPlural}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-1.5">
              {LIFECYCLES.map((s) => {
                const active = lifecycle === s;
                return (
                  <button key={s} onClick={() => setLifecycle(s)} className={cn("rounded-full border px-2 py-1 text-[10px] font-semibold transition-all", active ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>
                    {s === "all" ? "Any State" : s}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="scrollbar-thin flex-1 overflow-y-auto p-5 lg:p-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filtered.map((a, i) => <ArtefactCard key={a.id} artefact={a} index={i} onClick={() => setSelected(a)} />)}
            </div>
            {filtered.length === 0 && <div className="py-16 text-center text-[13px] text-muted-foreground">No artefacts match your filters.</div>}
          </div>
        </>
      )}

      <ArtefactDrawer artefact={selectedLive} allArtefacts={store.artefacts} store={store} open={!!selectedLive} onClose={() => setSelected(null)} />

      <CreateArtefactModal open={showCreate} onClose={() => setShowCreate(false)} onCreate={handleCreate} />

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 rounded-lg border border-border bg-background px-4 py-2.5 text-[12px] font-semibold text-foreground shadow-2xl">
            <CheckCircle2 className="mr-1.5 inline h-3.5 w-3.5 text-success" />{toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ArtefactCard({ artefact, index, onClick }: { artefact: Artefact; index: number; onClick: () => void }) {
  const meta = ARTEFACT_META[artefact.kind];
  const Icon = meta.icon;
  return (
    <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.03, 0.4) }}
      onClick={onClick} className="glass-card glass-card-hover relative overflow-hidden p-4 text-left">
      <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full blur-[40px]" style={{ background: `${artefact.color}22` }} />
      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${artefact.color}22`, color: artefact.color }}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[12.5px] font-bold text-foreground">{artefact.name}</div>
            <div className="font-mono text-[9.5px] text-muted-foreground">v{artefact.version}</div>
          </div>
        </div>
        <Badge variant={LIFECYCLE_TONE[artefact.lifecycle]} className="text-[9px]">{artefact.lifecycle}</Badge>
      </div>
      <p className="relative mt-2.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{artefact.description}</p>
      <div className="relative mt-3 grid grid-cols-3 gap-1.5">
        {artefact.stats.slice(0, 3).map((s) => (
          <div key={s.label} className="rounded-md border border-border/60 bg-card/40 px-1.5 py-1 text-center">
            <div className="text-[8px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
            <div className="font-mono text-[11px] font-bold tabular-nums text-foreground">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="relative mt-3 flex flex-wrap items-center gap-1.5 text-[9.5px] text-muted-foreground">
        <span className="truncate">{artefact.owner}</span>
        <span>·</span>
        <span className="truncate">{artefact.team}</span>
      </div>
      <div className="relative mt-2 flex flex-wrap gap-1">
        {artefact.champion && <Badge variant="default" className="text-[8.5px]"><Crown className="h-2.5 w-2.5" /> Champion</Badge>}
        {artefact.challenger && <Badge variant="warning" className="text-[8.5px]"><Swords className="h-2.5 w-2.5" /> Challenger</Badge>}
        {artefact.shadowMode && <Badge variant="secondary" className="text-[8.5px]"><Eye className="h-2.5 w-2.5" /> Shadow</Badge>}
        {artefact.tags.slice(0, 2).map((t) => <Badge key={t} variant="outline" className="text-[8.5px]">{t}</Badge>)}
      </div>
      <div className="relative mt-2 flex items-center gap-2 text-[9px] text-muted-foreground">
        <History className="h-3 w-3" /> updated {relativeTime(artefact.updatedAt)}
      </div>
    </motion.button>
  );
}

function CreateArtefactModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (i: { name: string; kind: ArtefactKind; description: string; owner: string; team: string; tags: string[] }) => void }) {
  const [name, setName] = useState("");
  const [artKind, setArtKind] = useState<ArtefactKind>("rule");
  const [description, setDescription] = useState("");
  const [owner, setOwner] = useState("Maya Chen");
  const [team, setTeam] = useState("governance-team");
  const [tags, setTags] = useState("");
  const submit = () => {
    if (!name.trim()) return;
    onCreate({ name: name.trim(), kind: artKind, description: description.trim() || "New governed artefact.", owner, team, tags: tags.split(",").map((t) => t.trim()).filter(Boolean) });
    setName(""); setDescription(""); setTags("");
  };
  return (
    <Modal open={open} onClose={onClose} className="max-w-xl">
      <div className="p-5">
        <h3 className="text-[15px] font-semibold text-foreground">New Governed Artefact</h3>
        <p className="mt-0.5 text-[11.5px] text-muted-foreground">Register a new artefact with semantic versioning and a draft lifecycle.</p>
        <div className="mt-4 space-y-3">
          <Field label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Velocity Rule Set v2"
              className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-[12px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
          </Field>
          <Field label="Registry">
            <div className="flex flex-wrap gap-1.5">
              {ARTEFACT_KINDS.map((k) => {
                const meta = ARTEFACT_META[k];
                const active = artKind === k;
                return (
                  <button key={k} onClick={() => setArtKind(k)} className={cn("flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10.5px] font-semibold transition-all", active ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>
                    <meta.icon className="h-3 w-3" style={{ color: meta.color }} /> {meta.labelPlural}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Description">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Short description…"
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-[12px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Owner"><input value={owner} onChange={(e) => setOwner(e.target.value)} className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-[12px] text-foreground focus:border-primary focus:outline-none" /></Field>
            <Field label="Team"><input value={team} onChange={(e) => setTeam(e.target.value)} className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-[12px] text-foreground focus:border-primary focus:outline-none" /></Field>
          </div>
          <Field label="Tags (comma-separated)"><input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="production, rules"
            className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-[12px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" /></Field>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={!name.trim()}><Plus className="h-3.5 w-3.5" /> Create Draft</Button>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}
