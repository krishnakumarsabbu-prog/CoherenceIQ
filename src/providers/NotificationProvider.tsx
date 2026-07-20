import { createContext, useContext, useState, type ReactNode } from "react";
import type { Notification } from "@/types";

interface NotifCtx {
  notifications: Notification[];
  unread: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  push: (n: Omit<Notification, "id" | "time" | "read">) => void;
}

const NotificationContext = createContext<NotifCtx | undefined>(undefined);

const SEED: Notification[] = [
  { id: "n1", title: "High-risk login blocked", body: "Session #S-9842 from Lagos, NG denied by rule R-117 (Impossible Travel).", severity: "critical", time: new Date(Date.now() - 2 * 60 * 1000).toISOString(), read: false, module: "Session Investigation" },
  { id: "n2", title: "New device challenge", body: "Customer 88421 challenged via SMS OTP for new fingerprint.", severity: "warning", time: new Date(Date.now() - 12 * 60 * 1000).toISOString(), read: false, module: "Session Explorer" },
  { id: "n3", title: "Plugin updated", body: "GeoVelocity v2.4.1 deployed to production tenant.", severity: "success", time: new Date(Date.now() - 58 * 60 * 1000).toISOString(), read: false, module: "Plugin Marketplace" },
  { id: "n4", title: "Coherence Brain retrained", body: "Model coherence-v3.2 AUC improved to 0.961 (+0.004).", severity: "info", time: new Date(Date.now() - 3 * 3600 * 1000).toISOString(), read: true, module: "Model Studio" },
  { id: "n5", title: "API latency spike", body: "Authentication API p95 reached 412ms on us-east-1.", severity: "warning", time: new Date(Date.now() - 5 * 3600 * 1000).toISOString(), read: true, module: "Dashboard" },
];

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(SEED);

  const markRead = (id: string) =>
    setNotifications((n) => n.map((x) => (x.id === id ? { ...x, read: true } : x)));
  const markAllRead = () => setNotifications((n) => n.map((x) => ({ ...x, read: true })));
  const push = (n: Omit<Notification, "id" | "time" | "read">) =>
    setNotifications((prev) => [
      { ...n, id: `n${Date.now()}`, time: new Date().toISOString(), read: false },
      ...prev,
    ]);

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unread, markRead, markAllRead, push }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
