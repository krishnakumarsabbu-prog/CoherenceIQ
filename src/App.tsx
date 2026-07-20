import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import { AppLayout } from "@/components/shell/AppLayout";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { SessionExplorerPage } from "@/pages/SessionExplorerPage";
import { SessionInvestigationPage } from "@/pages/SessionInvestigationPage";
import { ModulePlaceholder } from "@/pages/ModulePlaceholder";
import { RuleStudioPage } from "@/pages/RuleStudioPage";
import { GraphIntelligencePage } from "@/pages/GraphIntelligencePage";
import { TemporalIntelligencePage } from "@/pages/TemporalIntelligencePage";
import { CoherenceBrainPage } from "@/pages/CoherenceBrainPage";
import { NAV_MODULES } from "@/config/navigation";

function Protected({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <Protected>
            <AppLayout />
          </Protected>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="sessions" element={<SessionExplorerPage />} />
        <Route path="sessions/:id" element={<SessionInvestigationPage />} />
        <Route path="evidence" element={<ModulePlaceholder moduleId="evidence-explorer" />} />
        <Route path="rules" element={<RuleStudioPage />} />
        <Route path="plugins" element={<RuleStudioPage />} />
        <Route path="graph" element={<GraphIntelligencePage />} />
        <Route path="temporal" element={<TemporalIntelligencePage />} />
        <Route path="brain" element={<CoherenceBrainPage />} />
        <Route path="replay" element={<ModulePlaceholder moduleId="replay-studio" />} />
        <Route path="model" element={<ModulePlaceholder moduleId="model-studio" />} />
        <Route path="copilot" element={<ModulePlaceholder moduleId="ai-copilot" />} />
        <Route path="admin" element={<RuleStudioPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
