"use client";

import { useLayoutEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { ArrowUp, Mic, Paperclip, Plus, Square, Trash2, X } from "lucide-react";
import { useApp } from "@/hooks/use-app";
import { useComposer } from "@/hooks/use-composer";
import { useDropdown } from "@/hooks/use-dropdown";
import { useSpeechInput } from "@/hooks/use-speech-input";
import { cn, formatBytes } from "@/lib/utils";
import { DEFAULT_TOOLS, type ToolAction } from "@/lib/mock/tools";
import { ModelSelector } from "./model-selector";
import { AgentSelector } from "./agent-selector";
import { QuickActions } from "./quick-actions";
import { ToolPickerMenu, TOOL_ICONS } from "./tool-picker-menu";

const MAX_ROWS = 8;
const LINE_HEIGHT = 22;

// Central composer: auto-resizing textarea, dynamic placeholder, agent
// (Specialist) selector, and contextual quick actions. The model selector
// lives here on desktop but relocates to the top bar on narrow viewports
// (see ChatLayout) — so it's rendered desktop-only below.
export function Composer() {
  const { activeThread } = useApp();
  const {
    value,
    setValue,
    attachments,
    addAttachments,
    removeAttachment,
    placeholder,
    canSend,
    isStreaming,
    budgetBlocked,
    send,
    stop,
  } = useComposer();
  const speech = useSpeechInput({ value, onChange: setValue });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    open: toolMenuOpen,
    toggle: toggleToolMenu,
    close: closeToolMenu,
    ref: toolMenuRef,
  } = useDropdown();
  // The composer's active "mode" set from the Tool Picker (upload is one-shot —
  // it just opens the file picker — so only the flagged tools live here).
  const [activeTool, setActiveTool] = useState<Exclude<ToolAction, "upload"> | null>(null);
  const activeToolMeta = activeTool
    ? DEFAULT_TOOLS.find((t) => t.action === activeTool) ?? null
    : null;
  const isEmptyThread = activeThread.messages.length === 0;

  // Loads picked files client-side (object URLs) — never uploaded to a server.
  const onFilesPicked = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addAttachments(e.target.files);
    e.target.value = ""; // let the same file be picked again after removal
  };

  // Sending ends dictation first so an in-flight interim word can't clobber the
  // freshly-cleared composer after the message is dispatched.
  const handleSend = () => {
    speech.stop();
    send();
    setActiveTool(null);
  };

  // Applies a picked tool's mode. `upload` is one-shot (opens the real,
  // client-side file picker — no server); the others flag a visible active mode
  // on the input. Front-end only.
  const handleToolSelect = (action: ToolAction) => {
    closeToolMenu();
    if (action === "upload") {
      fileInputRef.current?.click();
      return;
    }
    setActiveTool(action);
  };

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_ROWS * LINE_HEIGHT + 16)}px`;
  }, [value]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) handleSend();
    }
  };

  return (
    <div className="shrink-0 px-4 pb-4 pt-2">
      <div className="mx-auto max-w-[720px]">
        {isEmptyThread && <QuickActions />}

        <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-composer)] px-3 py-2.5 transition-colors focus-within:border-[var(--accent)]">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder={placeholder}
            aria-label="Message"
            disabled={budgetBlocked}
            className="w-full resize-none bg-transparent text-[14px] leading-[22px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none scrollbar-hidden"
          />

          {speech.recording && (
            <div className="mt-1 flex items-center gap-2 text-[12px] text-[var(--accent)]">
              <span
                className="inline-block size-2 rounded-full bg-[var(--accent)]"
                style={{ opacity: 0.5 + speech.level * 0.5 }}
              />
              Listening… speak now
            </div>
          )}
          {speech.error && !speech.recording && (
            <div className="mt-1 text-[12px] text-red-400">{speech.error}</div>
          )}
          {budgetBlocked && (
            <p role="alert" className="mt-1 text-[12px] text-amber-300">
              Monthly AI budget reached. New requests are blocked until the operator resets it.
            </p>
          )}
          {speech.clipUrl && !speech.recording && (
            <div className="mt-2 flex items-center gap-2">
              <audio controls src={speech.clipUrl} className="h-8 max-w-full" />
              <button
                type="button"
                onClick={speech.discardClip}
                aria-label="Discard recording"
                className="rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          )}

          {attachments.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {attachments.map((file) => (
                <li
                  key={file.id}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-hover)] py-1 pl-2 pr-1 text-[12px] text-[var(--text-primary)]"
                >
                  <Paperclip className="size-3 shrink-0 text-[var(--text-secondary)]" />
                  <span className="max-w-[160px] truncate">{file.name}</span>
                  <span className="shrink-0 text-[var(--text-muted)]">{formatBytes(file.size)}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(file.id)}
                    aria-label={`Remove ${file.name}`}
                    className="rounded p-0.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {activeToolMeta && (
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="flex items-center gap-1.5 rounded-lg border border-[var(--accent)]/40 bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] py-1 pl-2 pr-1 text-[12px] font-medium text-[var(--text-primary)]">
                {(() => {
                  const Icon = TOOL_ICONS[activeToolMeta.icon];
                  return <Icon className="size-3.5" aria-hidden />;
                })()}
                {activeToolMeta.label}
                <button
                  type="button"
                  onClick={() => setActiveTool(null)}
                  aria-label={`Disattiva ${activeToolMeta.label}`}
                  className="rounded p-0.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  <X className="size-3.5" />
                </button>
              </span>
            </div>
          )}

          <div className="mt-2 flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={onFilesPicked}
              className="hidden"
              aria-hidden
              tabIndex={-1}
            />
            <div ref={toolMenuRef} className="relative">
              <button
                type="button"
                onClick={toggleToolMenu}
                disabled={budgetBlocked}
                aria-haspopup="menu"
                aria-expanded={toolMenuOpen}
                aria-label="Strumenti"
                className={cn("rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]", budgetBlocked && "cursor-not-allowed opacity-40 hover:bg-transparent")}
              >
                <Plus className={cn("size-4 transition-transform", toolMenuOpen && "rotate-45")} />
              </button>
              <ToolPickerMenu
                tools={DEFAULT_TOOLS}
                isOpen={toolMenuOpen}
                filter={value}
                onSelect={handleToolSelect}
              />
            </div>
            {/* Model selector: composer on desktop, top bar on mobile
                (rendered in ChatLayout's header below md). Same popup. */}
            <div className="hidden md:block">
              <ModelSelector />
            </div>
            <AgentSelector />

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={speech.toggle}
                disabled={!speech.supported || budgetBlocked}
                aria-label={speech.recording ? "Stop voice input" : "Start voice input"}
                aria-pressed={speech.recording}
                title={speech.supported ? undefined : "Voice input isn't supported in this browser"}
                style={
                  speech.recording
                    ? { boxShadow: `0 0 0 ${1 + speech.level * 6}px color-mix(in srgb, var(--accent) 28%, transparent)` }
                    : undefined
                }
                className={cn(
                  "rounded-lg p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                  speech.recording
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]",
                  (!speech.supported || budgetBlocked) && "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-[var(--text-secondary)]",
                )}
              >
                <Mic className="size-4" />
              </button>
              {isStreaming ? (
                <button
                  type="button"
                  onClick={stop}
                  aria-label="Stop generating"
                  className="flex size-8 items-center justify-center rounded-lg bg-[var(--accent)] text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  <Square className="size-3.5 fill-current" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!canSend}
                  aria-label="Send message"
                  className={cn(
                    "flex size-8 items-center justify-center rounded-lg text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                    canSend
                      ? "bg-[var(--accent)] hover:opacity-90"
                      : "cursor-not-allowed bg-[var(--bg-hover)] text-[var(--text-muted)]",
                  )}
                >
                  <ArrowUp className="size-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
