import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Server, Hash, FileJson, ListTree, Code as Code2, Clock, Link2, CircleCheck as CheckCircle2, CircleAlert as AlertCircle, ShieldAlert, CircleSlash } from "lucide-react";
import type { PipelineNode, NodeStatus } from "@/lib/investigationData";
import { NODE_ICONS, NODE_ICON_FALLBACK } from "./icons";
import { RequestResponseViewer } from "./RequestResponseViewer";
import { cn, formatDateTime } from "@/lib/utils";

interface NodeDetailDrawerProps {
  node: PipelineNode | null;
  open: boolean;
  onClose: () => void;
}

type Tab = "payload" | "headers" | "metadata" | "raw";

const STATUS_META: Record<NodeStatus, { label: string; text: string; Icon: typeof CheckCircle2 }> = {
  completed: { label: "Completed", text: "text-success", Icon: CheckCircle2 },
  warning: { label: "Warning", text: "text-warning", Icon: ShieldAlert },
  failed: { label: "Failed", text: "text-destructive", Icon: AlertCircle },
  skipped: { label: "Skipped", text: "text-muted-foreground", Icon: CircleSlash },
};

function MetaItem({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Zap }) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-2.5">
      <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-1 truncate font-mono text-[11.5px] font-medium text-foreground" title={value}>{value}</div>
    </div>
  );
}

export function NodeDetailDrawer({ node, open, onClose }: NodeDetailDrawerProps) {
  const [tab, setTab] = useState<Tab>("payload");

  const tabs: { id: Tab; label: string; icon: typeof FileJson }[] = [
    { id: "payload", label: "Request / Response", icon: FileJson },
    { id: "headers", label: "Headers", icon: Server },
    { id: "metadata", label: "Metadata", icon: ListTree },
    { id: "raw", label: "Raw Payload", icon: Code2 },
  ];

  return (
    <AnimatePresence>
      {open && node && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[180]"
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className="absolute right-0 top-0 flex h-full w-full max-w-[760px] flex-col border-l border-border bg-background shadow-2xl"
          >
            {/* Header */}
            <div className="shrink-0 border-b border-border px-4 py-3">
              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = NODE_ICONS[node.iconKey] ?? NODE_ICON_FALLBACK;
                  const sm = STATUS_META[node.status];
                  return (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                  );
                })()}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-[15px] font-semibold tracking-tight text-foreground">{node.label}</h3>
                    <span className="shrink-0 rounded bg-muted px-1.5 py-px font-mono text-[9px] font-bold text-muted-foreground">{node.abbr}</span>
                  </div>
                  <p className="truncate text-[11.5px] text-muted-foreground">{node.description}</p>
                </div>
                <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Status strip */}
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <MetaItem label="Status" value={`${node.statusCode} · ${STATUS_META[node.status].label}`} icon={STATUS_META[node.status].Icon} />
                <MetaItem label="Latency" value={`${node.latencyMs}ms`} icon={Zap} />
                <MetaItem label="Exec Time" value={`${node.executionMs}ms`} icon={Clock} />
                <MetaItem label="Confidence" value={`${(node.confidence * 100).toFixed(0)}%`} icon={CheckCircle2} />
              </div>

              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <MetaItem label="API URL" value={node.apiUrl} icon={Link2} />
                <MetaItem label="Trace ID" value={String(node.metadata.traceId ?? "—")} icon={Hash} />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex shrink-0 items-center gap-1 border-b border-border px-3">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "relative -mb-px flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium transition-colors",
                    tab === t.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <t.icon className="h-3.5 w-3.5" /> {t.label}
                  {tab === t.id && <motion.span layoutId="drawer-tab" className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="min-h-0 flex-1 overflow-hidden">
              {tab === "payload" && (
                <RequestResponseViewer
                  request={node.request}
                  response={node.response}
                  requestHeaders={node.headers}
                  responseHeaders={node.headers}
                  apiUrl={node.apiUrl}
                  statusCode={node.statusCode}
                  className="h-full"
                />
              )}

              {tab === "headers" && (
                <div className="h-full overflow-auto scrollbar-thin p-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Request Headers</div>
                      <div className="overflow-hidden rounded-lg border border-border">
                        {Object.entries(node.headers).map(([k, v], i) => (
                          <div key={k} className={cn("flex items-start gap-2 px-3 py-2 font-mono text-[11px]", i > 0 && "border-t border-border/60")}>
                            <span className="shrink-0 font-semibold text-sky-500 dark:text-sky-400">{k}</span>
                            <span className="text-muted-foreground">:</span>
                            <span className="break-all text-foreground/80">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Response Headers</div>
                      <div className="overflow-hidden rounded-lg border border-border">
                        {[
                          ["Content-Type", "application/json"],
                          ["X-Trace-Id", String(node.metadata.traceId ?? "—")],
                          ["X-Response-Time", `${node.executionMs}ms`],
                          ["X-Status", String(node.statusCode)],
                          ["X-Node-Version", String(node.metadata.version ?? "—")],
                          ["Date", formatDateTime(typeof node.response === "object" && node.response !== null && "decidedAt" in node.response ? String((node.response as { decidedAt?: unknown }).decidedAt ?? new Date().toISOString()) : new Date().toISOString())],
                        ].map(([k, v], i) => (
                          <div key={k} className={cn("flex items-start gap-2 px-3 py-2 font-mono text-[11px]", i > 0 && "border-t border-border/60")}>
                            <span className="shrink-0 font-semibold text-emerald-500 dark:text-emerald-400">{k}</span>
                            <span className="text-muted-foreground">:</span>
                            <span className="break-all text-foreground/80">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {tab === "metadata" && (
                <div className="h-full overflow-auto scrollbar-thin p-4">
                  <div className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Execution Metadata</div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {Object.entries(node.metadata).map(([k, v]) => (
                      <div key={k} className="rounded-lg border border-border bg-card/40 p-2.5">
                        <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{k}</div>
                        <div className="mt-0.5 truncate font-mono text-[11px] font-medium text-foreground" title={String(v)}>{String(v)}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Risk & Confidence</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-border bg-card/40 p-3">
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Risk Contribution</div>
                      <div className={cn("mt-0.5 font-mono text-xl font-bold tabular-nums", node.riskContribution >= 75 ? "text-destructive" : node.riskContribution >= 40 ? "text-warning" : node.riskContribution > 0 ? "text-success" : "text-muted-foreground")}>{node.riskContribution}</div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${node.riskContribution}%` }} transition={{ duration: 0.5 }} className={cn("h-full rounded-full", node.riskContribution >= 75 ? "bg-destructive" : node.riskContribution >= 40 ? "bg-warning" : "bg-success")} />
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-card/40 p-3">
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Confidence</div>
                      <div className="mt-0.5 font-mono text-xl font-bold tabular-nums text-primary">{(node.confidence * 100).toFixed(0)}%</div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${node.confidence * 100}%` }} transition={{ duration: 0.5 }} className="h-full rounded-full bg-primary" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {tab === "raw" && (
                <div className="flex h-full flex-col p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Raw HTTP Payload</span>
                    <span className="rounded bg-muted px-1.5 py-px font-mono text-[9.5px] text-muted-foreground">{node.rawPayload.split("\n").length} lines</span>
                  </div>
                  <pre className="flex-1 overflow-auto scrollbar-thin rounded-lg border border-border bg-[#0b1220]/70 p-3 font-mono text-[11px] leading-relaxed text-foreground/85">
                    {node.rawPayload}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
