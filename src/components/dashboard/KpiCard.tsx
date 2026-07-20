import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { ReactNode } from "react";

interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: number;
  deltaSuffix?: string;
  icon?: LucideIcon;
  accent?: "primary" | "success" | "warning" | "destructive";
  spark?: ReactNode;
  index?: number;
}

const ACCENT: Record<string, string> = {
  primary: "from-sky-500/15 to-transparent text-sky-400",
  success: "from-emerald-500/15 to-transparent text-emerald-400",
  warning: "from-amber-500/15 to-transparent text-amber-400",
  destructive: "from-rose-500/15 to-transparent text-rose-400",
};

export function KpiCard({ label, value, delta, deltaSuffix = "%", icon: Icon, accent = "primary", spark, index = 0 }: KpiCardProps) {
  const up = (delta ?? 0) >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
    >
      <Card className="kpi-card p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <div className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
            <div className="mt-1.5 text-[24px] font-bold leading-none tabular-nums text-foreground">{value}</div>
          </div>
          {Icon && (
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br", ACCENT[accent])}>
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between">
          {delta !== undefined && (
            <div className={cn("flex items-center gap-1 text-[11px] font-medium", up ? "text-success" : "text-destructive")}>
              {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(delta).toFixed(1)}{deltaSuffix}
              <span className="text-muted-foreground/70">vs 24h</span>
            </div>
          )}
          {spark && <div className="h-7 w-20">{spark}</div>}
        </div>
      </Card>
    </motion.div>
  );
}
