import { realpath } from 'node:fs/promises'
import { dirname }  from 'node:path'
import { join }     from 'node:path'

/** Finds the project's own cli, when it is not this one (`self`). */
export async function localCli(cwd: string, self: string): Promise<string | null> {
  const own = await realpath(self)
  for (let folder = cwd; ; folder = dirname(folder)) {
    const manifest = Bun.file(join(folder, 'node_modules/@newt-js/cli/package.json'))
    if (await manifest.exists()) {
      const root = await realpath(dirname(manifest.name!))
      if (root === own) return null
      const { bin } = await manifest.json() as { bin?: string | Record<string, string> }
      const path = typeof bin === 'string' ? bin : bin?.newt
      return path ? join(root, path) : null
    }
    if (dirname(folder) === folder) return null
  }
}
