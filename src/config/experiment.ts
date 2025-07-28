import { z, type ZodObject } from "zod";
import type { ExperimentService } from "../types/service";
import { logger } from "../utils/dev";
import defu from "defu";
import type { DefinedStimuli, ResolvedStimuli } from "./stimuli";
import { resolveStimuli } from "./stimuli";

export type ExperimentSource = string | string[];

export interface ExperimentBase {
  duration: string;
  compensation: string;
  services: ExperimentService[];

  allowRepeats?: boolean;
  autoSave?: boolean;

  stimuli: DefinedStimuli;
  schema: ZodObject;

  extra?: Record<string, unknown>;
}

export interface DefinedExperiment {
  rootDir: string;

  duration: ExperimentBase["duration"];
  compensation: ExperimentBase["compensation"];
  services: ExperimentBase["services"];

  allowRepeats?: ExperimentBase["allowRepeats"];
  autoSave?: ExperimentBase["autoSave"];

  stimuli: ExperimentBase["stimuli"];
  schema: ZodObject;

  extra?: ExperimentBase["extra"];
}

export interface ResolvedExperiment {
  version: string;
  rootDir: DefinedExperiment["rootDir"];

  duration: DefinedExperiment["duration"];
  compensation: DefinedExperiment["compensation"];
  services: DefinedExperiment["services"];

  allowRepeats: Required<DefinedExperiment["allowRepeats"]>;
  autoSave: Required<DefinedExperiment["autoSave"]>;

  stimuli: ResolvedStimuli;
  schema: DefinedExperiment["schema"];

  tableName: string;

  extra?: Required<DefinedExperiment["extra"]>;
}

export const defineExperiment = (experiment: ExperimentBase): DefinedExperiment => {
  const schema = (experiment.schema || z.object({}))

  return {
    ...experiment,
    rootDir: "",
    schema,
  }
}

export const EXPERIMENT_TABLE_PREFIX = `_experiment`

const getTableName = (name: string) => {
  return `${EXPERIMENT_TABLE_PREFIX}-${name}`
}

export const resolveExperiment = (version: string, experiment: DefinedExperiment): ResolvedExperiment => {
  if (/^[a-z_][\w-]+$/i.test(version) === false) {
    logger.warn([
      `Experiment \`version=${version}\` is invalid.`,
      'Experiment names must be valid JavaScript identifiers (`-` is allowed, too). Thus, this experiment will be ignored.',
    ].join('\n'))
  }

  const stimuli = resolveStimuli(experiment.rootDir, experiment.stimuli);

  return defu(experiment, {
    tableName: getTableName(version),
    stimuli,
    version,
    allowRepeats: false,
    autoSave: false,
    extra: {}
  })
}

export const resolveExperiments = (experiments: Record<string, DefinedExperiment>): Record<string, ResolvedExperiment> => {
  return Object.fromEntries(
    Object.entries(experiments)
      .map(([version, experiment]) => [version, resolveExperiment(version, experiment)])
  )
}
