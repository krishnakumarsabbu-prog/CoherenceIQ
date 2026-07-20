import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ALL_COMMANDS } from "@/config/navigation";
import { Modal } from "@/components/ui/modal";
import { Kbd } from "@/components/ui/misc";
import { Search, CornerDownLeft, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onAction?: (id: string) => void;
}

export function CommandPalette({ open, onClose, onAction }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_COMMANDS;
    return ALL_COMMANDS.filter((c) => (c.label + " " + c.hint + " " + c.group).toLowerCase().includes(q));
  }, [query]);

  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const run = (idx: number) => {
    const cmd = filtered[idx];
    if (!cmd) return;
    if (cmd.path) navigate(cmd.path);
    else onAction?.(cmd.id);
    onClose();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); run(active); }
  };

  return (
    <Modal open={open} onClose={onClose} className="max-w-xl p-0 overflow-hidden" showClose={false}>
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKey}
          placeholder="Type a command or search modules…"
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <Kbd>esc</Kbd>
      </div>
      <div className="max-h-[52vh] overflow-y-auto scrollbar-thin p-2">
        {filtered.length === 0 && (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">No results for "{query}"</div>
        )}
        {filtered.map((cmd, i) => (
          <button
            key={cmd.id + i}
            onMouseEnter={() => setActive(i)}
            onClick={() => run(i)}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors",
              active === i ? "bg-primary/12 ring-1 ring-inset ring-primary/25" : "hover:bg-accent/60"
            )}
          >
            <span className={cn("flex h-7 w-7 items-center justify-center rounded-md", active === i ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
              <cmd.icon className="h-3.5 w-3.5" />
            </span>
            <div className="flex-1">
              <div className="text-[13px] font-medium text-foreground">{cmd.label}</div>
              <div className="text-[11px] text-muted-foreground">{cmd.hint}</div>
            </div>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">{cmd.group}</span>
            {active === i && <CornerDownLeft className="h-3.5 w-3.5 text-primary" />}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[10.5px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><ArrowUp className="h-3 w-3" /><ArrowDown className="h-3 w-3" /> navigate</span>
          <span className="flex items-center gap-1"><CornerDownLeft className="h-3 w-3" /> select</span>
        </div>
        <span className="font-medium text-foreground/80">CoherenceIQ</span>
      </div>
    </Modal>
  );
}
