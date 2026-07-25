import { useState } from "react";
import { motion } from "framer-motion";
import { Store, Workflow, Download, Star, CircleCheck as CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/shell/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PluginMarketplace } from "@/components/rulestudio/PluginMarketplace";
import { SAMPLE_PIPELINES } from "@/lib/pipelineData";

type Tab = "plugins" | "templates";

export function MarketplacePage() {
  const [tab, setTab] = useState<Tab>("plugins");
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-5 pt-4 lg:px-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Marketplace</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Install detection plugins and pipeline templates</p>
        </div>
        <div className="flex items-center gap-1">
          {(["plugins", "templates"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-medium capitalize transition-all",
                tab === t ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              {t === "plugins" ? <Store className="h-3.5 w-3.5" /> : <Workflow className="h-3.5 w-3.5" />}
              {t === "plugins" ? "Plugins" : "Pipeline Templates"}
            </button>
          ))}
        </div>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto p-5 lg:p-6">
        {tab === "plugins" ? (
          <PluginMarketplace />
        ) : (
          <PipelineTemplates />
        )}
      </div>
    </div>
  );
}

function PipelineTemplates() {
  return (
    <div>
      <PageHeader
        title="Pipeline Templates"
        subtitle="Pre-built pipeline blueprints — install to start running immediately."
        actions={<Button size="sm"><Workflow className="h-3.5 w-3.5" /> Publish template</Button>}
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {SAMPLE_PIPELINES.map((p, i) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className="flex h-full flex-col p-4">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Workflow className="h-5 w-5" />
                </div>
                <Badge variant="default">{p.version}</Badge>
              </div>
              <h3 className="mt-3 text-[14px] font-semibold text-foreground">{p.name}</h3>
              <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">{p.description}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.tags.map((t) => <Badge key={t} variant="outline" className="text-[9px]">{t}</Badge>)}
              </div>
              <div className="mt-3 flex items-center justify-between text-[10.5px] text-muted-foreground">
                <span className="flex items-center gap-1"><Star className="h-3 w-3" /> 4.{6 + (i % 3)}</span>
                <span>{p.nodes.length} nodes</span>
                <span>by {p.owner}</span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 border-t border-border/60 pt-3">
                <Button variant="outline" size="sm" className="flex-1">Preview</Button>
                <Button size="sm" className="flex-1"><Download className="h-3.5 w-3.5" /> Install</Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
      <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
        <CheckCircle2 className="mx-auto h-6 w-6 text-muted-foreground/60" />
        <p className="mt-2 text-[12px] text-muted-foreground">More templates coming soon from the community.</p>
      </div>
    </div>
  );
}
