import * as vscode from "vscode";
import { AuthManager } from "./auth/auth-manager";
import { SessionManager } from "./session/session-manager";
import { ApiClient } from "./session/api-client";
import { WorkspaceTrustManager, WorkspaceNotTrustedError } from "./workspace/trust-manager";
import { WorkspaceScanner } from "./workspace/scanner";
import { ContextBuilder } from "./context/context-builder";
import { ContextUploader } from "./context/uploader";
import { StatusBar } from "./ui/status-bar";
import { initLogger, setLogLevel, logger } from "./utils/logger";
import { getGitMetadata } from "./utils/git";
import { getSettings, onSettingsChanged } from "./config/settings";
import type { RepositoryContext } from "./context/context-builder";

// ── Module-level singletons (reset on deactivate) ────────────────────────────
let authManager:    AuthManager;
let sessionManager: SessionManager;
let apiClient:      ApiClient;
let trustManager:   WorkspaceTrustManager;
let scanner:        WorkspaceScanner;
let uploader:       ContextUploader;
let statusBar:      StatusBar;
let lastContext:    RepositoryContext | null = null;
let debounceTimer:  NodeJS.Timeout | null = null;

export function activate(context: vscode.ExtensionContext): void {
  const channel = vscode.window.createOutputChannel("AetherisUI");
  context.subscriptions.push(channel);
  initLogger(channel);

  const settings = getSettings();
  setLogLevel(settings.logLevel);
  logger.info("AetherisUI extension activating");

  // ── Construct services ─────────────────────────────────────────────────────
  const settings0 = getSettings();
  apiClient      = new ApiClient(settings0.serverUrl);
  authManager    = new AuthManager(context);
  sessionManager = new SessionManager(authManager, apiClient);
  trustManager   = new WorkspaceTrustManager();
  scanner        = new WorkspaceScanner(trustManager);
  uploader       = new ContextUploader(apiClient);
  statusBar      = new StatusBar();

  context.subscriptions.push(authManager, trustManager, statusBar);

  // ── React to session state changes ────────────────────────────────────────
  sessionManager.onStateChanged((state) => {
    const wsName = lastContext?.workspaceName;
    statusBar.update(state, state === "connected" ? wsName : undefined);
    if (state === "auth-required" || state === "session-expired") {
      void vscode.window.showWarningMessage(
        "AetherisUI: Sign in required.",
        "Sign In",
      ).then((v) => { if (v) void vscode.commands.executeCommand("aetheris.signIn"); });
    }
  });

  // ── React to Workspace Trust changes ──────────────────────────────────────
  trustManager.onTrustChanged((trusted) => {
    if (trusted && sessionManager.getState() === "connected") {
      void triggerSync(true);
    }
  });

  // ── File watcher for auto-sync ────────────────────────────────────────────
  const watcher = vscode.workspace.createFileSystemWatcher("**/*", false, false, false);
  context.subscriptions.push(watcher);

  const debouncedSync = () => {
    const cfg = getSettings();
    if (!cfg.autoSync) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => void triggerSync(false), cfg.syncDebounceMs);
  };

  context.subscriptions.push(
    watcher.onDidChange(debouncedSync),
    watcher.onDidCreate(debouncedSync),
    watcher.onDidDelete(debouncedSync),
  );

  // Active editor change → refresh active file in context
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => {
      if (getSettings().includeActiveFile && sessionManager.getState() === "connected") {
        debouncedSync();
      }
    }),
  );

  // ── Settings changes ──────────────────────────────────────────────────────
  context.subscriptions.push(
    onSettingsChanged((s) => {
      setLogLevel(s.logLevel);
      apiClient = new ApiClient(s.serverUrl);
    }),
  );

  // ── Register commands ─────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand("aetheris.signIn", async () => {
      if (await authManager.isAuthenticated()) {
        void vscode.window.showInformationMessage("AetherisUI: Already signed in.");
        return;
      }
      await authManager.signIn();
    }),

    vscode.commands.registerCommand("aetheris.signOut", async () => {
      await sessionManager.disconnect();
      await authManager.signOut();
      lastContext = null;
      void vscode.window.showInformationMessage("AetherisUI: Signed out.");
    }),

    vscode.commands.registerCommand("aetheris.connectWorkspace", async () => {
      if (!(await authManager.isAuthenticated())) {
        void vscode.window.showWarningMessage(
          "AetherisUI: Sign in first.",
          "Sign In",
        ).then((v) => { if (v) void vscode.commands.executeCommand("aetheris.signIn"); });
        return;
      }
      if (!trustManager.isTrusted()) {
        void vscode.window.showWarningMessage(
          "AetherisUI: Workspace Trust is required to connect.",
        );
        return;
      }
      const connected = await sessionManager.connect();
      if (connected) await triggerSync(true);
    }),

    vscode.commands.registerCommand("aetheris.disconnectWorkspace", async () => {
      if (lastContext) await uploader.clearContext(lastContext.workspaceId);
      await sessionManager.disconnect();
      lastContext = null;
      void vscode.window.showInformationMessage("AetherisUI: Workspace disconnected.");
    }),

    vscode.commands.registerCommand("aetheris.syncWorkspace", async () => {
      if (sessionManager.getState() !== "connected") {
        void vscode.window.showWarningMessage("AetherisUI: Not connected.");
        return;
      }
      await triggerSync(true);
    }),

    vscode.commands.registerCommand("aetheris.showStatus", () => {
      const env   = trustManager.describeEnvironment();
      const state = sessionManager.getState();
      const lines = [
        `State: ${state}`,
        `Workspace: ${lastContext?.workspaceName ?? "—"}`,
        `Branch: ${lastContext?.git?.branch ?? "—"}`,
        `Files: ${lastContext?.fileTree.filter((f) => f.kind === "file").length ?? 0}`,
        `Trust: ${env.trusted ? "granted" : "restricted"} (${env.kind})`,
        `Last sync: ${lastContext ? new Date(lastContext.syncedAt).toLocaleTimeString() : "—"}`,
      ];
      void vscode.window.showInformationMessage(`AetherisUI\n${lines.join("\n")}`);
    }),

    vscode.commands.registerCommand("aetheris.openWebApp", async () => {
      const { serverUrl } = getSettings();
      await vscode.env.openExternal(vscode.Uri.parse(serverUrl));
    }),

    vscode.commands.registerCommand("aetheris.showExcludedFiles", () => {
      logger.show();
      void vscode.window.showInformationMessage(
        "AetherisUI: Excluded files are listed in the output channel.",
      );
    }),

    vscode.commands.registerCommand("aetheris.clearCache", async () => {
      if (lastContext) await uploader.clearContext(lastContext.workspaceId);
      lastContext = null;
      void vscode.window.showInformationMessage("AetherisUI: Context cache cleared.");
    }),

    vscode.commands.registerCommand("aetheris.revokeSession", async () => {
      await authManager.signOut();
      await sessionManager.disconnect();
      lastContext = null;
      void vscode.window.showInformationMessage("AetherisUI: Session revoked.");
    }),

    vscode.commands.registerCommand("aetheris.showLogs", () => {
      logger.show();
    }),
  );

  // Auto-connect on startup if already authenticated
  void (async () => {
    if (await authManager.isAuthenticated()) {
      await sessionManager.connect();
      if (sessionManager.getState() === "connected" && trustManager.isTrusted()) {
        await triggerSync(true);
      }
    } else {
      statusBar.update("auth-required");
    }
  })();

  logger.info("AetherisUI extension activated");
}

// ── Sync orchestration ────────────────────────────────────────────────────────

async function triggerSync(full: boolean): Promise<void> {
  if (sessionManager.getState() !== "connected") return;

  const settings = getSettings();
  statusBar.setSyncing();

  try {
    const scan = await scanner.scan(settings);
    if (!scan) return;

    const root   = scan.workspaceRoot;
    const git    = settings.includeGitMetadata ? await getGitMetadata(root) : null;
    const active = settings.includeActiveFile  ? await scanner.readActiveFile(settings) : null;
    const open   = settings.includeOpenEditors
      ? vscode.window.visibleTextEditors
          .map((e) => e.document.uri.fsPath)
          .filter((p) => p.startsWith(root))
      : [];

    const session = await authManager.getSession();
    if (!session) return;

    if (full || !lastContext) {
      const ctx = ContextBuilder.buildFull(
        scan, git, active, open, session.sessionId, settings.maxContextSizeKb,
      );
      await uploader.uploadFull(ctx);
      lastContext = ctx;
    } else {
      const next = ContextBuilder.buildFull(
        scan, git, active, open, session.sessionId, settings.maxContextSizeKb,
      );
      const delta = ContextBuilder.buildDelta(lastContext, next);
      await uploader.uploadDelta(delta);
      lastContext = next;
    }
  } catch (e) {
    if (e instanceof WorkspaceNotTrustedError) {
      logger.warn("Sync skipped — workspace not trusted");
    } else {
      logger.error("Sync error", { error: String(e) });
    }
  } finally {
    const state = sessionManager.getState();
    statusBar.update(state, state === "connected" ? lastContext?.workspaceName : undefined);
  }
}

export function deactivate(): void {
  logger.info("AetherisUI extension deactivating");
  if (debounceTimer) clearTimeout(debounceTimer);
  sessionManager?.dispose();
}
