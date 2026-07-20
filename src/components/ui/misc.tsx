import * as React from "react";
import { cn } from "@/lib/utils";

export function Separator({ className, orientation = "horizontal" }: { className?: string; orientation?: "horizontal" | "vertical" }) {
  return (
    <div
      className={cn(
        "bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className
      )}
    />
  );
}

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export function Tooltip({ content, children, side = "top", className }: TooltipProps) {
  const [open, setOpen] = React.useState(false);
  const pos =
    side === "top" ? "bottom-full left-1/2 -translate-x-1/2 mb-2"
    : side === "bottom" ? "top-full left-1/2 -translate-x-1/2 mt-2"
    : side === "left" ? "right-full top-1/2 -translate-y-1/2 mr-2"
    : "left-full top-1/2 -translate-y-1/2 ml-2";
  return (
    <span className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      {children}
      {open && (
        <span className={cn("absolute z-[100] whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-lg animate-fade-in", pos, className)}>
          {content}
        </span>
      )}
    </span>
  );
}

export function Avatar({ initials, className }: { initials: string; className?: string }) {
  return (
    <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-cyan-400 text-[11px] font-bold text-primary-foreground", className)}>
      {initials}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted/60", className)} />;
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">{children}</kbd>;
}
