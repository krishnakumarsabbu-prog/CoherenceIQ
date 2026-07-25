import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, Boxes, CircleCheck as CheckCircle2, FlaskConical, Beaker, X, ArrowRight, ShieldCheck, TriangleAlert as AlertTriangle, Activity, Cpu, FileOutput } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, relativeTime } from "@/lib/utils";
import {
  NODE_REGISTRY, REGISTRY_CATEGORY_META, REGISTRY_CATEGORY_ORDER,
  searchRegistry, registryStats,
  type NodeRegistryEntry, type RegistryCategory, type PortSchema, type ConfigFieldDef,
} from "@/lib/nodeRegistry";

const STATUS_META: Record<NodeRegistryEntry["status"], { label: string; icon: React.ElementType; color: string; variant: "success" | "warning" | "muted" }> = {
  stable: { label: "Stable", icon: CheckCircle2, color: "text-success", variant: "success" },
  beta: { label: "Beta", icon: FlaskConical, color: "text-warning", variant: "warning" },
  experimental: { label: "Experimental", icon: Beaker, color: "text-muted-foreground", variant: "muted" },
};

export function NodeRegistryPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<RegistryCategory | "all">("all");
  const [status, setStatus] = useState<NodeRegistryEntry["status"] | "all">("all");
  const [selected, setSelected] = useState<NodeRegistryEntry | null>(null);

  const filtered = useMemo(() => searchRegistry(query, category, status), [query, category, status]);
  const stats = useMemo(() => registryStats(), []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-5 pt-4 lg:px-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Node Registry</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {stats.total} reusable pipeline nodes across {stats.categories} categories · every capability as a composable node
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 border-b border-border px-5 py-2.5 sm:grid-cols-5 lg:px-6">
        <StatTile label="Total Nodes" value={stats.total} icon={Boxes} color="text-primary" />
        <StatTile label="Stable" value={stats.stable} icon={CheckCircle2} color="text-success" />
        <StatTile label="Beta" value={stats.beta} icon={FlaskConical} color="text-warning" />
        <StatTile label="Experimental" value={stats.experimental} icon={Beaker} color="text-muted-foreground" />
        <StatTile label="Categories" value={stats.categories} icon={Filter} color="text-primary" />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-2.5 lg:px-6">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, type, tag…"
            className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-3 text-[12px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <button
            onClick={() => setCategory("all")}
            className={cn("rounded-full border px-2.5 py-1 text-[10.5px] font-semibold transition-all", category === "all" ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground")}
          >All</button>
          {REGISTRY_CATEGORY_ORDER.map((cat) => {
            const meta = REGISTRY_CATEGORY_META[cat];
            const active = category === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={cn("rounded-full border px-2.5 py-1 text-[10.5px] font-semibold transition-all", active ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground")}
              >
                <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: meta.color }} />
                {meta.label.replace(" Nodes", "")}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1.5">
          {(["all", "stable", "beta", "experimental"] as const).map((s) => {
            const active = status === s;
            return (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={cn("rounded-full border px-2 py-1 text-[10px] font-semibold capitalize transition-all", active ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground")}
              >{s === "all" ? "Any Status" : s}</button>
            );
          })}
        </div>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto p-5 lg:p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((n, i) => <RegistryCard key={n.id} node={n} index={i} onClick={() => setSelected(n)} />)}
        </div>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-[13px] text-muted-foreground">No nodes match your filters.</div>
        )}
      </div>

      <NodeDetailDrawer node={selected} open={!!selected} onClose={() => setSelected(null)} />
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

function RegistryCard({ node, index, onClick }: { node: NodeRegistryEntry; index: number; onClick: () => void }) {
  const catMeta = REGISTRY_CATEGORY_META[node.category];
  const statusMeta = STATUS_META[node.status];
  const Icon = node.icon;
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.4) }}
      onClick={onClick}
      className="glass-card glass-card-hover relative overflow-hidden p-4 text-left"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full blur-[40px]" style={{ background: `${node.color}22` }} />
      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${node.color}22`, color: node.color }}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[12.5px] font-bold text-foreground">{node.label}</div>
            <div className="font-mono text-[9.5px] text-muted-foreground">{node.type}</div>
          </div>
        </div>
        <Badge variant={statusMeta.variant} className="text-[9px]">{statusMeta.label}</Badge>
      </div>
      <p className="relative mt-2.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{node.description}</p>
      <div className="relative mt-3 flex items-center gap-3 text-[9.5px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: catMeta.color }} />
          {catMeta.label.replace(" Nodes", "")}
        </span>
        <span>{node.ports.filter((p) => p.kind === "input").length} in · {node.ports.filter((p) => p.kind === "output").length} out</span>
        <span>{node.config.length} config</span>
      </div>
      <div className="relative mt-2 flex flex-wrap gap-1">
        {node.tags.slice(0, 3).map((t) => <Badge key={t} variant="outline" className="text-[8.5px]">{t}</Badge>)}
      </div>
      <div className="relative mt-2 text-[9px] text-muted-foreground">v{node.version} · {relativeTime(node.updatedAt)}</div>
    </motion.button>
  );
}

function NodeDetailDrawer({ node, open, onClose }: { node: NodeRegistryEntry | null; open: boolean; onClose: () => void }) {
  if (!node) return null;
  const catMeta = REGISTRY_CATEGORY_META[node.category];
  const statusMeta = STATUS_META[node.status];
  const Icon = node.icon;
  const inputs = node.ports.filter((p) => p.kind === "input");
  const outputs = node.ports.filter((p) => p.kind === "output");

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: 420, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 420, opacity: 0 }}
          transition={{ type: "spring", damping: 32, stiffness: 300 }}
          className="fixed inset-y-0 right-0 z-[150] flex h-full w-full max-w-[460px] flex-col border-l border-border bg-card/95 backdrop-blur-xl shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: `${node.color}22`, color: node.color }}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[15px] font-bold text-foreground">{node.label}</div>
                <div className="font-mono text-[10px] text-muted-foreground">{node.type}</div>
              </div>
            </div>
            <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-4">
            <p className="text-[12px] leading-relaxed text-muted-foreground">{node.description}</p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge variant="default">
                <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full" style={{ background: catMeta.color }} />
                {catMeta.label}
              </Badge>
              <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
              <Badge variant="outline">v{node.version}</Badge>
              <Badge variant="outline">{node.author}</Badge>
            </div>

            {/* Ports */}
            <SectionTitle icon={ArrowRight} title="Input / Output Schema" />
            <div className="space-y-3">
              {inputs.length > 0 && (
                <PortGroup label="Inputs" ports={inputs} accent="#0ea5e9" />
              )}
              {outputs.length > 0 && (
                <PortGroup label="Outputs" ports={outputs} accent="#84cc16" />
              )}
            </div>

            {/* Configuration */}
            <SectionTitle icon={Cpu} title="Configuration" />
            <div className="space-y-2">
              {node.config.map((f) => <ConfigRow key={f.key} field={f} />)}
            </div>

            {/* Validation */}
            <SectionTitle icon={ShieldCheck} title="Validation Rules" />
            <div className="space-y-1.5">
              {node.validation.map((v, i) => (
                <div key={i} className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/30 px-2.5 py-2 text-[11px]">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-warning" />
                  <div>
                    <span className="font-mono text-[10px] text-foreground">{v.field}</span>
                    <span className="ml-1.5 rounded bg-muted px-1 py-0.5 font-mono text-[9px] text-muted-foreground">{v.rule}</span>
                    <div className="mt-0.5 text-muted-foreground">{v.message}</div>
                  </div>
                </div>
              ))}
              {node.validation.length === 0 && (
                <div className="rounded-md border border-dashed border-border px-3 py-3 text-center text-[11px] text-muted-foreground">
                  No validation rules defined.
                </div>
              )}
            </div>

            {/* Metrics */}
            <SectionTitle icon={Activity} title="Execution Metrics" />
            <div className="grid grid-cols-2 gap-2">
              {node.metrics.map((m) => (
                <div key={m.key} className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                  <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{m.label}</div>
                  <div className="mt-0.5 flex items-baseline gap-1">
                    <span className="font-mono text-[11px] font-bold text-foreground">{m.key}</span>
                    <span className="text-[9px] text-muted-foreground">{m.unit}</span>
                  </div>
                  <div className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{m.description}</div>
                </div>
              ))}
            </div>

            {/* Explainability */}
            <SectionTitle icon={FileOutput} title="Explainability" />
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-center gap-1.5">
                <span className="rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">{node.explainability.method}</span>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-foreground">{node.explainability.description}</p>
              <div className="mt-2">
                <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Outputs</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {node.explainability.outputs.map((o) => (
                    <span key={o} className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[9.5px] text-foreground">{o}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="mt-4 flex flex-wrap gap-1">
              {node.tags.map((t) => <Badge key={t} variant="outline" className="text-[9px]">{t}</Badge>)}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <div className="text-[10px] text-muted-foreground">Updated {relativeTime(node.updatedAt)}</div>
            <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="mb-2 mt-5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
      <Icon className="h-3 w-3" /> {title}
    </div>
  );
}

function PortGroup({ label, ports, accent }: { label: string; ports: PortSchema[]; accent: string }) {
  return (
    <div>
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: accent }}>{label}</div>
      <div className="space-y-1.5">
        {ports.map((p) => (
          <div key={p.name} className="rounded-md border border-border/60 bg-muted/20 px-2.5 py-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold text-foreground">{p.name}</span>
              {p.description && <span className="text-[9.5px] text-muted-foreground">{p.description}</span>}
            </div>
            <div className="mt-1.5 space-y-1">
              {p.fields.map((f) => (
                <div key={f.name} className="flex items-baseline gap-1.5 text-[10.5px]">
                  <span className="font-mono text-foreground">{f.name}</span>
                  <span className="rounded bg-muted px-1 py-0.5 font-mono text-[9px] text-muted-foreground">{f.type}</span>
                  {f.required && <span className="text-[9px] font-bold text-destructive">required</span>}
                  {f.enum && <span className="text-[9px] text-muted-foreground">{f.enum.join("|")}</span>}
                  {f.unit && <span className="text-[9px] text-muted-foreground">{f.unit}</span>}
                  {f.description && <span className="text-[9.5px] text-muted-foreground">— {f.description}</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConfigRow({ field }: { field: ConfigFieldDef }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/20 px-2.5 py-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] font-bold text-foreground">{field.key}</span>
        <div className="flex items-center gap-1">
          <span className="rounded bg-muted px-1 py-0.5 font-mono text-[9px] text-muted-foreground">{field.type}</span>
          {field.required && <span className="text-[9px] font-bold text-destructive">required</span>}
        </div>
      </div>
      {field.description && <div className="mt-0.5 text-[10px] text-muted-foreground">{field.description}</div>}
      <div className="mt-1 flex flex-wrap gap-1.5 text-[9.5px] text-muted-foreground">
        <span>default: <span className="font-mono text-foreground">{String(field.default)}</span></span>
        {field.enum && <span>options: {field.enum.join(", ")}</span>}
        {field.min !== undefined && <span>min: {field.min}</span>}
        {field.max !== undefined && <span>max: {field.max}</span>}
        {field.unit && <span>unit: {field.unit}</span>}
        {field.group && <span className="rounded bg-muted px-1">{field.group}</span>}
      </div>
    </div>
  );
}
