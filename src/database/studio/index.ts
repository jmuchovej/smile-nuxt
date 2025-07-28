import { readFile, writeFile } from "node:fs/promises";
import { ChildProcess, spawn } from "node:child_process";
import { join, dirname } from "pathe";
import { defu } from "defu";
import { createResolver, extendPages, extendRouteRules } from "@nuxt/kit";
import type { Nuxt, NuxtPage } from "nuxt/schema";
import type { SmileColumn, SmileTable } from "../core/types";
import { fromZod, getValidatedTable } from "../core/zod";
import { getMetaTables } from "..";
import type { SmileRuntimeConfig, ResolvedExperiment } from "../../config";
import Handlebars from "handlebars";

export const spawnDrizzleStudio = async (nuxt: Nuxt) => {
  if (!nuxt.options.dev) return;

  let studioPort = nuxt.options.smile.database?.studio.port ?? 7646;
  nuxt.options.runtimeConfig.public.smile.database = defu(nuxt.options.runtimeConfig.public.smile.database, {
    studioPort,
  });

  const smileRuntimeConfig = nuxt.options.runtimeConfig.smile;
  const root = dirname(smileRuntimeConfig.database.path);

  // extendPages((pages: NuxtPage[]) => {
  //   pages.unshift({
  //     name: "drizzle-studio",
  //     path: "/studio",
  //     file: resolve("../../runtime/pages/studio.vue"),
  //     meta: {
  //       devOnly: true,
  //     }
  //   });
  // })

  extendRouteRules('/studio', {
    redirect: `https://local.drizzle.studio?port=${studioPort}`,
  })

  let studioProcess: ChildProcess | undefined;

  const { resolve } = createResolver(import.meta.url);
  const templateDir = resolve('.');

  nuxt.hook("build:before", async () => {
    const config = await generateDrizzleConfig(templateDir, smileRuntimeConfig);
    await writeFile(join(root, "drizzle.config.ts"), config);

    const schema = await generateSchemaFile(templateDir, Object.values(smileRuntimeConfig.experiments));
    await writeFile(join(root, "schema.ts"), schema);
  });

  nuxt.hook("listen", async () => {
    studioProcess = spawn('npx', ['drizzle-kit', 'studio', '--port', `${studioPort}`], {
      cwd: root,
      stdio: "inherit",
    });
  });

  nuxt.hook("close", async () => {
    studioProcess?.kill();
  });
}

async function generateDrizzleConfig(templateDir: string, runtimeConfig: SmileRuntimeConfig): string {
  const templateData = {
    databasePath: runtimeConfig.database.path,
  };

  const file = await readFile(join(templateDir, `drizzle.config.ts.handlebars`), { encoding: "utf-8" })
  const template = Handlebars.compile(file)
  return template(templateData);
}

async function generateSchemaFile(templateDir: string, experiments: ResolvedExperiment[]): string {
  const tables = [
    ...getMetaTables(),
    ...experiments.flatMap((experiment) => {
      const experimentTable = getValidatedTable(experiment.tableName, experiment.schema)
      const { stimuli } = experiment;
      const stimuliTable = getValidatedTable(stimuli.tableName, stimuli.schema)
      return [experimentTable, stimuliTable,]
    }),
  ];

  const templateData = {
    tables: tables.map(table => ({
      tsName: table.name.replace(/\-/g, ''),
      sqlName: table.name,
      columns: Object.entries(table.columns).map(([name, column]) => ({
        name,
        definition: generateColumnDefinition(column),
      })),
    })),
  }

  const file = await readFile(join(templateDir, `schema.ts.handlebars`), { encoding: "utf-8" })
  const template = Handlebars.compile(file)
  return template(templateData);
}

function generateColumnDefinition(column: SmileColumn): string {
  let def = '';
  switch (column.type) {
    case "text": def = `text()`; break;
    case "number": def = `integer()`; break;
    case "boolean": def = `integer({ mode: "boolean" })`; break;
    case "date": def = `dateType()`; break;
    case "json": def = `jsonType()`; break;
  }

  const { primaryKey, unique, optional } = column.constraints;
  if (primaryKey) def = `${def}.primaryKey()`;
  if (unique && !primaryKey) def = `${def}.unique()`;
  if (!optional) def = `${def}.notNull()`;

  return def;
}
