import { Link, useLocation } from "react-router-dom";
import { NAV_MODULES } from "@/config/navigation";
import { ChevronRight } from "lucide-react";
import { Fragment } from "react";

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  sessions: "Session Explorer",
  evidence: "Evidence Explorer",
  "rule-intelligence": "Rule Intelligence",
  rules: "Rule Studio",
  plugins: "Plugin Marketplace",
  graph: "Graph Intelligence",
  temporal: "Temporal Intelligence",
  brain: "Coherence Brain",
  replay: "Replay Studio",
  model: "Model Studio",
  copilot: "AI Copilot",
  admin: "Administration",
};

export function Breadcrumbs() {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean);

  const crumbs: { label: string; path?: string }[] = [{ label: "CoherenceIQ", path: "/dashboard" }];
  parts.forEach((p, i) => {
    const isSessionId = i === 1 && parts[0] === "sessions" && p.startsWith("S-");
    if (isSessionId) {
      crumbs.push({ label: "Session Investigation", path: `/sessions` });
      crumbs.push({ label: p });
    } else {
      crumbs.push({ label: LABELS[p] ?? p, path: i === 0 ? `/${parts.slice(0, i + 1).join("/")}` : undefined });
    }
  });

  return (
    <nav className="flex items-center gap-1 text-[12px]">
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        return (
          <Fragment key={i}>
            {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/50" />}
            {c.path && !last ? (
              <Link to={c.path} className="text-muted-foreground transition-colors hover:text-foreground">{c.label}</Link>
            ) : (
              <span className={last ? "font-medium text-foreground" : "text-muted-foreground"}>{c.label}</span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
