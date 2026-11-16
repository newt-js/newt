import { join }   from 'node:path'
// --------------------------------------------------------
import { quoted } from '../../templates/quoted/quoted'

/** The routes file under `src` that registers `method` at `path` already, from `src`; null when none does. */
export async function routeFileWith(src: string, method: string, path: string): Promise<string | null> {
  const call = new RegExp(`router\\.${method}\\(\\s*${RegExp.escape(quoted(path))}`)
  for await (const file of new Bun.Glob('**/*.routes.ts').scan(src)) {
    if (call.test(await Bun.file(join(src, file)).text())) return join('src', file)
  }
  return null
}
