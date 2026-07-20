export type Decision = "Allow" | "Challenge" | "Deny";

export interface LoginSession {
  sessionId: string;
  customer: string;
  username: string;
  customerId: string;
  device: string;
  deviceType: "Desktop" | "Mobile" | "Tablet";
  browser: string;
  os: string;
  country: string;
  countryCode: string;
  city: string;
  ip: string;
  riskScore: number;
  coherenceScore: number;
  fraudProbability: number;
  decision: Decision;
  application: string;
  channel: "Web" | "Mobile App" | "API" | "SSO";
  loginTime: string;
  duration: number;
  latency: number;
  newDevice: boolean;
  vpn: boolean;
  mfaUsed: boolean;
  mfaType: string;
  authMethod: string;
  asn: string;
  isp: string;
  timezone: string;
  latitude: number;
  longitude: number;
  userAgent: string;
  fingerprint: string;
  previousLoginTime: string | null;
  previousCountry: string | null;
  previousCity: string | null;
  velocityEvents: number;
  failedAttempts: number;
  evidenceCount: number;
  triggeredRules: string[];
  pluginHits: string[];
  status: "Success" | "Failed" | "Blocked";
}

export interface DashboardSummary {
  totalSessions: number;
  allow: number;
  challenge: number;
  deny: number;
  avgRiskScore: number;
  avgCoherenceScore: number;
  avgFraudProbability: number;
  topCountries: { country: string; code: string; count: number; risk: number }[];
  topDevices: { device: string; count: number }[];
  topBrowsers: { browser: string; count: number }[];
  newDevices: number;
  activePlugins: number;
  avgApiLatency: number;
  apiHealth: { name: string; status: "healthy" | "degraded" | "down"; latency: number; uptime: number }[];
  riskTrend: { time: string; allow: number; challenge: number; deny: number; risk: number }[];
  fraudTrend: { time: string; probability: number; blocked: number }[];
  hourlyHeatmap: { hour: number; day: number; value: number }[];
  countryMap: { code: string; name: string; value: number; risk: number }[];
  decisions24h: { name: string; value: number }[];
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "critical" | "success";
  time: string;
  read: boolean;
  module: string;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: string;
  tenant: string;
  avatar: string;
}
