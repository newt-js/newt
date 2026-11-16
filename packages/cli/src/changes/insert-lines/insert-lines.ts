import type { InsertLinesChange } from '../../commands/command'
import { addedImports }           from '../added-imports/added-imports'
import type { ChangeOutcome }     from '../change-outcome'
import type { VirtualFiles }      from '../virtual-files/virtual-files'

const holdsBlock = (current: string[], block: string[]) => current.some((_, at) => block.every((line, offset) => current[at + offset] === line))

/** Inserts a block of lines just before or after a line of a file, with their imports; where that line is not, it changes nothing and says what to add. */
export async function insertLines({ path, anchor, position, lines, imports }: InsertLinesChange, files: VirtualFiles): Promise<ChangeOutcome> {
  const text = await files.read(path)
  const current = text?.split('\n') ?? []
  if (holdsBlock(current, lines) && addedImports(text ?? '', imports) === (text ?? '')) {
    return { status: 'skipped', note: 'up to date', warnings: [] }
  }
  const found = current.indexOf(anchor)
  const at = position === 'before' ? found : found + 1
  if (found === -1) {
    const what = [...imports, ...lines.map(line => line.trim())].join('; ')
    return { status: 'skipped', note: 'not as newt wrote it', warnings: [`${path} is not as newt wrote it, so newt did not change it: add ${what}`] }
  }
  const inserted = holdsBlock(current, lines) ? current : [...current.slice(0, at), ...lines, ...current.slice(at)]
  await files.write(path, addedImports(inserted.join('\n'), imports))
  return { status: 'updated', warnings: [] }
}
