import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import { AppLayout } from "@/components/shell/AppLayout";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { PipelineStudioPage } from "@/pages/PipelineStudioPage";
import { NodeRegistryPage } from "@/pages/NodeRegistryPage";
import { AssetsPage } from "@/pages/AssetsPage";
import { ExecutionsPage } from "@/pages/ExecutionsPage";
import { GovernancePage } from "@/pages/GovernancePage";
import { MarketplacePage } from "@/pages/MarketplacePage";
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
        <Route index element={<Navigate to="/pipelines" replace />} />
        <Route path="pipelines" element={<PipelineStudioPage />} />
        <Route path="nodes" element={<NodeRegistryPage />} />
        <Route path="assets" element={<AssetsPage />} />
        <Route path="executions" element={<ExecutionsPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="governance" element={<GovernancePage />} />
        <Route path="marketplace" element={<MarketplacePage />} />
        <Route path="admin" element={<AdministrationPage />} />
        <Route path="sessions/:id" element={<SessionInvestigationPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/pipelines" replace />} />
    </Routes>
  );
}
