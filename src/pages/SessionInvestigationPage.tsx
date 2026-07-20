import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { generateSessions } from "@/lib/mockData";
import { buildInvestigation } from "@/lib/investigationData";
import { PageHeader } from "@/components/shell/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Copy, Download, ShieldCheck, ShieldAlert, ShieldX, Maximize2, Minimize2 } from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";
import { motion } from "framer-motion";
import { TimelinePanel } from "@/components/investigation/TimelinePanel";
import { EvidencePanel } from "@/components/investigation/EvidencePanel";
import { AISummaryPanel } from "@/components/investigation/AISummaryPanel";
import { NodeDetailDrawer } from "@/components/investigation/NodeDetailDrawer";

const SESSIONS = generateSessions(200);

function ThreePanelResize({
  sizes, onSizesChange, children,
}: {
  sizes: number[];
  onSizesChange: (s: number[]) => void;
  children: [React.ReactNode, React.ReactNode, React.ReactNode];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<number | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (dragging.current === null || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const pct = ((clientX - rect.left) / rect.width) * 100;

      const idx = dragging.current;
      const next = [...sizes];
      const min = 18;
      const left = Math.max(min, Math.min(sizes[idx] + sizes[idx + 1] - min, pct));
      const delta = left - sizes[idx];
      next[idx] = left;
      next[idx + 1] = sizes[idx] + sizes[idx + 1] - left;
      // keep third panel stable when dragging first handle
      if (idx === 0) {
        next[2] = sizes[2];
      }
      onSizesChange(next);
    };
    const onUp = () => { dragging.current = null; document.body.style.cursor = ""; document.body.style.userSelect = ""; };
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
  }, [sizes, onSizesChange]);

  return (
    <div ref={containerRef} className="flex h-full w-full">
      <div style={{ width: `${sizes[0]}%` }} className="min-h-0 min-w-0 overflow-hidden">{children[0]}</div>
      <div
        onMouseDown={() => { dragging.current = 0; document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none"; }}
        onTouchStart={() => { dragging.current = 0; }}
        className="group relative z-10 flex w-1 shrink-0 cursor-col-resize items-center justify-center bg-border transition-colors hover:bg-primary/40"
      >
        <div className="absolute h-12 w-[3px] rounded-full bg-primary/0 transition-all group-hover:bg-primary/30" />
      </div>
      <div style={{ width: `${sizes[1]}%` }} className="min-h-0 min-w-0 overflow-hidden">{children[1]}</div>
      <div
        onMouseDown={() => { dragging.current = 1; document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none"; }}
        onTouchStart={() => { dragging.current = 1; }}
        className="group relative z-10 flex w-1 shrink-0 cursor-col-resize items-center justify-center bg-border transition-colors hover:bg-primary/40"
      >
        <div className="absolute h-12 w-[3px] rounded-full bg-primary/0 transition-all group-hover:bg-primary/30" />
      </div>
      <div style={{ width: `${sizes[2]}%` }} className="min-h-0 min-w-0 overflow-hidden">{children[2]}</div>
    </div>
  );
}

export function SessionInvestigationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sizes, setSizes] = useState<number[]>(() => {
    const stored = localStorage.getItem("inv-3panel");
    if (stored) try { const p = JSON.parse(stored); if (Array.isArray(p) && p.length === 3) return p; } catch {}
    return [26, 42, 32];
  });
  const [zenMode, setZenMode] = useState(false);

  useEffect(() => { localStorage.setItem("inv-3panel", JSON.stringify(sizes)); }, [sizes]);

  const session = useMemo(() => SESSIONS.find((s) => s.sessionId === id) ?? SESSIONS[0], [id]);
  const investigation = useMemo(() => buildInvestigation(session), [session]);

  const selectedNode = useMemo(
    () => investigation.nodes.find((n) => n.id === selectedNodeId) ?? null,
    [investigation, selectedNodeId]
  );

  const decisionColor: "success" | "warning" | "destructive" = session.decision === "Allow" ? "success" : session.decision === "Challenge" ? "warning" : "destructive";
  const DecisionIcon = session.decision === "Allow" ? ShieldCheck : session.decision === "Challenge" ? ShieldAlert : ShieldX;

  const openNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setDrawerOpen(true);
  };

  const exportCase = () => {
    const blob = new Blob([JSON.stringify(investigation, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${investigation.caseId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyId = async () => {
    try { await navigator.clipboard.writeText(session.sessionId); } catch {}
  };

  const resetLayout = () => setSizes([26, 42, 32]);

  return (
    <div className="flex h-full flex-col p-4 lg:p-5">
      {!zenMode && (
        <PageHeader
          title={`Session ${session.sessionId}`}
          subtitle={`${session.customer} · ${session.application} · ${formatDateTime(session.loginTime)}`}
          actions={
            <>
              <Button variant="outline" size="sm" onClick={() => navigate("/sessions")}><ArrowLeft className="h-3.5 w-3.5" /> Back</Button>
              <Button variant="outline" size="sm" onClick={copyId}><Copy className="h-3.5 w-3.5" /> Copy ID</Button>
              <Button variant="outline" size="sm" onClick={exportCase}><Download className="h-3.5 w-3.5" /> Export</Button>
              <Button size="sm" onClick={() => setZenMode(true)}><Maximize2 className="h-3.5 w-3.5" /> Zen</Button>
            </>
          }
        />
      )}

      {/* Decision banner */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn("mb-3", zenMode && "mb-2")}>
        <div className="glass-card relative overflow-hidden p-0">
          <div className={cn("absolute inset-x-0 top-0 h-1", decisionColor === "success" ? "bg-success" : decisionColor === "warning" ? "bg-warning" : "bg-destructive")} />
          <div className="flex flex-col gap-3 p-3.5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", decisionColor === "success" ? "bg-success/15 text-success" : decisionColor === "warning" ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive")}>
                <DecisionIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-foreground">{session.decision}</span>
                  <Badge variant={decisionColor}>{session.status}</Badge>
                  {zenMode && (
                    <button onClick={() => setZenMode(false)} className="ml-2 flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground">
                      <Minimize2 className="h-3 w-3" /> Exit
                    </button>
                  )}
                </div>
                <div className="mt-0.5 text-[12px] text-muted-foreground">
                  <span className="font-semibold text-foreground">{session.sessionId}</span> · {session.customer} · Decided in <span className="font-semibold text-foreground">{session.latency}ms</span> · {session.triggeredRules.length} rules · {investigation.evidence.length} evidence signals
                </div>
              </div>
            </div>
            <div className="flex items-center gap-5">
              <div className="text-center">
                <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Risk</div>
                <div className={cn("text-xl font-bold tabular-nums", session.riskScore >= 75 ? "text-destructive" : session.riskScore >= 40 ? "text-warning" : "text-success")}>{session.riskScore}</div>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Coherence</div>
                <div className={cn("text-xl font-bold tabular-nums", session.coherenceScore >= 70 ? "text-success" : session.coherenceScore >= 40 ? "text-warning" : "text-destructive")}>{session.coherenceScore}</div>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Fraud %</div>
                <div className={cn("text-xl font-bold tabular-nums", session.fraudProbability >= 60 ? "text-destructive" : session.fraudProbability >= 30 ? "text-warning" : "text-success")}>{session.fraudProbability}%</div>
              </div>
              <div className="h-8 w-px bg-border hidden sm:block" />
              <div className="hidden text-center sm:block">
                <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Case</div>
                <div className="font-mono text-sm font-bold text-primary">{investigation.caseId}</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Three-panel workstation */}
      <div className="glass-card relative min-h-0 flex-1 overflow-hidden p-0">
        {/* Panel column headers overlay */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex border-b border-border/40 bg-background/60 backdrop-blur-sm">
          <div style={{ width: `${sizes[0]}%` }} className="flex items-center justify-between border-r border-border/40 px-3 py-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Timeline</span>
          </div>
          <div style={{ width: `${sizes[1]}%` }} className="flex items-center justify-between border-r border-border/40 px-3 py-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Evidence</span>
          </div>
          <div style={{ width: `${sizes[2]}%` }} className="flex items-center justify-between px-3 py-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">AI Summary</span>
            <button onClick={resetLayout} className="pointer-events-auto rounded px-1.5 py-px text-[9px] text-muted-foreground hover:bg-accent hover:text-foreground">reset</button>
          </div>
        </div>

        <div className="absolute inset-0 top-[26px]">
          <ThreePanelResize sizes={sizes} onSizesChange={setSizes}>
            <div className="h-full overflow-hidden border-r border-border bg-card/30">
              <TimelinePanel
                nodes={investigation.nodes}
                selectedId={selectedNodeId}
                onSelect={openNode}
                decision={session.decision}
              />
            </div>
            <div className="h-full overflow-hidden border-r border-border bg-card/20">
              <EvidencePanel evidence={investigation.evidence} />
            </div>
            <div className="h-full overflow-hidden bg-card/30">
              <AISummaryPanel case={investigation} />
            </div>
          </ThreePanelResize>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-[10.5px] text-muted-foreground">
        <span>Click any pipeline node to inspect request / response payloads</span>
        <span className="font-mono">{investigation.nodes.length} stages · {investigation.evidence.length} evidence · {investigation.insights.length} insights</span>
      </div>

      <NodeDetailDrawer node={selectedNode} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
