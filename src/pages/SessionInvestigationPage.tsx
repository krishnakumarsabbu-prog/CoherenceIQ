import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { generateSessions } from "@/lib/mockData";
import { PageHeader } from "@/components/shell/Breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResizablePanels } from "@/components/shell/ResizablePanels";
import { GaugeChart, AreaChart } from "@/components/charts/Charts";
import { ArrowLeft, Globe, Smartphone, Monitor, Fingerprint, Clock, Zap, ShieldCheck, ShieldAlert, ShieldX, MapPin, Wifi, Server, Activity, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle2, Circle as XCircle, ChevronRight, Copy, Download, Sparkles, Network, KeyRound } from "lucide-react";
import { cn, formatDateTime, formatTime, relativeTime } from "@/lib/utils";
import { motion } from "framer-motion";

const SESSIONS = generateSessions(200);

interface EvidenceRow { id: string; source: string; signal: string; weight: number; type: "geo" | "device" | "behavior" | "network" | "identity"; detail: string }

function buildEvidence(s: typeof SESSIONS[number]): EvidenceRow[] {
  const ev: EvidenceRow[] = [];
  ev.push({ id: "e1", source: "GeoVelocity", signal: "Distance from previous login", weight: s.riskScore >= 60 ? 78 : 22, type: "geo", detail: `${s.previousCity} → ${s.city} in 4.2h` });
  ev.push({ id: "e2", source: "Device Intelligence", signal: "Device fingerprint", weight: s.newDevice ? 64 : 18, type: "device", detail: s.newDevice ? "First-seen fingerprint" : "Known device · 47 logins" });
  ev.push({ id: "e3", source: "IP Reputation", signal: "ASN / proxy / VPN", weight: s.vpn ? 71 : 14, type: "network", detail: `${s.asn} · ${s.isp}${s.vpn ? " · VPN" : ""}` });
  ev.push({ id: "e4", source: "Behavioral Biometrics", signal: "Keystroke cadence", weight: s.coherenceScore < 50 ? 58 : 24, type: "behavior", detail: `Coherence ${s.coherenceScore}/100` });
  ev.push({ id: "e5", source: "Velocity", signal: "Login attempts (1h)", weight: s.failedAttempts > 2 ? 67 : 12, type: "behavior", detail: `${s.velocityEvents} events · ${s.failedAttempts} failed` });
  ev.push({ id: "e6", source: "Identity", signal: "Credential status", weight: 8, type: "identity", detail: `Last successful: ${relativeTime(s.previousLoginTime!)}` });
  return ev;
}

const TYPE_ICON: Record<EvidenceRow["type"], typeof Globe> = {
  geo: MapPin, device: Smartphone, behavior: Activity, network: Network, identity: KeyRound,
};

export function SessionInvestigationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"overview" | "evidence" | "timeline" | "raw">("overview");

  const session = useMemo(() => SESSIONS.find((s) => s.sessionId === id) ?? SESSIONS[0], [id]);
  const evidence = useMemo(() => buildEvidence(session), [session]);

  const decisionColor = session.decision === "Allow" ? "success" : session.decision === "Challenge" ? "warning" : "destructive";
  const DecisionIcon = session.decision === "Allow" ? ShieldCheck : session.decision === "Challenge" ? ShieldAlert : ShieldX;

  const timeline = useMemo(() => [
    { t: session.loginTime, label: "Session initiated", icon: Globe, detail: `${session.channel} · ${session.application}`, kind: "info" },
    { t: session.loginTime, label: "Device fingerprint collected", icon: Fingerprint, detail: session.device, kind: "info" },
    { t: session.loginTime, label: "Geo enrichment resolved", icon: MapPin, detail: `${session.city}, ${session.country}`, kind: "info" },
    { t: session.loginTime, label: session.triggeredRules.length ? `${session.triggeredRules.length} rules triggered` : "No rules triggered", icon: AlertTriangle, detail: session.triggeredRules.join(", ") || "Clean", kind: session.triggeredRules.length ? "warning" : "info" },
    { t: session.loginTime, label: "Coherence Brain inference", icon: Sparkles, detail: `Risk ${session.riskScore} · Coherence ${session.coherenceScore} · Fraud ${session.fraudProbability}%`, kind: "info" },
    { t: session.loginTime, label: `Decision: ${session.decision}`, icon: DecisionIcon, detail: `Latency ${session.latency}ms`, kind: decisionColor },
    { t: session.loginTime, label: session.mfaUsed ? `MFA challenge (${session.mfaType})` : "MFA bypassed", icon: KeyRound, detail: session.mfaUsed ? "Verified" : "Step-up not required", kind: session.mfaUsed ? "success" : "info" },
    { t: session.loginTime, label: session.status === "Success" ? "Session established" : session.status, icon: session.status === "Success" ? CheckCircle2 : XCircle, detail: `Duration ${formatTime(session.duration)}`, kind: session.status === "Success" ? "success" : "destructive" },
  ], [session, DecisionIcon, decisionColor]);

  return (
    <div className="flex h-full flex-col p-5 lg:p-6">
      <PageHeader
        title={`Session ${session.sessionId}`}
        subtitle={`${session.customer} · ${session.application} · ${formatDateTime(session.loginTime)}`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => navigate("/sessions")}><ArrowLeft className="h-3.5 w-3.5" /> Back</Button>
            <Button variant="outline" size="sm"><Copy className="h-3.5 w-3.5" /> Copy ID</Button>
            <Button size="sm"><Download className="h-3.5 w-3.5" /> Export report</Button>
          </>
        }
      />

      {/* Top decision banner */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
        <Card className="relative overflow-hidden p-0">
          <div className={cn("absolute inset-x-0 top-0 h-1", decisionColor === "success" ? "bg-success" : decisionColor === "warning" ? "bg-warning" : "bg-destructive")} />
          <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className={cn("flex h-14 w-14 items-center justify-center rounded-xl", decisionColor === "success" ? "bg-success/15 text-success" : decisionColor === "warning" ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive")}>
                <DecisionIcon className="h-7 w-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-foreground">{session.decision}</span>
                  <Badge variant={decisionColor as any}>{session.status}</Badge>
                </div>
                <div className="mt-0.5 text-[12.5px] text-muted-foreground">
                  Decided in <span className="font-semibold text-foreground">{session.latency}ms</span> · {session.triggeredRules.length} rules triggered · {session.evidenceCount} evidence signals
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Risk</div>
                <div className={cn("text-2xl font-bold tabular-nums", session.riskScore >= 75 ? "text-destructive" : session.riskScore >= 40 ? "text-warning" : "text-success")}>{session.riskScore}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Coherence</div>
                <div className={cn("text-2xl font-bold tabular-nums", session.coherenceScore >= 70 ? "text-success" : session.coherenceScore >= 40 ? "text-warning" : "text-destructive")}>{session.coherenceScore}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Fraud %</div>
                <div className={cn("text-2xl font-bold tabular-nums", session.fraudProbability >= 60 ? "text-destructive" : session.fraudProbability >= 30 ? "text-warning" : "text-success")}>{session.fraudProbability}%</div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Tabs */}
      <div className="mb-3 flex items-center gap-1 border-b border-border">
        {([
          { id: "overview", label: "Overview" },
          { id: "evidence", label: "Evidence" },
          { id: "timeline", label: "Timeline" },
          { id: "raw", label: "Raw JSON" },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "relative -mb-px px-3.5 py-2 text-[12.5px] font-medium transition-colors",
              tab === t.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
            {tab === t.id && <motion.span layoutId="inv-tab" className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {tab === "overview" && (
          <ResizablePanels defaultSizes={[58, 42]} storageKey="inv-panels" direction="horizontal">
            <div className="h-full overflow-y-auto scrollbar-thin pr-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Customer", value: session.customer, icon: KeyRound },
                  { label: "Username", value: session.username, icon: KeyRound },
                  { label: "Customer ID", value: session.customerId, icon: KeyRound },
                  { label: "Application", value: session.application, icon: Monitor },
                  { label: "Channel", value: session.channel, icon: Globe },
                  { label: "Auth Method", value: session.authMethod, icon: ShieldCheck },
                  { label: "Device", value: session.device, icon: Smartphone },
                  { label: "Device Type", value: session.deviceType, icon: Smartphone },
                  { label: "Browser", value: session.browser, icon: Globe },
                  { label: "OS", value: session.os, icon: Monitor },
                  { label: "New Device", value: session.newDevice ? "Yes" : "No", icon: Fingerprint },
                  { label: "VPN / Proxy", value: session.vpn ? "Detected" : "None", icon: Wifi },
                  { label: "IP Address", value: session.ip, icon: Globe },
                  { label: "ISP", value: session.isp, icon: Wifi },
                  { label: "ASN", value: session.asn, icon: Server },
                  { label: "Timezone", value: session.timezone, icon: Clock },
                  { label: "City", value: `${session.city}, ${session.country}`, icon: MapPin },
                  { label: "Coordinates", value: `${session.latitude.toFixed(2)}, ${session.longitude.toFixed(2)}`, icon: MapPin },
                  { label: "Login Time", value: formatDateTime(session.loginTime), icon: Clock },
                  { label: "Duration", value: formatTime(session.duration), icon: Activity },
                  { label: "MFA", value: session.mfaUsed ? session.mfaType : "Not used", icon: ShieldCheck },
                  { label: "Failed Attempts", value: `${session.failedAttempts}`, icon: AlertTriangle },
                ].map((f) => (
                  <div key={f.label} className="glass-card flex items-center gap-3 px-3 py-2.5">
                    <f.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{f.label}</div>
                      <div className="truncate text-[12.5px] font-medium text-foreground">{f.value}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Card>
                  <CardHeader className="pb-1"><CardTitle className="text-xs">Geo Comparison</CardTitle></CardHeader>
                  <CardContent className="pt-1 text-[12px] space-y-1.5">
                    <div className="flex justify-between"><span className="text-muted-foreground">Previous</span><span className="font-medium">{session.previousCity}, {session.previousCountry}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Current</span><span className="font-medium">{session.city}, {session.country}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Previous login</span><span className="font-medium">{relativeTime(session.previousLoginTime!)}</span></div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1"><CardTitle className="text-xs">Velocity</CardTitle></CardHeader>
                  <CardContent className="pt-1 text-[12px] space-y-1.5">
                    <div className="flex justify-between"><span className="text-muted-foreground">Events (1h)</span><span className="font-medium">{session.velocityEvents}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Failed attempts</span><span className="font-medium">{session.failedAttempts}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Evidence signals</span><span className="font-medium">{session.evidenceCount}</span></div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="h-full space-y-3 overflow-y-auto scrollbar-thin pl-3">
              <Card>
                <CardHeader className="pb-1"><CardTitle className="text-xs">Risk Score</CardTitle></CardHeader>
                <CardContent><GaugeChart value={session.riskScore} label="Risk Index" height={150} color={session.riskScore >= 75 ? "hsl(0 72% 56%)" : session.riskScore >= 40 ? "hsl(38 92% 54%)" : "hsl(142 71% 48%)"} /></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1"><CardTitle className="text-xs">Coherence Score</CardTitle></CardHeader>
                <CardContent><GaugeChart value={session.coherenceScore} label="Coherence" height={150} color="hsl(199 89% 52%)" /></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1"><CardTitle className="text-xs">Signal Trace</CardTitle><CardDescription>Last 60s</CardDescription></CardHeader>
                <CardContent>
                  <AreaChart
                    data={{
                      time: Array.from({ length: 12 }, (_, i) => `${i * 5}s`),
                      series: [
                        { name: "Risk", data: Array.from({ length: 12 }, (_, i) => Math.max(2, session.riskScore + Math.sin(i) * 8 - i)), color: "hsl(0 72% 56%)" },
                        { name: "Coherence", data: Array.from({ length: 12 }, (_, i) => Math.min(99, session.coherenceScore + Math.cos(i) * 6 + i)), color: "hsl(199 89% 52%)" },
                      ],
                    }}
                    height={170}
                  />
                </CardContent>
              </Card>
            </div>
          </ResizablePanels>
        )}

        {tab === "evidence" && (
          <div className="h-full overflow-y-auto scrollbar-thin">
            <div className="space-y-2">
              {evidence.map((e, i) => (
                <motion.div key={e.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                  <Card className="flex items-center gap-4 p-4">
                    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", e.weight >= 60 ? "bg-destructive/15 text-destructive" : e.weight >= 30 ? "bg-warning/15 text-warning" : "bg-success/15 text-success")}>
                      {TYPE_ICON[e.type] && (() => { const I = TYPE_ICON[e.type]; return <I className="h-4 w-4" />; })()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-foreground">{e.signal}</span>
                        <Badge variant="muted" className="text-[9px]">{e.source}</Badge>
                      </div>
                      <div className="mt-0.5 text-[11.5px] text-muted-foreground">{e.detail}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Weight</div>
                        <div className={cn("text-base font-bold tabular-nums", e.weight >= 60 ? "text-destructive" : e.weight >= 30 ? "text-warning" : "text-success")}>{e.weight}</div>
                      </div>
                      <div className="h-10 w-24">
                        <GaugeChart value={e.weight} label="" height={40} color={e.weight >= 60 ? "hsl(0 72% 56%)" : e.weight >= 30 ? "hsl(38 92% 54%)" : "hsl(142 71% 48%)"} />
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
            <div className="mt-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-xs">Triggered Rules</CardTitle><CardDescription>Rule policies that fired on this session</CardDescription></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {session.triggeredRules.length === 0 ? (
                      <span className="text-[12px] text-muted-foreground">No rules triggered — session passed all policy gates.</span>
                    ) : session.triggeredRules.map((r) => (
                      <Badge key={r} variant="warning" className="gap-1.5 py-1"><AlertTriangle className="h-3 w-3" /> {r}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="mt-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-xs">Plugin Hits</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {session.pluginHits.length === 0 ? <span className="text-[12px] text-muted-foreground">No plugin contributions.</span> :
                      session.pluginHits.map((p) => <Badge key={p} variant="default" className="gap-1.5 py-1"><Sparkles className="h-3 w-3" /> {p}</Badge>)}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {tab === "timeline" && (
          <div className="h-full overflow-y-auto scrollbar-thin">
            <div className="relative pl-6">
              <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />
              {timeline.map((t, i) => {
                const I = t.icon;
                const color = t.kind === "success" ? "text-success bg-success/15" : t.kind === "warning" ? "text-warning bg-warning/15" : t.kind === "destructive" ? "text-destructive bg-destructive/15" : "text-primary bg-primary/15";
                return (
                  <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="relative mb-5">
                    <div className={cn("absolute -left-[18px] flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-background", color)}>
                      <I className="h-2.5 w-2.5" />
                    </div>
                    <Card className="p-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-semibold text-foreground">{t.label}</span>
                        <span className="font-mono text-[10.5px] text-muted-foreground">{new Date(t.t).toLocaleTimeString("en-US", { hour12: false })}</span>
                      </div>
                      <div className="mt-0.5 text-[11.5px] text-muted-foreground">{t.detail}</div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "raw" && (
          <div className="h-full overflow-hidden rounded-lg border border-border bg-[#0b1220] p-4 font-mono text-[11.5px] leading-relaxed text-muted-foreground">
            <pre className="h-full overflow-y-auto scrollbar-thin">{JSON.stringify(session, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
