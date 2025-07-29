import { createResolver, extendPages, resolveFiles } from "@nuxt/kit";
import type { NuxtPage } from "nuxt/schema";
import { dirname, extname, join, relative } from "pathe";
import type { SmileBuildConfig } from "../types/build-config";
import { logger } from "../utils/module";

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

  const routingTable: Record<string, any[]> = {};
  const timelines: Record<string, any[]> = {};

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

  // const experimentFiles: Record<string, string[]> = Object.fromEntries(
  //   await Promise.all(
  //     Object.keys(config.experiments).map(async (experiment) => {
  //       const base = join(config.paths.experiments, experiment);
  //       const files = await resolveFiles(base, ["**/*.vue", "**/*.mdx"]);
  //       logger.debug(`found ${files.length} files for \`${experiment}\``);
  //       const relpaths = files.map((path) => relative(base, path));
  //       return [experiment, relpaths];
  //     })
  //   )
  // );

  // const experimentTree = Object.fromEntries(
  //   Object.entries(experimentFiles).map(([name, files]) => {
  //     const root: ExperimentNode = {
  //       type: "block",
  //       name: "root",
  //       dirname: "root",
  //       basename: "root",
  //       route: "root",
  //       order: undefined,
  //       children: [],
  //       canRandomize: false,
  //     };
  //     for (const file of files) {
  //       logger.debug(`traversing ${file}...`);
  //       buildExperimentTree(root, "", file);
  //     }

  //     // Update canRandomize based on children
  //     updateCanRandomize(root);

  //     return [name, root];
  //   })
  // );
}

function buildExperimentTree(
  parent: ExperimentNode,
  prefix: string,
  path: string | undefined
): ExperimentNode | undefined {
  if (!path || !parent.children) return parent;

  const [segment, ...remainingPath] = path.split("/");
  if (!segment) return parent;

  const relpath = prefix ? join(prefix, segment) : segment;
  const name = relpath.replace(/\//g, "-");

  // Check if this node already exists in parent's children
  let existingNode = parent.children.find((child) => child.basename === segment);

  if (!existingNode) {
    // Create new node
    const { route, order } = processRoute(relpath);
    const stripped = segment.replace(/(\d+\.)?(.*)/, "$2");
    const extension = extname(stripped).replace(/\./g, "");
    const type = (extension === "" ? "block" : extension) as ExperimentNode["type"];

    existingNode = {
      type,
      name,
      children: type === "block" ? [] : undefined,
      dirname: dirname(relpath),
      basename: segment,
      route,
      order,
      canRandomize: true, // Will be updated based on children
    };
    parent.children.push(existingNode);
    logger.debug(`  Created: ${parent.name} -> ${existingNode.name} (${existingNode.type})`);
  }

  // If there's more path to process and this node can have children
  if (remainingPath.length > 0 && existingNode.children !== undefined) {
    buildExperimentTree(existingNode, relpath, remainingPath.join("/"));
  }

  return parent;
}

function updateCanRandomize(node: ExperimentNode): void {
  if (!node.children || node.children.length === 0) {
    // Leaf nodes already have their canRandomize set correctly
    return;
  }

  // First, recursively process all children
  for (const child of node.children) {
    updateCanRandomize(child);
  }

  const hasOrderedChildren = node.children.some((child) => child.order !== undefined);
  node.canRandomize = !hasOrderedChildren;
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
