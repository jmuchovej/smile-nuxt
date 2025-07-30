import pl from "nodejs-polars";
import { basename, dirname, extname, join } from "pathe";
import { kebabCase } from "scule";
import { type GlobOptions, globSync } from "tinyglobby";
import { type ZodObject, z } from "zod";
import { useLogger } from "../utils/module";

export type StimuliSource = string | string[];

export interface StimuliBase {
  name: string;
  source: StimuliSource;
  schema: ZodObject;
}

export const STIMULI_TABLE_PREFIX = `_stimuli`;

const getTableName = (name: string) => {
  return `${STIMULI_TABLE_PREFIX}-${kebabCase(name)}`;
};

export interface DefinedStimuli {
  name: StimuliBase["name"];
  source: StimuliBase["source"];
  schema: StimuliBase["schema"];
}

export interface ResolvedStimuli {
  name: StimuliBase["name"];

  sources: ResolvedStimuliSource[];
  schema: DefinedStimuli["schema"];

  tableName: string;
}

export interface ResolvedStimuliSource {
  dirname: string;
  basename: string;
  load: () => Promise<pl.DataFrame>;
}

interface StimuliTransformer {
  type: string;
  extensions: string[];
  loader: (source: string) => Promise<pl.DataFrame>;
}

const defineStimuliTransformer = (config: StimuliTransformer) => config;

const csvTransformer = defineStimuliTransformer({
  type: "csv",
  extensions: [".csv"],
  loader: (file: string) => pl.scanCSV(file, { sep: "," }).collect(),
});
const tsvTransformer = defineStimuliTransformer({
  type: "tsv",
  extensions: [".tsv"],
  loader: (file: string) => pl.scanCSV(file, { sep: "\t" }).collect(),
});

const jsonlTransformer = defineStimuliTransformer({
  type: "jsonl",
  extensions: [".jsonl", ".ndjson"],
  loader: (file: string) => pl.scanJson(file).collect(),
});

const parquetTransformer = defineStimuliTransformer({
  type: "parquet",
  extensions: [".parquet"],
  loader: (file: string) => pl.scanParquet(file).collect(),
});

const Transformers = [csvTransformer, tsvTransformer, jsonlTransformer, parquetTransformer];

type Transformer = (typeof Transformers)[number];
type TransformerFileType = Transformer["extensions"][number];

export const defineStimuli = (stimuli: StimuliBase): DefinedStimuli => {
  const schema = stimuli.schema || z.object({});

  return {
    ...stimuli,
    schema,
  };
};

export function resolveStimuli(rootDir: string, stimuli: DefinedStimuli): ResolvedStimuli {
  const logger = useLogger("config", "stimuli");
  const { source } = stimuli; // sugar
  const sources = Array.isArray(source) ? source : [source];

  const globOptions: Omit<GlobOptions, "patterns"> = {
    dot: false,
    absolute: true,
    onlyFiles: true,
    ignore: ["**/.DS_Store"],
    cwd: join(dirname(rootDir), "stimuli"),
  };
  logger.debug(`Searching with ${sources} in ${globOptions.cwd}`);

  const resolvedSources: ResolvedStimuliSource[] = [];
  for (const match of globSync(sources, globOptions)) {
    logger.info(`found match: ${match}`);
    const extension = extname(match);
    const transformer = Transformers.find((t) => t.extensions.includes(extension));
    if (!transformer) {
      throw new Error(`Unsupported file type: ${extension} (on ${match})`);
    }

    resolvedSources.push({
      dirname: dirname(match),
      basename: basename(match),
      load: () => {
        const file = join(dirname(match), basename(match));
        return transformer.loader(file);
      },
    });
  }

  const isDefaultStimuli = stimuli.name === "silly-rabbit" && stimuli.source === "trix-are-for-kids.csv";
  if (resolvedSources.length === 0 && !isDefaultStimuli) {
    throw new Error(`No files found for ${stimuli.name}`);
  }

  return {
    name: stimuli.name,
    sources: resolvedSources,
    tableName: getTableName(stimuli.name),
    schema: stimuli.schema,
  };
}
