import type { ReplaceLineChange } from '../../commands/command'
import { addedImports }           from '../added-imports/added-imports'
import type { ChangeOutcome }     from '../change-outcome'
import type { VirtualFiles }      from '../virtual-files/virtual-files'

/** Replaces a line of a file, adding its imports; where that line is not, it changes nothing and says what to write. */
export async function replaceLine(change: ReplaceLineChange, files: VirtualFiles): Promise<ChangeOutcome> {
  const { path, line, imports } = change
  const text = await files.read(path) ?? ''
  const current = text.split('\n')
  if (current.includes(change.with) && !current.includes(line) && addedImports(text, imports) === text) {
    return { status: 'skipped', note: 'up to date', warnings: [] }
  }
  const at = current.indexOf(line)
  if (at === -1) {
    const what = [...imports, change.with.trim()].join('; ')
    return { status: 'skipped', note: 'not as newt wrote it', failed: true, warnings: [`${path} is not as newt wrote it, so newt did not change it: write ${what}`] }
  }
  const replaced = [...current.slice(0, at), change.with, ...current.slice(at + 1)]
  await files.write(path, addedImports(replaced.join('\n'), imports))
  return { status: 'updated', warnings: [] }
}
