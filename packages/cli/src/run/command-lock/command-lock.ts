import { open }    from 'node:fs/promises'
import { rm }      from 'node:fs/promises'
import { stat }    from 'node:fs/promises'
import { dirname } from 'node:path'
import { join }    from 'node:path'

export const LOCK_FILE = '.newt.lock'

/** A lock older than this was left by a command that died. */
const STALE_MS = 120_000

async function projectOf(cwd: string): Promise<string> {
  for (let folder = cwd; ; folder = dirname(folder)) {
    if (await Bun.file(join(folder, 'package.json')).exists()) return folder
    if (dirname(folder) === folder) return cwd
  }
}

/** Waits until no other newt command runs in this project, and holds it until the returned release is called; two commands at once would lose each other's changes. */
export async function commandLock(cwd: string, waitMs = 60_000): Promise<() => Promise<void>> {
  const lock = join(await projectOf(cwd), LOCK_FILE)
  const until = Date.now() + waitMs
  for (;;) {
    try {
      await (await open(lock, 'wx')).close()
      return () => rm(lock, { force: true })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') return async () => undefined
      const age = await stat(lock).then(found => Date.now() - found.mtimeMs, () => 0)
      if (age > STALE_MS) await rm(lock, { force: true })
      else if (Date.now() > until) throw new Error(`another newt command has run here for a while: if none does, remove ${lock}`)
      else await Bun.sleep(50)
    }
  }
}
