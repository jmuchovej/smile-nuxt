import { readFile } from 'node:fs/promises'
import { join } from 'pathe'
import { withLeadingSlash, withoutTrailingSlash } from 'ufo'
import FastGlob from 'fast-glob'
import type { ExperimentSource, ResolvedExperimentSource } from '../types/experiment'
import { logger } from './module'

export const defineLocalSource = (source: ExperimentSource | ResolvedExperimentSource): ResolvedExperimentSource => {
  if (source.include.startsWith('./') || source.include.startsWith('../')) {
    logger.warn('Collection source should not start with `./` or `../`.')
    source.include = source.include.replace(/^(\.\/|\.\.\/|\/)*/, '')
  }
  const { fixed } = parseSourceBase(source)
  const resolvedSource: ResolvedExperimentSource = {
    _resolved: true,
    prefix: withoutTrailingSlash(withLeadingSlash(fixed)),
    prepare: async ({ rootDir }) => {
      resolvedSource.cwd = source.cwd
        ? String(source.cwd).replace(/^~~\//, rootDir)
        : join(rootDir, 'smile')
    },
    getKeys: async () => {
      const _keys = await FastGlob(source.include, { cwd: resolvedSource.cwd, ignore: source!.exclude || [], dot: true })
        .catch((): [] => [])
      return _keys.map(key => key.substring(fixed.length))
    },
    getItem: async (key) => {
      const fullPath = join(resolvedSource.cwd, fixed, key)
      const content = await readFile(fullPath, 'utf8')
      return content
    },
    ...source,
    include: source.include,
    cwd: '',
  }
  return resolvedSource
}

export function parseSourceBase(source: ExperimentSource) {
  const [fixPart, ...rest] = source.include.includes('*') ? source.include.split('*') : ['', source.include]
  return {
    fixed: fixPart || '',
    dynamic: `*${rest.join('*')}`,
  }
}
