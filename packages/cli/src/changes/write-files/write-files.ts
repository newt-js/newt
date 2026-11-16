import { mkdir }          from 'node:fs/promises'
import { rm }             from 'node:fs/promises'
import { dirname }        from 'node:path'
import { join }           from 'node:path'
// --------------------------------------------------------
import { CommandError }   from '../../commands/command-error/command-error'
import { blockedPath }    from '../blocked-path/blocked-path'
import { outsideProject } from '../outside-project/outside-project'

/** Checks that every file can be written, then writes them; `dryRun` only checks. */
export async function writeFiles(cwd: string, changed: Map<string, string | null>, dryRun: boolean): Promise<void> {
  const written = [...changed].filter(([, content]) => content !== null).map(([path]) => path)
  const blocked = (await Promise.all(written.map(async path => await outsideProject(cwd, path) ?? await blockedPath(cwd, path))))
    .filter(why => why !== null)
  if (blocked.length > 0) throw new CommandError(`newt wrote nothing: ${blocked.join('; ')}`)
  if (dryRun) return
  for (const [path, content] of changed) {
    const at = join(cwd, path)
    if (content === null) await rm(at, { force: true })
    else {
      await mkdir(dirname(at), { recursive: true })
      await Bun.write(at, content)
    }
  }
}
