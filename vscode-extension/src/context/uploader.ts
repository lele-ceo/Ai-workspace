import * as vscode from "vscode";
import type { ApiClient } from "../session/api-client";
import type { RepositoryContext, ContextDelta } from "./context-builder";
import { logger } from "../utils/logger";

const MAX_RETRY        = 3;
const RETRY_DELAY_MS   = [1_000, 4_000, 16_000];

export class ContextUploader {
  constructor(private readonly apiClient: ApiClient) {}

  async uploadFull(ctx: RepositoryContext): Promise<boolean> {
    for (let attempt = 0; attempt < MAX_RETRY; attempt++) {
      const ok = await this.apiClient.uploadContext(ctx);
      if (ok) {
        logger.info("Full context uploaded", {
          files:     ctx.selectedFiles.length,
          sizeKb:    Math.round(ctx.totalSizeBytes / 1024),
          workspace: ctx.workspaceId,
        });
        return true;
      }
      logger.warn(`Upload attempt ${attempt + 1} failed, retrying`);
      await delay(RETRY_DELAY_MS[attempt] ?? 16_000);
    }
    logger.error("Full context upload failed after max retries");
    return false;
  }

  async uploadDelta(delta: ContextDelta): Promise<boolean> {
    if (delta.updatedFiles.length === 0 && delta.removedPaths.length === 0) {
      logger.debug("Delta is empty, skipping upload");
      return true;
    }
    const ok = await this.apiClient.uploadDelta(delta);
    if (ok) {
      logger.info("Delta uploaded", {
        updated: delta.updatedFiles.length,
        removed: delta.removedPaths.length,
      });
    } else {
      logger.warn("Delta upload failed");
    }
    return ok;
  }

  async clearContext(workspaceId: string): Promise<void> {
    const ok = await this.apiClient.deleteContext(workspaceId);
    logger.info("Context cleared", { workspaceId, ok });
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
