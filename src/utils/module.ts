import { hasNuxtModule, installModule, useLogger } from "@nuxt/kit";
import type { ConsolaInstance } from "consola";
import { defu } from "defu";
import type { Nuxt } from "nuxt/schema";
import type { BuiltinDriverName } from "unstorage";

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export async function registerModule(nuxt: Nuxt, name: string, key: string, options: Record<string, any>) {
  if (!hasNuxtModule(name)) {
    await installModule(name, options);
  } else {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    (nuxt.options as any)[key] = defu((nuxt.options as any)[key], options);
  }
}

export const logger: ConsolaInstance = useLogger("@smile/nuxt", {
  level: 5,
});

export const defaultNitroDevStorage = {
  // driver: "indexedb" as BuiltinDriverName,
  // base: "smile:",
  // dbName: "smile",
  // storeName: "smile",
  driver: "fs" as BuiltinDriverName,
  base: ".data/smile",
};
