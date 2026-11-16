import type { ReplaceLineChange } from '../../commands/command'
import type { ChangeOutcome }     from '../change-outcome'
import { withImports }            from '../insert-lines/insert-lines'
import type { VirtualFiles }      from '../virtual-files/virtual-files'

/** Replaces a line of a file, adding its imports; where that line is not, it changes nothing and says what to write. */
export async function replaceLine(change: ReplaceLineChange, files: VirtualFiles): Promise<ChangeOutcome> {
  const { path, line, imports } = change
  const current = (await files.read(path))?.split('\n') ?? []
  if (current.includes(change.with) && imports.every(each => current.includes(each))) {
    return { status: 'skipped', note: 'up to date', warnings: [] }
  }
  const at = current.indexOf(line)
  if (at === -1) {
    const what = [...imports, change.with.trim()].join('; ')
    return { status: 'skipped', note: 'not as newt wrote it', warnings: [`${path} is not as newt wrote it, so newt did not change it: write ${what}`] }
  }
  const replaced = [...current.slice(0, at), change.with, ...current.slice(at + 1)]
  await files.write(path, withImports(replaced, imports).join('\n'))
  return { status: 'updated', warnings: [] }
}
