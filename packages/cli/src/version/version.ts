import { join } from 'node:path'

const MANIFEST = join(import.meta.dir, '../../package.json')

export async function version(): Promise<string> {
  const { version } = await Bun.file(MANIFEST).json() as { version: string }
  return version
}
