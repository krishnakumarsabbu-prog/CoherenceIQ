import { motion, AnimatePresence } from "framer-motion";
import { X, Settings2, Play, Trash2, ChevronRight } from "lucide-react";
import { NODE_TYPE_MAP, type PipelineNode } from "@/lib/pipelineData";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface NodeConfigPanelProps {
  node: PipelineNode | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<PipelineNode["data"]>) => void;
  onDelete: (id: string) => void;
}

export function NodeConfigPanel({ node, open, onClose, onUpdate, onDelete }: NodeConfigPanelProps) {
  const def = node ? NODE_TYPE_MAP[node.type] : null;
  return (
    <AnimatePresence>
      {open && node && def && (
        <motion.div
          initial={{ x: 360, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 360, opacity: 0 }}
          transition={{ type: "spring", damping: 32, stiffness: 300 }}
          className="flex h-full w-[340px] shrink-0 flex-col border-l border-border bg-card/80 backdrop-blur-xl"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${def.color}22`, color: def.color }}>
                <def.icon className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[13px] font-bold text-foreground">{node.data.label}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{def.label}</div>
              </div>
            </div>
            <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
            <p className="mb-4 text-[12px] leading-relaxed text-muted-foreground">{def.description}</p>

            <div className="mb-4 flex flex-wrap gap-1.5">
              <Badge variant="default">{def.category}</Badge>
              <Badge variant="outline">{def.inputs} in</Badge>
              <Badge variant="outline">{def.outputs} out</Badge>
            </div>

            <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <Settings2 className="h-3 w-3" /> Configuration
            </div>
            <div className="space-y-2.5">
              {Object.entries(node.data.config).map(([key, value]) => (
                <ConfigField
                  key={key}
                  k={key}
                  value={value}
                  onChange={(v) => onUpdate(node.id, { config: { ...node.data.config, [key]: v } })}
                />
              ))}
            </div>

            {node.data.assetRef && (
              <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Linked Asset</div>
                <div className="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-foreground">
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />{node.data.assetRef}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 border-t border-border p-3">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => onDelete(node.id)}>
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </Button>
            <Button size="sm" className="flex-1">
              <Play className="h-3.5 w-3.5" /> Run node
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ConfigField({ k, value, onChange }: { k: string; value: unknown; onChange: (v: unknown) => void }) {
  const isBool = typeof value === "boolean";
  const isNum = typeof value === "number";
  const isArr = Array.isArray(value);
  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{k}</label>
      {isBool ? (
        <button
          onClick={() => onChange(!value)}
          className={cn("flex h-8 w-full items-center justify-between rounded-md border border-border px-3 text-[12px]", value ? "bg-primary/10 text-primary" : "text-muted-foreground")}
        >
          <span>{value ? "true" : "false"}</span>
          <span className={cn("relative h-4 w-7 rounded-full transition-colors", value ? "bg-primary" : "bg-muted")}>
            <span className={cn("absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all", value ? "left-3.5" : "left-0.5")} />
          </span>
        </button>
      ) : isArr ? (
        <input
          value={value.join(", ")}
          onChange={(e) => onChange(e.target.value.split(",").map((s) => s.trim()))}
          className="h-8 w-full rounded-md border border-border bg-background px-3 font-mono text-[11px] text-foreground focus:border-primary focus:outline-none"
        />
      ) : (
        <input
          type={isNum ? "number" : "text"}
          value={String(value ?? "")}
          onChange={(e) => onChange(isNum ? Number(e.target.value) : e.target.value)}
          className="h-8 w-full rounded-md border border-border bg-background px-3 text-[12px] text-foreground focus:border-primary focus:outline-none"
        />
      )}
    </div>
  );
}
