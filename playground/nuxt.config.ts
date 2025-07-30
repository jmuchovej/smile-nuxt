import { createResolver } from "@nuxt/kit";
import { join } from "pathe";

const { resolve } = createResolver(import.meta.url);

export default defineNuxtConfig({
  compatibilityDate: "2025-07-29",
  modules: ["../src/module"], // "@nuxt/image", "@nuxt/fonts"],
  devServer: {
    port: 7645,
  },
  dev: true,
  pages: true,
  ssr: false,
  icon: {
    provider: "iconify",
  },
  smile: {},
  devtools: {
    enabled: true,
    timeline: {
      enabled: true,
    },
  },
  experimental: {
    renderJsonPayloads: false,
    watcher: "chokidar",
  },
  nitro: {
    experimental: {
      database: true,
    },
    database: {
      smile: {
        connector: "libsql",
        options: {
          url: `file:${join(resolve("."), ".data", "smile.production.db")}`,
        },
      },
    },
    devDatabase: {
      smile: {
        connector: "libsql",
        options: {
          url: `file:${join(resolve("."), ".data", "smile.dev.db")}`,
        },
      },
    },
  },
});
