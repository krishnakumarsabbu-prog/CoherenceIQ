import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Blocks, Search, Database, Layers3, Workflow, Cpu, Activity, GitBranch, ShieldCheck, Gauge, Boxes } from "lucide-react";
import { NODE_TYPES, NODE_TYPE_MAP, CATEGORY_META, type NodeCategory } from "@/lib/pipelineData";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<NodeCategory, React.ElementType> = {
  source: Database,
  intelligence: Layers3,
  model: Cpu,
  decision: GitBranch,
  output: Activity,
  governance: ShieldCheck,
  flow: Workflow,
};

export function PipelineComponentsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<NodeCategory | "all">("all");

  const filtered = useMemo(() => {
    let list = NODE_TYPES;
    if (category !== "all") list = list.filter((n) => n.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((n) => n.label.toLowerCase().includes(q) || n.description.toLowerCase().includes(q) || n.type.includes(q));
    }
    return list;
  }, [search, category]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const n of NODE_TYPES) map[n.category] = (map[n.category] ?? 0) + 1;
    return map;
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-5 pt-5 lg:px-6">
        <div className="flex items-center gap-2">
          <Blocks className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Pipeline Components</h1>
        </div>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          {NODE_TYPES.length} reusable nodes · drag directly into Pipeline Studio · {Object.keys(counts).length} categories
        </p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Category sidebar */}
        <div className="w-[200px] shrink-0 overflow-y-auto border-r border-border p-3">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Categories</div>
          <button
            onClick={() => setCategory("all")}
            className={cn(
              "mb-1 flex w-full items-center justify-between rounded-md px-2.5 py-2 text-[12px] font-medium transition-colors",
              category === "all" ? "bg-primary/15 text-primary" : "text-foreground hover:bg-accent/40",
            )}
          >
            <span>All Components</span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] tabular-nums">{NODE_TYPES.length}</span>
          </button>
          {(Object.keys(CATEGORY_META) as NodeCategory[]).map((cat) => {
            const meta = CATEGORY_META[cat];
            const Icon = CATEGORY_ICONS[cat];
            return (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={cn(
                  "mb-1 flex w-full items-center justify-between rounded-md px-2.5 py-2 text-[12px] font-medium transition-colors",
                  category === cat ? "bg-primary/15 text-primary" : "text-foreground hover:bg-accent/40",
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
                  <span>{meta.label}</span>
                </div>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] tabular-nums">{counts[cat] ?? 0}</span>
              </button>
            );
          })}
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto p-5 lg:p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search components by name, type, or description..."
                className="h-9 pl-9 text-[13px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((node, i) => {
              const meta = CATEGORY_META[node.category];
              return (
                <div
                  key={node.type}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/pipeline-node", node.type);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  className="cursor-grab active:cursor-grabbing"
                >
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="glass-card glass-card-hover group p-4"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: `${node.color}22`, color: node.color }}
                    >
                      <node.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[13px] font-bold text-foreground">{node.label}</h3>
                      <Badge variant="outline" className="mt-1 text-[9px]" style={{ color: meta.color, borderColor: `${meta.color}40` }}>
                        {meta.label}
                      </Badge>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{node.description}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2">
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Boxes className="h-3 w-3" /> {node.inputs} in</span>
                      <span className="flex items-center gap-1"><Gauge className="h-3 w-3" /> {node.outputs} out</span>
                    </div>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">{node.type}</code>
                  </div>
                </motion.div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Search className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-[13px]">No components match "{search}".</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
