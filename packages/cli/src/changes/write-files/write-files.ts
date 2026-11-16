import { rm }           from 'node:fs/promises'
import { join }         from 'node:path'
// --------------------------------------------------------
import { CommandError } from '../../commands/command-error/command-error'
import { blockedPath }  from '../blocked-path/blocked-path'

/** Checks that every file can be written, then writes them; `dryRun` only checks. Fails before writing any, or says which it wrote. */
export async function writeFiles(cwd: string, changed: Map<string, string | null>, dryRun: boolean): Promise<void> {
  const blocked = (await Promise.all([...changed].filter(([, content]) => content !== null).map(([path]) => blockedPath(cwd, path))))
    .filter(why => why !== null)
  if (blocked.length > 0) throw new CommandError(`newt wrote nothing: ${blocked.join('; ')}`)
  if (dryRun) return
  const done: string[] = []
  for (const [path, content] of changed) {
    try {
      if (content === null) await rm(join(cwd, path), { force: true })
      else await Bun.write(join(cwd, path), content)
    } catch (error) {
      const wrote = done.length === 0 ? 'nothing before it' : `${done.join(', ')} before it`
      throw new CommandError(`newt could not write ${path} (${(error as Error).message}); it wrote ${wrote}`)
    }
    done.push(path)
  }
}
