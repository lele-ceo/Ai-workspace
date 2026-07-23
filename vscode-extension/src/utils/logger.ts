import * as vscode from "vscode";

export type LogLevel = "off" | "error" | "warn" | "info" | "debug";

const LEVELS: Record<LogLevel, number> = {
  off: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

let channel: vscode.OutputChannel | null = null;
let currentLevel: LogLevel = "info";

export function initLogger(outputChannel: vscode.OutputChannel): void {
  channel = outputChannel;
}

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

function write(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  if (!channel || LEVELS[currentLevel] < LEVELS[level]) return;
  const ts = new Date().toISOString();
  const prefix = `[${ts}] [${level.toUpperCase()}]`;
  // Never log token values, file contents, or secrets.
  const safe = context ? ` ${JSON.stringify(sanitize(context))}` : "";
  channel.appendLine(`${prefix} ${message}${safe}`);
}

function sanitize(obj: Record<string, unknown>): Record<string, unknown> {
  const REDACTED = "[REDACTED]";
  const SENSITIVE = /token|secret|key|password|credential|auth|cookie/i;
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k,
      SENSITIVE.test(k) ? REDACTED : v,
    ]),
  );
}

export const logger = {
  error: (msg: string, ctx?: Record<string, unknown>) => write("error", msg, ctx),
  warn:  (msg: string, ctx?: Record<string, unknown>) => write("warn",  msg, ctx),
  info:  (msg: string, ctx?: Record<string, unknown>) => write("info",  msg, ctx),
  debug: (msg: string, ctx?: Record<string, unknown>) => write("debug", msg, ctx),
  show:  () => channel?.show(),
};
