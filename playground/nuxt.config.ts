import { type NuxtPage } from "nuxt/schema";

export default defineNuxtConfig({
  compatibilityDate: '2024-07-28',
  devServer: {
    port: 7645
  },
  dev: true,
  pages: true,
  modules: ['../src/module', "@nuxt/image", "@nuxtjs/mdc", "@vueuse/nuxt"], // "@nuxt/image", "@nuxt/fonts"],
  smile: {
    project: {
      name: "smile-playground",
      ref: "smile-playground-ref",
      codename: "something-whacky-tomorrow",
      url: ""
    }
  },
  devtools: {
    enabled: true,

    timeline: {
      enabled: true,
    },
  },
  experimental: {
    renderJsonPayloads: false,
  },
  hooks: {
    "pages:extend": (pages: NuxtPage[]) => {
      // TODO prevent ordering collisions
      pages.forEach(page => {
        const prefixes = [`/experiment`, `/instruction`]
        const shouldCleanup = prefixes.some(p => page.path.startsWith(p))
        if (!shouldCleanup)
          return

        page.path = page.path
          .split(`/`)
          .map(part => part.replace(/^\d+\./, ``))
          .join(`/`)
      })
    }
  }
})
