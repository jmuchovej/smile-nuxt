import {
	createResolver,
	defineNuxtModule,
} from "@nuxt/kit";
import type { Nuxt } from "nuxt/schema";
import { defu } from "defu";
import { loadSmileConfig } from "./utils/config";
import { logger, registerModule } from "./utils/module";

export * from "./types";
export * from "./utils";

export interface ModuleOptions {
	database?: {
		type: string;
		url: string;
	};
}

export default defineNuxtModule<ModuleOptions>({
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
		},
	},
	async setup(options: ModuleOptions, nuxt: Nuxt) {
		const { resolve } = createResolver(import.meta.url);

		nuxt.options.pages = nuxt.options.pages || {};
		nuxt.options.pages = true;

		nuxt.options.alias["#smile"] = resolve("./runtime");

		const { activeExperiment, experiments } = await loadSmileConfig(nuxt);

		const versions = experiments.map((e) => e.version) as string[];

		if (nuxt.options.dev) {
			nuxt.options.appConfig.smile = defu(nuxt.options.appConfig.smile || {}, {
				activeExperiment,
				availableExperiments: versions,
			});
		}

		nuxt.options.ssr = false;
		nuxt.options.css = nuxt.options.css || [];

		nuxt.options.router = defu(nuxt.options.router || {}, {
			options: { hashMode: true },
		});
		nuxt.options.router.options.hashMode = true;

		await registerModule(nuxt, "@nuxtjs/mdc", "mdc", {});
		if (nuxt.options.dev) {
			await registerModule(nuxt, "@nuxt/ui-pro", "ui", {});
		} else {
			await registerModule(nuxt, "@nuxt/ui", "ui", {});
		}

		if (!nuxt.options.dev) {
			return;
		}
	},
});
