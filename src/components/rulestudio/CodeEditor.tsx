import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Lightweight Monaco-style editor: line numbers, syntax-highlighted overlay,
// editable transparent textarea. Supports json | expression modes. No external
// dependency — the project does not ship Monaco.

type Token = { text: string; cls: string };

const JSON_KEYWORDS = new Set(["true", "false", "null"]);

function tokenizeJson(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < line.length) {
    const c = line[i];
    if (/\s/.test(c)) { let s = c; while (++i < line.length && /\s/.test(line[i])) s += line[i]; tokens.push({ text: s, cls: "" }); continue; }
    if (c === '"') {
      let s = '"'; i++;
      while (i < line.length && line[i] !== '"') { s += line[i]; if (line[i] === "\\") { s += line[i + 1] ?? ""; i += 2; continue; } i++; }
      s += line[i] ?? ""; i++;
      const prev = tokens.filter((t) => t.cls === "json-key").pop();
      void prev;
      const isKey = line[i] !== undefined && line.slice(i).trimStart().startsWith(":");
      tokens.push({ text: s, cls: isKey ? "json-key" : "json-string" });
      continue;
    }
    if (/[-\d]/.test(c)) {
      let s = c; while (++i < line.length && /[\d.eE+\-]/.test(line[i])) s += line[i];
      tokens.push({ text: s, cls: "json-number" }); continue;
    }
    if (/[{}[\]:,]/.test(c)) { tokens.push({ text: c, cls: "json-punct" }); i++; continue; }
    let s = c; while (++i < line.length && /[a-zA-Z_]/.test(line[i])) s += line[i];
    tokens.push({ text: s, cls: JSON_KEYWORDS.has(s) ? "json-bool" : "" }); continue;
  }
  return tokens;
}

function tokenizeExpr(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < line.length) {
    const c = line[i];
    if (/\s/.test(c)) { let s = c; while (++i < line.length && /\s/.test(line[i])) s += line[i]; tokens.push({ text: s, cls: "" }); continue; }
    if (c === '"' || c === "'") { let s = c; i++; while (i < line.length && line[i] !== c) { s += line[i]; i++; } s += line[i] ?? ""; i++; tokens.push({ text: s, cls: "expr-string" }); continue; }
    if (c === "$") { let s = c; i++; while (i < line.length && /[a-zA-Z0-9_.\[\]]/.test(line[i])) { s += line[i]; i++; } tokens.push({ text: s, cls: "expr-var" }); continue; }
    if (/\d/.test(c)) { let s = c; while (++i < line.length && /[\d.]/.test(line[i])) s += line[i]; tokens.push({ text: s, cls: "expr-num" }); continue; }
    if (/[+\-*/()<>!=&|.,]/.test(c)) { let s = c; while (++i < line.length && /[+\-*/<>!=&|]/.test(line[i])) s += line[i]; tokens.push({ text: s, cls: "expr-op" }); continue; }
    let s = c; while (++i < line.length && /[a-zA-Z_]/.test(line[i])) s += line[i];
    tokens.push({ text: s, cls: "expr-keyword" }); continue;
  }
  return tokens;
}

interface Props {
  value: string;
  onChange?: (v: string) => void;
  language?: "json" | "expression";
  readOnly?: boolean;
  className?: string;
  minHeight?: number;
}

export function CodeEditor({ value, onChange, language = "json", readOnly = false, className, minHeight = 320 }: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const [focused, setFocused] = useState(false);

  const lines = value.split("\n");
  const lineCount = Math.max(1, lines.length);

  const syncScroll = () => {
    if (taRef.current && preRef.current) {
      preRef.current.scrollTop = taRef.current.scrollTop;
      preRef.current.scrollLeft = taRef.current.scrollLeft;
    }
  };

  useEffect(() => { syncScroll(); }, [value]);

  const tokenize = language === "json" ? tokenizeJson : tokenizeExpr;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border bg-muted/30 font-mono text-[12.5px] leading-[1.55] dark:bg-black/30",
        focused ? "border-primary/60 ring-1 ring-primary/30" : "border-border",
        className,
      )}
      style={{ minHeight }}
    >
      <div className="absolute inset-0 flex">
        {/* gutter */}
        <div className="select-none border-r border-border/60 bg-muted/40 px-2 py-3 text-right text-[11px] text-muted-foreground/60 dark:bg-black/30" style={{ width: 48, minWidth: 48 }}>
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className="tabular-nums">{i + 1}</div>
          ))}
        </div>
        {/* code area */}
        <div className="relative flex-1 overflow-hidden">
          <pre
            ref={preRef}
            aria-hidden
            className="pointer-events-none absolute inset-0 m-0 overflow-auto whitespace-pre px-3 py-3 text-foreground"
            style={{ scrollbarWidth: "none" }}
          >
            {lines.map((ln, i) => (
              <div key={i} className="min-h-[1.55em]">
                {tokenize(ln).map((t, j) => (
                  <span key={j} className={TOKEN_CLASSES[t.cls]}>{t.text}</span>
                ))}
                {ln === "" && "\u200b"}
              </div>
            ))}
          </pre>
          <textarea
            ref={taRef}
            value={value}
            readOnly={readOnly}
            spellCheck={false}
            onChange={(e) => onChange?.(e.target.value)}
            onScroll={syncScroll}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className={cn(
              "absolute inset-0 m-0 resize-none overflow-auto whitespace-pre bg-transparent px-3 py-3 font-mono text-[12.5px] leading-[1.55] text-transparent caret-primary outline-none",
              readOnly && "cursor-default",
            )}
            style={{ caretColor: "hsl(var(--primary))" }}
          />
        </div>
      </div>
    </div>
  );
}

const TOKEN_CLASSES: Record<string, string> = {
  "json-key": "text-sky-600 dark:text-sky-300",
  "json-string": "text-emerald-600 dark:text-emerald-300",
  "json-number": "text-amber-600 dark:text-amber-300",
  "json-punct": "text-muted-foreground",
  "json-bool": "text-fuchsia-600 dark:text-fuchsia-300",
  "expr-var": "text-sky-600 dark:text-sky-300",
  "expr-string": "text-emerald-600 dark:text-emerald-300",
  "expr-num": "text-amber-600 dark:text-amber-300",
  "expr-op": "text-rose-600 dark:text-rose-300",
  "expr-keyword": "text-fuchsia-600 dark:text-fuchsia-300",
};
