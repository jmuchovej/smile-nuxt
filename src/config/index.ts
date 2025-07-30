import { createDefineConfig, loadConfig, type WatchConfigOptions, watchConfig } from "c12";
import type { Nuxt } from "nuxt/schema";
import { join, relative } from "pathe";
import z from "zod";
import { useLogger } from "../utils/module";
import { type DefinedExperiment, defineExperiment, resolveExperiments } from "./experiment";
import { defineStimuli } from "./stimuli";

export type * from "./experiment";
export { defineExperiment } from "./experiment";
export type * from "./module";
export type * from "./step";
export type * from "./stimuli";
export { defineStimuli } from "./stimuli";

type NuxtSmileConfig = {
  activeExperiment: string;
  experiments: Record<string, DefinedExperiment>;
};

const defaultConfig: NuxtSmileConfig = {
  activeExperiment: "default-experiment",
  experiments: {
    "default-experiment": defineExperiment({
      compensation: "$100.00",
      duration: "10 minutes",
      services: [{ type: "prolific", code: "C7W0RVYD" }],
      stimuli: defineStimuli({
        name: "silly-rabbit",
        source: "trix-are-for-kids.csv",
        schema: z.object({
          id: z.string().trialID(),
        }),
      }),
      schema: z.object({
        id: z.string().trialID(),
      }),
    }),
  },
};

export const defineSmileConfig = createDefineConfig<NuxtSmileConfig>();

type ConfigLoader = typeof watchConfig;

export async function loadSmileConfig(nuxt: Nuxt) {
  const logger = useLogger("config");
  const devConfigLoader = (opts: WatchConfigOptions) =>
    watchConfig({
      ...opts,
      onWatch: (e) => {
        logger.info(`${relative(nuxt.options.rootDir, e.path)} ${e.type}, restarting the Nuxt server...`);
        nuxt.hooks.callHook(`restart`, { hard: true });
      },
    });
  const prodConfigLoader = loadConfig;
  const configLoader = (nuxt.options.dev ? devConfigLoader : prodConfigLoader) as ConfigLoader;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).defineSmileConfig = (c: any) => c;

  const layers = [...nuxt.options._layers].reverse();

  const configs = await Promise.all(
    layers.map((layer) =>
      configLoader<NuxtSmileConfig>({
        name: "smile",
        cwd: layer.config.rootDir,
        // Don't push the dummy configuration that's used for type-generation
        defaultConfig: { activeExperiment: "", experiments: {} },
      })
    )
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).defineSmileConfig;

  if (nuxt.options.dev) {
    nuxt.hook("close", () => Promise.all(configs.map((c) => c.unwatch())).then(() => {}));
  }

  const activeExperiment = configs.find((c) => c.config?.activeExperiment)?.config.activeExperiment;

  const definedExperiments = configs.reduce(
    (acc, current) => {
      const experiments = current.config?.experiments || {};
      // biome-ignore lint/style/noNonNullAssertion: This will be resolved by `c12`
      const cwd = current.cwd!;

      for (const [version, experiment] of Object.entries(experiments)) {
        experiment.rootDir = join(cwd, "experiments");
        acc[version] = experiment;
      }

      return acc;
    },
    {} as NuxtSmileConfig["experiments"]
  );
  const hasNoExperiments = Object.keys(definedExperiments || {}).length === 0;

  if (hasNoExperiments) {
    logger.warn(
      `No experiment configurations found! Falling back to the default experiment.`,
      `To have full control over your experiments, define the config file in your project root.`,
      `\n`,
      `See: https://smilejs.netlify.app/getting-started`
    );
  }

  const experiments = resolveExperiments(hasNoExperiments ? defaultConfig.experiments : definedExperiments);

  return {
    activeExperiment,
    experiments,
  };
}
