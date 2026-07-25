import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import { AppLayout } from "@/components/shell/AppLayout";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { RuleIntelligencePage } from "@/pages/RuleIntelligencePage";
import { FeatureIntelligencePage } from "@/pages/FeatureIntelligencePage";
import { DatasetBuilderPage } from "@/pages/DatasetBuilderPage";
import { PipelineStudioPage } from "@/pages/PipelineStudioPage";
import { PipelineComponentsPage } from "@/pages/PipelineComponentsPage";
import { ModelStudioPage } from "@/pages/ModelStudioPage";
import { ExecutionsPage } from "@/pages/ExecutionsPage";
import { ComparisonStudioPage } from "@/pages/ComparisonStudioPage";
import { CoherenceBrainPage } from "@/pages/CoherenceBrainPage";
import { CopilotPage } from "@/pages/CopilotPage";
import { AdministrationPage } from "@/pages/AdministrationPage";
import { SessionInvestigationPage } from "@/pages/SessionInvestigationPage";

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
        <Route path="rules" element={<RuleIntelligencePage />} />
        <Route path="features" element={<FeatureIntelligencePage />} />
        <Route path="datasets" element={<DatasetBuilderPage />} />
        <Route path="pipelines" element={<PipelineStudioPage />} />
        <Route path="components" element={<PipelineComponentsPage />} />
        <Route path="models" element={<ModelStudioPage />} />
        <Route path="executions" element={<ExecutionsPage />} />
        <Route path="compare" element={<ComparisonStudioPage />} />
        <Route path="brain" element={<CoherenceBrainPage />} />
        <Route path="copilot" element={<CopilotPage />} />
        <Route path="admin" element={<AdministrationPage />} />
        <Route path="sessions/:id" element={<SessionInvestigationPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
