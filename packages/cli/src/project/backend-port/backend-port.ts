import { join }         from 'node:path'
// --------------------------------------------------------
import { DEFAULT_PORT } from '../../options/port-of/port-of'

/** The port a backend serves on, by its .env. */
export async function backendPort(backend: string): Promise<number> {
  const env = Bun.file(join(backend, '.env'))
  const port = await env.exists() ? /^PORT=(\d+)\s*$/m.exec(await env.text())?.[1] : undefined
  return port === undefined ? DEFAULT_PORT : Number(port)
}
