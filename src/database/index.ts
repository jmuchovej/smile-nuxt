import { existsSync, mkdirSync } from "node:fs";
import { createClient } from "@libsql/client";
import { type SQL, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import type { Nuxt } from "nuxt/schema";
import { dirname, join } from "pathe";
import { logger } from "../utils/module";
import { getCreateIndexQueries, getCreateTableQuery, getDropTableIfExistsQuery } from "./core/sql";
import { blockSchema, participantSchema, sessionSchema, trialSchema } from "./core/tables";
import type { SmileTable } from "./core/types";
import { getValidatedTable } from "./core/zod";
import { seedStimuliTable } from "./seed";

export const initializeDatabase = async (nuxt: Nuxt) => {
  const smileRuntimeConfig = nuxt.options.runtimeConfig.smile;
  const databasePath = join(nuxt.options.buildDir, "smile", "database", "smile.db");

  nuxt.options.runtimeConfig.smile.database = {
    path: databasePath,
  };

  if (!existsSync(dirname(databasePath))) {
    mkdirSync(dirname(databasePath), { recursive: true });
  }

  logger.debug(`Creating libSQL client with url=${databasePath}`);
  const db = drizzle(createClient({ url: `file:${databasePath}` }));

  const tables: SmileTable[] = [];

  tables.push(...getMetaTables());
  logger.debug(`Added all of Smile's "meta" tables!`);
  const { experiments } = smileRuntimeConfig;
  for (const experiment of Object.values(experiments)) {
    const { stimuli } = experiment;
    tables.push(getValidatedTable(experiment.tableName, experiment.schema));
    tables.push(getValidatedTable(stimuli.tableName, stimuli.schema));
    logger.debug(`Adding the \`${experiment.tableName}\` table!`);
    logger.debug(`Adding the \`${stimuli.tableName}\` table!`);
  }

  const queries: SQL[] = [];

  for (const table of tables) {
    const statements = [getDropTableIfExistsQuery(table), getCreateTableQuery(table), ...getCreateIndexQueries(table)];
    queries.push(...statements.map((s) => sql.raw(s)));
    logger.debug(`Running the following on \`${table.name}\`!`);
    for (const statement of statements) {
      logger.debug(`  - ${statement}`);
    }
  }

  logger.debug(`Initializing database!`);
  await db.batch([db.run(sql`pragma defer_foreign_keys=true;`), ...queries.map((q) => db.run(q))]);

  // Always seed database with experiment stimuli data
  logger.debug(`Seeding database with stimuli!`);
  const stimuli = Object.fromEntries(Object.values(experiments).map(({ stimuli }) => [stimuli.tableName, stimuli]));
  await Promise.all(
    tables
      .filter(({ name }) => Object.keys(stimuli).includes(name))
      .map(async (t: SmileTable) => await seedStimuliTable(db, t, stimuli[t.name]!))
  );
};

export const getMetaTables = (): SmileTable[] => {
  const tables: SmileTable[] = [];

  const metaTables = {
    participants: participantSchema,
    sessions: sessionSchema,
    blocks: blockSchema,
    trials: trialSchema,
  };

  for (const [name, schema] of Object.entries(metaTables)) {
    tables.push(getValidatedTable(name, schema));
  }

  return tables;
};
