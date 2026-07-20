import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";

/**
 * Lightweight markdown renderer tuned for chat output:
 * headings, tables, fenced code (with language label + copy),
 * inline code, bold, lists, blockquotes, hr.
 * No external deps — keeps the bundle lean and avoids new packages.
 */

interface Token {
  type: "heading" | "code" | "table" | "ul" | "ol" | "quote" | "hr" | "para";
  level?: number;
  lang?: string;
  lines?: string[];
  header?: string[];
  rows?: string[][];
  items?: string[];
  inline?: string;
}

function tokenize(md: string): Token[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const tokens: Token[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      const lang = fence[1] || "text";
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      tokens.push({ type: "code", lang, lines: buf });
      continue;
    }

    // Heading
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      tokens.push({ type: "heading", level: h[1].length, inline: h[2] });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+\s*$/.test(line) || /^\*\*\*+\s*$/.test(line)) {
      tokens.push({ type: "hr" });
      i++;
      continue;
    }

    // Table — header | sep | rows
    if (/\|/.test(line) && i + 1 < lines.length && /^\s*\|?[\s:-]+\|[\s:|-]+$/.test(lines[i + 1])) {
      const header = line.split("|").map((c) => c.trim()).filter((_c, idx, arr) => !(idx === 0 && arr[0] === "") && !(idx === arr.length - 1 && arr[arr.length - 1] === ""));
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim() !== "") {
        const cells = lines[i].split("|").map((c) => c.trim());
        // drop leading/trailing empty from edge pipes
        if (cells.length > 2 && cells[0] === "" && cells[cells.length - 1] === "") {
          rows.push(cells.slice(1, -1));
        } else {
          rows.push(cells);
        }
        i++;
      }
      tokens.push({ type: "table", header, rows });
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      tokens.push({ type: "quote", inline: buf.join(" ") });
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }
      tokens.push({ type: "ul", items });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      tokens.push({ type: "ol", items });
      continue;
    }

    // Blank line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph (gather until blank or special line)
    const buf: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^```/.test(lines[i]) &&
      !/^#{1,6}\s+/.test(lines[i]) &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^---+\s*$/.test(lines[i]) &&
      !(/^\|/.test(lines[i]) && i + 1 < lines.length && /^\s*\|?[\s:-]+\|[\s:|-]+$/.test(lines[i + 1]))
    ) {
      buf.push(lines[i]);
      i++;
    }
    tokens.push({ type: "para", inline: buf.join(" ") });
  }
  return tokens;
}

/** Tokenize a single inline line into bold / code / text spans. */
function renderInline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let rest = text;
  let key = 0;
  const push = (node: ReactNode) => {
    nodes.push(<span key={`${keyBase}-${key++}`}>{node}</span>);
  };
  while (rest.length > 0) {
    // inline code
    const codeMatch = rest.match(/^([^`]*)`([^`]+)`/);
    const boldMatch = rest.match(/^([^*]*)\*\*([^*]+)\*\*/);
    const italicMatch = rest.match(/^([^_]*)_([^_]+)_/);

    const candidates = [codeMatch, boldMatch, italicMatch].filter(Boolean) as RegExpMatchArray[];
    if (candidates.length === 0) {
      push(rest);
      break;
    }
    const best = candidates.reduce((a, b) => ((a.index ?? 0) <= (b.index ?? 0) ? a : b));
    if (best === codeMatch) {
      if (best[1]) push(best[1]);
      push(<code className="rounded bg-muted/70 px-1.5 py-0.5 font-mono text-[11.5px] text-primary">{best[2]}</code>);
      rest = rest.slice(best[0].length);
    } else if (best === boldMatch) {
      if (best[1]) push(best[1]);
      push(<strong className="font-semibold text-foreground">{best[2]}</strong>);
      rest = rest.slice(best[0].length);
    } else {
      if (best[1]) push(best[1]);
      push(<em className="italic text-foreground/85">{best[2]}</em>);
      rest = rest.slice(best[0].length);
    }
  }
  return nodes;
}

function CodeBlock({ lang, lines }: { lang: string; lines: string[] }) {
  const [copied, setCopied] = useState(false);
  const code = lines.join("\n");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <div className="group relative my-2 overflow-hidden rounded-lg border border-border bg-[hsl(222_47%_5%)] text-slate-100 dark:bg-black/40">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-sky-300/80">{lang}</span>
        <button
          onClick={copy}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-100"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="scrollbar-thin overflow-auto p-3 text-[12px] leading-relaxed">
        <code className="font-mono">
          {lines.map((ln, idx) => (
            <div key={idx} className="whitespace-pre">
              <SyntaxLine lang={lang} line={ln} />
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}

/** Minimal, dependency-free syntax highlighter.
 * Highlights comments, strings, numbers, keywords, and known DSL/JSON tokens.
 * Returns spans styled via Tailwind — no runtime parser dependency. */
const KEYWORDS: Record<string, string[]> = {
  yaml: ["true", "false", "null", "yes", "no"],
  json: ["true", "false", "null"],
  dsl: ["match", "where", "and", "or", "then", "policy", "when", "action", "notify", "escalate", "session", "device", "ip"],
  text: [],
};

function SyntaxLine({ lang, line }: { lang: string; line: string }) {
  if (lang === "json") return <JsonLine line={line} />;
  if (lang === "yaml") return <YamlLine line={line} />;
  if (lang === "dsl") return <DslLine line={line} />;
  return <span className="text-slate-200">{line || " "}</span>;
}

function classifyToken(word: string, lang: string): string {
  const kw = KEYWORDS[lang] ?? [];
  if (kw.includes(word.toLowerCase())) return "text-fuchsia-400";
  if (/^-?\d+(\.\d+)?$/.test(word)) return "text-amber-400";
  if (/^(true|false|null)$/i.test(word)) return "text-fuchsia-400";
  return "text-slate-200";
}

function JsonLine({ line }: { line: string }) {
  const m = line.match(/^(\s*)(.*?)(,)?$/);
  if (!m) return <span className="text-slate-200">{line}</span>;
  const [, indent, body, comma] = m;
  const kv = body.match(/^"([^"]+)"\s*:\s*(.*)$/);
  if (kv) {
    const [, key, val] = kv;
    return (
      <span>
        <span className="text-slate-500">{indent}</span>
        <span className="text-sky-300">"{key}"</span>
        <span className="text-slate-400">:</span>
        <span className="ml-1">
          <JsonValue value={val} />
        </span>
        {comma && <span className="text-slate-400">,</span>}
      </span>
    );
  }
  return (
    <span>
      <span className="text-slate-500">{indent}</span>
      <JsonValue value={body} />
      {comma && <span className="text-slate-400">,</span>}
    </span>
  );
}

function JsonValue({ value }: { value: string }) {
  const v = value.trim();
  if (/^".*"$/.test(v)) return <span className="text-emerald-300">{v}</span>;
  if (/^(true|false|null)$/i.test(v)) return <span className="text-fuchsia-400">{v}</span>;
  if (/^-?\d+(\.\d+)?$/.test(v)) return <span className="text-amber-400">{v}</span>;
  if (v === "{" || v === "}" || v === "[" || v === "]") return <span className="text-slate-400">{v}</span>;
  return <span className="text-slate-200">{v}</span>;
}

function YamlLine({ line }: { line: string }) {
  const m = line.match(/^(\s*)([A-Za-z0-9_-]+)(:)(.*)$/);
  if (!m) {
    if (line.trim().startsWith("#")) return <span className="text-slate-500 italic">{line}</span>;
    return <span className="text-slate-200">{line}</span>;
  }
  const [, indent, key, colon, rest] = m;
  const val = rest.trim();
  return (
    <span>
      <span className="text-slate-500">{indent}</span>
      <span className="text-sky-300">{key}</span>
      <span className="text-slate-400">{colon}</span>
      {val && <span className="ml-1 text-emerald-300">{val}</span>}
    </span>
  );
}

function DslLine({ line }: { line: string }) {
  const trimmed = line.trim();
  if (trimmed.startsWith("//") || trimmed.startsWith("#")) return <span className="text-slate-500 italic">{line}</span>;
  const indent = line.slice(0, line.length - trimmed.length);
  const words = trimmed.split(/(\s+)/);
  return (
    <span>
      <span className="text-slate-500">{indent}</span>
      {words.map((w, idx) => {
        if (/^\s+$/.test(w)) return <span key={idx}>{w}</span>;
        if (/[=<>!]/.test(w)) return <span key={idx} className="text-sky-400">{w}</span>;
        if (KEYWORDS.dsl.includes(w.toLowerCase())) return <span key={idx} className="text-fuchsia-400 font-semibold">{w}</span>;
        if (/^-?\d+(\.\d+)?$/.test(w)) return <span key={idx} className="text-amber-400">{w}</span>;
        if (/^[A-Z][A-Za-z0-9-]*$/.test(w)) return <span key={idx} className="text-emerald-300">{w}</span>;
        return <span key={idx} className={classifyToken(w, "dsl")}>{w}</span>;
      })}
    </span>
  );
}

export function Markdown({ content, className }: { content: string; className?: string }) {
  const tokens = tokenize(content);
  return (
    <div className={cn("text-[13px] leading-relaxed text-foreground/90", className)}>
      {tokens.map((t, idx) => {
        const key = `tk-${idx}`;
        switch (t.type) {
          case "heading": {
            const sizes = ["text-lg", "text-base", "text-[15px]", "text-sm", "text-sm", "text-xs"];
            const size = sizes[(t.level ?? 1) - 1];
            return (
              <div key={key} className={cn("mt-3 mb-1.5 font-bold tracking-tight text-foreground", size, (t.level ?? 1) === 1 && "border-b border-border pb-1.5")}>
                {renderInline(t.inline ?? "", key)}
              </div>
            );
          }
          case "code":
            return <CodeBlock key={key} lang={t.lang ?? "text"} lines={t.lines ?? []} />;
          case "table":
            return (
              <div key={key} className="my-2 overflow-x-auto scrollbar-thin">
                <table className="w-full border-collapse text-[12px]">
                  <thead>
                    <tr className="border-b border-border">
                      {t.header?.map((h, i) => (
                        <th key={i} className="px-2.5 py-1.5 text-left font-semibold text-foreground">
                          {renderInline(h, `${key}-h${i}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {t.rows?.map((r, ri) => (
                      <tr key={ri} className="border-b border-border/60 last:border-0 hover:bg-accent/30">
                        {r.map((c, ci) => (
                          <td key={ci} className="px-2.5 py-1.5 align-top text-foreground/85">
                            {renderInline(c, `${key}-c${ri}-${ci}`)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "ul":
            return (
              <ul key={key} className="my-1.5 space-y-1 pl-4">
                {t.items?.map((it, i) => (
                  <li key={i} className="relative pl-3 before:absolute before:left-0 before:top-[0.55em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-primary/60">
                    {renderInline(it, `${key}-li${i}`)}
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={key} className="my-1.5 space-y-1 pl-4">
                {t.items?.map((it, i) => (
                  <li key={i} className="relative pl-4">
                    <span className="absolute left-0 top-0 font-mono text-[11px] font-semibold text-primary">{i + 1}.</span>
                    {renderInline(it, `${key}-li${i}`)}
                  </li>
                ))}
              </ol>
            );
          case "quote":
            return (
              <blockquote key={key} className="my-2 border-l-2 border-primary/50 bg-primary/5 px-3 py-1.5 text-foreground/80 italic">
                {renderInline(t.inline ?? "", key)}
              </blockquote>
            );
          case "hr":
            return <hr key={key} className="my-3 border-border" />;
          case "para":
          default:
            return (
              <p key={key} className="my-1.5">
                {renderInline(t.inline ?? "", key)}
              </p>
            );
        }
      })}
    </div>
  );
}
