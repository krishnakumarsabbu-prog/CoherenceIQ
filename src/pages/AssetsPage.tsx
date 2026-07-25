import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Filter, Boxes, Copy, Upload, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, relativeTime } from "@/lib/utils";
import {
  WORKSPACE_ASSETS, ASSET_TYPE_META, ASSET_TYPES, APPROVAL_STATUS_TONE,
  LIFECYCLE_STATUS_TONE, searchAssets, type WorkspaceAsset, type AssetType,
  type ApprovalStatus,
} from "@/lib/assetWorkspaceData";
import { AssetDrawer } from "@/components/assetworkspace/AssetDrawer";

const APPROVAL_FILTERS: (ApprovalStatus | "all")[] = ["all", "Published", "In Review", "Approved", "Draft"];

export function AssetsPage() {
  const [assets, setAssets] = useState<WorkspaceAsset[]>(WORKSPACE_ASSETS);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<AssetType | "all">("all");
  const [approval, setApproval] = useState<ApprovalStatus | "all">("all");
  const [selected, setSelected] = useState<WorkspaceAsset | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const filtered = useMemo(() => searchAssets(assets, query, type, approval), [assets, query, type, approval]);

  const stats = useMemo(() => ({
    total: assets.length,
    published: assets.filter((a) => a.approvalStatus === "Published").length,
    review: assets.filter((a) => a.approvalStatus === "In Review").length,
    types: ASSET_TYPES.length,
    reused: assets.filter((a) => a.usedByPipelines.length > 1).length,
  }), [assets]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const handleClone = (a: WorkspaceAsset) => {
    const clone: WorkspaceAsset = {
      ...a,
      id: `${a.id}-clone-${Date.now().toString(36)}`,
      name: `${a.name} (Clone)`,
      version: "draft",
      approvalStatus: "Draft",
      lifecycleStatus: "draft",
      updatedAt: new Date().toISOString(),
      versions: [{ version: "draft", author: a.owner, date: new Date().toISOString().slice(0, 10), change: "Cloned from " + a.version, status: "Draft" }],
      approvals: [{ id: `ap-${Date.now()}`, step: "Author Review", approver: a.owner, role: "Author", status: "Pending", date: null, comment: "" }],
    };
    setAssets((prev) => [clone, ...prev]);
    setSelected(null);
    showToast(`Cloned "${a.name}" to a new draft`);
  };

  const handlePublish = (a: WorkspaceAsset) => {
    const nextVersion = `v${parseInt(a.version.replace(/\D/g, "") || "1", 10) + 1}`;
    setAssets((prev) => prev.map((x) => x.id === a.id ? {
      ...x,
      approvalStatus: "Published",
      lifecycleStatus: "active",
      version: nextVersion,
      updatedAt: new Date().toISOString(),
      versions: [{ version: nextVersion, author: a.owner, date: new Date().toISOString().slice(0, 10), change: "Published to production", status: "Published" }, ...x.versions],
    } : x));
    showToast(`Published "${a.name}" as ${nextVersion}`);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-5 pt-4 lg:px-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Asset Workspace</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{stats.total} reusable assets across {stats.types} types · rule sets, models, features, datasets, policies & more</p>
        </div>
        <Button size="sm"><Plus className="h-3.5 w-3.5" /> New Asset</Button>
      </div>

      <div className="grid grid-cols-2 gap-2 border-b border-border px-5 py-2.5 sm:grid-cols-5 lg:px-6">
        <StatTile label="Total Assets" value={stats.total} icon={Boxes} color="text-primary" />
        <StatTile label="Published" value={stats.published} icon={CheckCircle2} color="text-success" />
        <StatTile label="In Review" value={stats.review} icon={Upload} color="text-warning" />
        <StatTile label="Asset Types" value={stats.types} icon={Filter} color="text-primary" />
        <StatTile label="Multi-pipeline" value={stats.reused} icon={Copy} color="text-success" />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-2.5 lg:px-6">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, tag, owner, team…"
            className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-3 text-[12px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <button
            onClick={() => setType("all")}
            className={cn("rounded-full border px-2.5 py-1 text-[10.5px] font-semibold transition-all", type === "all" ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground")}
          >All</button>
          {ASSET_TYPES.map((t) => {
            const meta = ASSET_TYPE_META[t];
            const active = type === t;
            return (
              <button
                key={t}
                onClick={() => setType(t)}
                className={cn("rounded-full border px-2.5 py-1 text-[10.5px] font-semibold transition-all", active ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground")}
              >
                <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: meta.color }} />
                {meta.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1.5">
          {APPROVAL_FILTERS.map((s) => {
            const active = approval === s;
            return (
              <button
                key={s}
                onClick={() => setApproval(s)}
                className={cn("rounded-full border px-2 py-1 text-[10px] font-semibold transition-all", active ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground")}
              >{s === "all" ? "Any Status" : s}</button>
            );
          })}
        </div>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto p-5 lg:p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((a, i) => <AssetCard key={a.id} asset={a} index={i} onClick={() => setSelected(a)} />)}
        </div>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-[13px] text-muted-foreground">No assets match your filters.</div>
        )}
      </div>

      <AssetDrawer
        asset={selected}
        allAssets={assets}
        open={!!selected}
        onClose={() => setSelected(null)}
        onClone={handleClone}
        onPublish={handlePublish}
      />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 rounded-lg border border-border bg-background px-4 py-2.5 text-[12px] font-semibold text-foreground shadow-2xl"
          >
            <CheckCircle2 className="mr-1.5 inline h-3.5 w-3.5 text-success" />{toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/40 px-3 py-2">
      <Icon className={cn("h-4 w-4", color)} />
      <div>
        <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={cn("font-mono text-[15px] font-bold tabular-nums", color)}>{value}</div>
      </div>
    </div>
  );
}

function AssetCard({ asset, index, onClick }: { asset: WorkspaceAsset; index: number; onClick: () => void }) {
  const meta = ASSET_TYPE_META[asset.type];
  const Icon = meta.icon;
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.4) }}
      onClick={onClick}
      className="glass-card glass-card-hover relative overflow-hidden p-4 text-left"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full blur-[40px]" style={{ background: `${asset.color}22` }} />
      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${asset.color}22`, color: asset.color }}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[12.5px] font-bold text-foreground">{asset.name}</div>
            <div className="font-mono text-[9.5px] text-muted-foreground">{asset.version}</div>
          </div>
        </div>
        <Badge variant={APPROVAL_STATUS_TONE[asset.approvalStatus]} className="text-[9px]">{asset.approvalStatus}</Badge>
      </div>
      <p className="relative mt-2.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{asset.description}</p>
      <div className="relative mt-3 grid grid-cols-3 gap-1.5">
        {asset.stats.slice(0, 3).map((s) => (
          <div key={s.label} className="rounded-md border border-border/60 bg-card/40 px-1.5 py-1 text-center">
            <div className="text-[8px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
            <div className="font-mono text-[11px] font-bold tabular-nums text-foreground">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="relative mt-3 flex items-center justify-between text-[9.5px] text-muted-foreground">
        <span className="truncate">{asset.owner}</span>
        <span className="flex items-center gap-1">
          <span className="rounded bg-muted/50 px-1 font-mono">{asset.usedByPipelines.length}</span>
          pipelines
        </span>
      </div>
      <div className="relative mt-2 flex flex-wrap gap-1">
        {asset.tags.slice(0, 3).map((t) => <Badge key={t} variant="outline" className="text-[8.5px]">{t}</Badge>)}
      </div>
      <div className="relative mt-2 text-[9px] text-muted-foreground">updated {relativeTime(asset.updatedAt)}</div>
    </motion.button>
  );
}
