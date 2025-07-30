import { join } from "pathe";
import { addTemplate, addServerTemplate, addServerPlugin } from "@nuxt/kit";
import type pl from "nodejs-polars";
import type { ZodObject } from "zod";
import type { ResolvedStimuli, ResolvedStimuliSource } from "../config/stimuli";
import type { SmileBuildConfig } from "../types/build-config";
import { useLogger } from "../utils/module";
import { blockSchema, participantSchema, sessionSchema, trialSchema } from "./schemas";
import type { SmileColumn, SmileTable } from "./types";
import { getValidatedTable } from "./zod";
import {
  moduleTemplates,
  drizzleConfigTemplate,
  schemaTemplate,
  databaseTemplate,
  tsSeedTemplate,
  tsTablesTemplate,
  sqlTablesTemplate,
} from "./templates";

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

  addTemplate(databaseTemplate(buildConfig));
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

  addTemplate(drizzleConfigTemplate(buildConfig));
  addTemplate(schemaTemplate(buildConfig, tables));

  addTemplate(sqlTablesTemplate(buildConfig, tables));
  addTemplate(tsTablesTemplate(buildConfig, tables));
  nuxt.options.alias["#smile/sql/tables"] = join(buildDir, moduleTemplates.tsTables);
  addTemplate(tsSeedTemplate(buildConfig, tables));
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
