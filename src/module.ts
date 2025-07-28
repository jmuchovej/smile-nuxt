import "./database/core/zod";
import {
	createResolver,
	defineNuxtModule,
} from "@nuxt/kit";
import type { Nuxt } from "nuxt/schema";
import { defu } from "defu";
import { loadSmileConfig } from "./utils/config";
import { logger, registerModule } from "./utils/module";
import type { SmileModuleOptions } from "./types/module";
import { initializeDatabase } from "./database";
import { join } from "pathe";
import { existsSync, mkdirSync } from "node:fs";

export * from "./types";
export * from "./utils";

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
		},
	},
	async setup(options: SmileModuleOptions, nuxt: Nuxt) {
		const { resolve } = createResolver(import.meta.url);
		nuxt.options.alias["#smile"] = resolve("./runtime");

		nuxt.options.pages = nuxt.options.pages || {};
		nuxt.options.pages = true;

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

		nuxt.options.nitro = defu(nuxt.options.nitro, {});
		nuxt.options.appConfig = defu(nuxt.options.appConfig, { smile: {} });
		nuxt.options.runtimeConfig = defu(nuxt.options.runtimeConfig, {
		  smile: {},
			public: {
				smile: {}
			},
		});

		const { activeExperiment, experiments } = await loadSmileConfig(nuxt);
		const versions = experiments.map((e) => e.version) as string[];

		nuxt.options.appConfig.smile = defu(nuxt.options.appConfig.smile, {
			activeExperiment,
			availableExperiments: versions,
		});

		nuxt.options.runtimeConfig.smile = defu(nuxt.options.runtimeConfig.smile, {
			activeExperiment,
			experiments: Object.fromEntries(
			  experiments.map((e) => [e.version, e])
			),
		});

		const sandbox = join(nuxt.options.buildDir, "smile")
		if (!existsSync(sandbox)) mkdirSync(sandbox, { recursive: true })

		await initializeDatabase(nuxt);
	},
});
