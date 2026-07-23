import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { WorkspaceTrustManager } from "./trust-manager";
import { filterFile, compileExcludes, shouldExcludeDirectory } from "./file-filter";
import { logger } from "../utils/logger";
import type { ExtensionSettings } from "../config/settings";

const MAX_FILES    = 500;
const MAX_SCAN_MS  = 10_000; // abort scan after 10s

export interface FileEntry {
  path: string;   // relative to workspace root
  kind: "file" | "directory";
  language?: string;
  sizeBytes: number;
  sha256: string;
}

export interface FileContent extends FileEntry {
  content: string;
  truncated: boolean;
}

export interface ScanResult {
  workspaceRoot: string;
  workspaceName: string;
  fileTree: FileEntry[];
  /** Files whose content passed all filters and size limits. */
  permittedFiles: FileContent[];
  excludedPaths: string[];
  scannedAt: number;
}

export class WorkspaceScanner {
  constructor(private readonly trustManager: WorkspaceTrustManager) {}

  async scan(settings: ExtensionSettings): Promise<ScanResult | null> {
    this.trustManager.requireTrust();

    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      logger.warn("No workspace folder open");
      return null;
    }

    const root      = folder.uri.fsPath;
    const name      = folder.name;
    const userExcl  = compileExcludes(settings.additionalExcludes);
    const maxKb     = settings.maxFileSizeKb;
    const deadline  = Date.now() + MAX_SCAN_MS;

    const fileTree: FileEntry[]    = [];
    const permitted: FileContent[] = [];
    const excluded: string[]       = [];

    await this.walk(root, root, fileTree, permitted, excluded, userExcl, maxKb, deadline);

    logger.info("Workspace scan complete", {
      files:    fileTree.filter((f) => f.kind === "file").length,
      excluded: excluded.length,
    });

    return {
      workspaceRoot: root,
      workspaceName: name,
      fileTree,
      permittedFiles: permitted,
      excludedPaths:  excluded,
      scannedAt:      Date.now(),
    };
  }

  /** Read just the active editor file (fast path). */
  async readActiveFile(settings: ExtensionSettings): Promise<FileContent | null> {
    this.trustManager.requireTrust();

    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.uri.scheme !== "file") return null;

    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) return null;

    const absPath = editor.document.uri.fsPath;
    const root    = folder.uri.fsPath;
    const rel     = path.relative(root, absPath).replace(/\\/g, "/");

    if (rel.startsWith("..")) return null; // outside workspace

    const content  = editor.document.getText();
    const maxBytes = settings.maxFileSizeKb * 1024;
    const result   = filterFile(rel, content, Buffer.byteLength(content, "utf8"), settings.maxFileSizeKb, compileExcludes(settings.additionalExcludes));

    if (!result.allowed) return null;

    const truncated = Buffer.byteLength(content, "utf8") > maxBytes;
    const slice     = truncated ? content.slice(0, maxBytes) : content;

    return {
      path:      rel,
      kind:      "file",
      language:  editor.document.languageId,
      sizeBytes: Buffer.byteLength(slice, "utf8"),
      sha256:    sha256hex(slice),
      content:   slice,
      truncated,
    };
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private async walk(
    dir: string,
    root: string,
    fileTree: FileEntry[],
    permitted: FileContent[],
    excluded: string[],
    userExcl: RegExp[],
    maxFileSizeKb: number,
    deadline: number,
  ): Promise<void> {
    if (Date.now() > deadline || fileTree.length >= MAX_FILES) return;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (Date.now() > deadline || fileTree.length >= MAX_FILES) break;

      const abs = path.join(dir, entry.name);
      const rel = path.relative(root, abs).replace(/\\/g, "/");

      if (entry.isSymbolicLink()) {
        // Validate symlink stays inside workspace root.
        try {
          const real = fs.realpathSync(abs);
          if (!real.startsWith(root)) {
            excluded.push(rel);
            continue;
          }
        } catch {
          excluded.push(rel);
          continue;
        }
      }

      if (entry.isDirectory()) {
        if (shouldExcludeDirectory(entry.name)) {
          excluded.push(rel + "/");
          continue;
        }
        fileTree.push({ path: rel, kind: "directory", sizeBytes: 0, sha256: "" });
        await this.walk(abs, root, fileTree, permitted, excluded, userExcl, maxFileSizeKb, deadline);
        continue;
      }

      if (!entry.isFile()) continue;

      let stat: fs.Stats;
      try { stat = fs.statSync(abs); } catch { continue; }

      if (stat.size > maxFileSizeKb * 1024) {
        excluded.push(rel);
        continue;
      }

      let content: string;
      try { content = fs.readFileSync(abs, "utf8"); } catch { continue; }

      const check = filterFile(rel, content, stat.size, maxFileSizeKb, userExcl);
      const lang  = languageFromExtension(path.extname(entry.name));

      const entry2: FileEntry = {
        path:      rel,
        kind:      "file",
        language:  lang,
        sizeBytes: stat.size,
        sha256:    sha256hex(content),
      };
      fileTree.push(entry2);

      if (!check.allowed) {
        excluded.push(rel);
        continue;
      }

      permitted.push({ ...entry2, content, truncated: false });
    }
  }
}

function sha256hex(s: string): string {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

function languageFromExtension(ext: string): string | undefined {
  const map: Record<string, string> = {
    ".ts": "typescript", ".tsx": "typescriptreact", ".js": "javascript",
    ".jsx": "javascriptreact", ".py": "python", ".rs": "rust",
    ".go": "go", ".java": "java", ".cs": "csharp", ".rb": "ruby",
    ".php": "php", ".swift": "swift", ".kt": "kotlin", ".cpp": "cpp",
    ".c": "c", ".h": "c", ".md": "markdown", ".json": "json",
    ".yaml": "yaml", ".yml": "yaml", ".toml": "toml", ".sql": "sql",
    ".sh": "shellscript", ".bash": "shellscript", ".zsh": "shellscript",
    ".html": "html", ".css": "css", ".scss": "scss",
  };
  return map[ext.toLowerCase()];
}
