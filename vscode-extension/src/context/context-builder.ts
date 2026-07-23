import * as crypto from "crypto";
import * as path from "path";
import type { ScanResult, FileContent } from "../workspace/scanner";
import type { GitMetadata } from "../utils/git";

export const CONTEXT_VERSION = 1;

// ── Schema types (mirrored in src/types/vscode-session.types.ts) ──────────────

export interface RepositoryContext {
  version: typeof CONTEXT_VERSION;
  sessionId: string;
  workspaceId: string;
  workspaceName: string;
  repositoryRoot: string;
  git: GitMetadata | null;
  fileTree: ContextFileEntry[];
  selectedFiles: ContextFileContent[];
  activeFile: ContextFileContent | null;
  openEditorPaths: string[];
  syncedAt: number;
  totalSizeBytes: number;
  excludedCount: number;
}

export interface ContextFileEntry {
  path: string;
  kind: "file" | "directory";
  language?: string;
  sizeBytes: number;
  sha256: string;
}

export interface ContextFileContent extends ContextFileEntry {
  content: string;
  truncated: boolean;
}

export interface ContextDelta {
  version: typeof CONTEXT_VERSION;
  sessionId: string;
  workspaceId: string;
  syncedAt: number;
  updatedFiles: ContextFileContent[];
  removedPaths: string[];
  activeFile: ContextFileContent | null;
}

// ── Builder ───────────────────────────────────────────────────────────────────

export class ContextBuilder {
  /**
   * Derive a stable workspace ID from the workspace root path.
   * Not sensitive — used as a correlation key, not a secret.
   */
  static workspaceId(rootPath: string): string {
    return crypto.createHash("sha256").update(rootPath, "utf8").digest("hex").slice(0, 16);
  }

  static buildFull(
    scan: ScanResult,
    git: GitMetadata | null,
    activeFile: FileContent | null,
    openEditorPaths: string[],
    sessionId: string,
    maxContextSizeKb: number,
  ): RepositoryContext {
    const maxBytes    = maxContextSizeKb * 1024;
    let accumulated   = 0;
    const selected: ContextFileContent[] = [];

    for (const f of scan.permittedFiles) {
      const fBytes = Buffer.byteLength(f.content, "utf8");
      if (accumulated + fBytes > maxBytes) break;
      accumulated += fBytes;
      selected.push({
        path:      f.path,
        kind:      "file",
        language:  f.language,
        sizeBytes: f.sizeBytes,
        sha256:    f.sha256,
        content:   f.content,
        truncated: f.truncated,
      });
    }

    return {
      version:        CONTEXT_VERSION,
      sessionId,
      workspaceId:    ContextBuilder.workspaceId(scan.workspaceRoot),
      workspaceName:  scan.workspaceName,
      repositoryRoot: path.basename(scan.workspaceRoot), // basename only, not full path
      git,
      fileTree:       scan.fileTree.map(({ path: p, kind, language, sizeBytes, sha256 }) => ({
                        path: p, kind, language, sizeBytes, sha256,
                      })),
      selectedFiles:  selected,
      activeFile:     activeFile
                        ? {
                            path:      activeFile.path,
                            kind:      "file",
                            language:  activeFile.language,
                            sizeBytes: activeFile.sizeBytes,
                            sha256:    activeFile.sha256,
                            content:   activeFile.content,
                            truncated: activeFile.truncated,
                          }
                        : null,
      openEditorPaths,
      syncedAt:       scan.scannedAt,
      totalSizeBytes: accumulated,
      excludedCount:  scan.excludedPaths.length,
    };
  }

  static buildDelta(
    previous: RepositoryContext,
    current: RepositoryContext,
  ): ContextDelta {
    const prevMap = new Map(previous.selectedFiles.map((f) => [f.path, f.sha256]));

    const updated = current.selectedFiles.filter(
      (f) => prevMap.get(f.path) !== f.sha256,
    );

    const currentPaths = new Set(current.fileTree.map((f) => f.path));
    const removed = previous.fileTree
      .filter((f) => !currentPaths.has(f.path))
      .map((f) => f.path);

    return {
      version:      CONTEXT_VERSION,
      sessionId:    current.sessionId,
      workspaceId:  current.workspaceId,
      syncedAt:     current.syncedAt,
      updatedFiles: updated,
      removedPaths: removed,
      activeFile:   current.activeFile,
    };
  }
}
