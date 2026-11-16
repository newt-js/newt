import { mkdir }        from 'node:fs/promises'
import { rm }           from 'node:fs/promises'
import { stat }         from 'node:fs/promises'
import { dirname }      from 'node:path'
import { join }         from 'node:path'
// --------------------------------------------------------
import { CommandError } from '../../commands/command-error/command-error'
import { blockedPath }  from '../blocked-path/blocked-path'

const exists = (path: string) => stat(path).then(() => true, () => false)

/** The folders `path` needs that are not there, the outermost first. */
async function missingFolders(path: string): Promise<string[]> {
  const missing: string[] = []
  for (let folder = dirname(path); !await exists(folder); folder = dirname(folder)) missing.unshift(folder)
  return missing
}

/** Checks that every file can be written, then writes them; `dryRun` only checks. When a write fails, puts back what it wrote, so it writes all or none. */
export async function writeFiles(cwd: string, changed: Map<string, string | null>, dryRun: boolean): Promise<void> {
  const blocked = (await Promise.all([...changed].filter(([, content]) => content !== null).map(([path]) => blockedPath(cwd, path))))
    .filter(why => why !== null)
  if (blocked.length > 0) throw new CommandError(`newt wrote nothing: ${blocked.join('; ')}`)
  if (dryRun) return
  const undo: (() => Promise<unknown>)[] = []
  for (const [path, content] of changed) {
    const at = join(cwd, path)
    try {
      const before = Bun.file(at)
      const original = await before.exists() ? await before.bytes() : null
      const folders = await missingFolders(at)
      undo.push(() => original === null ? rm(at, { force: true }) : Bun.write(at, original))
      undo.push(...folders.map(folder => () => rm(folder, { recursive: true, force: true })))
      if (content === null) await rm(at, { force: true })
      else {
        await mkdir(dirname(at), { recursive: true })
        await Bun.write(at, content)
      }
    } catch (error) {
      for (const step of undo.toReversed()) await step().catch(() => undefined)
      throw new CommandError(`newt wrote nothing: it could not write ${path} (${(error as Error).message}), and put back what it had written`)
    }
  }
}
