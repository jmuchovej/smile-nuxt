import type { $ZodTypes } from 'zod/v4/core';

import type { Experiment, DefinedExperiment, ResolvedExperiment, ExperimentSource, ResolvedExperimentSource } from '../types/experiment'
import { logger } from './module'
import { defineLocalSource } from './source'
import { z } from "zod";

const ZOD_JSON_TYPES = [
  'ZodObject', 'ZodArray', 'ZodRecord', 'ZodIntersection', 'ZodUnion', 'ZodAny', 'ZodMap',
]

export const defineExperiment = (experiment: Experiment): DefinedExperiment => {
  const schema = (experiment.schema || z.object({})) as $ZodTypes

  const source = resolveSource(experiment.source)

  return {
    ...experiment,
    source,
    schema: z.toJSONSchema(schema),
  }
}

export const resolveExperiment = (version: string, experiment: DefinedExperiment): ResolvedExperiment => {
  if (/^[a-z_][\w-]+$/i.test(version) === false) {
    logger.warn([
      `Experiment \`version=${version}\` is invalid.`,
      'Experiment names must be valid JavaScript identifiers (`-` is allowed, too). Thus, this experiment will be ignored.',
    ].join('\n'))
  }

  const allowRepeats = experiment.allowRepeats ?? false
  const autoSave = experiment.autoSave ?? true
  const extra = experiment.extra ?? {}

  const source = resolveSource(experiment.source)

  return {
    ...experiment,
    version,
    allowRepeats, autoSave, extra,
    source,
  }
}

export const resolveExperiments = (experiments: Record<string, DefinedExperiment>): ResolvedExperiment[] => {
  return Object.entries(experiments)
    .map(([version, experiment]) => resolveExperiment(version, experiment))
    .filter(Boolean) as ResolvedExperiment[]
}

const resolveSource = (source: string | ExperimentSource | ExperimentSource[] | undefined): ResolvedExperimentSource[] | undefined => {
  if (!source) { return undefined; }

  if (typeof source === 'string') {
    logger.info(`found source: ${source}`);
    return [defineLocalSource({ include: source })]
  }

  const sources: ExperimentSource[] = Array.isArray(source) ? source : [source];
  return sources.map((source) => {
    if ((source as ResolvedExperimentSource)._resolved) {
      return source as ResolvedExperimentSource
    }

    return defineLocalSource(source)
  })
}
