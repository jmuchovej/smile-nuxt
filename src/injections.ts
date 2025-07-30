import {
  addComponentsDir,
  addImportsDir,
  addLayout,
  addRouteMiddleware,
  createResolver,
  logger,
  resolveFiles,
  updateTemplates,
} from "@nuxt/kit";
import type { NuxtTemplate } from "nuxt/schema";
import { parse, relative } from "pathe";
import type { SmileBuildConfig } from "./types/build-config";

export async function injectRuntimeTools(buildConfig: SmileBuildConfig) {
  const { resolve } = createResolver(import.meta.url);

  addRouteMiddleware({
    name: "smile-timeline",
    path: resolve("./runtime/middleware/timeline"),
    global: true,
  });

  addComponentsDir({
    path: resolve("./runtime/components"),
    prefix: "Smile",
    pathPrefix: false,
    watch: true,
  });

  addImportsDir(resolve("./runtime/composables"));

  const layouts = await resolveFiles(resolve("./runtime/layouts"), "**/*.vue");
  const templates: string[] = [];

  for (const layout of layouts) {
    const template = addTemplatePage(resolve("./runtime"), layout);
    // biome-ignore lint/style/noNonNullAssertion: this will always be set...
    templates.push(template.filename!);
  }

  if (!buildConfig.nuxt.options.dev) return;

  buildConfig.nuxt.hook("builder:watch", async (event, relpath) => {
    if (event !== "change") return;

    const path = resolve(buildConfig.nuxt.options.srcDir, relpath);

    logger.info(path);
    if (path.includes("smile") && path.includes("runtime")) {
      await updateTemplates({
        filter: (template) => templates.includes(template.filename),
      });
    }
  });
}

export function addTemplatePage(base: string, path: string): NuxtTemplate {
  const suffix = relative(base, path);
  const template: NuxtTemplate = {
    src: path,
    filename: `smile/${suffix}`,
    write: true,
  };
  addLayout(template, `smile-${parse(suffix).name}`);
  return template;
}
