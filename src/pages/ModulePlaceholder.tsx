import { NAV_MODULES } from "@/config/navigation";
import { PageHeader } from "@/components/shell/Breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Lock } from "lucide-react";

const MODULE_CONTENT: Record<string, { tagline: string; features: { title: string; desc: string }[]; stats: { label: string; value: string }[]; status: string }> = {
  "evidence-explorer": {
    tagline: "Forensic evidence vault — every signal, preserved.",
    status: "Beta",
    features: [
      { title: "Immutable evidence store", desc: "Cryptographically signed evidence records retained for 7 years." },
      { title: "Chain of custody", desc: "Audit trail for every signal collected, transformed, and scored." },
      { title: "Signal replay", desc: "Reconstruct the exact evidence set that drove any historical decision." },
    ],
    stats: [{ label: "Evidence records", value: "8.4M" }, { label: "Avg retention", value: "7y" }, { label: "Integrity checks", value: "100%" }],
  },
  "rule-studio": {
    tagline: "Author, simulate, and deploy risk rules — no code.",
    status: "GA",
    features: [
      { title: "Visual rule builder", desc: "Compose conditions across 240+ signals with a drag-and-drop canvas." },
      { title: "Sandbox simulation", desc: "Replay 90 days of sessions against a draft rule before promoting." },
      { title: "Versioned deployments", desc: "Roll back any rule in seconds; every change is tracked and signed." },
    ],
    stats: [{ label: "Active rules", value: "148" }, { label: "Draft rules", value: "12" }, { label: "Avg deploy time", value: "42s" }],
  },
  "plugin-marketplace": {
    tagline: "Extend CoherenceIQ with certified detection plugins.",
    status: "GA",
    features: [
      { title: "18 certified plugins", desc: "From GeoVelocity to Behavioral Biometrics — install in one click." },
      { title: "Custom plugin SDK", desc: "Ship proprietary signals as private plugins for your tenant only." },
      { title: "Telemetry & billing", desc: "Per-plugin latency, hit-rate, and cost surfaced in real time." },
    ],
    stats: [{ label: "Installed", value: "18" }, { label: "Available", value: "64" }, { label: "Avg install", value: "8s" }],
  },
  "graph-intelligence": {
    tagline: "Entity relationships, link analysis, and fraud rings.",
    status: "Beta",
    features: [
      { title: "Device-to-user graph", desc: "Visualize shared devices, IPs, and fingerprints across customers." },
      { title: "Fraud ring detection", desc: "Community detection flags coordinated account-takeover rings." },
      { title: "Path queries", desc: "Find the shortest link between any two identities in milliseconds." },
    ],
    stats: [{ label: "Entities", value: "12.1M" }, { label: "Edges", value: "94M" }, { label: "Rings flagged", value: "37" }],
  },
  "temporal-intelligence": {
    tagline: "Time-series anomaly detection across login behavior.",
    status: "Beta",
    features: [
      { title: "Seasonality modeling", desc: "Per-user baselines learn daily and weekly login patterns." },
      { title: "Drift detection", desc: "Alerts when cohort behavior shifts beyond confidence bands." },
      { title: "Forecast replay", desc: "Compare predicted vs. actual volume for any time window." },
    ],
    stats: [{ label: "Baselines", value: "2.3M" }, { label: "Anomalies / day", value: "412" }, { label: "Model accuracy", value: "94.2%" }],
  },
  "coherence-brain": {
    tagline: "The core ML engine that fuses every signal into one score.",
    status: "GA",
    features: [
      { title: "Ensemble inference", desc: "Gradient-boosted + graph neural network produce a single coherence score." },
      { title: "Explainability", desc: "SHAP-style feature attribution for every inference in under 12ms." },
      { title: "Online learning", desc: "Brain retrains nightly on labeled outcomes; AUC tracked continuously." },
    ],
    stats: [{ label: "Model version", value: "v3.2" }, { label: "AUC", value: "0.961" }, { label: "Inference p95", value: "12ms" }],
  },
  "replay-studio": {
    tagline: "Step through any session event-by-event.",
    status: "Beta",
    features: [
      { title: "Event timeline", desc: "Scrub through every API call, signal, and decision in sequence." },
      { title: "Side-by-side diff", desc: "Compare a suspicious session against the user's known-good baseline." },
      { title: "What-if simulation", desc: "Toggle rules off and re-score a historical session instantly." },
    ],
    stats: [{ label: "Replayable sessions", value: "100%" }, { label: "Avg load", value: "320ms" }, { label: "What-if runs / day", value: "1.8K" }],
  },
  "model-studio": {
    tagline: "Train, evaluate, and ship custom risk models.",
    status: "GA",
    features: [
      { title: "Feature store", desc: "240+ engineered features with lineage and freshness tracking." },
      { title: "Experiment tracking", desc: "Compare AUC, precision, recall, and drift across model versions." },
      { title: "Shadow deployment", desc: "Run a candidate model in parallel and compare decisions live." },
    ],
    stats: [{ label: "Models", value: "14" }, { label: "Experiments", value: "286" }, { label: "Best AUC", value: "0.961" }],
  },
  "ai-copilot": {
    tagline: "Conversational risk intelligence — ask anything.",
    status: "Preview",
    features: [
      { title: "Natural-language queries", desc: "\"Show me high-risk logins from Nigeria in the last hour.\" Just ask." },
      { title: "Root-cause explanation", desc: "Copilot explains why a session was denied, citing every signal." },
      { title: "Rule authoring assist", desc: "Describe a policy in English; Copilot drafts the rule for you." },
    ],
    stats: [{ label: "Queries / day", value: "4.2K" }, { label: "Avg latency", value: "1.1s" }, { label: "Satisfaction", value: "92%" }],
  },
  "administration": {
    tagline: "Tenant, user, and policy management.",
    status: "GA",
    features: [
      { title: "Tenant isolation", desc: "Per-tenant data boundaries, keys, and audit logs." },
      { title: "RBAC & SSO", desc: "Granular roles with SAML / OIDC federation and SCIM provisioning." },
      { title: "Compliance exports", desc: "On-demand audit reports for SOC 2, ISO 27001, and PCI DSS." },
    ],
    stats: [{ label: "Users", value: "284" }, { label: "Roles", value: "12" }, { label: "Tenants", value: "6" }],
  },
};

export function ModulePlaceholder({ moduleId }: { moduleId: string }) {
  const mod = NAV_MODULES.find((m) => m.id === moduleId)!;
  const content = MODULE_CONTENT[moduleId] ?? MODULE_CONTENT["rule-studio"];
  const Icon = mod.icon;

  return (
    <div className="p-5 lg:p-6">
      <PageHeader
        title={mod.label}
        subtitle={content.tagline}
        actions={
          <>
            <Badge variant={content.status === "GA" ? "success" : content.status === "Beta" ? "warning" : "default"}>
              {content.status}
            </Badge>
            <Button size="sm"><Sparkles className="h-3.5 w-3.5" /> Get started</Button>
          </>
        }
      />

      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="relative overflow-hidden p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-[80px]" />
          <div className="relative flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/20 to-cyan-400/10 ring-1 ring-inset ring-primary/20">
                <Icon className="h-7 w-7 text-primary" />
              </div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground">{mod.label}</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{mod.description}. {content.tagline}</p>
              <div className="mt-5 flex items-center gap-3">
                <Button><Sparkles className="h-4 w-4" /> Launch {mod.label} <ArrowRight className="h-4 w-4" /></Button>
                <Button variant="outline"><Lock className="h-4 w-4" /> Request access</Button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {content.stats.map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 + i * 0.08 }} className="glass-card p-4 text-center">
                  <div className="text-xl font-bold text-foreground">{s.value}</div>
                  <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Feature cards */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        {content.features.map((f, i) => (
          <motion.div key={f.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.08 }}>
            <Card className="h-full">
              <CardHeader>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <span className="text-[12px] font-bold">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <CardTitle className="pt-2 text-[14px]">{f.title}</CardTitle>
                <CardDescription className="text-[12.5px] leading-relaxed">{f.desc}</CardDescription>
              </CardHeader>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Coming soon strip */}
      <Card className="mt-4">
        <CardContent className="flex items-center justify-between p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-cyan-400">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-foreground">This module is fully interactive in CoherenceIQ Enterprise</div>
              <div className="text-[12px] text-muted-foreground">The Dashboard, Session Explorer, and Session Investigation modules are live in this preview.</div>
            </div>
          </div>
          <Button variant="outline" size="sm">Book a demo <ArrowRight className="h-3.5 w-3.5" /></Button>
        </CardContent>
      </Card>
    </div>
  );
}
