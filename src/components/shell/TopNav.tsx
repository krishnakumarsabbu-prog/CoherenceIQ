import { useEffect, useState } from "react";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationBell } from "./Notifications";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { UserProfile } from "./UserProfile";
import { Command, CircleHelp as HelpCircle, Activity, Zap } from "lucide-react";
import { Tooltip } from "@/components/ui/misc";

interface TopNavProps {
  onOpenCommand: () => void;
}

export function TopNav({ onOpenCommand }: TopNavProps) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card/60 px-4 backdrop-blur-xl">
      <div className="flex items-center gap-2.5">
        <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-cyan-400 shadow-[0_0_18px_-4px_hsl(199_89%_52%)]">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-white"><path d="M4 16c5-9 11-9 16 0" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round"/><circle cx="12" cy="8" r="2.4" fill="currentColor"/></svg>
        </div>
        <div className="hidden flex-col leading-none sm:flex">
          <span className="text-[13px] font-bold tracking-tight text-foreground">CoherenceIQ</span>
          <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground">COHERENCE AI</span>
        </div>
      </div>

      <div className="mx-1 hidden h-5 w-px bg-border sm:block" />

      <div className="hidden items-center gap-1.5 lg:flex">
        <span className="flex items-center gap-1.5 rounded-md bg-success/10 px-2 py-1 text-[10.5px] font-semibold text-success">
          <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" /></span>
          LIVE
        </span>
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{time.toLocaleTimeString("en-US", { hour12: false })}</span>
        <span className="text-[11px] text-muted-foreground/70">UTC-5</span>
      </div>

      <div className="flex-1" />
      <div className="hidden flex-1 justify-center px-4 md:flex">
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-1">
        <Tooltip content="Command palette (Ctrl+K)">
          <button onClick={onOpenCommand} className="hidden h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground sm:inline-flex">
            <Command className="h-4 w-4" />
          </button>
        </Tooltip>
        <Tooltip content="Live API health">
          <button className="hidden h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground lg:inline-flex">
            <Activity className="h-4 w-4" />
          </button>
        </Tooltip>
        <Tooltip content="Quick actions">
          <button className="hidden h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground lg:inline-flex">
            <Zap className="h-4 w-4" />
          </button>
        </Tooltip>
        <Tooltip content="Help & docs">
          <button className="hidden h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground sm:inline-flex">
            <HelpCircle className="h-4 w-4" />
          </button>
        </Tooltip>
        <div className="mx-1 h-5 w-px bg-border" />
        <ThemeSwitcher />
        <NotificationBell />
        <div className="mx-1 h-5 w-px bg-border" />
        <UserProfile />
      </div>
    </header>
  );
}
