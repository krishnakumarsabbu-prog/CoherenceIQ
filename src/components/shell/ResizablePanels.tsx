import { useEffect, useRef, useState, type ReactNode } from "react";

interface ResizablePanelsProps {
  children: [ReactNode, ReactNode];
  defaultSizes?: [number, number];
  minSizes?: [number, number];
  direction?: "horizontal" | "vertical";
  storageKey?: string;
}

export function ResizablePanels({
  children, defaultSizes = [60, 40], minSizes = [25, 25], direction = "horizontal", storageKey,
}: ResizablePanelsProps) {
  const [sizes, setSizes] = useState<[number, number]>(() => {
    if (storageKey) {
      const stored = localStorage.getItem(storageKey);
      if (stored) try { return JSON.parse(stored); } catch {}
    }
    return defaultSizes;
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(sizes));
  }, [sizes, storageKey]);

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const pct = direction === "horizontal"
        ? ((clientX - rect.left) / rect.width) * 100
        : ((clientY - rect.top) / rect.height) * 100;
      const a = Math.max(minSizes[0], Math.min(100 - minSizes[1], pct));
      setSizes([a, 100 - a]);
    };
    const onUp = () => { dragging.current = false; document.body.style.cursor = ""; document.body.style.userSelect = ""; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [direction, minSizes]);

  const isH = direction === "horizontal";

  return (
    <div ref={containerRef} className={`flex h-full w-full ${isH ? "flex-row" : "flex-col"}`}>
      <div style={{ [isH ? "width" : "height"]: `${sizes[0]}%` }} className="min-h-0 min-w-0 overflow-hidden">
        {children[0]}
      </div>
      <div
        onMouseDown={() => { dragging.current = true; document.body.style.cursor = isH ? "col-resize" : "row-resize"; document.body.style.userSelect = "none"; }}
        onTouchStart={() => { dragging.current = true; }}
        className={`group relative z-10 flex shrink-0 items-center justify-center bg-border transition-colors hover:bg-primary/40 ${isH ? "w-1 cursor-col-resize" : "h-1 cursor-row-resize"}`}
      >
        <div className={`absolute bg-primary/0 transition-all group-hover:bg-primary/30 ${isH ? "h-10 w-[3px] rounded-full" : "w-10 h-[3px] rounded-full"}`} />
      </div>
      <div style={{ [isH ? "width" : "height"]: `${sizes[1]}%` }} className="min-h-0 min-w-0 overflow-hidden">
        {children[1]}
      </div>
    </div>
  );
}
