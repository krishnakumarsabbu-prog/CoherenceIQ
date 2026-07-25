import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RotateCcw, GitCommitVertical as GitCommit } from "lucide-react";
import { relativeTime } from "@/lib/utils";
import type { PipelineVersion } from "@/lib/pipelineStore";
import { cn } from "@/lib/utils";

interface VersionHistoryModalProps {
  open: boolean;
  onClose: () => void;
  versions: PipelineVersion[];
  publishedId: string | null;
  onRestore: (versionId: string) => void;
}

const LABEL_VARIANT: Record<PipelineVersion["label"], "default" | "outline" | "secondary"> = {
  published: "default",
  draft: "outline",
  archived: "secondary",
};

export function VersionHistoryModal({ open, onClose, versions, publishedId, onRestore }: VersionHistoryModalProps) {
  return (
    <Modal open={open} onClose={onClose} className="max-w-xl">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-2 text-[14px] font-bold text-foreground">
          <GitCommit className="h-4 w-4" /> Version History
        </div>
        <div className="mt-0.5 text-[12px] text-muted-foreground">Save snapshots and restore any past version of this pipeline.</div>
      </div>
      <div className="scrollbar-thin max-h-[55vh] overflow-y-auto p-3">
        {versions.length === 0 ? (
          <div className="px-3 py-10 text-center text-[12px] text-muted-foreground">No saved versions yet. Save or publish to create one.</div>
        ) : (
          <div className="space-y-1.5">
            {versions.map((v) => (
              <div
                key={v.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2.5",
                  v.id === publishedId ? "border-primary/40 bg-primary/5" : "border-border",
                )}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-foreground">
                  {v.version.replace("v", "")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-foreground">{v.version}</span>
                    <Badge variant={LABEL_VARIANT[v.label]} className="text-[9px]">{v.label}</Badge>
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">{v.note} · {v.savedBy} · {relativeTime(v.savedAt)}</div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => onRestore(v.id)}>
                  <RotateCcw className="h-3.5 w-3.5" /> Restore
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
