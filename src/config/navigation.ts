import {
  LayoutDashboard, Layers3, Workflow, Blocks, Cpu, Activity,
  GitCompareArrows, Brain, Sparkles, Settings, Database, Boxes,
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
  { id: "dashboard", label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, group: "Operate", description: "Executive fraud risk overview & KPIs across all pipelines" },
  { id: "rule-intelligence", label: "Rule Intelligence", path: "/rules", icon: Layers3, group: "Build", description: "Upload, parse, and cluster fraud detection rules" },
  { id: "feature-intelligence", label: "Feature Intelligence", path: "/features", icon: Boxes, group: "Build", description: "Generate and engineer ML features from rule clusters" },
  { id: "dataset-builder", label: "Dataset Builder", path: "/datasets", icon: Database, group: "Build", description: "Build ML datasets from features with encoding, scaling, and sampling" },
  { id: "pipeline-studio", label: "Pipeline Studio", path: "/pipelines", icon: Workflow, group: "Build", description: "Design and run executable fraud pipelines on a visual canvas" },
  { id: "pipeline-components", label: "Pipeline Components", path: "/components", icon: Blocks, group: "Build", description: "Library of reusable pipeline nodes — drag directly into Pipeline Studio" },
  { id: "model-studio", label: "Model Studio", path: "/models", icon: Cpu, group: "Build", description: "Train, evaluate, and version ML models — reusable across pipelines" },
  { id: "executions", label: "Executions", path: "/executions", icon: Activity, group: "Build", description: "Run pipelines against sessions, batches, replays, CSV, JSON, or API" },
  { id: "comparison-studio", label: "Comparison Studio", path: "/compare", icon: GitCompareArrows, group: "Build", description: "Compare unlimited pipelines with metrics, charts, and rankings" },
  { id: "coherence-brain", label: "Coherence Brain", path: "/brain", icon: Brain, group: "Build", description: "Final orchestration engine — fuse all models into ALLOW, CHALLENGE, DENY, BLOCK" },
  { id: "ai-copilot", label: "AI Copilot", path: "/copilot", icon: Sparkles, group: "Build", description: "AI assistant — suggest clusters, features, models, and pipeline improvements", badge: "AI" },
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
