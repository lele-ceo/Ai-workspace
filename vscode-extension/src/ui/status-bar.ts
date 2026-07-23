import * as vscode from "vscode";
import type { ConnectionState } from "../session/session-manager";

const PRIORITY = 100; // right side of status bar

interface StatusConfig {
  text:    string;
  tooltip: string;
  color?:  vscode.ThemeColor;
  command?: string;
}

const STATE_CONFIG: Record<ConnectionState, StatusConfig> = {
  disconnected:    { text: "$(cloud-upload) Aetheris",      tooltip: "AetherisUI — Click to connect",       command: "aetheris.connectWorkspace" },
  "auth-required": { text: "$(key) Aetheris: Sign in",      tooltip: "AetherisUI — Authentication required", command: "aetheris.signIn" },
  connecting:      { text: "$(loading~spin) Aetheris",       tooltip: "AetherisUI — Connecting…" },
  connected:       { text: "$(check) Aetheris",              tooltip: "AetherisUI — Workspace connected",    command: "aetheris.showStatus",
                      color: new vscode.ThemeColor("statusBarItem.prominentForeground") },
  "session-expired": { text: "$(warning) Aetheris: Expired", tooltip: "AetherisUI — Session expired, sign in again", command: "aetheris.signIn",
                      color: new vscode.ThemeColor("statusBarItem.warningForeground") },
  "access-revoked":  { text: "$(error) Aetheris: Revoked",   tooltip: "AetherisUI — Access revoked",          command: "aetheris.signIn",
                      color: new vscode.ThemeColor("statusBarItem.errorForeground") },
  error:             { text: "$(error) Aetheris",             tooltip: "AetherisUI — Error. Check logs.",      command: "aetheris.showLogs",
                      color: new vscode.ThemeColor("statusBarItem.errorForeground") },
};

export class StatusBar {
  private readonly item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      PRIORITY,
    );
    this.item.show();
    this.update("disconnected");
  }

  update(state: ConnectionState, workspaceName?: string): void {
    const cfg   = STATE_CONFIG[state];
    const label = workspaceName ? `${cfg.text} (${workspaceName})` : cfg.text;
    this.item.text          = label;
    this.item.tooltip       = cfg.tooltip;
    this.item.color         = cfg.color;
    this.item.command       = cfg.command;
    this.item.backgroundColor = undefined;
  }

  setSyncing(): void {
    this.item.text    = "$(sync~spin) Aetheris: Syncing…";
    this.item.tooltip = "AetherisUI — Uploading workspace context";
    this.item.command = undefined;
  }

  dispose(): void {
    this.item.dispose();
  }
}
