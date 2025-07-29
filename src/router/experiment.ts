import { createResolver, extendPages, resolveFiles } from "@nuxt/kit";
import type { NuxtPage } from "nuxt/schema";
import { extname, join, relative } from "pathe";
import type { SmileBuildConfig } from "../types/build-config";

interface ExperimentNode {
  type: "mdx" | "vue" | "block";
  name: string;
  dirname: string;
  basename: string;
  route: string;
  order: number | undefined;
  children: ExperimentNode[] | undefined;
  canRandomize: boolean;
}

export async function addExperimentRoutes(config: SmileBuildConfig) {
  const { resolve } = createResolver(import.meta.url);

  const experimentFiles = await resolveFiles(config.paths.experiments, ["**/*.vue", "**/*.mdx"]);
  const relpaths = experimentFiles.map((path) => relative(config.paths.experiments, path));

  extendPages((pages) => {
    for (const path of relpaths) {
      const route = processRoute(path);
      let file: NuxtPage["file"];
      switch (route.type) {
        case "vue":
          file = join(config.paths.experiments, path);
          break;
        case "mdx":
          file = resolve("../runtime/components/mdx-renderer.vue");
          break;
      }
      pages.push({
        name: route.name,
        path: route.path,
        file,
      });
    }
  });
}

type RouteEntry = NuxtPage & {
  type: ExperimentNode["type"];
  order: ExperimentNode["order"];
  title?: string;
};
function processRoute(relpath: string): RouteEntry {
  const type = extname(relpath);
  const refinedSegments: string[] = [];
  let order: number | undefined;

  const segments = relpath.replace(type, "").split("/");
  for (const segment of segments) {
    if (!segment) continue;

    // Preprocess numeric prefixes (derived from `@nuxt/content`)
    const refined = refineURLPart(segment);

    // Extract ordering
    const match = segment.match(/^(?<order>\d+)\.(.*)/);
    if (match?.groups?.order) {
      order = parseInt(match.groups.order, 10);
    }

    if (refined) refinedSegments.push(refined);
  }

  const route = refinedSegments.join("/");
  const patterned = route.replaceAll(/\[[^/]+\]/g, (match) => {
    match = match.replaceAll(/\[|\]/g, "");
    if (match.includes("...")) return `:${match.replace(/.../, "")}*`;

    return `:${match}`;
  });

  const cleanedRoute = patterned ? patterned : `${segments[segments.length - 1]}`;

  return {
    name: `experiment-${route.replace(/\//g, "-")}`,
    path: `/experiment/${cleanedRoute}`,
    type: type as RouteEntry["type"],
    order,
    title: segments[segments.length - 1],
  };
}

function refineURLPart(segment: string): string {
  // biome-ignore lint/style/noNonNullAssertion: <explanation>
  segment = segment.split(/[/:]/).pop()!;

  return segment
    .replace(/(\d+\.)?(.*)/, "$2") // Remove numbering (e.g., `01.overview` -> `overview`)
    .replace(/^index(\.draft)?$/, "") // Remove the `index` keyword
    .replace(/\.draft$/, ""); // Remove the `draft` keyword
}
