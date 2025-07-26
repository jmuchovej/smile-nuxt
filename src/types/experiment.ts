import type { $ZodTypes, $ZodShape, $ZodObject } from "zod/v4/core";
import type { JSONSchema as zodJSON } from "zod/v4/core";
import type { ExperimentService } from './service'

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Experiments { }

export interface ExperimentSource {
  include: string;
  prefix?: string;
  exclude?: string[];
  cwd?: string;
}

export interface ResolvedExperimentSource extends ExperimentSource {
  _resolved: true
  prepare?: (options: { rootDir: string }) => Promise<void>
  getKeys?: () => Promise<string[]>
  getItem?: (path: string) => Promise<string>
  cwd: string
}

export interface Experiment<T extends $ZodShape = $ZodShape> {
  duration: string
  compensation: string
  services: ExperimentService[]

  // TODO implement globbing/etc.
  source?: string | ResolvedExperimentSource[],

  allowRepeats?: boolean
  autoSave?: boolean

  schema: $ZodObject<T>

  extra?: Record<string, unknown>
}

export interface DefinedExperiment {
  duration: Experiment['duration']
  compensation: Experiment['compensation']
  services: Experiment['services']

  source: ResolvedExperimentSource[] | undefined,

  allowRepeats?: Experiment['allowRepeats']
  autoSave?: Experiment['autoSave']

  schema: zodJSON.BaseSchema

  extra?: Experiment['extra']
}

export interface ResolvedExperiment {
  version: string
  duration: Experiment['duration']
  compensation: Experiment['compensation']
  services: Experiment['services']

  source: ResolvedExperimentSource[] | undefined,

  allowRepeats: Required<Experiment['allowRepeats']>
  autoSave: Required<Experiment['autoSave']>

  schema: zodJSON.BaseSchema,

  extra: Required<Experiment['extra']>
}

export interface ExperimentInfo {
  version: string
  pascalVersion: string

  source: ResolvedExperimentSource[],
}

export interface ExperimentItemBase {
  id: string
  path: string
  frontmatter: Record<string, unknown>
}
