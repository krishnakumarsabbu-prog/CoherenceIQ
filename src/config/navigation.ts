import {
  Workflow, LayoutDashboard, Boxes, Activity, Gavel, Sparkles, Store, Settings, Blocks, GitCompareArrows,
  type LucideIcon,
} from "lucide-react";

export interface NavModule {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  group: "Build" | "Operate" | "Govern";
  description: string;
  badge?: string;
}

export const NAV_MODULES: NavModule[] = [
  { id: "pipeline-studio", label: "Pipeline Studio", path: "/pipelines", icon: Workflow, group: "Build", description: "Design and run executable pipelines on a visual canvas" },
  { id: "node-registry", label: "Node Registry", path: "/nodes", icon: Blocks, group: "Build", description: "Browse every capability as a reusable pipeline node with schemas and metrics" },
  { id: "assets", label: "Assets", path: "/assets", icon: Boxes, group: "Build", description: "Reusable rule sets, models, feature sets, graphs & datasets" },
  { id: "executions", label: "Executions", path: "/executions", icon: Activity, group: "Build", description: "Run history, logs, and per-step results" },
  { id: "comparison-studio", label: "Comparison Studio", path: "/compare", icon: GitCompareArrows, group: "Build", description: "Execute multiple pipelines in parallel and benchmark results side-by-side" },
  { id: "dashboard", label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, group: "Operate", description: "Executive risk overview & KPIs" },
  { id: "governance", label: "Governance", path: "/governance", icon: Gavel, group: "Govern", description: "Rule intelligence, rule authoring, and session validation" },
  { id: "marketplace", label: "Marketplace", path: "/marketplace", icon: Store, group: "Govern", description: "Install detection plugins and pipeline templates" },
  { id: "administration", label: "Administration", path: "/admin", icon: Settings, group: "Govern", description: "Tenant, users, and environment management" },
];

export const NAV_GROUPS: NavModule["group"][] = ["Build", "Operate", "Govern"];

export const ALL_COMMANDS = [
  ...NAV_MODULES.map((m) => ({ id: m.id, label: m.label, hint: `Go to ${m.label}`, path: m.path, icon: m.icon, group: "Navigation" })),
  { id: "cmd-palette", label: "Command Palette", hint: "Open command palette", path: "", icon: Workflow, group: "Actions" },
  { id: "toggle-theme", label: "Toggle Theme", hint: "Switch light / dark", path: "", icon: Settings, group: "Actions" },
  { id: "notifications", label: "Notifications", hint: "View notifications", path: "", icon: Activity, group: "Actions" },
  { id: "sign-out", label: "Sign Out", hint: "End your session", path: "", icon: Settings, group: "Actions" },
];
