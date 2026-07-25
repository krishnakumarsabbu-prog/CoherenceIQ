import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, X, ChevronRight, Filter } from "lucide-react";
import { PageHeader } from "@/components/shell/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, relativeTime } from "@/lib/utils";
import {
  SAMPLE_ASSETS, ASSET_KIND_META, type AssetRecord, type AssetKind,
} from "@/lib/pipelineData";

const KINDS: (AssetKind | "all")[] = [
  "all", "pipeline", "rule-set", "model", "feature-set", "graph", "temporal-profile",
  "session-validator", "replay", "copilot-agent", "dataset",
];

const STATUS_VARIANT: Record<AssetRecord["status"], "default" | "success" | "outline"> = {
  active: "success",
  draft: "default",
  archived: "outline",
};

export function AssetsPage() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<AssetKind | "all">("all");
  const [selected, setSelected] = useState<AssetRecord | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SAMPLE_ASSETS.filter((a) => {
      if (kind !== "all" && a.kind !== kind) return false;
      if (!q) return true;
      return (a.name + " " + a.description + " " + a.tags.join(" ")).toLowerCase().includes(q);
    });
  }, [query, kind]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-5 pt-4 lg:px-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Assets</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{SAMPLE_ASSETS.length} reusable assets · rule sets, models, feature sets, graphs & datasets</p>
        </div>
        <Button size="sm"><Plus className="h-3.5 w-3.5" /> New Asset</Button>
      </div>

      <div className="flex items-center gap-2 border-b border-border px-5 py-2.5 lg:px-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search assets…"
            className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-3 text-[12px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>
        <div className="hidden items-center gap-1.5 sm:flex">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          {KINDS.map((k) => {
            const active = kind === k;
            const meta = k === "all" ? null : ASSET_KIND_META[k as AssetKind];
            return (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[10.5px] font-semibold transition-all",
                  active ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {meta && <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: meta.color }} />}
                {k === "all" ? "All" : meta?.label ?? k}
              </button>
            );
          })}
        </div>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto p-5 lg:p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((a, i) => {
            const meta = ASSET_KIND_META[a.kind];
            return (
              <motion.button
                key={a.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => setSelected(a)}
                className="glass-card glass-card-hover relative overflow-hidden p-4 text-left"
              >
                <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full blur-[40px]" style={{ background: `${meta.color}22` }} />
                <div className="relative flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${meta.color}22`, color: meta.color }}>
                      <meta.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[12.5px] font-bold text-foreground">{a.name}</div>
                      <div className="font-mono text-[9.5px] text-muted-foreground">{a.version}</div>
                    </div>
                  </div>
                  <Badge variant={STATUS_VARIANT[a.status]} className="text-[9px]">{a.status}</Badge>
                </div>
                <p className="relative mt-2.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{a.description}</p>
                <div className="relative mt-3 grid grid-cols-3 gap-1.5">
                  {a.stats.map((s) => (
                    <div key={s.label} className="rounded-md border border-border/60 bg-card/40 px-1.5 py-1 text-center">
                      <div className="text-[8px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
                      <div className="font-mono text-[11px] font-bold tabular-nums text-foreground">{s.value}</div>
                    </div>
                  ))}
                </div>
                <div className="relative mt-3 flex items-center justify-between text-[9.5px] text-muted-foreground">
                  <span>{a.owner}</span>
                  <span>updated {relativeTime(a.updatedAt)}</span>
                </div>
              </motion.button>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-[13px] text-muted-foreground">No assets match your filters.</div>
        )}
      </div>

      <AssetDrawer asset={selected} open={!!selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function AssetDrawer({ asset, open, onClose }: { asset: AssetRecord | null; open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && asset && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[180]">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className="absolute right-0 top-0 flex h-full w-full max-w-[480px] flex-col border-l border-border bg-background shadow-2xl"
          >
            {(() => {
              const meta = ASSET_KIND_META[asset.kind];
              return (
                <>
                  <div className="shrink-0 border-b border-border p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `${meta.color}22`, color: meta.color }}>
                        <meta.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-[15px] font-semibold text-foreground">{asset.name}</h3>
                        <p className="truncate text-[11.5px] text-muted-foreground">{meta.label} · {asset.version}</p>
                      </div>
                      <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"><X className="h-4 w-4" /></button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Badge variant={STATUS_VARIANT[asset.status]}>{asset.status}</Badge>
                      <Badge variant="outline">{asset.usedByPipelines} pipelines</Badge>
                      {asset.tags.map((t) => <Badge key={t} variant="default" className="text-[9px]">{t}</Badge>)}
                    </div>
                  </div>
                  <div className="scrollbar-thin min-h-0 flex-1 overflow-auto p-4">
                    <p className="text-[12.5px] leading-relaxed text-foreground/85">{asset.description}</p>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {asset.stats.map((s) => (
                        <div key={s.label} className="rounded-lg border border-border bg-card/40 p-2.5 text-center">
                          <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
                          <div className="mt-0.5 font-mono text-[14px] font-bold tabular-nums text-foreground">{s.value}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 rounded-lg border border-border bg-card/40 p-3">
                      <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Metadata</div>
                      <div className="space-y-1.5 text-[12px]">
                        <Row label="Asset ID" value={asset.id} />
                        <Row label="Owner" value={asset.owner} />
                        <Row label="Updated" value={relativeTime(asset.updatedAt)} />
                        <Row label="Kind" value={meta.label} />
                      </div>
                    </div>
                    <div className="mt-4 rounded-lg border border-border bg-card/40 p-3">
                      <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Used by pipelines</div>
                      <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                        <ChevronRight className="h-3.5 w-3.5" /> {asset.usedByPipelines} pipeline(s) reference this asset
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 border-t border-border p-3">
                    <Button size="sm" variant="outline" className="flex-1">Open in editor</Button>
                    <Button size="sm" className="flex-1">Add to pipeline</Button>
                  </div>
                </>
              );
            })()}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
