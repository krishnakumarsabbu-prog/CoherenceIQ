import { useState } from "react";
import { Layers3, ShieldCheck, Boxes } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/rulestudio/RuleStudioTabs";
import { RuleIntelligencePage } from "@/pages/RuleIntelligencePage";
import { SessionValidationStudioPage } from "@/pages/SessionValidationStudioPage";
import { useNavigate } from "react-router-dom";

type Tab = "intelligence" | "validation";

export function GovernancePage() {
  const [tab, setTab] = useState<Tab>("intelligence");
  const navigate = useNavigate();

  return (
    <div className="relative flex h-full flex-col">
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <div className="flex items-center justify-between border-b border-border px-5 pt-4 lg:px-6">
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Governance</span>
          <TabsList>
            <TabsTrigger value="intelligence"><Layers3 className="h-3.5 w-3.5" /> Rule Intelligence</TabsTrigger>
            <TabsTrigger value="validation"><ShieldCheck className="h-3.5 w-3.5" /> Session Validation</TabsTrigger>
            <button
              onClick={() => navigate("/assets")}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11.5px] font-semibold text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
            >
              <Boxes className="h-3.5 w-3.5" /> Asset Workspace
            </button>
          </TabsList>
        </div>

        <TabsContent value="intelligence" className="flex-1 overflow-hidden">
          <RuleIntelligencePage />
        </TabsContent>

        <TabsContent value="validation" className="flex-1 overflow-hidden">
          <SessionValidationStudioPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
