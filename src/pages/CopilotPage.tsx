import { useState } from "react";
import { CopilotPanel } from "@/components/copilot/CopilotPanel";
import { PageHeader } from "@/components/shell/Breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Maximize2 } from "lucide-react";

export function CopilotPage() {
  const [open, setOpen] = useState(true);
  return (
    <div className="flex h-full flex-col p-4 lg:p-5">
      <PageHeader
        title="AI Copilot"
        subtitle="Conversational risk intelligence — ask anything about sessions, rules, and policies"
        actions={
          <>
            <Badge variant="default"><Sparkles className="h-3 w-3" /> Preview</Badge>
            <Button size="sm" onClick={() => setOpen((o) => !o)}>
              <Maximize2 className="h-3.5 w-3.5" /> {open ? "Focused" : "Expand"}
            </Button>
          </>
        }
      />
      <div className="glass-card min-h-0 flex-1 overflow-hidden p-0">
        <CopilotPanel open={open} onOpenChange={setOpen} variant="page" />
      </div>
    </div>
  );
}
