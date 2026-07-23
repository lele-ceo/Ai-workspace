import * as vscode from "vscode";
import { logger } from "../utils/logger";

export type TrustChangeHandler = (trusted: boolean) => void;

/**
 * Enforces VS Code Workspace Trust before any workspace content is read.
 * All workspace-reading code MUST check isTrusted() before proceeding.
 */
export class WorkspaceTrustManager {
  private handlers: TrustChangeHandler[] = [];
  private disposable: vscode.Disposable;

  constructor() {
    this.disposable = vscode.workspace.onDidGrantWorkspaceTrust(() => {
      logger.info("Workspace trust granted — context sync available");
      this.handlers.forEach((h) => h(true));
    });
  }

  /** True only when the workspace is explicitly trusted. */
  isTrusted(): boolean {
    return vscode.workspace.isTrusted;
  }

  /**
   * Throw if the workspace is not trusted.
   * Call this at the top of every function that reads workspace content.
   */
  requireTrust(): void {
    if (!this.isTrusted()) {
      throw new WorkspaceNotTrustedError(
        "Cannot access workspace content: Workspace Trust is required. " +
        "Open the Trust dialog in VS Code to proceed.",
      );
    }
  }

  /** Register a callback fired whenever trust state changes. */
  onTrustChanged(handler: TrustChangeHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Describe the current workspace environment for diagnostic purposes.
   * Never reads file content — metadata only.
   */
  describeEnvironment(): WorkspaceEnvironment {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      return { kind: "empty", trusted: false };
    }
    const scheme = folders[0].uri.scheme;
    const multiRoot = folders.length > 1;

    let kind: WorkspaceEnvironment["kind"] = "local";
    if (scheme === "vscode-remote") {
      const authority = folders[0].uri.authority;
      if (authority.startsWith("ssh-remote")) kind = "ssh-remote";
      else if (authority.startsWith("wsl")) kind = "wsl";
      else if (authority.startsWith("dev-container")) kind = "devcontainer";
      else if (authority.startsWith("codespace")) kind = "codespace";
      else kind = "remote";
    } else if (scheme !== "file") {
      kind = "virtual";
    }

    return {
      kind: multiRoot ? "multi-root" : kind,
      trusted: this.isTrusted(),
      scheme,
    };
  }

  dispose(): void {
    this.disposable.dispose();
  }
}

export class WorkspaceNotTrustedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceNotTrustedError";
  }
}

export interface WorkspaceEnvironment {
  kind:
    | "empty"
    | "local"
    | "multi-root"
    | "ssh-remote"
    | "wsl"
    | "devcontainer"
    | "codespace"
    | "remote"
    | "virtual";
  trusted: boolean;
  scheme?: string;
}
