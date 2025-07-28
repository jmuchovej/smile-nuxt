import "./database/zod";
import { createResolver, defineNuxtModule } from "@nuxt/kit";
import type { Nuxt } from "nuxt/schema";
import { defu } from "defu";
import { loadSmileConfig } from "./config";
import { logger, registerModule } from "./utils/module";
import { spawnDrizzleStudio } from "./database/studio";
import { initializeDatabase } from "./database";
import { join } from "pathe";
import { existsSync, mkdirSync } from "node:fs";

export {
	defineStimuli,
	defineExperiment,
	defineSmileConfig,
} from "./config";
export type * from "./config";
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
	async setup(options: SmileModuleOptions, nuxt: Nuxt) {
		const { resolve } = createResolver(import.meta.url);
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

		nuxt.options.nitro = defu(nuxt.options.nitro, {});
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

		const sandbox = join(nuxt.options.buildDir, "smile");
		if (!existsSync(sandbox)) mkdirSync(sandbox, { recursive: true });

		await initializeDatabase(nuxt);
		await spawnDrizzleStudio(nuxt);
	},
});
