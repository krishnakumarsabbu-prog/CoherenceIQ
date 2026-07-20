import { useMemo, useState, useCallback } from "react";
import { ChevronRight, ChevronDown, Copy, Check, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface JsonViewerProps {
  data: unknown;
  className?: string;
  searchClassName?: string;
  maxHeight?: string;
  showSearch?: boolean;
  defaultExpanded?: boolean;
}

interface NodeMeta {
  path: string;
  depth: number;
}

function classifyValue(value: unknown): string {
  if (value === null) return "text-muted-foreground italic";
  if (typeof value === "string") return "text-emerald-500 dark:text-emerald-400";
  if (typeof value === "number") return "text-sky-600 dark:text-sky-400";
  if (typeof value === "boolean") return "text-amber-600 dark:text-amber-400";
  return "text-foreground";
}

function renderScalar(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  return String(value);
}

function countNodes(data: unknown): number {
  if (data === null || typeof data !== "object") return 1;
  let n = 1;
  for (const v of Object.values(data as object)) n += countNodes(v);
  return n;
}

function matchesQuery(value: unknown, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  if (typeof value === "string") return value.toLowerCase().includes(q);
  if (typeof value === "number" || typeof value === "boolean") return String(value).toLowerCase().includes(q);
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value as object)) {
      if (k.toLowerCase().includes(q) || matchesQuery(v, q)) return true;
    }
  }
  return false;
}

function pathContainsMatch(data: unknown, query: string, currentPath: string): boolean {
  if (!query) return true;
  if (typeof data !== "object" || data === null) return matchesQuery(data, query);
  for (const [k, v] of Object.entries(data as object)) {
    const p = `${currentPath}.${k}`;
    if (matchesQuery(k, query) || matchesQuery(v, query) || pathContainsMatch(v, query, p)) return true;
  }
  return false;
}

interface RenderProps {
  data: unknown;
  keyName?: string;
  depth: number;
  path: string;
  query: string;
  collapsed: Set<string>;
  toggle: (path: string) => void;
  defaultExpanded: boolean;
}

function JsonNode({ data, keyName, depth, path, query, collapsed, toggle, defaultExpanded }: RenderProps) {
  const isCollapsed = collapsed.has(path) || (!defaultExpanded && depth > 1 && !query);
  const isArray = Array.isArray(data);
  const isObject = data !== null && typeof data === "object" && !isArray;

  if (data === null || typeof data !== "object") {
    const valStr = renderScalar(data);
    const isMatch = query && matchesQuery(keyName ?? "", query) || matchesQuery(data, query);
    return (
      <div className="flex items-start gap-1 py-px leading-relaxed" style={{ paddingLeft: depth * 14 }}>
        {keyName !== undefined && (
          <>
            <span className={cn("font-medium text-foreground/90", isMatch && query && "rounded bg-warning/30")}>{JSON.stringify(keyName)}</span>
            <span className="text-muted-foreground">: </span>
          </>
        )}
        <span className={cn(classifyValue(data), isMatch && query && "rounded bg-warning/30 px-0.5")}>{valStr}</span>
        {keyName !== undefined && <span className="text-muted-foreground">,</span>}
      </div>
    );
  }

  const entries = Object.entries(data as object);
  const open = !isCollapsed;
  const summary = isArray ? `[${entries.length}]` : `{${entries.length}}`;
  const hasMatch = !query || pathContainsMatch(data, query, path);

  if (!hasMatch) return null;

  const Icon = open ? ChevronDown : ChevronRight;

  return (
    <div>
      <div
        className="flex cursor-pointer items-start gap-1 py-px leading-relaxed hover:bg-accent/40 rounded-sm"
        style={{ paddingLeft: depth * 14 }}
        onClick={() => toggle(path)}
      >
        <Icon className="mt-[3px] h-3 w-3 shrink-0 text-muted-foreground" />
        {keyName !== undefined && (
          <>
            <span className={cn("font-medium text-foreground/90", query && matchesQuery(keyName, query) && "rounded bg-warning/30")}>{JSON.stringify(keyName)}</span>
            <span className="text-muted-foreground">: </span>
          </>
        )}
        <span className="text-muted-foreground">{isArray ? "[" : "{"}</span>
        {!open && (
          <>
            <span className="text-muted-foreground/70">{summary}</span>
            <span className="text-muted-foreground">{isArray ? "]" : "}"}</span>
            {keyName !== undefined && <span className="text-muted-foreground">,</span>}
          </>
        )}
      </div>
      {open && (
        <>
          {entries.map(([k, v], i) => (
            <JsonNode
              key={k + i}
              data={v}
              keyName={k}
              depth={depth + 1}
              path={`${path}.${k}`}
              query={query}
              collapsed={collapsed}
              toggle={toggle}
              defaultExpanded={defaultExpanded}
            />
          ))}
          <div className="flex items-start gap-1 py-px leading-relaxed" style={{ paddingLeft: depth * 14 }}>
            <span className="text-muted-foreground">{isArray ? "]" : "}"}</span>
            {keyName !== undefined && <span className="text-muted-foreground">,</span>}
          </div>
        </>
      )}
    </div>
  );
}

export function JsonViewer({ data, className, searchClassName, maxHeight = "100%", showSearch = true, defaultExpanded = true }: JsonViewerProps) {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const jsonStr = useMemo(() => JSON.stringify(data, null, 2), [data]);
  const nodeCount = useMemo(() => countNodes(data), [data]);
  const matchCount = useMemo(() => {
    if (!query) return null;
    const q = query.toLowerCase();
    let n = 0;
    const walk = (v: unknown) => {
      if (typeof v === "string" && v.toLowerCase().includes(q)) n++;
      else if (typeof v === "number" && String(v).toLowerCase().includes(q)) n++;
      else if (typeof v === "boolean" && String(v).includes(q)) n++;
      else if (v && typeof v === "object") Object.values(v as object).forEach(walk);
    };
    walk(data);
    return n;
  }, [data, query]);

  const toggle = useCallback((path: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  }, []);

  const collapseAll = () => setCollapsed(new Set(["$"]));
  const expandAll = () => setCollapsed(new Set());

  const copy = async () => {
    try { await navigator.clipboard.writeText(jsonStr); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch {}
  };

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {showSearch && (
        <div className={cn("flex items-center gap-2 border-b border-border px-3 py-2", searchClassName)}>
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search keys & values…"
              className="h-7 w-full rounded-md border border-border bg-background/60 pl-8 pr-7 font-mono text-[11px] text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <button onClick={expandAll} className="rounded-md border border-border px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground">Expand</button>
          <button onClick={collapseAll} className="rounded-md border border-border px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground">Collapse</button>
          <button onClick={copy} className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
            {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
      {showSearch && (query || nodeCount > 0) && (
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-1 text-[10px] text-muted-foreground">
          <span>{nodeCount} nodes</span>
          {query && <span>{matchCount ?? 0} matches</span>}
        </div>
      )}
      <div className="flex-1 overflow-auto scrollbar-thin" style={{ maxHeight }}>
        <pre className="px-3 py-2 font-mono text-[11.5px] leading-relaxed">
          <JsonNode data={data} depth={0} path="$" query={query} collapsed={collapsed} toggle={toggle} defaultExpanded={defaultExpanded} />
        </pre>
      </div>
    </div>
  );
}
