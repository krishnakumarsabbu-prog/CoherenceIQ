import { useMemo, useState } from "react";
import { Copy, Check, Download, Search, X, Columns2, Rows2, ChevronDown, ChevronRight, GitCompare } from "lucide-react";
import { JsonViewer } from "./JsonViewer";
import { cn } from "@/lib/utils";

interface RequestResponseViewerProps {
  request: unknown;
  response: unknown;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  apiUrl?: string;
  statusCode?: number;
  className?: string;
}

type ViewMode = "side" | "stacked";
type TabMode = "json" | "diff" | "raw";

interface DiffPath {
  path: string;
  left?: unknown;
  right?: unknown;
  type: "added" | "removed" | "changed";
}

function flatten(obj: unknown, prefix = ""): Map<string, unknown> {
  const map = new Map<string, unknown>();
  if (obj === null || typeof obj !== "object") {
    if (prefix) map.set(prefix, obj);
    return map;
  }
  for (const [k, v] of Object.entries(obj as object)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      for (const [fp, fv] of flatten(v, p)) map.set(fp, fv);
    } else {
      map.set(p, v);
    }
  }
  return map;
}

function computeDiff(left: unknown, right: unknown): DiffPath[] {
  const lm = flatten(left);
  const rm = flatten(right);
  const diffs: DiffPath[] = [];
  const allKeys = new Set([...lm.keys(), ...rm.keys()]);
  for (const k of allKeys) {
    const l = lm.get(k);
    const r = rm.get(k);
    if (l === undefined && r !== undefined) diffs.push({ path: k, right: r, type: "added" });
    else if (l !== undefined && r === undefined) diffs.push({ path: k, left: l, type: "removed" });
    else if (JSON.stringify(l) !== JSON.stringify(r)) diffs.push({ path: k, left: l, right: r, type: "changed" });
  }
  return diffs.sort((a, b) => a.path.localeCompare(b.path));
}

function renderVal(v: unknown): string {
  if (v === undefined) return "—";
  if (v === null) return "null";
  if (typeof v === "string") return JSON.stringify(v);
  return String(v);
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function HeaderBlock({ title, headers, collapsed, onToggle }: { title: string; headers?: Record<string, string>; collapsed: boolean; onToggle: () => void }) {
  if (!headers || Object.keys(headers).length === 0) return null;
  const Icon = collapsed ? ChevronRight : ChevronDown;
  return (
    <div className="border-b border-border/60">
      <button onClick={onToggle} className="flex w-full items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground">
        <Icon className="h-3 w-3" /> {title} ({Object.keys(headers).length})
      </button>
      {!collapsed && (
        <div className="px-3 pb-2 font-mono text-[10.5px] leading-relaxed">
          {Object.entries(headers).map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <span className="shrink-0 text-muted-foreground">{k}:</span>
              <span className="break-all text-foreground/80">{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function RequestResponseViewer({ request, response, requestHeaders, responseHeaders, apiUrl, statusCode, className }: RequestResponseViewerProps) {
  const [mode, setMode] = useState<ViewMode>("side");
  const [tab, setTab] = useState<TabMode>("json");
  const [reqQuery, setReqQuery] = useState("");
  const [resQuery, setResQuery] = useState("");
  const [diffQuery, setDiffQuery] = useState("");
  const [copiedSide, setCopiedSide] = useState<"req" | "res" | null>(null);
  const [reqHeadersCollapsed, setReqHeadersCollapsed] = useState(false);
  const [resHeadersCollapsed, setResHeadersCollapsed] = useState(false);

  const diffs = useMemo(() => computeDiff(request, response), [request, response]);
  const filteredDiffs = useMemo(() => {
    if (!diffQuery) return diffs;
    const q = diffQuery.toLowerCase();
    return diffs.filter((d) => d.path.toLowerCase().includes(q) || renderVal(d.left).toLowerCase().includes(q) || renderVal(d.right).toLowerCase().includes(q));
  }, [diffs, diffQuery]);

  const copy = async (side: "req" | "res", data: unknown) => {
    try { await navigator.clipboard.writeText(JSON.stringify(data, null, 2)); setCopiedSide(side); setTimeout(() => setCopiedSide(null), 1400); } catch {}
  };

  const sideClass = "flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-[#0b1220]/60 dark:bg-[#0b1220]/40";

  const SearchBar = ({ value, onChange, onCopy, copied }: { value: string; onChange: (v: string) => void; onCopy: () => void; copied: boolean }) => (
    <div className="flex items-center gap-2 border-b border-border/60 px-3 py-1.5">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search…"
          className="h-6 w-full rounded border border-border bg-background/60 pl-7 pr-6 font-mono text-[10.5px] text-foreground outline-none focus:border-primary"
        />
        {value && <button onClick={() => onChange("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>}
      </div>
      <button onClick={onCopy} className="flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground">
        {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
        {copied ? "OK" : "Copy"}
      </button>
    </div>
  );

  const renderJsonPanel = (side: "req" | "res", data: unknown, headers: Record<string, string> | undefined, query: string, setQuery: (v: string) => void, collapsed: boolean, setCollapsed: (v: boolean) => void) => {
    return (
      <div className={sideClass}>
        <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
          <div className="flex items-center gap-2">
            <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold", side === "req" ? "bg-sky-500/15 text-sky-500 dark:text-sky-400" : "bg-emerald-500/15 text-emerald-500 dark:text-emerald-400")}>
              {side === "req" ? "REQUEST" : "RESPONSE"}
            </span>
            {side === "res" && statusCode && (
              <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold", statusCode < 300 ? "bg-success/15 text-success" : statusCode < 400 ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive")}>
                {statusCode}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => downloadJson(data, `${side}.json`)} className="rounded border border-border p-1 text-muted-foreground hover:bg-accent hover:text-foreground" title="Download">
              <Download className="h-3 w-3" />
            </button>
          </div>
        </div>
        <HeaderBlock title="Headers" headers={headers} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        <SearchBar value={query} onChange={setQuery} onCopy={() => copy(side, data)} copied={copiedSide === side} />
        <div className="min-h-0 flex-1 overflow-hidden">
          <JsonViewer data={data} maxHeight="100%" showSearch={false} defaultExpanded className="h-full" />
        </div>
      </div>
    );
  };

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
          {([["json", "JSON"], ["diff", "Diff"], ["raw", "Raw"]] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn("flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-medium transition-colors", tab === id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              {id === "diff" && <GitCompare className="h-3 w-3" />}
              {label}
              {id === "diff" && diffs.length > 0 && <span className="ml-0.5 rounded bg-warning/20 px-1 text-[9px] text-warning">{diffs.length}</span>}
            </button>
          ))}
        </div>
        {tab !== "diff" && (
          <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
            {([["side", "Side-by-side", Columns2], ["stacked", "Stacked", Rows2]] as const).map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={cn("flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors", mode === id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}
                title={label}
              >
                <Icon className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}
        {apiUrl && (
          <div className="ml-auto flex min-w-0 items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1">
            <span className="text-[9px] font-bold uppercase text-muted-foreground">API</span>
            <span className="truncate font-mono text-[10.5px] text-foreground/80">{apiUrl}</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-hidden p-2">
        {tab === "json" && (
          <div className={cn("flex h-full gap-2", mode === "stacked" && "flex-col")}>
            {renderJsonPanel("req", request, requestHeaders, reqQuery, setReqQuery, reqHeadersCollapsed, setReqHeadersCollapsed)}
            {renderJsonPanel("res", response, responseHeaders, resQuery, setResQuery, resHeadersCollapsed, setResHeadersCollapsed)}
          </div>
        )}

        {tab === "diff" && (
          <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-[#0b1220]/60 dark:bg-[#0b1220]/40">
            <div className="flex items-center gap-2 border-b border-border/60 px-3 py-1.5">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={diffQuery}
                  onChange={(e) => setDiffQuery(e.target.value)}
                  placeholder="Search diff paths…"
                  className="h-6 w-full rounded border border-border bg-background/60 pl-7 pr-6 font-mono text-[10.5px] text-foreground outline-none focus:border-primary"
                />
                {diffQuery && <button onClick={() => setDiffQuery("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>}
              </div>
              <span className="text-[10px] text-muted-foreground">{filteredDiffs.length} diffs</span>
              <button onClick={() => downloadJson(diffs, "diff.json")} className="flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground">
                <Download className="h-3 w-3" /> Diff
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto scrollbar-thin">
              {filteredDiffs.length === 0 ? (
                <div className="flex h-full items-center justify-center text-[12px] text-muted-foreground">
                  <div className="text-center">
                    <GitCompare className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                    No differences between request and response payloads.
                  </div>
                </div>
              ) : (
                <table className="w-full font-mono text-[11px]">
                  <thead className="sticky top-0 bg-[#0b1220] text-[9px] uppercase tracking-wider text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="px-3 py-1.5 text-left">Path</th>
                      <th className="px-3 py-1.5 text-left">Request</th>
                      <th className="px-3 py-1.5 text-left">Response</th>
                      <th className="px-3 py-1.5 text-left">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDiffs.map((d) => (
                      <tr key={d.path} className="border-b border-border/40 hover:bg-accent/20">
                        <td className="px-3 py-1.5 text-foreground/90">{d.path}</td>
                        <td className={cn("px-3 py-1.5", d.type === "added" ? "text-muted-foreground/50" : "text-amber-500 dark:text-amber-400")}>{renderVal(d.left)}</td>
                        <td className={cn("px-3 py-1.5", d.type === "removed" ? "text-muted-foreground/50" : "text-emerald-500 dark:text-emerald-400")}>{renderVal(d.right)}</td>
                        <td className="px-3 py-1.5">
                          <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
                            d.type === "added" ? "bg-emerald-500/15 text-emerald-500 dark:text-emerald-400" :
                            d.type === "removed" ? "bg-destructive/15 text-destructive" :
                            "bg-amber-500/15 text-amber-500 dark:text-amber-400")}>
                            {d.type}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {tab === "raw" && (
          <div className={cn("flex h-full gap-2 overflow-hidden", mode === "stacked" && "flex-col")}>
            <div className={sideClass}>
              <div className="border-b border-border px-3 py-1.5 text-[10px] font-bold uppercase text-sky-500 dark:text-sky-400">Request Raw</div>
              <div className="min-h-0 flex-1 overflow-auto scrollbar-thin p-3">
                <pre className="whitespace-pre-wrap break-all font-mono text-[10.5px] leading-relaxed text-foreground/80">{JSON.stringify(request, null, 2)}</pre>
              </div>
            </div>
            <div className={sideClass}>
              <div className="border-b border-border px-3 py-1.5 text-[10px] font-bold uppercase text-emerald-500 dark:text-emerald-400">Response Raw</div>
              <div className="min-h-0 flex-1 overflow-auto scrollbar-thin p-3">
                <pre className="whitespace-pre-wrap break-all font-mono text-[10.5px] leading-relaxed text-foreground/80">{JSON.stringify(response, null, 2)}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
