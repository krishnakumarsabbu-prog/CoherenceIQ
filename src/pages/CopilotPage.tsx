import { CopilotPanel } from "@/components/copilot/CopilotPanel";
import { PageHeader } from "@/components/shell/Breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

export function CopilotPage() {
  return (
    <div className="flex h-full flex-col p-4 lg:p-5">
      <PageHeader
        title="AI Copilot"
        subtitle="Conversational fraud-detection architect — design pipelines, recommend models, and generate governance docs"
        actions={
          <Badge variant="default"><Sparkles className="h-3 w-3" /> AI</Badge>
        }
      />
      <div className="glass-card min-h-0 flex-1 overflow-hidden p-0">
        <CopilotPanel open onOpenChange={() => {}} variant="page" />
      </div>
    </div>
  );
}
