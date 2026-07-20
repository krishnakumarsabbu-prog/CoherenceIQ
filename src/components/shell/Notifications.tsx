import { useState } from "react";
import { useNotifications } from "@/providers/NotificationProvider";
import { Popover } from "@/components/ui/popover";
import { Bell, CheckCheck, Circle } from "lucide-react";
import { cn, relativeTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const SEVERITY: Record<string, { dot: string; label: string }> = {
  critical: { dot: "bg-destructive", label: "text-destructive" },
  warning: { dot: "bg-warning", label: "text-warning" },
  success: { dot: "bg-success", label: "text-success" },
  info: { dot: "bg-primary", label: "text-primary" },
};

export function NotificationBell() {
  const { notifications, unread, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger={
        <button className="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
              {unread}
            </span>
          )}
        </button>
      }
    >
      <div className="w-[360px]">
        <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && <Badge variant="destructive" className="text-[9px]">{unread} new</Badge>}
          </div>
          <button onClick={markAllRead} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </button>
        </div>
        <div className="max-h-[360px] overflow-y-auto scrollbar-thin">
          {notifications.map((n) => {
            const s = SEVERITY[n.severity];
            return (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={cn(
                  "flex w-full gap-3 border-b border-border/60 px-3.5 py-2.5 text-left transition-colors hover:bg-accent/50",
                  !n.read && "bg-primary/[0.04]"
                )}
              >
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", s.dot)} />
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("text-[12.5px] font-semibold", !n.read ? "text-foreground" : "text-muted-foreground")}>{n.title}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{relativeTime(n.time)}</span>
                  </div>
                  <p className="text-[11.5px] leading-relaxed text-muted-foreground">{n.body}</p>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className={cn("text-[10px] font-medium", s.label)}>{n.severity.toUpperCase()}</span>
                    <span className="text-[10px] text-muted-foreground/70">· {n.module}</span>
                  </div>
                </div>
                {!n.read && <Circle className="mt-1 h-2 w-2 fill-primary text-primary" />}
              </button>
            );
          })}
        </div>
        <div className="border-t border-border px-3.5 py-2 text-center">
          <button className="text-[11.5px] font-medium text-primary hover:underline">View all activity</button>
        </div>
      </div>
    </Popover>
  );
}
