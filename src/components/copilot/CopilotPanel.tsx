import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, X, ShieldAlert, FileText, FlaskConical, Gavel, ClipboardList, GitCompareArrows, Scale, PanelRightClose, Loader as Loader2, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  COPILOT_SUGGESTIONS, generateCopilotResponse, uid,
  type CopilotContext, type CopilotIntent, type CopilotMessage, type CopilotSuggestion,
} from "@/lib/copilotData";
import { Markdown } from "@/components/markdown/Markdown";
import { generateSessions } from "@/lib/mockData";
import type { LoginSession } from "@/types";
import { Badge } from "@/components/ui/badge";

const SESSIONS = generateSessions(200);
const DEFAULT_SESSION: LoginSession = {
  sessionId: "S-1001", customer: "Eleanor Voss", customerId: "CUST-9912", username: "e.voss",
  decision: "Deny", status: "Blocked", riskScore: 88, coherenceScore: 32, fraudProbability: 91,
  channel: "Web", application: "Retail Banking", device: "MacBook Pro 16\"", deviceType: "Desktop",
  os: "macOS 14.5", browser: "Chrome 131", city: "Frankfurt", country: "Germany", countryCode: "DE",
  latitude: 50.11, longitude: 8.68, ip: "185.220.101.4", asn: "AS2856", isp: "Deutsche Telekom",
  loginTime: new Date().toISOString(), latency: 88, duration: 45, userAgent: "Mozilla/5.0",
  fingerprint: "fp_a1b2c3d4e5f6", timezone: "Europe/Berlin", previousCountry: "United States",
  previousCity: "New York", previousLoginTime: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
  triggeredRules: ["R-117 Impossible Travel", "R-203 New Device"], pluginHits: ["GeoVelocity", "Device Intelligence"],
  evidenceCount: 7, newDevice: true, vpn: true, mfaUsed: false, mfaType: "Authenticator App", authMethod: "Password + OTP",
  failedAttempts: 3, velocityEvents: 12
};
const HIGH_RISK = SESSIONS.find((s) => s?.decision === "Deny") ?? SESSIONS[0] ?? DEFAULT_SESSION;
const COMPARE = SESSIONS.find((s) => s?.decision === "Challenge" && s?.sessionId !== HIGH_RISK.sessionId) ?? SESSIONS[1] ?? DEFAULT_SESSION;

const ICON_MAP: Record<CopilotSuggestion["icon"], React.ElementType> = {
  shield: ShieldAlert,
  file: FileText,
  evidence: FlaskConical,
  gavel: Gavel,
  report: ClipboardList,
  compare: GitCompareArrows,
  policy: Scale,
};

const WELCOME: CopilotMessage = {
  id: uid("msg"),
  role: "assistant",
  ts: Date.now(),
  content: `## CoherenceIQ Copilot

I'm your conversational risk assistant. I've loaded **${HIGH_RISK.sessionId}** (*${HIGH_RISK.customer}*, decision **${HIGH_RISK.decision}**) as context.

Ask me anything, or tap a prompt below to begin.`,
};

interface CopilotPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contextSession?: LoginSession;
  /** docked = fixed right rail; page = inline fill */
  variant?: "docked" | "page";
}

export function CopilotPanel({ open, onOpenChange, contextSession, variant = "docked" }: CopilotPanelProps) {
  const [messages, setMessages] = useState<CopilotMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ctx: CopilotContext = useMemo(
    () => ({ session: contextSession ?? HIGH_RISK, compareSession: COMPARE }),
    [contextSession],
  );

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, thinking]);

  const send = (intent: CopilotIntent, text?: string) => {
    const userMsg: CopilotMessage = {
      id: uid("msg"),
      role: "user",
      ts: Date.now(),
      content: text ?? COPILOT_SUGGESTIONS.find((s) => s.intent === intent)?.label ?? "Question",
      intent,
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setThinking(true);
    const replyDelay = 420 + Math.random() * 420;
    setTimeout(() => {
      const { markdown, citations } = generateCopilotResponse(intent, ctx, text);
      const assistantMsg: CopilotMessage = {
        id: uid("msg"),
        role: "assistant",
        ts: Date.now(),
        content: markdown,
        intent,
        citations,
      };
      setMessages((m) => [...m, assistantMsg]);
      setThinking(false);
    }, replyDelay);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || thinking) return;
    send("freeform", text);
  };

  const isDocked = variant === "docked";

  const panel = (
    <div
      className={cn(
        "flex h-full flex-col bg-background",
        isDocked && "border-l border-border shadow-2xl",
      )}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-cyan-400 shadow-[0_0_18px_-4px_hsl(199_89%_52%)]">
            <Sparkles className="h-4 w-4 text-white" />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-success" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-bold tracking-tight text-foreground">AI Copilot</span>
              <Badge variant="default" className="text-[9px]">AI</Badge>
            </div>
            <div className="truncate text-[10.5px] text-muted-foreground">
              Context: <span className="font-mono text-foreground/70">{ctx.session?.sessionId}</span>
            </div>
          </div>
        </div>
        {isDocked && (
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div className="space-y-3">
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
          {thinking && (
            <motion.div
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 rounded-xl border border-border bg-card/40 px-3 py-2.5"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-sky-500 to-cyan-400">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Analyzing context…
              </span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Suggestions */}
      <div className="shrink-0 border-t border-border px-3 py-2">
        <div className="flex flex-wrap gap-1.5">
          {COPILOT_SUGGESTIONS.map((s) => {
            const Icon = ICON_MAP[s.icon];
            return (
              <button
                key={s.id}
                onClick={() => send(s.intent)}
                disabled={thinking}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border border-border bg-card/40 px-2.5 py-1 text-[10.5px] font-medium text-foreground/80 transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary disabled:opacity-50",
                )}
              >
                <Icon className="h-3 w-3" />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Composer */}
      <form onSubmit={onSubmit} className="flex shrink-0 items-end gap-2 border-t border-border p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit(e as unknown as React.FormEvent);
            }
          }}
          rows={1}
          placeholder="Ask about this session… (Enter to send, Shift+Enter for newline)"
          className="scrollbar-thin max-h-28 min-h-[38px] flex-1 resize-none rounded-lg border border-border bg-card/40 px-3 py-2 text-[12.5px] text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
        <button
          type="submit"
          disabled={thinking || !input.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );

  if (!isDocked) {
    return <div className="h-full">{panel}</div>;
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 320 }}
          className="fixed right-0 top-0 z-[170] h-screen w-full max-w-[440px]"
        >
          {panel}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MessageBubble({ message }: { message: CopilotMessage }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={cn("flex gap-2.5", isUser && "flex-row-reverse")}
    >
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
          isUser ? "bg-secondary text-secondary-foreground" : "bg-gradient-to-br from-sky-500 to-cyan-400 text-white",
        )}
      >
        {isUser ? <span className="text-[10px] font-bold">You</span> : <Sparkles className="h-3.5 w-3.5" />}
      </div>
      <div className={cn("group min-w-0 max-w-[calc(100%-44px)]", isUser && "flex flex-col items-end")}>
        <div
          className={cn(
            "relative rounded-xl border px-3 py-2",
            isUser
              ? "border-primary/30 bg-primary/10 text-foreground"
              : "border-border bg-card/50 text-foreground/90",
          )}
        >
          {isUser ? (
            <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : (
            <>
              <Markdown content={message.content} />
              {!isUser && (
                <button
                  onClick={copy}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-md border border-border bg-card opacity-0 shadow-md transition-opacity group-hover:opacity-100"
                  title="Copy response"
                >
                  {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                </button>
              )}
            </>
          )}
        </div>
        {message.citations && message.citations.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {message.citations.map((c) => (
              <span key={c.ref} className="rounded-full bg-muted px-2 py-0.5 text-[9.5px] text-muted-foreground">
                {c.label} <span className="font-mono">· {c.ref}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/** Dock toggle button — used in the TopNav. */
export function CopilotDockToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "relative flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[11.5px] font-semibold transition-all",
        open ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
      title="Toggle AI Copilot"
    >
      <Sparkles className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Copilot</span>
      {!open && (
        <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
        </span>
      )}
    </button>
  );
}

/** Floating collapse tab shown on the right edge when the dock is closed. */
export function CopilotDockEdge({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="group fixed right-0 top-1/2 z-[160] flex -translate-y-1/2 items-center gap-2 rounded-l-xl border border-r-0 border-border bg-card/80 py-3 pl-2 pr-2.5 shadow-lg backdrop-blur-md transition-all hover:bg-card hover:pr-3"
      title="Open AI Copilot"
    >
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-sky-500 to-cyan-400">
        <Sparkles className="h-3.5 w-3.5 text-white" />
      </div>
      <span className="[writing-mode:vertical-lr] rotate-180 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors group-hover:text-primary">
        Copilot
      </span>
      <PanelRightClose className="h-3.5 w-3.5 rotate-180 text-muted-foreground transition-colors group-hover:text-primary" />
    </button>
  );
}
