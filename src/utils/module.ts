import type { ConsolaInstance } from 'consola'
import { defu } from 'defu'
import { useLogger, installModule, hasNuxtModule } from '@nuxt/kit'
import type { Nuxt } from 'nuxt/schema'

export const registerModule = async (
  nuxt: Nuxt,
  name: string,
  key: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options: Record<string, any>,
) => {
  if (!hasNuxtModule(name)) {
    await installModule(name, options)
  }
  else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (nuxt.options as any)[key] = defu((nuxt.options as any)[key], options)
  }
}

export const logger: ConsolaInstance = useLogger('@smile/nuxt', {
  level: 5
});
