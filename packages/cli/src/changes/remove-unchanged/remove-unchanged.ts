import type { RemoveUnchangedChange } from '../../commands/command'
import type { ChangeOutcome }         from '../change-outcome'
import type { VirtualFiles }          from '../virtual-files/virtual-files'

/** Removes a file only while it is just as it was made; a file someone changed stays, with a warning. */
export async function removeUnchanged({ path, content, why }: RemoveUnchangedChange, files: VirtualFiles): Promise<ChangeOutcome> {
  const text = await files.read(path)
  if (text === null) {
    return { status: 'skipped', note: 'not there', warnings: [] }
  }
  if (text !== content) {
    return { status: 'skipped', note: 'changed', warnings: [`${path} was changed, so newt left it, though ${why}`] }
  }
  await files.remove(path)
  return { status: 'removed', note: why, warnings: [] }
}
