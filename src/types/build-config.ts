import { existsSync, mkdirSync } from "node:fs";
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
}

export function createSmileBuildConfig(nuxt: Nuxt, experiments: SmileBuildConfig["experiments"]): SmileBuildConfig {
  const buildDir = nuxt.options.buildDir;
  const rootDir = nuxt.options.rootDir;
  const sandbox = join(buildDir, "smile");
  const databasePath = join(sandbox, "database", "smile.db");

  if (!existsSync(sandbox)) mkdirSync(sandbox, { recursive: true });
  if (!existsSync(dirname(databasePath))) mkdirSync(dirname(databasePath), { recursive: true });

  return {
    paths: {
      database: databasePath,
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
  };
}
