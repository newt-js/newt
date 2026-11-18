import { join } from 'node:path'

type Manifest = { dependencies?: Record<string, string> }

/** A folder is a newt backend when its package.json depends on @newt-js/core and it has newt's src/contexts/contexts.ts: a library that depends on core is not one. */
export async function isBackend(folder: string): Promise<boolean> {
  const manifest = Bun.file(join(folder, 'package.json'))
  if (!await manifest.exists()) return false
  const { dependencies } = await manifest.json().catch(() => ({})) as Manifest
  if (dependencies?.['@newt-js/core'] === undefined) return false
  return Bun.file(join(folder, 'src/contexts/contexts.ts')).exists()
}
