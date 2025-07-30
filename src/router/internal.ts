import { addServerHandler, createResolver, extendPages, resolveFiles } from "@nuxt/kit";
import type { RouterMethod } from "h3";
import { extname, relative } from "pathe";
import type { SmileBuildConfig } from "../types/build-config";

export async function addInternalRoutes(config: SmileBuildConfig) {
  const { resolve } = createResolver(import.meta.url);

  extendPages(async (pages) => {
    pages.push({
      name: "smile-config",
      path: "/smile/config",
      file: resolve("../runtime/pages/config.vue"),
    });

    for (const experiment of Object.values(config.experiments)) {
      pages.push({
        name: `smile-timeline-${experiment.version}`,
        path: `/experiment/${experiment.version}/_timeline`,
        file: resolve("../runtime/pages/experiment-timeline.vue"),
        meta: {
          experiment: experiment.version,
          devOnly: true,
        },
      });
    }
  });

  const apiBase = resolve("../runtime/server/api");
  const apiFiles = await resolveFiles(apiBase, "**/*.ts");

  for (const apiFile of apiFiles) {
    addAPIRoute(apiBase, apiFile);
  }
}

export function addAPIRoute(base: string, path: string) {
  const relpath = relative(base, path);

  const [route, method] = relpath.replace(extname(relpath), "").split(".", 2);
  if (!route || !method) return;

  addServerHandler({
    route: `/api/smile/${route.replace(/\/index$/, "")}`,
    method: method as RouterMethod,
    handler: path,
  });
}
