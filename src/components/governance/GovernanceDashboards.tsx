import { useMemo } from "react";
import { motion } from "framer-motion";
import { Activity, TrendingUp, TrendingDown, TriangleAlert as AlertTriangle, ShieldCheck, Crown, Swords, Eye, Gauge } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, formatCompact } from "@/lib/utils";
import {
  ARTEFACT_META, ARTEFACT_KINDS,
  type Artefact, type ArtefactKind,
} from "@/lib/governanceData";
import { useGovernanceStats } from "@/lib/governanceStore";

export function GovernanceDashboards({ artefacts }: { artefacts: Artefact[] }) {
  const stats = useGovernanceStats(artefacts);
  return (
    <div className="space-y-3">
      <HealthStrip stats={stats} />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <AssetUsageCard artefacts={artefacts} />
        <ModelDriftCard artefacts={artefacts} />
        <ExecutionStatsCard artefacts={artefacts} stats={stats} />
        <LifecycleDistributionCard artefacts={artefacts} />
      </div>
    </div>
  );
}

function HealthStrip({ stats }: { stats: ReturnType<typeof useGovernanceStats> }) {
  const tiles = [
    { label: "Governance Health", value: `${stats.score ?? 0}`, icon: ShieldCheck, tone: "text-success", sub: "composite score" },
    { label: "Approved", value: `${stats.approved}`, icon: ShieldCheck, tone: "text-success", sub: `of ${stats.total}` },
    { label: "In Review", value: `${stats.review}`, icon: Activity, tone: "text-warning", sub: "awaiting approval" },
    { label: "Pending Approvals", value: `${stats.pendingApprovals}`, icon: AlertTriangle, tone: "text-warning", sub: "steps" },
    { label: "Shadow Runs", value: `${stats.shadowing}`, icon: Eye, tone: "text-primary", sub: "active" },
    { label: "Champions", value: `${stats.champions}`, icon: Crown, tone: "text-primary", sub: `· ${stats.challengers} challengers` },
    { label: "Drift Alerts", value: `${stats.drifters}`, icon: AlertTriangle, tone: "text-destructive", sub: "models" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
      {tiles.map((t, i) => (
        <motion.div key={t.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
          className="glass-card flex items-center gap-2.5 p-3">
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg bg-muted/40", t.tone)}>
            <t.icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{t.label}</div>
            <div className={cn("font-mono text-[16px] font-bold tabular-nums", t.tone)}>{t.value}</div>
            <div className="truncate text-[8.5px] text-muted-foreground">{t.sub}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function AssetUsageCard({ artefacts }: { artefacts: Artefact[] }) {
  const rows = useMemo(() => {
    return ARTEFACT_KINDS.map((k) => {
      const items = artefacts.filter((a) => a.kind === k);
      const exec = items.reduce((n, a) => n + a.usage.reduce((s, u) => s + u.executions, 0), 0);
      return { kind: k, count: items.length, exec };
    }).sort((a, b) => b.exec - a.exec);
  }, [artefacts]);
  const max = Math.max(1, ...rows.map((r) => r.exec));
  return (
    <DashboardCard title="Asset Usage" subtitle="Executions by artefact kind (7d)" icon={Activity}>
      <div className="space-y-2">
        {rows.map((r) => {
          const meta = ARTEFACT_META[r.kind];
          const Icon = meta.icon;
          const pct = (r.exec / max) * 100;
          return (
            <div key={r.kind} className="flex items-center gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md" style={{ background: `${meta.color}22`, color: meta.color }}>
                <Icon className="h-3 w-3" />
              </div>
              <div className="w-20 shrink-0 text-[11px] font-semibold text-foreground">{meta.labelPlural}</div>
              <div className="relative h-5 flex-1 overflow-hidden rounded-md bg-muted/40">
                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }}
                  className="h-full rounded-md" style={{ background: `${meta.color}cc` }} />
              </div>
              <div className="w-16 shrink-0 text-right font-mono text-[11px] font-bold tabular-nums text-foreground">{formatCompact(r.exec)}</div>
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}

function ModelDriftCard({ artefacts }: { artefacts: Artefact[] }) {
  const models = useMemo(() => artefacts.filter((a) => a.kind === "model" && a.drift.length > 0), [artefacts]);
  return (
    <DashboardCard title="Model Drift Indicators" subtitle="Population Stability Index (PSI) over 14d" icon={Gauge}>
      {models.length === 0 ? <Empty msg="No models reporting drift." /> : (
        <div className="space-y-3">
          {models.map((m) => {
            const latest = m.drift[m.drift.length - 1];
            const alert = latest.psi > latest.threshold;
            return (
              <div key={m.id} className="rounded-lg border border-border bg-card/40 p-2.5">
                <div className="flex items-center justify-between">
                  <span className="truncate text-[12px] font-semibold text-foreground">{m.name}</span>
                  <Badge variant={alert ? "destructive" : "success"} className="text-[9px]">
                    {alert ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                    PSI {latest.psi.toFixed(3)}
                  </Badge>
                </div>
                <Sparkline data={m.drift.map((d) => d.psi)} threshold={latest.threshold} color={m.color} />
                <div className="mt-1 flex items-center justify-between text-[9.5px] text-muted-foreground">
                  <span>accuracy {latest.accuracy.toFixed(3)}</span>
                  <span>threshold {latest.threshold.toFixed(2)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardCard>
  );
}

function ExecutionStatsCard({ artefacts, stats }: { artefacts: Artefact[]; stats: ReturnType<typeof useGovernanceStats> }) {
  const top = useMemo(() =>
    artefacts.map((a) => ({ a, exec: a.usage.reduce((s, u) => s + u.executions, 0) }))
      .filter((x) => x.exec > 0)
      .sort((a, b) => b.exec - a.exec)
      .slice(0, 5), [artefacts]);
  return (
    <DashboardCard title="Execution Statistics" subtitle="Top artefacts by execution volume (7d)" icon={Activity}>
      <div className="mb-3 grid grid-cols-3 gap-2 text-center">
        <MiniBox label="Total Exec" value={formatCompact(stats.totalExec)} />
        <MiniBox label="Avg Latency" value={`${stats.avgLatency}ms`} />
        <MiniBox label="Artefacts" value={`${stats.total}`} />
      </div>
      {top.length === 0 ? <Empty msg="No executions recorded." /> : (
        <div className="space-y-1.5">
          {top.map(({ a, exec }) => {
            const meta = ARTEFACT_META[a.kind];
            return (
              <div key={a.id} className="flex items-center gap-2 rounded-md border border-border/60 bg-card/40 px-2.5 py-1.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: `${a.color}22`, color: a.color }}>
                  <meta.icon className="h-3 w-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11.5px] font-semibold text-foreground">{a.name}</div>
                  <div className="text-[9.5px] text-muted-foreground">{meta.label} · v{a.version}</div>
                </div>
                <div className="font-mono text-[11px] font-bold tabular-nums text-foreground">{formatCompact(exec)}</div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardCard>
  );
}

function LifecycleDistributionCard({ artefacts }: { artefacts: Artefact[] }) {
  const counts = useMemo(() => {
    const states = ["Draft", "Review", "Approved", "Deprecated"] as const;
    return states.map((s) => ({ state: s, count: artefacts.filter((a) => a.lifecycle === s).length }));
  }, [artefacts]);
  const total = Math.max(1, artefacts.length);
  const tones: Record<string, string> = { Draft: "#64748b", Review: "#f59e0b", Approved: "#10b981", Deprecated: "#ef4444" };
  return (
    <DashboardCard title="Lifecycle Distribution" subtitle="Artefacts by governance state" icon={ShieldCheck}>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/40">
        {counts.map((c) => c.count > 0 && (
          <motion.div key={c.state} initial={{ width: 0 }} animate={{ width: `${(c.count / total) * 100}%` }} transition={{ duration: 0.5 }}
            style={{ background: tones[c.state] }} title={`${c.state}: ${c.count}`} />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {counts.map((c) => (
          <div key={c.state} className="rounded-lg border border-border bg-card/40 p-2.5 text-center">
            <div className="mx-auto mb-1 h-2 w-2 rounded-full" style={{ background: tones[c.state] }} />
            <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{c.state}</div>
            <div className="font-mono text-[15px] font-bold tabular-nums text-foreground">{c.count}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-1.5">
        {ARTEFACT_KINDS.map((k) => {
          const meta = ARTEFACT_META[k];
          const items = artefacts.filter((a) => a.kind === k);
          return (
            <div key={k} className="flex items-center gap-2 text-[10.5px]">
              <meta.icon className="h-3 w-3" style={{ color: meta.color }} />
              <span className="w-16 text-muted-foreground">{meta.labelPlural}</span>
              <div className="flex flex-1 gap-0.5">
                {["Draft", "Review", "Approved", "Deprecated"].map((s) => {
                  const n = items.filter((a) => a.lifecycle === s).length;
                  return n > 0 ? <span key={s} className="rounded px-1 font-mono text-[9px] text-foreground" style={{ background: `${tones[s]}33` }}>{n}</span> : null;
                })}
              </div>
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}

function DashboardCard({ title, subtitle, icon: Icon, children }: { title: string; subtitle: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="glass-card p-3.5">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary"><Icon className="h-3.5 w-3.5" /></div>
        <div>
          <div className="text-[12.5px] font-semibold text-foreground">{title}</div>
          <div className="text-[9.5px] text-muted-foreground">{subtitle}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

function Sparkline({ data, threshold, color }: { data: number[]; threshold: number; color: string }) {
  const w = 240, h = 36;
  const max = Math.max(...data, threshold) * 1.1;
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * w},${h - (d / max) * h}`).join(" ");
  const thrY = h - (threshold / max) * h;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-1.5 h-9 w-full" preserveAspectRatio="none">
      <line x1="0" y1={thrY} x2={w} y2={thrY} stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" className="text-destructive/50" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

function MiniBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-card/40 px-2 py-1.5 text-center">
      <div className="text-[8.5px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-mono text-[13px] font-bold tabular-nums text-foreground">{value}</div>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="py-6 text-center text-[11.5px] text-muted-foreground">{msg}</div>;
}

export type { ArtefactKind };
