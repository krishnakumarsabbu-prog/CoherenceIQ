import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  showClose?: boolean;
}

export function Modal({ open, onClose, children, className, showClose = true }: ModalProps) {
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center p-4 sm:p-6 animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn("relative z-10 mt-[12vh] w-full max-w-lg glass-card p-0 shadow-2xl animate-slide-up", className)}>
        {showClose && (
          <button onClick={onClose} className="absolute right-3 top-3 z-20 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
