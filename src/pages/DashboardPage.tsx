import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { generateDashboard, generateSessions } from "@/lib/mockData";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shell/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AreaChart, BarChart, PieChart, HeatmapChart, GaugeChart, CountryMapChart, StackedAreaChart, TrendLineChart } from "@/components/charts/Charts";
import { Activity, ShieldCheck, ShieldAlert, ShieldX, Gauge, Brain, TriangleAlert as AlertTriangle, Smartphone, Puzzle, Zap, Globe, TrendingUp, RefreshCw, Download, ChevronRight } from "lucide-react";
import { formatCompact, formatNumber, formatPercent } from "@/lib/utils";
import { motion } from "framer-motion";

export function DashboardPage() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const sessions = generateSessions(200);
      return generateDashboard(sessions);
    },
    staleTime: 120_000,
  });

  const d = useMemo(() => data, [data]);

  if (!d) {
    return <div className="p-6"><div className="h-6 w-32 animate-pulse rounded bg-muted" /></div>;
  }

  return (
    <div className="p-5 lg:p-6">
      <PageHeader
        title="Executive Dashboard"
        subtitle="Real-time login risk intelligence across Global Bank · Production"
        actions={
          <>
            <Button variant="outline" size="sm"><RefreshCw className="h-3.5 w-3.5" /> Refresh</Button>
            <Button variant="outline" size="sm"><Download className="h-3.5 w-3.5" /> Export</Button>
            <Button size="sm"><TrendingUp className="h-3.5 w-3.5" /> Last 24 hours</Button>
          </>
        }
      />

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
        <KpiCard index={0} label="Total Sessions" value={formatCompact(d.totalSessions)} delta={8.4} icon={Activity} accent="primary" />
        <KpiCard index={1} label="Allow" value={formatCompact(d.allow)} delta={2.1} icon={ShieldCheck} accent="success" />
        <KpiCard index={2} label="Challenge" value={formatCompact(d.challenge)} delta={-3.2} icon={ShieldAlert} accent="warning" />
        <KpiCard index={3} label="Deny" value={formatCompact(d.deny)} delta={1.7} icon={ShieldX} accent="destructive" />
        <KpiCard index={4} label="Avg Risk Score" value={d.avgRiskScore} delta={-4.6} icon={Gauge} accent="warning" />
        <KpiCard index={5} label="Avg Coherence" value={d.avgCoherenceScore} delta={1.2} icon={Brain} accent="primary" />
        <KpiCard index={6} label="Fraud Probability" value={formatPercent(d.avgFraudProbability)} delta={-0.8} icon={AlertTriangle} accent="destructive" />
      </div>

      {/* Secondary KPI Row */}
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-5">
        <KpiCard index={0} label="New Devices" value={formatNumber(d.newDevices)} delta={12.4} icon={Smartphone} accent="primary" />
        <KpiCard index={1} label="Active Plugins" value={d.activePlugins} delta={0} deltaSuffix="" icon={Puzzle} accent="success" />
        <KpiCard index={2} label="Avg API Latency" value={`${d.avgApiLatency}ms`} delta={-6.1} icon={Zap} accent="primary" />
        <KpiCard index={3} label="Top Country" value={d.topCountries[0]?.country.split(" ").slice(0, 2).join(" ") ?? "—"} delta={5.2} icon={Globe} accent="warning" />
        <KpiCard index={4} label="Blocked Savings" value="$2.4M" delta={14.8} icon={ShieldCheck} accent="success" />
      </div>

      {/* Main charts grid */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Risk & Decision Trend</CardTitle>
              <CardDescription>Hourly distribution of allow / challenge / deny decisions</CardDescription>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" /> Allow</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning" /> Challenge</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive" /> Deny</span>
            </div>
          </CardHeader>
          <CardContent>
            <StackedAreaChart
              time={d.riskTrend.map((r) => r.time)}
              series={[
                { name: "Allow", data: d.riskTrend.map((r) => r.allow), color: "hsl(142, 71%, 48%)" },
                { name: "Challenge", data: d.riskTrend.map((r) => r.challenge), color: "hsl(38, 92%, 54%)" },
                { name: "Deny", data: d.riskTrend.map((r) => r.deny), color: "hsl(0, 72%, 56%)" },
              ]}
              height={280}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Decisions (24h)</CardTitle>
            <CardDescription>Distribution of enforcement outcomes</CardDescription>
          </CardHeader>
          <CardContent>
            <PieChart
              data={[
                { name: "Allow", value: d.decisions24h[0].value },
                { name: "Challenge", value: d.decisions24h[1].value },
                { name: "Deny", value: d.decisions24h[2].value },
              ]}
              height={280}
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Average Risk Score</CardTitle>
            <CardDescription>Cohort risk over rolling window</CardDescription>
          </CardHeader>
          <CardContent>
            <GaugeChart value={d.avgRiskScore} label="Risk Index" height={170} color="hsl(38, 92%, 54%)" />
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-success/10 py-1.5"><div className="text-sm font-bold text-success">Low</div><div className="text-[10px] text-muted-foreground">0–39</div></div>
              <div className="rounded-md bg-warning/10 py-1.5"><div className="text-sm font-bold text-warning">Med</div><div className="text-[10px] text-muted-foreground">40–77</div></div>
              <div className="rounded-md bg-destructive/10 py-1.5"><div className="text-sm font-bold text-destructive">High</div><div className="text-[10px] text-muted-foreground">78–100</div></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Fraud Probability Trend</CardTitle>
            <CardDescription>Daily fraud probability & blocked attempts</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendLineChart
              time={d.fraudTrend.map((f) => f.time)}
              series={[
                { name: "Fraud Probability %", data: d.fraudTrend.map((f) => f.probability), color: "hsl(0, 72%, 56%)" },
                { name: "Blocked Attempts", data: d.fraudTrend.map((f) => f.blocked), color: "hsl(38, 92%, 54%)" },
              ]}
              height={240}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Top Countries</CardTitle>
            <CardDescription>Session volume by origin (color = avg risk)</CardDescription>
          </CardHeader>
          <CardContent>
            <CountryMapChart data={d.countryMap} height={260} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>Session Heatmap</CardTitle>
            <CardDescription>Login volume by day of week & hour</CardDescription>
          </CardHeader>
          <CardContent>
            <HeatmapChart data={d.hourlyHeatmap} height={260} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Top Devices</CardTitle>
            <CardDescription>Most common login devices</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart
              data={{
                categories: d.topDevices.map((t) => t.device.split(" ").slice(0, 2).join(" ")),
                series: [{ name: "Sessions", data: d.topDevices.map((t) => t.count) }],
              }}
              height={260}
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Top Browsers</CardTitle>
            <CardDescription>Browser distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <AreaChart
              data={{
                time: d.topBrowsers.map((b) => b.browser.split(" ")[0]),
                series: [{ name: "Sessions", data: d.topBrowsers.map((b) => b.count) }],
              }}
              height={220}
            />
          </CardContent>
        </Card>

        {/* API Health */}
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>API Health</CardTitle>
              <CardDescription>Service mesh status & latency</CardDescription>
            </div>
            <Badge variant="success" className="gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-success" /> 5 of 6 healthy</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {d.apiHealth.map((s, i) => (
                <motion.div
                  key={s.name}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/30 px-3 py-2.5 transition-colors hover:bg-accent/40"
                >
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.status === "healthy" ? "bg-success" : s.status === "degraded" ? "bg-warning" : "bg-destructive"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-[13px] font-medium text-foreground">{s.name}</div>
                    <div className="text-[10.5px] text-muted-foreground">Uptime {s.uptime}%</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-[12.5px] font-semibold tabular-nums text-foreground">{s.latency}ms</div>
                      <div className="text-[9.5px] text-muted-foreground">p95</div>
                    </div>
                    <div className={`hidden w-20 rounded-md px-2 py-1 text-center text-[10.5px] font-semibold uppercase sm:block ${s.status === "healthy" ? "bg-success/10 text-success" : s.status === "degraded" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"}`}>
                      {s.status}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
