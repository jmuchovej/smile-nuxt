import { existsSync, mkdirSync } from "node:fs";
import type { Nuxt } from "nuxt/schema";
import { defu } from "defu";
import { join, dirname } from "pathe";
import { SQL, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client"
import {
  getDropTableIfExistsQuery,
  getCreateTableQuery,
  getCreateIndexQueries,
} from "./core/sql";
import { logger } from "../utils/module";
import { getValidatedTable } from "./core/zod";
import type { SmileTable } from "./core/types";
import {
  participantSchema, sessionSchema, blockSchema, trialSchema
} from "./core/tables";

export const initializeDatabase = async (nuxt: Nuxt) => {
  const smileRuntimeConfig = nuxt.options.runtimeConfig.smile;
  const databasePath = join(nuxt.options.buildDir, "smile", "database", "smile.db")

  nuxt.options.runtimeConfig.smile.database = {
    path: databasePath,
  };

  if (!existsSync(dirname(databasePath))) {
    mkdirSync(dirname(databasePath), { recursive: true })
  }

  logger.debug(`Creating libSQL client with url=${databasePath}`)
  const db = drizzle(createClient({ url: `file:${databasePath}` }));

  const tables: SmileTable[] = [];

  tables.push(...getMetaTables())
  logger.debug(`Added all of Smile's "meta" tables!`)
  const { experiments } = smileRuntimeConfig;
  for (const [name, experiment] of Object.entries(experiments)) {
    tables.push(getValidatedTable(`experiment_${name}`, experiment.schema));
    logger.debug(`Adding the \`experiment_${name}\` table!`)
  }

  const queries: SQL[] = [];

  for (const table of tables) {
    const statements = [
      getDropTableIfExistsQuery(table),
      getCreateTableQuery(table),
      ...getCreateIndexQueries(table),
    ];
    queries.push(...statements.map((s) => sql.raw(s)));
    logger.debug(`Running the following on \`${table.name}\`!`)
    for (const statement of statements) {
      logger.debug(`  - ${statement}`);
    }
  }

  logger.debug(`Initializing database!`)
  await db.batch([
    db.run(sql`pragma defer_foreign_keys=true;`),
    ...queries.map((q) => db.run(q)),
  ])
}

export const getMetaTables = (): SmileTable[] => {
  const tables: SmileTable[] = [];

  const metaTables = {
    participants: participantSchema,
    sessions: sessionSchema,
    blocks: blockSchema,
    trials: trialSchema,
  }

  for (const [name, schema] of Object.entries(metaTables)) {
    tables.push(getValidatedTable(name, schema));
  }

  return tables;
}
