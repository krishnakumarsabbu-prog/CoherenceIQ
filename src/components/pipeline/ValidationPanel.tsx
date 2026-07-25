import { motion, AnimatePresence } from "framer-motion";
import { CircleAlert as AlertCircle, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle2, ChevronRight } from "lucide-react";
import type { ValidationIssue } from "@/lib/pipelineValidation";
import { cn } from "@/lib/utils";

interface ValidationPanelProps {
  issues: ValidationIssue[];
  open: boolean;
  onSelectNode?: (nodeId: string) => void;
}

export function ValidationPanel({ issues, open, onSelectNode }: ValidationPanelProps) {
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden border-t border-border bg-card/60 backdrop-blur-xl"
        >
          <div className="scrollbar-thin max-h-[180px] overflow-y-auto px-4 py-2.5">
            <div className="mb-2 flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 font-semibold text-destructive"><AlertCircle className="h-3 w-3" /> {errors.length} errors</span>
              <span className="flex items-center gap-1 font-semibold text-warning"><AlertTriangle className="h-3 w-3" /> {warnings.length} warnings</span>
              {issues.length === 0 && (
                <span className="flex items-center gap-1 font-semibold text-success"><CheckCircle2 className="h-3 w-3" /> Pipeline is valid</span>
              )}
            </div>
            <div className="space-y-1">
              {issues.map((iss) => (
                <button
                  key={iss.id}
                  onClick={() => iss.nodeId && onSelectNode?.(iss.nodeId)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] hover:bg-accent",
                    iss.severity === "error" ? "text-destructive" : "text-warning",
                  )}
                >
                  {iss.severity === "error" ? <AlertCircle className="h-3 w-3 shrink-0" /> : <AlertTriangle className="h-3 w-3 shrink-0" />}
                  <span className="flex-1">{iss.message}</span>
                  {iss.nodeId && <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
