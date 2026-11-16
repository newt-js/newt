import { basename } from 'node:path'
import { join }     from 'node:path'

/** The name of a backend's package, without its npm scope; its folder's name when its package.json has none. */
export async function backendPackageName(backend: string): Promise<string> {
  const json = await Bun.file(join(backend, 'package.json')).json().catch(() => ({})) as { name?: unknown }
  const name = typeof json.name === 'string' && json.name !== '' ? json.name : basename(backend)
  return name.replace(/^@[^/]+\//, '')
}
