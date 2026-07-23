import * as vscode from "vscode";

const SECTION = "aetheris";

export interface ExtensionSettings {
  serverUrl: string;
  autoSync: boolean;
  syncDebounceMs: number;
  includeGitMetadata: boolean;
  includeActiveFile: boolean;
  includeOpenEditors: boolean;
  maxFileSizeKb: number;
  maxContextSizeKb: number;
  additionalExcludes: string[];
  logLevel: "off" | "error" | "warn" | "info" | "debug";
}

export function getSettings(): ExtensionSettings {
  const cfg = vscode.workspace.getConfiguration(SECTION);
  return {
    serverUrl:          cfg.get<string>("serverUrl", "https://aetherisui.app").replace(/\/$/, ""),
    autoSync:           cfg.get<boolean>("autoSync", true),
    syncDebounceMs:     cfg.get<number>("syncDebounceMs", 3000),
    includeGitMetadata: cfg.get<boolean>("includeGitMetadata", true),
    includeActiveFile:  cfg.get<boolean>("includeActiveFile", true),
    includeOpenEditors: cfg.get<boolean>("includeOpenEditors", false),
    maxFileSizeKb:      cfg.get<number>("maxFileSizeKb", 256),
    maxContextSizeKb:   cfg.get<number>("maxContextSizeKb", 512),
    additionalExcludes: cfg.get<string[]>("additionalExcludes", []),
    logLevel:           cfg.get<"off"|"error"|"warn"|"info"|"debug">("logLevel", "info"),
  };
}

/** Listen for settings changes and call handler. Returns a disposable. */
export function onSettingsChanged(
  handler: (settings: ExtensionSettings) => void,
): vscode.Disposable {
  return vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration(SECTION)) handler(getSettings());
  });
}
