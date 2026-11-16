import { join } from 'node:path'

type Manifest = { dependencies?: Record<string, string> }

/** A folder is a newt backend when its package.json depends on @newt-js/core. */
export async function isBackend(folder: string): Promise<boolean> {
  const manifest = Bun.file(join(folder, 'package.json'))
  if (!await manifest.exists()) return false
  const { dependencies } = await manifest.json().catch(() => ({})) as Manifest
  return dependencies?.['@newt-js/core'] !== undefined
}
