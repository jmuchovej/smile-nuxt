import { existsSync, mkdirSync } from "node:fs";
import type { Resolver } from "@nuxt/kit";
import type { Nuxt } from "nuxt/schema";
import { dirname, join } from "pathe";
import type { ResolvedExperiment } from "../config";

export interface SmileBuildConfig {
  // Path configuration
  paths: {
    database: string; // Full path to database file
    buildDir: string; // Nuxt build directory
    rootDir: string; // Project root directory
    sandbox: string; // .nuxt/smile directory
    experiments: string;
    stimuli: string;
  };

  experiments: Record<string, ResolvedExperiment>;

  // Database configuration
  database: {
    filename: string; // Database filename (e.g., 'smile.db')
  };

  // Runtime configuration references
  nuxt: Nuxt;

  resolver: Resolver;
}

export function createSmileBuildConfig(
  nuxt: Nuxt,
  experiments: SmileBuildConfig["experiments"],
  resolver: Resolver
): SmileBuildConfig {
  const buildDir = nuxt.options.buildDir;
  const rootDir = nuxt.options.rootDir;
  const sandbox = join(buildDir, "smile");
  const database = join(sandbox, "database");

  const buildPaths = [sandbox, database];
  for (const path of buildPaths) {
    if (!existsSync(path)) mkdirSync(path, { recursive: true });
  }

  return {
    paths: {
      database,
      buildDir,
      rootDir,
      sandbox,
      experiments: join(rootDir, "experiments"),
      stimuli: join(rootDir, "stimuli"),
    },

    experiments,

    database: {
      filename: "smile.db",
    },

    nuxt,

    resolver,
  };
}
