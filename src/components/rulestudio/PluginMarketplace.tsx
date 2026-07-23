import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Puzzle, Activity, Zap, Clock, User, Settings2, Power, FileText, ChevronRight, CircleCheck as CheckCircle2, TriangleAlert as AlertTriangle, Circle as XCircle, Search, Globe, Smartphone, Brain, Gauge, Share2, Cpu, ShieldAlert, Database, X, ScrollText } from "lucide-react";
import { type Plugin, PLUGINS, PLUGIN_LOGS } from "@/lib/ruleStudioData";
import { cn, relativeTime, formatCompact } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/shell/Breadcrumbs";

const CATEGORY_ICON: Record<string, React.ElementType> = {
  "Geolocation": Globe,
  "Device Intelligence": Smartphone,
  "Behavioral Biometrics": Activity,
  "Velocity": Gauge,
  "Graph Intelligence": Share2,
  "Machine Learning": Brain,
  "Policy": ShieldAlert,
  "Threat Intel": Cpu,
  "Case Management": Database,
  "Identity": User,
};

const HEALTH_TONE = {
  Healthy: { dot: "bg-success", text: "text-success", bg: "bg-success/10" },
  Degraded: { dot: "bg-warning", text: "text-warning", bg: "bg-warning/10" },
  Down: { dot: "bg-destructive", text: "text-destructive", bg: "bg-destructive/10" },
};

export function PluginMarketplace() {
  const [plugins, setPlugins] = useState<Plugin[]>(PLUGINS);
  const [filter, setFilter] = useState("");
  const [catFilter, setCatFilter] = useState<string>("All");
  const [selected, setSelected] = useState<Plugin | null>(null);

  const categories = ["All", ...Array.from(new Set(PLUGINS.map((p) => p.category)))];

  const filtered = useMemo(() => plugins.filter((p) =>
    (catFilter === "All" || p.category === catFilter) &&
    (p.name.toLowerCase().includes(filter.toLowerCase()) || p.provider.toLowerCase().includes(filter.toLowerCase()) || p.category.toLowerCase().includes(filter.toLowerCase())),
  ), [plugins, filter, catFilter]);

  const toggle = (id: string) => {
    setPlugins((prev) => prev.map((p) => p.id === id ? { ...p, status: p.status === "Enabled" ? "Disabled" : "Enabled", calls24h: p.status === "Enabled" ? 0 : p.calls24h } : p));
    setSelected((s) => s && s.id === id ? { ...s, status: s.status === "Enabled" ? "Disabled" : "Enabled" } : s);
  };

  const stats = useMemo(() => ({
    enabled: plugins.filter((p) => p.status === "Enabled").length,
    degraded: plugins.filter((p) => p.health !== "Healthy").length,
    avgLatency: Math.round(plugins.reduce((a, p) => a + p.latency, 0) / plugins.length),
    calls: plugins.reduce((a, p) => a + p.calls24h, 0),
  }), [plugins]);

  return (
    <div>
      <PageHeader
        title="Plugin Marketplace"
        subtitle="Each intelligence provider is a plugin — install, configure, and monitor."
        actions={<Button size="sm"><Puzzle className="h-3.5 w-3.5" /> Browse catalog</Button>}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Enabled", value: `${stats.enabled}/${plugins.length}`, icon: CheckCircle2, tone: "text-success" },
          { label: "Degraded", value: stats.degraded, icon: AlertTriangle, tone: "text-warning" },
          { label: "Avg latency", value: `${stats.avgLatency}ms`, icon: Zap, tone: "text-primary" },
          { label: "Calls (24h)", value: formatCompact(stats.calls), icon: Activity, tone: "text-primary" },
        ].map((s) => (
          <Card key={s.label}><CardContent className="flex items-center gap-3 p-3.5">
            <s.icon className={cn("h-4 w-4", s.tone)} />
            <div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</div><div className="text-base font-bold text-foreground">{s.value}</div></div>
          </CardContent></Card>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search plugins, providers…" className="h-9 pl-9" />
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {categories.map((c) => (
            <button key={c} onClick={() => setCatFilter(c)} className={cn("rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors", catFilter === c ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>{c}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence>
          {filtered.map((p, i) => (
            <motion.div key={p.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ delay: i * 0.03 }}>
              <PluginCard plugin={p} onSelect={() => setSelected(p)} onToggle={() => toggle(p.id)} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <PluginDetailModal plugin={selected} onClose={() => setSelected(null)} onToggle={toggle} />
    </div>
  );
}

function PluginCard({ plugin, onSelect, onToggle }: { plugin: Plugin; onSelect: () => void; onToggle: () => void }) {
  const Icon = CATEGORY_ICON[plugin.category] ?? Puzzle;
  const h = HEALTH_TONE[plugin.health];
  const enabled = plugin.status === "Enabled";
  return (
    <Card className="group flex h-full flex-col p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary"><Icon className="h-5 w-5" /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[14px] font-semibold text-foreground">{plugin.name}</h3>
            <Badge variant="muted" className="font-mono text-[9.5px]">v{plugin.version}</Badge>
          </div>
          <p className="text-[11.5px] text-muted-foreground">{plugin.provider}</p>
        </div>
        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", h.dot)} title={plugin.health} />
      </div>

      <p className="mt-2.5 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">{plugin.description}</p>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md bg-muted/30 py-1.5">
          <div className={cn("text-[13px] font-bold tabular-nums", h.text)}>{plugin.latency}ms</div>
          <div className="text-[9.5px] uppercase text-muted-foreground">Latency</div>
        </div>
        <div className="rounded-md bg-muted/30 py-1.5">
          <div className="text-[13px] font-bold tabular-nums text-foreground">{plugin.uptime}%</div>
          <div className="text-[9.5px] uppercase text-muted-foreground">Uptime</div>
        </div>
        <div className="rounded-md bg-muted/30 py-1.5">
          <div className="text-[13px] font-bold tabular-nums text-foreground">{formatCompact(plugin.calls24h)}</div>
          <div className="text-[9.5px] uppercase text-muted-foreground">24h</div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Badge variant={enabled ? "success" : plugin.status === "Maintenance" ? "warning" : "muted"}>{plugin.status}</Badge>
          <span className="flex items-center gap-1"><User className="h-3 w-3" /> {plugin.owner}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 border-t border-border/60 pt-3">
        <Button variant="outline" size="sm" className="flex-1" onClick={onSelect}><Settings2 className="h-3.5 w-3.5" /> Configure</Button>
        <Button
          variant={enabled ? "outline" : "default"}
          size="sm"
          className={cn(!enabled && "bg-success text-success-foreground hover:bg-success/90")}
          onClick={onToggle}
        >
          <Power className="h-3.5 w-3.5" /> {enabled ? "Disable" : "Enable"}
        </Button>
      </div>
    </Card>
  );
}

function PluginDetailModal({ plugin, onClose, onToggle }: { plugin: Plugin | null; onClose: () => void; onToggle: (id: string) => void }) {
  return (
    <Modal open={!!plugin} onClose={onClose} className="max-w-2xl">
      {plugin && <PluginDetailContent plugin={plugin} onToggle={() => onToggle(plugin.id)} />}
    </Modal>
  );
}

function PluginDetailContent({ plugin, onToggle }: { plugin: Plugin; onToggle: () => void }) {
  const [tab, setTab] = useState<"overview" | "logs" | "config">("overview");
  const Icon = CATEGORY_ICON[plugin.category] ?? Puzzle;
  const h = HEALTH_TONE[plugin.health];
  const enabled = plugin.status === "Enabled";
  const logs = PLUGIN_LOGS[plugin.id] ?? [{ ts: "—", level: "INFO", message: "No recent logs." }];
  return (
    <div>
      <div className="flex items-start gap-4 border-b border-border p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary"><Icon className="h-6 w-6" /></div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-[16px] font-bold text-foreground">{plugin.name}</h2>
            <Badge variant="muted" className="font-mono">v{plugin.version}</Badge>
            <Badge variant={enabled ? "success" : plugin.status === "Maintenance" ? "warning" : "muted"}>{plugin.status}</Badge>
          </div>
          <p className="text-[12.5px] text-muted-foreground">{plugin.provider} · {plugin.category}</p>
        </div>
        <Button variant={enabled ? "outline" : "default"} size="sm" className={cn(!enabled && "bg-success text-success-foreground hover:bg-success/90")} onClick={onToggle}>
          <Power className="h-3.5 w-3.5" /> {enabled ? "Disable" : "Enable"}
        </Button>
      </div>

      <div className="flex items-center gap-1 border-b border-border px-4 py-2">
        {(["overview", "logs", "config"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("rounded-md px-3 py-1.5 text-[12.5px] font-medium capitalize transition-colors", tab === t ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/60")}>{t}</button>
        ))}
      </div>

      <div className="p-5">
        {tab === "overview" && (
          <div className="space-y-4">
            <p className="text-[13px] leading-relaxed text-muted-foreground">{plugin.description}</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Metric label="Health" value={plugin.health} tone={h.text} icon={plugin.health === "Healthy" ? CheckCircle2 : plugin.health === "Degraded" ? AlertTriangle : XCircle} />
              <Metric label="Latency p95" value={`${plugin.latency}ms`} icon={Zap} />
              <Metric label="Uptime" value={`${plugin.uptime}%`} icon={Activity} />
              <Metric label="Hit rate" value={`${plugin.hitRate}%`} icon={CheckCircle2} />
              <Metric label="Calls (24h)" value={formatCompact(plugin.calls24h)} icon={Activity} />
              <Metric label="Version" value={`v${plugin.version}`} icon={Puzzle} />
              <Metric label="Owner" value={plugin.owner} icon={User} />
              <Metric label="Installed" value={plugin.installed} icon={Clock} />
            </div>
          </div>
        )}
        {tab === "logs" && (
          <div className="max-h-80 overflow-auto rounded-lg border border-border bg-muted/30 p-3 font-mono text-[11.5px] dark:bg-black/30">
            {logs.map((l, i) => (
              <div key={i} className="flex gap-2 border-b border-border/40 py-1.5 last:border-0">
                <span className="text-muted-foreground/60">{l.ts}</span>
                <span className={cn("font-bold", l.level === "ERROR" ? "text-destructive" : l.level === "WARN" ? "text-warning" : "text-primary")}>{l.level}</span>
                <span className="flex-1 text-foreground/80">{l.message}</span>
              </div>
            ))}
          </div>
        )}
        {tab === "config" && (
          <PluginConfigForm plugin={plugin} />
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, tone, icon: Icon }: { label: string; value: string; tone?: string; icon: React.ElementType }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground"><Icon className="h-3 w-3" /> {label}</div>
      <div className={cn("mt-1 text-[13.5px] font-bold", tone ?? "text-foreground")}>{value}</div>
    </div>
  );
}

function PluginConfigForm({ plugin }: { plugin: Plugin }) {
  return (
    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
      <Field label="Endpoint URL" value={`https://plugins.coherence.ai/${plugin.id}/v${plugin.version.split(".")[0]}`} />
      <Field label="API Key reference" value={`\${secrets.${plugin.name.toUpperCase().replace(/ /g, "_")}_KEY}`} mono />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Timeout (ms)" value={String(plugin.latency * 3)} />
        <Field label="Retry attempts" value="3" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cache TTL (s)" value="60" />
        <Field label="Circuit breaker threshold" value="5" />
      </div>
      <label className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-3 py-2.5">
        <span className="text-[12.5px] text-foreground">Fail open (allow session if plugin errors)</span>
        <ToggleSwitch defaultOn />
      </label>
      <label className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-3 py-2.5">
        <span className="text-[12.5px] text-foreground">Collect telemetry</span>
        <ToggleSwitch defaultOn />
      </label>
      <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
        <Button variant="outline" size="sm">Cancel</Button>
        <Button size="sm"><CheckCircle2 className="h-3.5 w-3.5" /> Save configuration</Button>
      </div>
    </form>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <input defaultValue={value} readOnly={mono} className={cn("mt-1 w-full rounded-md border border-input bg-background/40 px-3 py-2 text-[12.5px] text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30", mono && "font-mono")} />
    </label>
  );
}

function ToggleSwitch({ defaultOn }: { defaultOn?: boolean }) {
  const [on, setOn] = useState(!!defaultOn);
  return (
    <button type="button" onClick={() => setOn(!on)} className={cn("relative h-5 w-9 rounded-full transition-colors", on ? "bg-primary" : "bg-muted")}>
      <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", on ? "left-[18px]" : "left-0.5")} />
    </button>
  );
}
