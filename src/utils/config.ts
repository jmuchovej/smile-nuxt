import { createDefineConfig, loadConfig, watchConfig } from 'c12'
import { relative } from 'pathe'
import type { Nuxt } from '@nuxt/schema'
import type { DefinedExperiment } from '../types/experiment'
import { defineExperiment, resolveExperiments } from './experiment'
import { logger } from './module'
import { z } from 'zod'

type NuxtSmileConfig = {
  activeExperiment: string
  experiments: Record<string, DefinedExperiment>
}

const defaultConfig: NuxtSmileConfig = {
  activeExperiment: 'pilot-01',
  experiments: {
    'pilot-01': defineExperiment({
      compensation: '$100.00',
      duration: '10 minutes',
      services: [{ type: "prolific", code: "C7W0RVYD" }],
      schema: z.object({
        id: z.string().trialID(),
      }),
    }),
  },
}

export const defineSmileConfig = createDefineConfig<NuxtSmileConfig>()

export const loadSmileConfig = async (nuxt: Nuxt, options: { defaultFallback?: boolean } = {}) => {
  const loader: typeof watchConfig = (nuxt.options.dev
    ? opts => watchConfig({
      ...opts,
      onWatch: (e) => {
        logger.info(`${relative(nuxt.options.rootDir, e.path)} ${e.type}, restarting the Nuxt server...`)
        nuxt.hooks.callHook('restart', { hard: true })
      },
    })
    : loadConfig) as typeof watchConfig

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).defineSmileConfig = (c: any) => c

  const layers = [...nuxt.options._layers].reverse()

  const smileConfigs = await Promise.all(
    layers.map(
      layer => loader<NuxtSmileConfig>({
        name: 'smile',
        cwd: layer.config.rootDir,
        defaultConfig: options.defaultFallback ? defaultConfig : undefined,
      }),
    ),
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).defineSmileConfig

  if (nuxt.options.dev) {
    nuxt.hook('close', () => Promise.all(smileConfigs.map(c => c.unwatch())).then(() => { }))
  }

  const activeExperiment = smileConfigs.find((current) => {
    return current.config?.activeExperiment
  })?.config.activeExperiment

  const experimentsConfig = smileConfigs.reduce((acc, current) => {
    if (!current.config?.experiments) return acc

    for (const [version, experiment] of Object.entries(current.config?.experiments)) {
      acc[version] = experiment
    }

    return acc
  }, {} as NuxtSmileConfig['experiments'])
  const hasNoExperiments = Object.keys(experimentsConfig || {}).length === 0

  if (hasNoExperiments) {
    logger.warn('No experiment configurations found! Falling back to the default experiment. To have full control over your experiments, define the config file in your project root.\nSee: https://smile.gureckislab.org/getting-started')
  }

  const experiments = resolveExperiments(hasNoExperiments ? defaultConfig.experiments : experimentsConfig)

  return { activeExperiment, experiments }
}
