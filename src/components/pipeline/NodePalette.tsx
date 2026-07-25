import { motion } from "framer-motion";
import { NODE_TYPES, CATEGORY_META, type NodeCategory } from "@/lib/pipelineData";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface NodePaletteProps {
  onAddNode: (type: string) => void;
}

export function NodePalette({ onAddNode }: NodePaletteProps) {
  const [query, setQuery] = useState("");
  const filtered = NODE_TYPES.filter((n) => n.label.toLowerCase().includes(query.toLowerCase()));

  const grouped = (Object.keys(CATEGORY_META) as NodeCategory[]).map((cat) => ({
    cat,
    nodes: filtered.filter((n) => n.category === cat),
  })).filter((g) => g.nodes.length > 0);

  return (
    <div className="flex h-full w-[240px] shrink-0 flex-col border-r border-border bg-card/60 backdrop-blur-xl">
      <div className="border-b border-border p-3">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search nodes…"
          className="h-8 w-full rounded-md border border-border bg-background px-3 text-[12px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto p-2">
        {grouped.map((g) => (
          <div key={g.cat} className="mb-3">
            <div className="px-2 pb-1.5 pt-2 text-[9.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground/70">
              {CATEGORY_META[g.cat].label}
            </div>
            <div className="space-y-1">
              {g.nodes.map((n, i) => (
                <motion.button
                  key={n.type}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => onAddNode(n.type)}
                  draggable
                  onDragStart={(e) => {
                    const ev = e as unknown as React.DragEvent;
                    ev.dataTransfer.setData("application/pipeline-node", n.type);
                    ev.dataTransfer.effectAllowed = "move";
                  }}
                  className={cn(
                    "group flex w-full items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2 text-left transition-all",
                    "hover:border-primary/30 hover:bg-primary/5",
                  )}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: `${n.color}22`, color: n.color }}>
                    <n.icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[11.5px] font-semibold text-foreground">{n.label}</div>
                    <div className="truncate text-[9.5px] text-muted-foreground">{n.description.split(".")[0]}</div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        ))}
        {grouped.length === 0 && (
          <div className="px-3 py-8 text-center text-[12px] text-muted-foreground">No nodes match "{query}"</div>
        )}
      </div>
      <div className="border-t border-border p-2.5 text-[9.5px] text-muted-foreground">
        Click to add · Drag onto canvas
      </div>
    </div>
  );
}
