import { hasNuxtModule, installModule } from "@nuxt/kit";
import chokidar from "chokidar";
import { consola } from "consola";
import type { ConsolaInstance } from "consola";
import { defu } from "defu";
import type { Nuxt } from "nuxt/schema";
import { join, relative } from "pathe";
import type { BuiltinDriverName } from "unstorage";
import { addAPIRoute } from "../router/internal";
import type { SmileBuildConfig } from "../types/build-config";

export function indentLines(str: string, indent: number = 2) {
  return str
    .replace(/ {2}/g, " ".repeat(indent))
    .split("\n")
    .map((line) => `${" ".repeat(indent)}${line}`)
    .join("\n");
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export async function registerModule(nuxt: Nuxt, name: string, key: string, options: Record<string, any>) {
  if (!hasNuxtModule(name)) {
    await installModule(name, options);
  } else {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    (nuxt.options as any)[key] = defu((nuxt.options as any)[key], options);
  }
}

export function useLogger(...tags: string[]) {
  return consola.withTag(["smile", ...(tags || [])].join(":"));
}

export const defaultNitroDevStorage = {
  // driver: "indexedb" as BuiltinDriverName,
  // base: "smile:",
  // dbName: "smile",
  // storeName: "smile",
  driver: "fs" as BuiltinDriverName,
  base: ".data/smile",
};

export async function devtools(buildConfig: SmileBuildConfig) {
  const {
    nuxt,
    resolver: { resolve },
  } = buildConfig;
  const base = join(resolve(".."), "src");
  const runtime = resolve("./runtime");

  const watcher = chokidar.watch(
    [
      join(runtime, "api/**/*.ts"),
      join(runtime, "middleware/**/*.ts"),
      join(runtime, "pages/**/*.vue"),
      join(runtime, "layouts/**/*.vue"),
      join(runtime, "database/**/*.ts"),
      join(runtime, "config/**/*.ts"),
      join(runtime, "utils/**/*.ts"),
    ],
    {
      ignoreInitial: true,
    }
  );

  nuxt.hook("ready", () => {
    watcher.on("add", async (path, _stats) => {
      const relpath = relative(base, path);
      logger.info(`Detected [add] in: ${relpath}`);

      if (path.includes("runtime/api/")) {
        addAPIRoute(base, path);
        return;
      }

      if (!path.includes("runtime")) {
        logger.info("Added new module file, restarting server...");
        await nuxt.callHook("restart");
        return;
      }
    });
    watcher.on("change", async (path, _stats) => {
      const relpath = relative(base, path);
      logger.info(`Detected [change] in: ${relpath}`);

      const needsRestart = ["database", "config", "utils"];
      if (needsRestart.some((p) => relpath.includes(`${p}/`))) {
        logger.info("Module source-code changed, restarting server...");
        await nuxt.callHook("restart");
        return;
      }
    });
  });
}
