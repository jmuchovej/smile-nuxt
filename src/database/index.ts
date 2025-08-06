import { join } from "pathe";
import { addServerPlugin } from "@nuxt/kit";
import type { SmileBuildConfig } from "../types/build-config";
import { useLogger } from "../utils/module";
import { blockSchema, participantSchema, sessionSchema, trialSchema } from "./schemas";
import type { SmileTable } from "./types";
import { getValidatedTable } from "./zod";
import { SmileTemplates, moduleTemplates } from "../templates";

export function initializeDatabase(buildConfig: SmileBuildConfig) {
  const logger = useLogger("database");

  const {
    nuxt,
    nuxt: {
      options: { buildDir },
    },
    resolver: { resolve },
    paths: { database: databasePath },
  } = buildConfig;

  SmileTemplates.database(buildConfig);
  nuxt.options.alias["#smile/database"] = databasePath;

  const tables = getMetaTables();
  logger.debug(`Added all of Smile's "meta" tables!`);

  const { experiments } = buildConfig;
  for (const experiment of Object.values(experiments)) {
    const { stimuli } = experiment;
    tables[experiment.tableName] = getValidatedTable(experiment.tableName, experiment.schema);
    tables[stimuli.tableName] = getValidatedTable(stimuli.tableName, stimuli.schema);
    logger.debug(`Adding the \`${experiment.tableName}\` table!`);
    logger.debug(`Adding the \`${stimuli.tableName}\` table!`);
  }

  SmileTemplates.drizzleConfig(buildConfig);
  SmileTemplates.schema(buildConfig, tables);

  SmileTemplates.sqlTables(buildConfig, tables);
  SmileTemplates.tsTables(buildConfig, tables);
  nuxt.options.alias["#smile/sql/tables"] = join(buildDir, moduleTemplates.tsTables);
  SmileTemplates.tsSeed(buildConfig, tables);
  nuxt.options.alias["#smile/sql/seed"] = join(buildDir, moduleTemplates.tsSeed);

  addServerPlugin(resolve("runtime", "server", "plugins", "database.ts"));
}

export function getMetaTables(): Record<string, SmileTable> {
  const tables: Record<string, SmileTable> = {};

  const metaTables = {
    participants: participantSchema,
    sessions: sessionSchema,
    blocks: blockSchema,
    trials: trialSchema,
  };

  for (const [name, schema] of Object.entries(metaTables)) {
    tables[name] = getValidatedTable(name, schema);
  }

  return tables;
}