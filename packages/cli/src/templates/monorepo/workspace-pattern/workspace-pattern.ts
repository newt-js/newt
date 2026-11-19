import { dirname } from 'node:path'

export const APPS_PATTERN = 'apps/*'

/** The workspaces pattern that takes a folder of the root: every folder beside it, or itself right under the root. */
export function workspacePattern(inRoot: string): string {
  const parent = dirname(inRoot)
  return parent === '.' ? inRoot : `${parent}/*`
}
