import type { SmileBuildConfig } from "@smile/types/build-config";
import { genDynamicImport } from "knitwork";
import type { NuxtTemplate } from "nuxt/schema";
import { join, relative, isAbsolute } from "pathe";
import { useLogger } from "../utils/module";

export const mdxTemplates = {
  componentManifest: "smile/components.ts",
};

export function mdxComponentsTemplate(config: SmileBuildConfig) {
  const logger = useLogger("templates", "mdx");
  return {
    filename: mdxTemplates.componentManifest,
    write: true,
    getContents: ({ app, nuxt, options }) => {
      const buildDir = join(nuxt.options.buildDir, "smile");
      const componentMap = app.components
        .filter(({ island, filePath, pascalName, global }) => {
          // Ignore island components
          if (island) return false;
          // Ignore CSS
          if (filePath.endsWith(".css")) return false;

          return nuxt.options.dev || global;
        })
        .reduce(
          (acc, { pascalName, filePath, global }) => {
            if (acc[pascalName]) return acc;

            const cleanPath = filePath.replace(/\b\.(?!vue)\w+$/g, "");
            acc[pascalName] = {
              name: pascalName,
              import: genDynamicImport(
                isAbsolute(filePath) ? `./${relative(buildDir, cleanPath)}` : cleanPath,
                { wrapper: false, singleQuotes: false }
              ),
              global,
            };

            return acc;
          },
          {} as Record<string, unknown>
        );

      const componentList = Object.values(componentMap);
      const globalComponents = componentList
        .filter(({ global }) => global)
        .map(({ name }) => name);
      const localComponents = componentList
        .filter(({ global }) => !global)
        .map(({ name }) => name);

      return [
        ...localComponents.map(
          (name) => `export const ${name} = () => ${componentMap[name].import};`
        ),
        `export const globalComponents: string[] = ${JSON.stringify(globalComponents, null, 2)};`,
        `export const localComponents: string[] = ${JSON.stringify(localComponents, null, 2)};`,
      ].join("\n");
    },
  } satisfies NuxtTemplate;
}
