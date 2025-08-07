import { readFile, stat } from "node:fs/promises";
import type { ParsedContent } from "@nuxtjs/mdc/runtime";
import { parseMarkdown } from "@nuxtjs/mdc/runtime";
import { watch } from "chokidar";
import { hash } from "ohash";
import { join, relative } from "pathe";
import { glob } from "tinyglobby";
import { defineNitroPlugin, type NitroApp, useRuntimeConfig, useStorage } from "#nitro";
import { useLogger } from "#smile/internal/logger";

interface ProcessedMdxContent extends ParsedContent {
  _path: string;
  _hash: string;
  _source: string;
}

interface CachedFile {
  hash: string;
  mtime: number;
  processed: ProcessedMdxContent;
}

export default defineNitroPlugin(async (nitroApp: NitroApp) => {
  const logger = useLogger("runtime", "server", "mdx");
  const storage = useStorage("smile:mdx");
  const { smile: config } = useRuntimeConfig();
  logger.debug("Starting nitro plugin...");

  logger.debug(`Found config with keys:: ${Object.keys(config)}`);
  // Get experiments path from config
  const experimentsPath = join(process.cwd(), "playground", "experiments");
  logger.debug(nitroApp.buildDir);

  async function processFile(filePath: string): Promise<ProcessedMdxContent> {
    const relativePath = relative(experimentsPath, filePath);
    const content = await readFile(filePath, "utf-8");
    const stats = await stat(filePath);
    const fileHash = hash(content);

    // Check if file is cached and unchanged
    const cacheKey = `cache:${relativePath}`;
    const cached = await storage.getItem<CachedFile>(cacheKey);

    if (cached && cached.hash === fileHash && cached.mtime === stats.mtimeMs) {
      logger.debug(`Using cached MDX for ${relativePath}`);
      return cached.processed;
    }

    logger.debug(`Processing MDX file: ${relativePath}`);

    const parsed = await parseMarkdown(content, {
      remarkPlugins: [],
      rehypePlugins: [],
    });

    const processed: ProcessedMdxContent = {
      ...parsed,
      _path: `/${relativePath.replace(/\.mdx?$/, "")}`,
      _hash: fileHash,
      _source: content,
    };

    // Cache the processed result
    await storage.setItem(cacheKey, {
      hash: fileHash,
      mtime: stats.mtimeMs,
      processed,
    });

    // Store content for API access
    const contentKey = `content:${relativePath.replace(/\.mdx?$/, "")}`;
    await storage.setItem(contentKey, processed);

    return processed;
  }

  async function invalidateFile(filePath: string): Promise<void> {
    const relativePath = relative(experimentsPath, filePath);
    const cacheKey = `cache:${relativePath}`;
    const contentKey = `content:${relativePath.replace(/\.mdx?$/, "")}`;

    await storage.removeItem(cacheKey);
    await storage.removeItem(contentKey);
    logger.debug(`Invalidated cache for ${relativePath}`);
  }

  try {
    const mdxFiles = await glob(["**/*.{md,mdx}"], {
      cwd: experimentsPath,
      absolute: true,
    });

    logger.debug(`Found ${mdxFiles.length} MDX files to process`);

    let processed = 0;
    for (const filePath of mdxFiles) {
      try {
        await processFile(filePath);
        processed++;
      } catch (error) {
        logger.error(`Failed to process ${filePath}:`, error);
      }
    }

    logger.info(`Processed ${processed} MDX files`);

    // Set up file watching for development
    if (nitroApp.dev) {
      const watcher = watch(join(experimentsPath, "**/*.{md,mdx}"), {
        persistent: true,
      });

      watcher.on("change", async (filePath) => {
        logger.debug(`MDX file changed: ${filePath}`);
        try {
          await processFile(filePath);
          logger.debug(`Reprocessed ${filePath}`);
        } catch (error) {
          logger.error(`Failed to reprocess ${filePath}:`, error);
        }
      });

      watcher.on("unlink", async (filePath) => {
        logger.debug(`MDX file deleted: ${filePath}`);
        await invalidateFile(filePath);
      });
    }
  } catch (error) {
    logger.error("Failed to initialize MDX processing:", error);
  }
});
