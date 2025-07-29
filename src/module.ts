// biome-ignore assist/source/organizeImports: Must be first to ensure zod extensions are loaded
import "./database/zod";
import { createResolver, defineNuxtModule } from "@nuxt/kit";
import { defu } from "defu";
import type { Nuxt } from "nuxt/schema";
import { loadSmileConfig } from "./config";
import { initializeDatabase } from "./database";
import { spawnDrizzleStudio } from "./database/studio";
import { generateRoutingTable } from "./router";
import { createSmileBuildConfig } from "./types/build-config";
import { logger, registerModule } from "./utils/module";

export type * from "./config";
export {
  defineExperiment,
  defineSmileConfig,
  defineStimuli,
} from "./config";
export * from "./types";

export interface SmileModuleOptions {
  database?: {
    type: "sqlite" | string;
    url: string;
    studio: {
      port: number;
    };
  };
}

export default defineNuxtModule<SmileModuleOptions>({
  meta: {
    name: "@smile/nuxt",
    configKey: "smile",
    compatibility: {
      nuxt: ">=3.16.0",
    },
    docs: "https://smile.gureckislab.org/getting-started/",
  },
  defaults: {
    database: {
      type: "sqlite",
      url: "file:./smile.db",
      studio: {
        port: 7646,
      },
    },
  },
  async setup(_options: SmileModuleOptions, nuxt: Nuxt) {
    const resolver = createResolver(import.meta.url);
    const { resolve } = resolver;
    nuxt.options.alias["#smile"] = resolve("./runtime");

    nuxt.options.pages = nuxt.options.pages || {};
    nuxt.options.pages = true;

    nuxt.options.ssr = false;

    nuxt.options.router = defu(nuxt.options.router || {}, {
      options: { hashMode: true },
    });
    nuxt.options.router.options.hashMode = true;

    await registerModule(nuxt, "@nuxtjs/mdc", "mdc", {});
    await registerModule(nuxt, "@nuxt/ui-pro", "ui", {
      css: ["~assets/css/main.css"],
    });

    nuxt.options.appConfig = defu(nuxt.options.appConfig, { smile: {} });
    nuxt.options.runtimeConfig = defu(nuxt.options.runtimeConfig, {
      smile: {},
      public: {
        smile: {},
      },
    });

    logger.debug(`Loading \`smile.config.ts\`...`);
    const { activeExperiment, experiments } = await loadSmileConfig(nuxt);
    const versions = Object.keys(experiments) as string[];
    logger.debug(`Loaded ${versions.length} experiments.`);

    nuxt.options.appConfig.smile = defu(nuxt.options.appConfig.smile, {
      activeExperiment,
      availableExperiments: versions,
    });

    nuxt.options.runtimeConfig.smile = defu(nuxt.options.runtimeConfig.smile, {
      activeExperiment,
      experiments,
    });

    const buildConfig = createSmileBuildConfig(nuxt, experiments, resolver);

    logger.debug("Dispatching database initializer...");
    await initializeDatabase(buildConfig);
    logger.debug("Dispatching drizzle studio spawner...");
    await spawnDrizzleStudio(buildConfig);
    logger.debug("Generating route table...");
    await generateRoutingTable(buildConfig);
  },
});
