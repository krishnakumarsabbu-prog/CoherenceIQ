import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import { AppLayout } from "@/components/shell/AppLayout";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { SessionExplorerPage } from "@/pages/SessionExplorerPage";
import { SessionInvestigationPage } from "@/pages/SessionInvestigationPage";
import { ModulePlaceholder } from "@/pages/ModulePlaceholder";
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
        <Route path="rules" element={<ModulePlaceholder moduleId="rule-studio" />} />
        <Route path="plugins" element={<ModulePlaceholder moduleId="plugin-marketplace" />} />
        <Route path="graph" element={<ModulePlaceholder moduleId="graph-intelligence" />} />
        <Route path="temporal" element={<ModulePlaceholder moduleId="temporal-intelligence" />} />
        <Route path="brain" element={<ModulePlaceholder moduleId="coherence-brain" />} />
        <Route path="replay" element={<ModulePlaceholder moduleId="replay-studio" />} />
        <Route path="model" element={<ModulePlaceholder moduleId="model-studio" />} />
        <Route path="copilot" element={<ModulePlaceholder moduleId="ai-copilot" />} />
        <Route path="admin" element={<ModulePlaceholder moduleId="administration" />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
