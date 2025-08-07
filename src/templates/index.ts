import type { SmileTable } from "../database/types";
import { databaseTemplates } from "./database";
import { mdxTemplates } from "./mdx";
import type { SmileBuildConfig } from "@smile/types/build-config";
import { addTemplate } from "@nuxt/kit";

import {
  databaseTemplate,
  drizzleConfigTemplate,
  schemaTemplate,
  sqlTablesTemplate,
  tsSeedTemplate,
  tsTablesTemplate,
} from "./database";
import { mdxComponentsTemplate } from "./mdx";

// Re-export and merge template constants under a unified moduleTemplates object
export const moduleTemplates = {
  // Database templates
  ...databaseTemplates,

  // MDX templates
  ...mdxTemplates,

  // Future template categories can be added here
  // app: appTemplates,
  // timeline: timelineTemplates,
  // components: componentTemplates,
} as const;

// Type for the merged templates
export type ModuleTemplateKeys = keyof typeof moduleTemplates;

export namespace SmileTemplates {
  type SmileTableRecords = Record<string, SmileTable>;

  export function database(config: SmileBuildConfig) {
    return addTemplate(databaseTemplate(config));
  }
  export function tsTables(config: SmileBuildConfig, tables: SmileTableRecords) {
    return addTemplate(tsTablesTemplate(config, tables));
  }
  export function tsSeed(config: SmileBuildConfig, tables: SmileTableRecords) {
    return addTemplate(tsSeedTemplate(config, tables));
  }
  export function schema(config: SmileBuildConfig, tables: SmileTableRecords) {
    return addTemplate(schemaTemplate(config, tables));
  }
  export function drizzleConfig(config: SmileBuildConfig) {
    return addTemplate(drizzleConfigTemplate(config));
  }
  export function sqlTables(config: SmileBuildConfig, tables: SmileTableRecords) {
    return addTemplate(sqlTablesTemplate(config, tables));
  }

  export function mdxComponents(config: SmileBuildConfig) {
    return addTemplate(mdxComponentsTemplate(config));
  }
}
