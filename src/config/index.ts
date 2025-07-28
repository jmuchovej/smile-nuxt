import z from "zod";
import type { Nuxt } from "nuxt/schema";
import { join, relative } from "pathe";
import { logger } from "../utils/module";
import { resolveExperiments, defineExperiment, type DefinedExperiment } from "./experiment";
import { defineStimuli } from "./stimuli";
import { createDefineConfig, loadConfig, watchConfig, type WatchConfigOptions } from "c12";

export type * from "./module";
export type * from "./experiment";
export type * from "./stimuli";
export type * from "./step";
export { defineExperiment } from "./experiment";
export { defineStimuli } from "./stimuli";

type NuxtSmileConfig = {
  activeExperiment: string;
  experiments: Record<string, DefinedExperiment>;
};

type SmileConfigLoaderOptions = {
  defaultFallback?: boolean;
}

const defaultConfig: NuxtSmileConfig = {
  activeExperiment: "pilot-01",
  experiments: {
    'pilot-01': defineExperiment({
      compensation: "$100.00",
      duration: "10 minutes",
      services: [
        {type: "prolific", code: "C7W0RVYD" },
      ],
      stimuli: defineStimuli({
        name: "random",
        source: "random.csv",
        schema: z.object({
          id: z.string().trialID(),
        }),
      }),
      schema: z.object({
        id: z.string().trialID(),
      })
    })
  },
};

export const defineSmileConfig = createDefineConfig<NuxtSmileConfig>();

type ConfigLoader = typeof watchConfig;

export async function loadSmileConfig(nuxt: Nuxt) {
  const devConfigLoader = (opts: WatchConfigOptions) => watchConfig({
    ...opts,
    onWatch: (e) => {
      logger.info(`${relative(nuxt.options.rootDir, e.path)} ${e.type}, restarting the Nuxt server...`);
      nuxt.hooks.callHook(`restart`, { hard: true })
    }
  })
  const prodConfigLoader = loadConfig;
  const configLoader = (nuxt.options.dev ? devConfigLoader : prodConfigLoader) as ConfigLoader;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).defineSmileConfig = (c: any) => c

  const layers = [...nuxt.options._layers].reverse()

  const configs = await Promise.all(
    layers.map(layer => configLoader<NuxtSmileConfig>({
      name: "smile",
      cwd: layer.config.rootDir,
      // Don't push the dummy configuration that's used for type-generation
      defaultConfig: { activeExperiment: "", experiments: {} }
    }))
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).defineSmileConfig

  if (nuxt.options.dev) {
    nuxt.hook("close", () => Promise.all(configs.map(c => c.unwatch())).then(() => {}))
  }

  const activeExperiment = configs.find((c) => c.config?.activeExperiment)?.config.activeExperiment;

  const definedExperiments = configs.reduce((acc, current) => {
    const experiments = current.config?.experiments || {};
    const cwd = current.cwd!

    for (const [version, experiment] of Object.entries(experiments)) {
      experiment.rootDir = join(cwd, "experiments");
      acc[version] = experiment;
    }

    return acc;
  }, {} as NuxtSmileConfig["experiments"])
  const hasNoExperiments = Object.keys(definedExperiments || {}).length === 0;

  if (hasNoExperiments) {
    logger.warn(
      `No experiment configurations found! Falling back to the default experiment.`,
      `To have full control over your experiments, define the config file in your project root.`,
      `\n`,
      `See: https://smilejs.netlify.app/getting-started`,
    );
  }

  const experiments = resolveExperiments(
    hasNoExperiments ? defaultConfig.experiments : definedExperiments
  );

  return {
    activeExperiment,
    experiments,
  };
}
