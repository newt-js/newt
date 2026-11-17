import { realpath } from 'node:fs/promises'
import { dirname }  from 'node:path'
import { join }     from 'node:path'
import { relative } from 'node:path'

export type LocalCli = { path: string | null, warning: string | null }

const none = (warning: string | null = null): LocalCli => ({ path: null, warning })

/** The project's own cli, when it is not this one (`self`); one that cannot run is passed over, with a warning. */
export async function findLocalCli(cwd: string, self: string): Promise<LocalCli> {
  const own = await realpath(self)
  for (let folder = cwd; ; folder = dirname(folder)) {
    const manifest = Bun.file(join(folder, 'node_modules/@newt-js/cli/package.json'))
    if (await manifest.exists()) {
      const root = await realpath(dirname(manifest.name!))
      if (root === own) return none()
      const passed = (why: string) => none(`${manifest.name} ${why}, so this newt runs instead`)
      let json: { bin?: string | Record<string, string> }
      try {
        json = await manifest.json() as typeof json
      } catch {
        return passed('is not valid JSON')
      }
      const bin = typeof json.bin === 'string' ? json.bin : json.bin?.newt
      if (!bin) return none()
      const path = join(root, bin)
      if (relative(root, path).startsWith('..')) return passed(`has a bin outside its package, ${bin}`)
      if (!await Bun.file(path).exists()) return passed(`has no ${bin}`)
      return { path, warning: null }
    }
    if (dirname(folder) === folder) return none()
  }
}
