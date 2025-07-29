import { readFile, writeFile } from "node:fs/promises";
import { createClient } from "@libsql/client";
import { type SQL, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { join } from "pathe";
import { camelCase } from "scule";
import type { SmileBuildConfig } from "../types/build-config";
import { logger } from "../utils/module";
import { blockSchema, participantSchema, sessionSchema, trialSchema } from "./schemas";
import { seedStimuliTable } from "./seed";
import { getCreateIndexQueries, getCreateTableQuery, getDropTableIfExistsQuery } from "./sql";
import type { SmileColumn, SmileTable } from "./types";
import { getValidatedTable } from "./zod";
import Handlebars from "handlebars";

export async function initializeDatabase(buildConfig: SmileBuildConfig) {
  const smileRuntimeConfig = buildConfig.nuxt.options.runtimeConfig.smile;
  const {
    paths: { database },
    database: { filename },
  } = buildConfig;

  const databasePath = join(database, filename);

  buildConfig.nuxt.options.runtimeConfig.smile.database = {
    path: databasePath,
  };

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

  // Update the alias to point to the actual generated file
  const virtualPath = join(buildConfig.paths.database, "virtual.ts");
  buildConfig.nuxt.options.alias["#smile/database"] = virtualPath;

  buildConfig.nuxt.hook("build:before", async () => {
    await createVirtualSchema(buildConfig);
  });

  // Always seed database with experiment stimuli data
  logger.debug(`Seeding database with stimuli!`);
  const stimuli = Object.fromEntries(Object.values(experiments).map(({ stimuli }) => [stimuli.tableName, stimuli]));
  await Promise.all(
    tables
      .filter(({ name }) => Object.keys(stimuli).includes(name))
      .map(async (t: SmileTable) => await seedStimuliTable(db, t, stimuli[t.name]!))
  );
}

export function getMetaTables(): SmileTable[] {
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
}

export async function createVirtualSchema(buildConfig: SmileBuildConfig) {
  const { resolve } = buildConfig.resolver;

  const {
    paths: { database },
    database: { filename },
    experiments,
  } = buildConfig;
  const databasePath = join(database, filename);

  const tables = Object.fromEntries(
    [
      ...getMetaTables(),
      ...Object.values(experiments).flatMap((experiment) => {
        const experimentTable = getValidatedTable(experiment.tableName, experiment.schema);
        const { stimuli } = experiment;
        const stimuliTable = getValidatedTable(stimuli.tableName, stimuli.schema);
        return [experimentTable, stimuliTable];
      }),
    ].map((table) => [table.name, table])
  );

  const templateData = {
    databasePath,
    tables: Object.values(tables).map((table) => ({
      tsName: camelCase(table.name),
      sqlName: table.name,
      columns: Object.entries(table.columns).map(([name, column]) => ({
        name,
        definition: generateColumnDefinition(column),
      })),
    })),
  };

  const drizzleConfigFile = await readFile(resolve("./database/templates/drizzle.config.ts"), { encoding: "utf-8" });
  const drizzleConfigTemplate = Handlebars.compile(drizzleConfigFile);
  const drizzleConfig = drizzleConfigTemplate(templateData);
  const drizzleConfigPath = join(buildConfig.paths.database, "drizzle.config.ts");
  await writeFile(drizzleConfigPath, drizzleConfig, { encoding: "utf-8" });

  const schemaFile = await readFile(resolve("./database/templates/schema.ts"), { encoding: "utf-8" });
  const schemaTemplate = Handlebars.compile(schemaFile);
  const schema = schemaTemplate(templateData);
  const schemaPath = join(buildConfig.paths.database, "schema.ts");
  await writeFile(schemaPath, schema, { encoding: "utf-8" });

  const virtualFile = await readFile(resolve("./database/templates/virtual.ts"), { encoding: "utf-8" });
  const virtualTemplate = Handlebars.compile(virtualFile);
  const virtual = virtualTemplate(templateData);
  const virtualPath = join(buildConfig.paths.database, "virtual.ts");
  await writeFile(virtualPath, virtual, { encoding: "utf-8" });

  logger.debug("Rendered & wrote database runtime exports!");
}

function generateColumnDefinition(column: SmileColumn): string {
  let def = "";
  switch (column.type) {
    case "text":
      def = `text()`;
      break;
    case "number":
      def = `integer()`;
      break;
    case "boolean":
      def = `integer({ mode: "boolean" })`;
      break;
    case "date":
      def = `dateType()`;
      break;
    case "json":
      def = `jsonType()`;
      break;
  }

  const { primaryKey, unique, optional } = column.constraints;
  if (primaryKey) def = `${def}.primaryKey()`;
  if (unique && !primaryKey) def = `${def}.unique()`;
  if (!optional) def = `${def}.notNull()`;

  return def;
}
