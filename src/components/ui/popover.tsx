import * as React from "react";
import { cn } from "@/lib/utils";

interface PopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
  contentClassName?: string;
}

export function Popover({ open, onOpenChange, trigger, children, align = "end", className, contentClassName }: PopoverProps) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOpenChange(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onOpenChange(false);
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", esc);
    };
  }, [open, onOpenChange]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div onClick={() => onOpenChange(!open)}>{trigger}</div>
      {open && (
        <div
          className={cn(
            "absolute z-[150] mt-2 min-w-[220px] origin-top overflow-hidden rounded-lg border border-border bg-popover/95 shadow-2xl backdrop-blur-xl animate-slide-up",
            align === "end" && "right-0",
            align === "start" && "left-0",
            align === "center" && "left-1/2 -translate-x-1/2",
            contentClassName
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({ children, onClick, className, active }: { children: React.ReactNode; onClick?: () => void; className?: string; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors hover:bg-accent",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        className
      )}
    >
      {children}
    </button>
  );
}

export function DropdownSeparator() {
  return <div className="my-1 h-px bg-border" />;
}

export function DropdownLabel({ children }: { children: React.ReactNode }) {
  return <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</div>;
}
