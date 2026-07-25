import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Send, X, ShieldAlert, FileText, FlaskConical, Gavel, ClipboardList,
  GitCompareArrows, Scale, PanelRightClose, Loader as Loader2, Copy, Check,
  Boxes, FunctionSquare, Cpu, Trophy, Workflow, Search, Gauge, Activity,
  Download, FileDown, Layers, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  COPILOT_CAPABILITY_SUGGESTIONS, classifyIntent, dispatch,
  type CopilotCapability, type CopilotResult,
} from "@/lib/copilotEngine";
import { Markdown } from "@/components/markdown/Markdown";
import { Badge } from "@/components/ui/badge";

const ICONS: Record<string, LucideIcon> = {
  shield: ShieldAlert, file: FileText, evidence: FlaskConical, gavel: Gavel,
  report: ClipboardList, compare: GitCompareArrows, policy: Scale,
  boxes: Boxes, function: FunctionSquare, cpu: Cpu, trophy: Trophy,
  workflow: Workflow, search: Search, gauge: Gauge, activity: Activity,
  layers: Layers,
};

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
  capability?: CopilotCapability;
  citations?: { label: string; ref: string }[];
  artifacts?: { kind: "template" | "design-doc"; id: string; label: string }[];
  designDocMarkdown?: string;
  templateJson?: string;
}

function uid(prefix = "msg"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

const WELCOME: ChatMessage = {
  id: uid("msg"),
  role: "assistant",
  ts: Date.now(),
  content: `## CoherenceIQ AI Copilot

I'm your conversational fraud-detection architect. Describe a requirement in natural language and I'll:

- Recommend **rule clusters** and **engineered features**
- Propose **predictive models** and pick a **champion** by metrics
- **Build a complete fraud pipeline** from your existing assets
- **Validate** designs, **detect missing stages**, and **improve performance**
- **Explain execution results** and **compare architectures**
- Generate **reusable templates** and **downloadable design documents**

Ask me anything, or tap a prompt below to begin.`,
};

function downloadFile(filename: string, content: string, type = "text/markdown") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface CopilotPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant?: "docked" | "page";
}

export function CopilotPanel({ open, onOpenChange, variant = "docked" }: CopilotPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, thinking]);

  const send = (capability: CopilotCapability, text?: string) => {
    const userText = text ?? COPILOT_CAPABILITY_SUGGESTIONS.find((s) => s.capability === capability)?.prompt ?? "Question";
    const userMsg: ChatMessage = { id: uid("msg"), role: "user", ts: Date.now(), content: userText, capability };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setThinking(true);
    const delay = 480 + Math.random() * 420;
    setTimeout(() => {
      const result: CopilotResult = dispatch(capability, userText);
      const assistantMsg: ChatMessage = {
        id: uid("msg"),
        role: "assistant",
        ts: Date.now(),
        content: result.markdown,
        capability: result.capability,
        citations: result.citations,
        artifacts: result.artifacts,
        designDocMarkdown: result.designDoc?.markdown,
        templateJson: result.template ? JSON.stringify(result.template, null, 2) : undefined,
      };
      setMessages((m) => [...m, assistantMsg]);
      setThinking(false);
    }, delay);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || thinking) return;
    const capability = classifyIntent(text);
    send(capability, text);
  };

  const isDocked = variant === "docked";

  const panel = (
    <div className={cn("flex h-full flex-col bg-background", isDocked && "border-l border-border shadow-2xl")}>
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
            <div className="truncate text-[10.5px] text-muted-foreground">Fraud-detection architect</div>
          </div>
        </div>
        {isDocked && (
          <button onClick={() => onOpenChange(false)} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" title="Close panel">
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
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 rounded-xl border border-border bg-card/40 px-3 py-2.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-sky-500 to-cyan-400">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Reasoning over your assets…
              </span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Capability suggestions */}
      <div className="shrink-0 border-t border-border px-3 py-2">
        <div className="scrollbar-thin flex gap-1.5 overflow-x-auto pb-1">
          {COPILOT_CAPABILITY_SUGGESTIONS.map((s) => {
            const Icon = ICONS[s.icon] ?? Sparkles;
            return (
              <button
                key={s.id}
                onClick={() => send(s.capability)}
                disabled={thinking}
                title={s.prompt}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card/40 px-2.5 py-1 text-[10.5px] font-medium text-foreground/80 transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary disabled:opacity-50"
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
          placeholder="Describe a fraud detection requirement… (Enter to send)"
          className="scrollbar-thin max-h-28 min-h-[38px] flex-1 resize-none rounded-lg border border-border bg-card/40 px-3 py-2 text-[12.5px] text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
        <button type="submit" disabled={thinking || !input.trim()} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-40">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );

  if (!isDocked) return <div className="h-full">{panel}</div>;

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 320 }} className="fixed right-0 top-0 z-[170] h-screen w-full max-w-[440px]">
          {panel}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch { /* clipboard unavailable */ }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("flex gap-2.5", isUser && "flex-row-reverse")}>
      <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", isUser ? "bg-secondary text-secondary-foreground" : "bg-gradient-to-br from-sky-500 to-cyan-400 text-white")}>
        {isUser ? <span className="text-[10px] font-bold">You</span> : <Sparkles className="h-3.5 w-3.5" />}
      </div>
      <div className={cn("group min-w-0 max-w-[calc(100%-44px)]", isUser && "flex flex-col items-end")}>
        <div className={cn("relative rounded-xl border px-3 py-2", isUser ? "border-primary/30 bg-primary/10 text-foreground" : "border-border bg-card/50 text-foreground/90")}>
          {isUser ? (
            <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : (
            <>
              <Markdown content={message.content} />
              <div className="mt-1.5 flex items-center gap-1.5">
                <button onClick={copy} className="flex items-center gap-1 rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" title="Copy response">
                  {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                {message.designDocMarkdown && (
                  <button
                    onClick={() => downloadFile(`copilot-design-doc-${message.id}.md`, message.designDocMarkdown!)}
                    className="flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary transition-colors hover:bg-primary/20"
                    title="Download design document"
                  >
                    <FileDown className="h-3 w-3" />
                    Design doc
                  </button>
                )}
                {message.templateJson && (
                  <button
                    onClick={() => downloadFile(`copilot-template-${message.id}.json`, message.templateJson!, "application/json")}
                    className="flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400"
                    title="Download pipeline template"
                  >
                    <Download className="h-3 w-3" />
                    Template
                  </button>
                )}
              </div>
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
      className={cn("relative flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[11.5px] font-semibold transition-all", open ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground")}
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
      <span className="[writing-mode:vertical-lr] rotate-180 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors group-hover:text-primary">Copilot</span>
      <PanelRightClose className="h-3.5 w-3.5 rotate-180 text-muted-foreground transition-colors group-hover:text-primary" />
    </button>
  );
}
