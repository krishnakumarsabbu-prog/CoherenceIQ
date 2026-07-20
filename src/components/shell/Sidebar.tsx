import { NavLink, useLocation } from "react-router-dom";
import { NAV_GROUPS, NAV_MODULES } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { ChevronRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-border bg-card/40 backdrop-blur-xl transition-[width] duration-200",
        collapsed ? "w-[64px]" : "w-[232px]"
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-border px-3">
        <button onClick={onToggle} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
          <ChevronRight className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </button>
        {!collapsed && (
          <div className="flex flex-col leading-none">
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Workspace</span>
            <span className="text-xs font-semibold text-foreground">Global Bank</span>
          </div>
        )}
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto py-3">
        {NAV_GROUPS.map((group) => {
          const items = NAV_MODULES.filter((m) => m.group === group);
          if (!items.length) return null;
          return (
            <div key={group} className="px-2 pb-3">
              {!collapsed && (
                <div className="px-2 pb-1.5 pt-2 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">{group}</div>
              )}
              <div className="space-y-0.5">
                {items.map((m) => {
                  const active = location.pathname === m.path || (m.path !== "/dashboard" && location.pathname.startsWith(m.path.split("/:")[0]));
                  return (
                    <NavLink
                      key={m.id}
                      to={m.path}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] font-medium transition-all",
                        active ? "text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                        collapsed && "justify-center"
                      )}
                      title={collapsed ? m.label : undefined}
                    >
                      {active && (
                        <motion.span
                          layoutId="sidebar-active"
                          className="absolute inset-0 rounded-md bg-primary/10 ring-1 ring-inset ring-primary/25"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      {active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />}
                      <m.icon className={cn("relative z-10 h-4 w-4 shrink-0", active && "text-primary")} />
                      {!collapsed && (
                        <>
                          <span className="relative z-10 flex-1 truncate">{m.label}</span>
                          {m.badge && (
                            <span className={cn(
                              "relative z-10 rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wide",
                              m.badge === "AI" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                            )}>
                              {m.badge === "AI" && <Sparkles className="mr-0.5 inline h-2.5 w-2.5" />}{m.badge}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <div className={cn("flex items-center gap-2 rounded-lg bg-gradient-to-br from-primary/10 to-transparent px-2.5 py-2", collapsed && "justify-center")}>
          <div className="relative flex h-7 w-7 items-center justify-center rounded-md bg-primary/20">
            <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-md bg-primary/30" />
            <Sparkles className="relative h-3.5 w-3.5 text-primary" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-[11px] font-semibold text-foreground">Brain v3.2</div>
              <div className="text-[9.5px] text-muted-foreground">AUC 0.961 · Healthy</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
