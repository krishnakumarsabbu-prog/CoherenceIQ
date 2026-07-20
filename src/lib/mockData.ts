import type { DashboardSummary, Decision, LoginSession } from "@/types";

const CUSTOMERS = [
  "Marcus Whitfield", "Eleanor Voss", "Hiroshi Tanaka", "Priya Raghunathan", "Olamide Adesanya",
  "Sofia Kowalski", "Liang Wei", "Anastasia Petrov", "Jean-Baptiste Mercier", "Fatima Al-Rashid",
  "Diego Hernández", "Ingrid Lindqvist", "Rajesh Mehta", "Camille Dubois", "Thomas O'Sullivan",
  "Yuki Yamamoto", "Hassan Bin-Saleh", "Greta Müller", "Mateo Rossi", "Aisha Okonkwo",
  "Viktor Navarro", "Lena Bergström", "Sundeep Iyer", "Margaux Lefevre", "Cormac Fitzgerald",
  "Naomi Brennan", "Kwame Asante", "Isabela Costa", "Felix Hoffmann", "Sana Qureshi",
];

const COUNTRIES: { name: string; code: string; cities: string[]; lat: number; lng: number }[] = [
  { name: "United States", code: "US", cities: ["New York", "San Francisco", "Chicago", "Austin", "Seattle"], lat: 40.71, lng: -74.0 },
  { name: "United Kingdom", code: "GB", cities: ["London", "Manchester", "Edinburgh"], lat: 51.5, lng: -0.12 },
  { name: "Germany", code: "DE", cities: ["Frankfurt", "Munich", "Berlin"], lat: 50.11, lng: 8.68 },
  { name: "Singapore", code: "SG", cities: ["Singapore"], lat: 1.35, lng: 103.8 },
  { name: "Japan", code: "JP", cities: ["Tokyo", "Osaka"], lat: 35.68, lng: 139.69 },
  { name: "India", code: "IN", cities: ["Mumbai", "Bengaluru", "Delhi"], lat: 19.07, lng: 72.87 },
  { name: "Brazil", code: "BR", cities: ["São Paulo", "Rio de Janeiro"], lat: -23.55, lng: -46.63 },
  { name: "Nigeria", code: "NG", cities: ["Lagos", "Abuja"], lat: 6.52, lng: 3.37 },
  { name: "United Arab Emirates", code: "AE", cities: ["Dubai", "Abu Dhabi"], lat: 25.2, lng: 55.27 },
  { name: "Australia", code: "AU", cities: ["Sydney", "Melbourne"], lat: -33.86, lng: 151.2 },
  { name: "Canada", code: "CA", cities: ["Toronto", "Vancouver"], lat: 43.65, lng: -79.38 },
  { name: "France", code: "FR", cities: ["Paris", "Lyon"], lat: 48.85, lng: 2.35 },
  { name: "Netherlands", code: "NL", cities: ["Amsterdam"], lat: 52.37, lng: 4.89 },
  { name: "South Africa", code: "ZA", cities: ["Johannesburg", "Cape Town"], lat: -26.2, lng: 28.04 },
  { name: "South Korea", code: "KR", cities: ["Seoul"], lat: 37.56, lng: 126.97 },
];

const DEVICES = [
  { name: "MacBook Pro 16\"", type: "Desktop" as const },
  { name: "iPhone 15 Pro", type: "Mobile" as const },
  { name: "Pixel 8 Pro", type: "Mobile" as const },
  { name: "ThinkPad X1 Carbon", type: "Desktop" as const },
  { name: "iPad Pro 12.9", type: "Tablet" as const },
  { name: "Galaxy S24 Ultra", type: "Mobile" as const },
  { name: "Dell XPS 15", type: "Desktop" as const },
  { name: "Surface Laptop 5", type: "Desktop" as const },
  { name: "iPhone 14", type: "Mobile" as const },
  { name: "Galaxy Tab S9", type: "Tablet" as const },
];

const BROWSERS = ["Chrome 131", "Safari 17.4", "Edge 131", "Firefox 133", "Chrome Mobile 131", "Safari Mobile 17"];
const OS = ["macOS 14.5", "Windows 11 Pro", "iOS 17.4", "Android 14", "Ubuntu 24.04", "iPadOS 17.4"];
const APPS = ["Retail Banking", "Wealth Portal", "Corporate Treasury", "Mobile Banking", "Trading Platform", "Card Management", "Loan Center", "Investment Portal"];
const CHANNELS: LoginSession["channel"][] = ["Web", "Mobile App", "API", "SSO"];
const AUTH_METHODS = ["Password + OTP", "Biometric", "Hardware Key", "SSO SAML", "Password + Push", "Password only"];
const MFA_TYPES = ["SMS OTP", "Authenticator App", "Hardware Key", "Push Notification", "Biometric", "—"];
const RULES = ["R-117 Impossible Travel", "R-203 New Device", "R-041 Velocity Spike", "R-310 Credential Stuffing", "R-089 Anomalous ASN", "R-512 Low Coherence", "R-155 Geo Mismatch", "R-404 Off-Hours Login", "R-221 Emulator Detection", "R-077 IP Reputation"];
const PLUGINS = ["GeoVelocity", "Device Intelligence", "Behavioral Biometrics", "IP Reputation", "Tor/Proxy Detector", "Email Age", "Phone Verify", "BREIN Profile"];
const ISPS = ["Comcast Cable", "AT&T Fiber", "BT Group", "Deutsche Telekom", "Singtel", "NTT West", "Jio", "Vivo Fibra", "MTN Nigeria", "Etisalat", "Telstra", "Bell Canada", "Orange France", "KPN", "Vodacom", "SK Broadband"];
const ASNS = ["AS7922", "AS7018", "AS2856", "AS3320", "AS7474", "AS4766", "AS28573", "AS29091", "AS15802", "AS1221", "AS577", "AS3215", "AS1136", "AS3741", "AS9318"];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min: number, max: number, d = 2): number { return parseFloat((Math.random() * (max - min) + min).toFixed(d)); }

function randomIp(): string {
  return `${randInt(1, 223)}.${randInt(0, 255)}.${randInt(0, 255)}.${randInt(1, 254)}`;
}

function weightedDecision(risk: number): Decision {
  if (risk >= 78) return "Deny";
  if (risk >= 45) return "Challenge";
  return "Allow";
}

function randomUsername(name: string): string {
  const parts = name.toLowerCase().split(" ");
  const styles = [`${parts[0]}.${parts[1]}`, `${parts[0][0]}${parts[1]}`, `${parts[0]}_${parts[1]}`, `${parts[0]}.${parts[1][0]}`];
  return pick(styles);
}

export function generateSessions(count = 200): LoginSession[] {
  const sessions: LoginSession[] = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const customer = pick(CUSTOMERS);
    const country = pick(COUNTRIES);
    const city = pick(country.cities);
    const device = pick(DEVICES);
    const browser = pick(BROWSERS);
    const os = pick(OS);
    const app = pick(APPS);
    const channel = pick(CHANNELS);
    const riskScore = randInt(2, 99);
    const coherenceScore = randInt(20, 99);
    const fraudProbability = Math.min(99, Math.max(1, Math.round(riskScore * 0.65 + (100 - coherenceScore) * 0.35 + randInt(-6, 6))));
    const decision = weightedDecision(riskScore);
    const newDevice = Math.random() < 0.18;
    const vpn = Math.random() < 0.22;
    const mfaUsed = decision !== "Deny" && Math.random() < 0.78;
    const loginTime = new Date(now - randInt(0, 72 * 3600 * 1000)).toISOString();
    const prevOffset = randInt(6, 240) * 3600 * 1000;
    const triggeredCount = riskScore >= 45 ? randInt(1, 4) : randInt(0, 1);
    const triggered: string[] = [];
    for (let j = 0; j < triggeredCount; j++) triggered.push(pick(RULES));
    const pluginCount = randInt(0, 3);
    const pluginHits: string[] = [];
    for (let j = 0; j < pluginCount; j++) pluginHits.push(pick(PLUGINS));

    sessions.push({
      sessionId: `S-${(10000 - i).toString().padStart(5, "0")}`,
      customer,
      username: randomUsername(customer),
      customerId: `C-${randInt(10000, 99999)}`,
      device: device.name,
      deviceType: device.type,
      browser,
      os,
      country: country.name,
      countryCode: country.code,
      city,
      ip: randomIp(),
      riskScore,
      coherenceScore,
      fraudProbability,
      decision,
      application: app,
      channel,
      loginTime,
      duration: randInt(1, 1200),
      latency: randInt(38, 820),
      newDevice,
      vpn,
      mfaUsed,
      mfaType: mfaUsed ? pick(MFA_TYPES) : "—",
      authMethod: pick(AUTH_METHODS),
      asn: pick(ASNS),
      isp: pick(ISPS),
      timezone: pick(["UTC-5", "UTC+0", "UTC+1", "UTC+8", "UTC+9", "UTC+5.5", "UTC-3", "UTC+4"]),
      latitude: country.lat + randFloat(-2, 2, 4),
      longitude: country.lng + randFloat(-2, 2, 4),
      userAgent: `Mozilla/5.0 (${os}) AppleWebKit/605.1.15 (KHTML, like Gecko) ${browser.split(" ")[0]}/131.0`,
      fingerprint: Array.from({ length: 32 }, () => "0123456789abcdef"[randInt(0, 15)]).join(""),
      previousLoginTime: new Date(now - prevOffset).toISOString(),
      previousCountry: Math.random() < 0.7 ? country.name : pick(COUNTRIES).name,
      previousCity: Math.random() < 0.6 ? city : pick(COUNTRIES).cities[0],
      velocityEvents: randInt(0, 28),
      failedAttempts: randInt(0, riskScore >= 45 ? 5 : 1),
      evidenceCount: randInt(2, 14),
      triggeredRules: [...new Set(triggered)],
      pluginHits: [...new Set(pluginHits)],
      status: decision === "Deny" ? "Blocked" : Math.random() < 0.08 ? "Failed" : "Success",
    });
  }
  return sessions.sort((a, b) => +new Date(b.loginTime) - +new Date(a.loginTime));
}

export function generateDashboard(sessions: LoginSession[]): DashboardSummary {
  const total = sessions.length;
  const allow = sessions.filter((s) => s.decision === "Allow").length;
  const challenge = sessions.filter((s) => s.decision === "Challenge").length;
  const deny = sessions.filter((s) => s.decision === "Deny").length;
  const avg = (k: keyof LoginSession) => Math.round(sessions.reduce((a, s) => a + (s[k] as number), 0) / total);

  const countryAgg = new Map<string, { count: number; risk: number; name: string }>();
  sessions.forEach((s) => {
    const e = countryAgg.get(s.countryCode) ?? { count: 0, risk: 0, name: s.country };
    e.count++;
    e.risk += s.riskScore;
    countryAgg.set(s.countryCode, e);
  });
  const topCountries = [...countryAgg.entries()]
    .map(([code, v]) => ({ code, country: v.name, count: v.count, risk: Math.round(v.risk / v.count) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const countryMap = [...countryAgg.entries()].map(([code, v]) => ({
    code,
    name: v.name,
    value: v.count,
    risk: Math.round(v.risk / v.count),
  }));

  const devAgg = new Map<string, number>();
  sessions.forEach((s) => devAgg.set(s.device, (devAgg.get(s.device) ?? 0) + 1));
  const topDevices = [...devAgg.entries()].map(([device, count]) => ({ device, count })).sort((a, b) => b.count - a.count).slice(0, 6);

  const brAgg = new Map<string, number>();
  sessions.forEach((s) => brAgg.set(s.browser, (brAgg.get(s.browser) ?? 0) + 1));
  const topBrowsers = [...brAgg.entries()].map(([browser, count]) => ({ browser, count })).sort((a, b) => b.count - a.count).slice(0, 5);

  const riskTrend = Array.from({ length: 24 }, (_, h) => {
    const hr = sessions.filter((s) => new Date(s.loginTime).getHours() === h);
    return {
      time: `${h.toString().padStart(2, "0")}:00`,
      allow: hr.filter((s) => s.decision === "Allow").length,
      challenge: hr.filter((s) => s.decision === "Challenge").length,
      deny: hr.filter((s) => s.decision === "Deny").length,
      risk: hr.length ? Math.round(hr.reduce((a, s) => a + s.riskScore, 0) / hr.length) : 0,
    };
  });

  const fraudTrend = Array.from({ length: 14 }, (_, i) => {
    const day = new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(0, 10);
    const fraud = randInt(3, 18);
    return { time: day.slice(5), probability: randFloat(2.1, 6.8, 1), blocked: fraud };
  });

  const hourlyHeatmap: { hour: number; day: number; value: number }[] = [];
  for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) hourlyHeatmap.push({ day: d, hour: h, value: randInt(0, 100) });

  const apiHealth = [
    { name: "Authentication API", status: "healthy" as const, latency: 124, uptime: 99.98 },
    { name: "Risk Engine", status: "healthy" as const, latency: 88, uptime: 99.99 },
    { name: "Coherence Brain", status: "healthy" as const, latency: 212, uptime: 99.95 },
    { name: "Session Store", status: "degraded" as const, latency: 412, uptime: 99.41 },
    { name: "Geo Service", status: "healthy" as const, latency: 64, uptime: 99.99 },
    { name: "Evidence Vault", status: "healthy" as const, latency: 156, uptime: 99.97 },
  ];

  return {
    totalSessions: total * 137,
    allow: Math.round(total * 137 * 0.78),
    challenge: Math.round(total * 137 * 0.16),
    deny: Math.round(total * 137 * 0.06),
    avgRiskScore: avg("riskScore"),
    avgCoherenceScore: avg("coherenceScore"),
    avgFraudProbability: avg("fraudProbability"),
    topCountries,
    topDevices,
    topBrowsers,
    newDevices: sessions.filter((s) => s.newDevice).length * 6,
    activePlugins: 18,
    avgApiLatency: Math.round(apiHealth.reduce((a, h) => a + h.latency, 0) / apiHealth.length),
    apiHealth,
    riskTrend,
    fraudTrend,
    hourlyHeatmap,
    countryMap,
    decisions24h: [
      { name: "Allow", value: Math.round(total * 137 * 0.78) },
      { name: "Challenge", value: Math.round(total * 137 * 0.16) },
      { name: "Deny", value: Math.round(total * 137 * 0.06) },
    ],
  };
}
