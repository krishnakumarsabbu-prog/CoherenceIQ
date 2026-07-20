import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { NAV_MODULES } from "@/config/navigation";
import { Popover } from "@/components/ui/popover";
import { Search, Command, ArrowRight } from "lucide-react";
import { generateSessions } from "@/lib/mockData";

const SESSIONS = generateSessions(200);

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const moduleHits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return NAV_MODULES.slice(0, 4);
    return NAV_MODULES.filter((m) => (m.label + m.description).toLowerCase().includes(q)).slice(0, 4);
  }, [query]);

  const sessionHits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return SESSIONS.filter((s) =>
      s.sessionId.toLowerCase().includes(q) ||
      s.customer.toLowerCase().includes(q) ||
      s.username.toLowerCase().includes(q) ||
      s.ip.includes(q) ||
      s.country.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [query]);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      align="start"
      className="w-full max-w-md"
      contentClassName="w-[460px]"
      trigger={
        <button className="group flex h-9 w-full max-w-md items-center gap-2.5 rounded-md border border-border bg-background/40 px-3 text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:bg-accent/30">
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">Search sessions, customers, modules…</span>
          <kbd className="inline-flex h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </button>
      }
    >
      <div className="border-b border-border p-2.5">
        <div className="flex items-center gap-2 rounded-md bg-background/60 px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sessions, customers, IPs, modules…"
            className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>
      <div className="max-h-[420px] overflow-y-auto scrollbar-thin p-1.5">
        {moduleHits.length > 0 && (
          <>
            <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Modules</div>
            {moduleHits.map((m) => (
              <button
                key={m.id}
                onClick={() => { navigate(m.path); setOpen(false); setQuery(""); }}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left hover:bg-accent"
              >
                <m.icon className="h-3.5 w-3.5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-[12.5px] font-medium text-foreground">{m.label}</div>
                  <div className="text-[10.5px] text-muted-foreground">{m.description}</div>
                </div>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </button>
            ))}
          </>
        )}
        {sessionHits.length > 0 && (
          <>
            <div className="px-2 py-1.5 pt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sessions</div>
            {sessionHits.map((s) => (
              <button
                key={s.sessionId}
                onClick={() => { navigate(`/sessions/${s.sessionId}`); setOpen(false); setQuery(""); }}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left hover:bg-accent"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded bg-muted font-mono text-[10px] font-bold text-muted-foreground">{s.countryCode}</div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-[12.5px] font-medium text-foreground">{s.sessionId} · {s.customer}</div>
                  <div className="truncate text-[10.5px] text-muted-foreground">{s.ip} · {s.city}, {s.countryCode}</div>
                </div>
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold ${s.decision === "Allow" ? "bg-success/15 text-success" : s.decision === "Challenge" ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive"}`}>{s.decision.toUpperCase()}</span>
              </button>
            ))}
          </>
        )}
        {query.length >= 2 && moduleHits.length === 0 && sessionHits.length === 0 && (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">No matches for "{query}"</div>
        )}
      </div>
    </Popover>
  );
}
