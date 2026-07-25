import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, GitBranch, Clock, ShieldCheck, Workflow, Copy, Upload, FileCode2, CircleCheck as CheckCircle2, Circle, Circle as XCircle, ChevronRight, History, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, relativeTime } from "@/lib/utils";
import {
  ASSET_TYPE_META, APPROVAL_STATUS_TONE, LIFECYCLE_STATUS_TONE,
  type WorkspaceAsset, type AssetVersion, type ApprovalStep,
} from "@/lib/assetWorkspaceData";
import { DependencyGraph } from "./DependencyGraph";

type DrawerTab = "overview" | "versions" | "approvals" | "dependencies" | "pipelines";

const TABS: { id: DrawerTab; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: FileCode2 },
  { id: "versions", label: "Versions", icon: GitBranch },
  { id: "approvals", label: "Approvals", icon: ShieldCheck },
  { id: "dependencies", label: "Dependencies", icon: Network },
  { id: "pipelines", label: "Pipelines", icon: Workflow },
];

export function AssetDrawer({
  asset, allAssets, open, onClose, onClone, onPublish,
}: {
  asset: WorkspaceAsset | null;
  allAssets: WorkspaceAsset[];
  open: boolean;
  onClose: () => void;
  onClone: (a: WorkspaceAsset) => void;
  onPublish: (a: WorkspaceAsset) => void;
}) {
  const [tab, setTab] = useState<DrawerTab>("overview");

  return (
    <AnimatePresence>
      {open && asset && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[180]">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className="absolute right-0 top-0 flex h-full w-full max-w-[640px] flex-col border-l border-border bg-background shadow-2xl"
          >
            <DrawerHeader asset={asset} onClose={onClose} onClone={() => onClone(asset)} onPublish={() => onPublish(asset)} />
            <DrawerTabs tab={tab} setTab={setTab} asset={asset} />
            <div className="scrollbar-thin min-h-0 flex-1 overflow-auto">
              {tab === "overview" && <OverviewTab asset={asset} />}
              {tab === "versions" && <VersionsTab asset={asset} />}
              {tab === "approvals" && <ApprovalsTab asset={asset} />}
              {tab === "dependencies" && <DependenciesTab asset={asset} allAssets={allAssets} />}
              {tab === "pipelines" && <PipelinesTab asset={asset} />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DrawerHeader({ asset, onClose, onClone, onPublish }: { asset: WorkspaceAsset; onClose: () => void; onClone: () => void; onPublish: () => void }) {
  const meta = ASSET_TYPE_META[asset.type];
  const Icon = meta.icon;
  return (
    <div className="shrink-0 border-b border-border p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `${asset.color}22`, color: asset.color }}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold text-foreground">{asset.name}</h3>
          <p className="truncate text-[11.5px] text-muted-foreground">{meta.label} · {asset.version} · {asset.owner}</p>
        </div>
        <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant={APPROVAL_STATUS_TONE[asset.approvalStatus]}>{asset.approvalStatus}</Badge>
        <Badge variant={LIFECYCLE_STATUS_TONE[asset.lifecycleStatus]}>{asset.lifecycleStatus}</Badge>
        <Badge variant="outline">{asset.usedByPipelines.length} pipelines</Badge>
        {asset.tags.map((t) => <Badge key={t} variant="default" className="text-[9px]">{t}</Badge>)}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" variant="outline" className="flex-1" onClick={onClone}><Copy className="h-3.5 w-3.5" /> Clone</Button>
        <Button size="sm" className="flex-1" onClick={onPublish} disabled={asset.approvalStatus === "Published"}><Upload className="h-3.5 w-3.5" /> Publish</Button>
      </div>
    </div>
  );
}

function DrawerTabs({ tab, setTab, asset }: { tab: DrawerTab; setTab: (t: DrawerTab) => void; asset: WorkspaceAsset }) {
  const counts: Partial<Record<DrawerTab, number>> = {
    versions: asset.versions.length,
    approvals: asset.approvals.length,
    dependencies: asset.dependencies.length,
    pipelines: asset.usedByPipelines.length,
  };
  return (
    <div className="flex shrink-0 items-center gap-1 border-b border-border px-3 py-2">
      {TABS.map((t) => {
        const active = tab === t.id;
        const count = counts[t.id];
        return (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11.5px] font-semibold transition-all",
              active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
            {count != null && <span className="ml-0.5 rounded bg-muted/60 px-1 text-[9px] tabular-nums">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

function OverviewTab({ asset }: { asset: WorkspaceAsset }) {
  return (
    <div className="space-y-4 p-4">
      <p className="text-[12.5px] leading-relaxed text-foreground/85">{asset.description}</p>
      <div className="grid grid-cols-3 gap-2">
        {asset.stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card/40 p-2.5 text-center">
            <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
            <div className="mt-0.5 font-mono text-[14px] font-bold tabular-nums text-foreground">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-border bg-card/40 p-3">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Metadata</div>
        <div className="space-y-1.5 text-[12px]">
          <Row label="Asset ID" value={asset.id} />
          <Row label="Type" value={ASSET_TYPE_META[asset.type].label} />
          <Row label="Owner" value={asset.owner} />
          <Row label="Team" value={asset.team} />
          <Row label="Created" value={relativeTime(asset.createdAt)} />
          <Row label="Updated" value={relativeTime(asset.updatedAt)} />
          {asset.metadata.map((m) => <Row key={m.key} label={m.key} value={m.value} />)}
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card/40 p-3">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tags</div>
        <div className="flex flex-wrap gap-1.5">
          {asset.tags.length === 0 ? <span className="text-[11px] text-muted-foreground">No tags</span> :
            asset.tags.map((t) => <Badge key={t} variant="default" className="text-[9px]">{t}</Badge>)}
        </div>
      </div>
    </div>
  );
}

function VersionsTab({ asset }: { asset: WorkspaceAsset }) {
  return (
    <div className="p-4">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        <History className="h-3.5 w-3.5" /> Version History ({asset.versions.length})
      </div>
      <div className="relative space-y-3 pl-5">
        <div className="absolute left-2 top-1 bottom-1 w-px bg-border" />
        {asset.versions.map((v, i) => <VersionRow key={v.version + i} v={v} latest={i === 0} />)}
      </div>
    </div>
  );
}

function VersionRow({ v, latest }: { v: AssetVersion; latest: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="relative">
      <div className={cn("absolute -left-[14px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background", latest ? "bg-primary" : "bg-muted-foreground/50")} />
      <div className="rounded-lg border border-border bg-card/40 p-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[12px] font-bold text-foreground">{v.version}</span>
          <Badge variant={APPROVAL_STATUS_TONE[v.status]} className="text-[9px]">{v.status}</Badge>
        </div>
        <div className="mt-1 text-[11.5px] text-foreground/85">{v.change}</div>
        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>{v.author}</span>
          <span>·</span>
          <span>{v.date}</span>
        </div>
      </div>
    </motion.div>
  );
}

function ApprovalsTab({ asset }: { asset: WorkspaceAsset }) {
  return (
    <div className="p-4">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" /> Approval Workflow ({asset.approvals.length})
      </div>
      <div className="space-y-2">
        {asset.approvals.map((a, i) => <ApprovalRow key={a.id} a={a} index={i} />)}
      </div>
    </div>
  );
}

function ApprovalRow({ a, index }: { a: ApprovalStep; index: number }) {
  const Icon = a.status === "Approved" ? CheckCircle2 : a.status === "Rejected" ? XCircle : Circle;
  const tone = a.status === "Approved" ? "text-success" : a.status === "Rejected" ? "text-destructive" : "text-warning";
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="flex items-start gap-3 rounded-lg border border-border bg-card/40 p-3">
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", tone)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="text-[12.5px] font-semibold text-foreground">{a.step}</span>
          <Badge variant={a.status === "Approved" ? "success" : a.status === "Rejected" ? "destructive" : "warning"} className="text-[9px]">{a.status}</Badge>
        </div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">{a.approver} · {a.role}</div>
        {a.date && <div className="mt-0.5 text-[10px] text-muted-foreground">{a.date}{a.comment ? ` · "${a.comment}"` : ""}</div>}
      </div>
    </motion.div>
  );
}

function DependenciesTab({ asset, allAssets }: { asset: WorkspaceAsset; allAssets: WorkspaceAsset[] }) {
  return (
    <div className="flex flex-col">
      <div className="border-b border-border p-4 pb-3">
        <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <Network className="h-3.5 w-3.5" /> Dependency Graph
        </div>
        <p className="text-[11px] text-muted-foreground">Assets this one depends on (left) and pipelines that consume it (right).</p>
      </div>
      <div className="h-[360px] border-b border-border">
        <DependencyGraph asset={asset} allAssets={allAssets} />
      </div>
      <div className="p-4">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Linked Assets ({asset.dependencies.length})</div>
        {asset.dependencies.length === 0 ? (
          <div className="text-[11.5px] text-muted-foreground">No linked assets.</div>
        ) : (
          <div className="space-y-1.5">
            {asset.dependencies.map((d, i) => {
              const meta = ASSET_TYPE_META[d.assetType];
              const Icon = meta.icon;
              return (
                <div key={d.assetId + i} className="flex items-center gap-2 rounded-lg border border-border bg-card/40 p-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ background: `${meta.color}22`, color: meta.color }}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-semibold text-foreground">{d.assetName}</div>
                    <div className="text-[10px] text-muted-foreground">{meta.label} · {d.kind}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function PipelinesTab({ asset }: { asset: WorkspaceAsset }) {
  return (
    <div className="p-4">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        <Workflow className="h-3.5 w-3.5" /> Pipeline Consumers ({asset.usedByPipelines.length})
      </div>
      {asset.usedByPipelines.length === 0 ? (
        <div className="text-[11.5px] text-muted-foreground">This asset is not currently used by any pipeline.</div>
      ) : (
        <div className="space-y-2">
          {asset.usedByPipelines.map((p, i) => (
            <motion.div key={p.pipelineId + i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-3 rounded-lg border border-border bg-card/40 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Workflow className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-semibold text-foreground">{p.pipelineName}</div>
                <div className="text-[10.5px] text-muted-foreground">{p.nodeLabel} · {p.nodeType}</div>
              </div>
              <Badge variant="outline" className="text-[9px]">{p.nodeType}</Badge>
            </motion.div>
          ))}
        </div>
      )}
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
