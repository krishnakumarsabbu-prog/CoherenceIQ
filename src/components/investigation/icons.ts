import {
  LogIn, Globe, UserCog, Smartphone, ShieldHalf, Fingerprint, Gavel, Gauge, Flag, Server,
  MapPin, Wifi, Cookie, Activity, Share2, Clock, type LucideIcon,
} from "lucide-react";

export const NODE_ICONS: Record<string, LucideIcon> = {
  login: LogIn,
  geo: Globe,
  customer: UserCog,
  device: Smartphone,
  reputation: ShieldHalf,
  identity: Fingerprint,
  recommendation: Flag,
  policy: Gavel,
  decision: Gauge,
};

export const EVIDENCE_ICONS: Record<string, LucideIcon> = {
  device: Smartphone,
  ip: Wifi,
  location: MapPin,
  cookie: Cookie,
  behavior: Activity,
  graph: Share2,
  temporal: Clock,
};

export const NODE_ICON_FALLBACK = Server;
