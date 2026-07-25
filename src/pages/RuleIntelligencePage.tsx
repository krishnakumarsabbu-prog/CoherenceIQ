import { useMemo, useState } from "react";
import { Layers3, Boxes } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/rulestudio/RuleStudioTabs";
import { ruleIntelligenceApi, type RuleRecord } from "@/lib/ruleIntelligenceData";
import { RuleCatalog } from "@/components/ruleintelligence/RuleCatalog";
import { RuleClustering } from "@/components/ruleintelligence/RuleClustering";
import { RuleDetailsDrawer } from "@/components/ruleintelligence/RuleDetailsDrawer";

type Tab = "catalog" | "clustering";

export function RuleIntelligencePage() {
  const [tab, setTab] = useState<Tab>("catalog");
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [selectedRule, setSelectedRule] = useState<RuleRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: stats } = useQuery({ queryKey: ["ri-stats"], queryFn: ruleIntelligenceApi.getStats });

  const subtitle = useMemo(() => {
    const parts: string[] = [];
    if (stats) {
      parts.push(`${stats.total_rules} rules`);
      parts.push(`${stats.total_clusters} clusters`);
      parts.push(`${Math.round(stats.avg_confidence * 100)}% avg confidence`);
    }
    return parts.join(" · ") || "Upload Markdown rule files to parse, cluster, and engineer features";
  }, [stats]);

  const openRule = (rule: RuleRecord) => {
    setSelectedRule(rule);
    setDrawerOpen(true);
  };

  return (
    <div className="relative flex h-full flex-col">
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <div className="flex items-center justify-between border-b border-border px-5 pt-5 lg:px-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Rule Intelligence</h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">{subtitle}</p>
          </div>
          <TabsList>
            <TabsTrigger value="catalog"><Layers3 className="h-3.5 w-3.5" /> Rule Catalog</TabsTrigger>
            <TabsTrigger value="clustering"><Boxes className="h-3.5 w-3.5" /> Rule Clustering</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="catalog" className="flex-1 overflow-hidden p-5 lg:p-6">
          <RuleCatalog onRowSelect={openRule} />
        </TabsContent>

        <TabsContent value="clustering" className="flex-1 overflow-hidden p-5 lg:p-6">
          <RuleClustering selectedCluster={selectedCluster} onSelectCluster={setSelectedCluster} />
        </TabsContent>

      </Tabs>

      <RuleDetailsDrawer rule={selectedRule} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
