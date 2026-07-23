import {
  LayoutDashboard, Search, FileSearch, FolderSearch, Layers3, Gavel, Puzzle, Share2,
  Clock, Brain, History, Cpu, Sparkles, Settings, type LucideIcon,
} from "lucide-react";

export interface NavModule {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  group: "Operate" | "Investigate" | "Govern" | "Intelligence" | "Studio";
  description: string;
  badge?: string;
}

export const NAV_MODULES: NavModule[] = [
  { id: "dashboard", label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, group: "Operate", description: "Executive risk overview & KPIs" },
  { id: "session-explorer", label: "Session Explorer", path: "/sessions", icon: Search, group: "Investigate", description: "Search & filter all login sessions" },
  { id: "session-investigation", label: "Session Investigation", path: "/sessions/S-10000", icon: FileSearch, group: "Investigate", description: "Deep-dive a single session", badge: "PRO" },
  { id: "evidence-explorer", label: "Evidence Explorer", path: "/evidence", icon: FolderSearch, group: "Investigate", description: "Forensic evidence vault" },
  { id: "rule-intelligence", label: "Rule Intelligence", path: "/rule-intelligence", icon: Layers3, group: "Govern", description: "Parse, cluster, and engineer rule features" },
  { id: "rule-studio", label: "Rule Studio", path: "/rules", icon: Gavel, group: "Govern", description: "Author & test risk rules" },
  { id: "plugin-marketplace", label: "Plugin Marketplace", path: "/plugins", icon: Puzzle, group: "Govern", description: "Install detection plugins" },
  { id: "graph-intelligence", label: "Graph Intelligence", path: "/graph", icon: Share2, group: "Intelligence", description: "Entity relationship graph" },
  { id: "temporal-intelligence", label: "Temporal Intelligence", path: "/temporal", icon: Clock, group: "Intelligence", description: "Time-series anomaly detection" },
  { id: "coherence-brain", label: "Coherence Brain", path: "/brain", icon: Brain, group: "Intelligence", description: "Core ML inference engine" },
  { id: "replay-studio", label: "Replay Studio", path: "/replay", icon: History, group: "Studio", description: "Replay sessions step-by-step" },
  { id: "model-studio", label: "Model Studio", path: "/model", icon: Cpu, group: "Studio", description: "Train & evaluate models" },
  { id: "ai-copilot", label: "AI Copilot", path: "/copilot", icon: Sparkles, group: "Studio", description: "Conversational risk assistant", badge: "AI" },
  { id: "administration", label: "Administration", path: "/admin", icon: Settings, group: "Govern", description: "Tenant & user management" },
];

export const NAV_GROUPS: NavModule["group"][] = ["Operate", "Investigate", "Govern", "Intelligence", "Studio"];

export const ALL_COMMANDS = [
  ...NAV_MODULES.map((m) => ({ id: m.id, label: m.label, hint: `Go to ${m.label}`, path: m.path, icon: m.icon, group: "Navigation" })),
  { id: "cmd-palette", label: "Command Palette", hint: "Open command palette", path: "", icon: Search, group: "Actions" },
  { id: "toggle-theme", label: "Toggle Theme", hint: "Switch light / dark", path: "", icon: Settings, group: "Actions" },
  { id: "notifications", label: "Notifications", hint: "View notifications", path: "", icon: Clock, group: "Actions" },
  { id: "sign-out", label: "Sign Out", hint: "End your session", path: "", icon: Settings, group: "Actions" },
];
