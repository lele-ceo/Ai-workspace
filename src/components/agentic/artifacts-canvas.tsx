"use client";

// ArtifactsCanvas: split-view workspace for markdown, code, mermaid diagrams
// and diff outputs generated during an agentic turn.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Code2, FileDiff, Share2, Copy, Check } from "lucide-react";
import type { Artifact, ArtifactKind } from "@/types/agentic.types";
import { Markdown } from "@/components/chat/markdown";

// ── Kind icon ─────────────────────────────────────────────────────────────────

function KindIcon({ kind }: { kind: ArtifactKind }) {
  if (kind === "markdown") return <FileText className="size-3.5" aria-hidden />;
  if (kind === "code") return <Code2 className="size-3.5" aria-hidden />;
  if (kind === "diff") return <FileDiff className="size-3.5" aria-hidden />;
  return <Share2 className="size-3.5" aria-hidden />;
}

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copied" : "Copy content"}
      className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-white/40 hover:bg-white/8 hover:text-white/70 focus-visible:outline-2 focus-visible:outline-indigo-400 transition-colors"
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="check"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <Check className="size-3 text-emerald-400" aria-hidden />
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Copy className="size-3" aria-hidden />
          </motion.span>
        )}
      </AnimatePresence>
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ── Code content ──────────────────────────────────────────────────────────────

function CodeContent({ content, language }: { content: string; language?: string }) {
  return (
    <pre className="overflow-x-auto p-4 text-[12px] leading-relaxed text-white/80 font-mono">
      <code data-language={language}>{content}</code>
    </pre>
  );
}

// ── Diff content ──────────────────────────────────────────────────────────────

function DiffContent({ current, previous }: { current: string; previous?: string }) {
  if (!previous) return <CodeContent content={current} />;

  const currentLines = current.split("\n");
  const previousLines = previous.split("\n");

  // Simplified line-level diff display (+ / - markers only)
  const removed = previousLines.filter((l) => !currentLines.includes(l));
  const added = currentLines.filter((l) => !previousLines.includes(l));

  return (
    <pre className="overflow-x-auto p-4 text-[12px] leading-relaxed font-mono space-y-px">
      {previousLines.map((line, i) => {
        const isRemoved = removed.includes(line);
        return (
          <code
            key={`r-${i}`}
            className={isRemoved ? "block text-red-400 bg-red-500/10" : "block text-white/40"}
          >
            {isRemoved ? "− " : "  "}
            {line}
          </code>
        );
      })}
      {added.map((line, i) => (
        <code key={`a-${i}`} className="block text-emerald-400 bg-emerald-500/10">
          + {line}
        </code>
      ))}
    </pre>
  );
}

// ── Mermaid content ───────────────────────────────────────────────────────────
// Rendered as a pre-block; a mermaid runtime library could render this in a
// real integration. The pre.mermaid class signals intent.

function MermaidContent({ content }: { content: string }) {
  return (
    <pre className="mermaid overflow-x-auto p-4 text-[12px] leading-relaxed text-white/70 font-mono">
      {content}
    </pre>
  );
}

// ── ArtifactsCanvas ───────────────────────────────────────────────────────────

export interface ArtifactsCanvasProps {
  artifacts: Artifact[];
  onClose?: () => void;
}

export function ArtifactsCanvas({ artifacts, onClose }: ArtifactsCanvasProps) {
  const [activeId, setActiveId] = useState<string>(artifacts[0]?.id ?? "");
  const active = artifacts.find((a) => a.id === activeId) ?? artifacts[0];

  if (!active) {
    return (
      <div className="flex flex-1 items-center justify-center text-[13px] text-white/30">
        No artifacts yet
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0a0b0f]">
      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Artifacts"
        className="flex items-center gap-1 overflow-x-auto border-b border-white/8 px-3 py-1.5 scrollbar-none"
      >
        {artifacts.map((a) => (
          <button
            key={a.id}
            role="tab"
            aria-selected={a.id === activeId}
            aria-controls={`artifact-panel-${a.id}`}
            id={`artifact-tab-${a.id}`}
            type="button"
            onClick={() => setActiveId(a.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded px-2.5 py-1 text-[12px] transition-colors focus-visible:outline-2 focus-visible:outline-indigo-400 ${
              a.id === activeId
                ? "bg-white/8 text-white"
                : "text-white/40 hover:text-white/60 hover:bg-white/5"
            }`}
          >
            <KindIcon kind={a.kind} />
            <span className="max-w-[120px] truncate">{a.title}</span>
          </button>
        ))}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close canvas"
            className="ml-auto rounded px-2 py-1 text-white/30 hover:text-white/60 focus-visible:outline-2 focus-visible:outline-indigo-400"
          >
            ✕
          </button>
        )}
      </div>

      {/* Content panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active.id}
          role="tabpanel"
          id={`artifact-panel-${active.id}`}
          aria-labelledby={`artifact-tab-${active.id}`}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="flex flex-1 flex-col overflow-hidden"
        >
          {/* Panel header */}
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-1.5">
            <span className="text-[11px] font-medium text-white/40 uppercase tracking-wide">
              {active.kind}
            </span>
            <CopyButton text={active.content} />
          </div>

          {/* Panel body */}
          <div className="flex-1 overflow-y-auto">
            {active.kind === "markdown" && (
              <div className="px-6 py-5">
                <Markdown content={active.content} />
              </div>
            )}
            {active.kind === "code" && (
              <CodeContent content={active.content} language={active.language} />
            )}
            {active.kind === "diff" && (
              <DiffContent
                current={active.content}
                previous={active.previousContent}
              />
            )}
            {active.kind === "mermaid" && (
              <MermaidContent content={active.content} />
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
