import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { TopNav } from "./TopNav";
import { Sidebar } from "./Sidebar";
import { Breadcrumbs } from "./Breadcrumbs";
import { CommandPalette } from "./CommandPalette";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/providers/ThemeProvider";
import { useAuth } from "@/providers/AuthProvider";
import { motion, AnimatePresence } from "framer-motion";

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const { toggle } = useTheme();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => { setCmdOpen(false); }, [location.pathname]);

  const handleAction = (id: string) => {
    if (id === "toggle-theme") toggle();
    else if (id === "sign-out") signOut();
    else if (id === "notifications") navigate("/dashboard");
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      <TopNav onOpenCommand={() => setCmdOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex h-11 shrink-0 items-center justify-between border-b border-border bg-card/30 px-5 backdrop-blur-sm">
            <Breadcrumbs />
            <div className="flex items-center gap-3 text-[10.5px] text-muted-foreground">
              <span className="hidden items-center gap-1.5 sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-success" /> Risk Engine · 88ms
              </span>
              <span className="hidden items-center gap-1.5 sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-warning" /> Session Store · 412ms
              </span>
              <span className="font-mono">v3.2.1</span>
            </div>
          </div>
          <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname.split("/")[1] || "dashboard"}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="flex flex-1 flex-col h-full min-h-0 overflow-auto scrollbar-thin"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} onAction={handleAction} />
    </div>
  );
}
