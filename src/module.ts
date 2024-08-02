import { join } from "pathe";
import { defu } from "defu";
import {
  defineNuxtModule,
  addComponentsDir, addPlugin, addImports,
  createResolver,
  installModule,
  extendPages,
  isIgnored,
  addImportsDir,
  addLayout,
  addTemplate,
} from "@nuxt/kit"
import { name, version } from "../package.json"
import schema from "./schema"

import type { ModuleOptions, SmileContext } from "./types/module";

const module = defineNuxtModule<ModuleOptions>({
  meta: {
    name,
    version,
    configKey: "smile",
    compatibility: {
      nuxt: ">=3.10.0",
    },
  },
  // Default configuration options of the Nuxt module
  defaults: {
    // TODO default to whatever environment Nuxt is using
    mode: "development",
    project: schema.project.$default,
    localStorageKey: schema.localStorageKey.$default,
    git: schema.git.$default,
  },

  async setup(_options, _nuxt) {
    const { resolve } = createResolver(import.meta.url)

    const runtimeOptions = Object.fromEntries(
      Object.entries(_options).filter(([key]) => key in schema)
    )
    _nuxt.options.appConfig.smile = Object.assign(
      _nuxt.options.appConfig.icon || {},
      runtimeOptions,
    )

    _nuxt.hook("schema:extend", (schemas) => {
      schemas.push({
        appConfig: {
          smile: schema,
        }
      })
    })

    // Do not add the extension since the `.ts` will be transpiled to `.mjs` after `npm run prepack`
    const runtimeDir = resolve("./runtime")

    // Modules
    await installModule("@pinia/nuxt")
    await installModule("@nuxt/icon")

    const twTemplate = addTemplate({
      filename: "smile-tailwind.config.cjs",
      write: true,
      getContents: ({ nuxt }) => `module.exports = {
  content: [
    "${resolve(runtimeDir, "components/**/*")}",
    "${resolve(runtimeDir, "layouts/**/*")}",
    "${resolve(runtimeDir, "pages/**/*")}",
  ],
  plugins: [
    require('daisyui'),
    // require('@tailwindcss/forms')({ strategy: 'class' }),
    // require('@tailwindcss/typography'),
    // require('@tailwindcss/aspect-ratio'),
  ],
  daisyui: {
    logs: false
  }
}`
    })
    await installModule("@nuxtjs/tailwindcss", defu({
      exposeConfig: true,
      config: { darkMode: `class`, },
      configPath: [twTemplate.dst, join(_nuxt.options.rootDir, `tailwind.config`)]
    // @ts-expect-error – `@nuxtjs/tailwindcss` not installed yet
    }, _nuxt.options.tailwindcss))

    // Plugins
    // addPlugin(resolve(runtimeDir, "stores", "smile"))
    // addPlugin(resolve(runtimeDir, "stores", "useSmileDataStore"))
    // addPlugin(resolve(runtimeDir, "stores", "firebase"))

    // Composables
    addImportsDir(resolve(runtimeDir, "composables"))

    // Layouts
    // const layouts = ["base", "experiment", "thanks", "welcome"]
    // layouts.forEach(layout => (addLayout(addTemplate({
    //   src: resolve(runtimeDir, "layouts", `${layout}.vue`),
    //   write: true
    // }), layout)))

    // Components
    addComponentsDir({
      path: resolve(runtimeDir, "components"),
      prefix: "Smile",
      global: true,
      watch: true,
      pathPrefix: false,
    })

    // TODO provide various pages which user's shouldn't easily modify, e.g.:
    //   - /config
    //   - / (& presentation mode)
    //   - /timeline  // timeline visualizer

    // TODO look into using `addCustomTab` for development mode!
  },
})

export default module
