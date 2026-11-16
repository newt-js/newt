import { rm }   from 'node:fs/promises'
import { join } from 'node:path'

export type VirtualFiles = {
  read(path: string): Promise<string | null>
  write(path: string, content: string): Promise<void>
  remove(path: string): Promise<void>
}

/** The files under `cwd` as the changes leave them: with `dryRun`, what they write is only remembered. */
export function virtualFiles(cwd: string, dryRun: boolean): VirtualFiles {
  const written = new Map<string, string | null>()
  return {
    async read(path) {
      const known = written.get(path)
      if (known !== undefined) return known
      const file = Bun.file(join(cwd, path))
      return await file.exists() ? file.text() : null
    },
    async write(path, content) {
      written.set(path, content)
      if (!dryRun) await Bun.write(join(cwd, path), content)
    },
    async remove(path) {
      written.set(path, null)
      if (!dryRun) await rm(join(cwd, path), { force: true })
    },
  }
}
