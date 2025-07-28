export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
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
});
