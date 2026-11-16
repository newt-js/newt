import type { InsertLinesChange } from '../../commands/command'
import type { ChangeOutcome }     from '../change-outcome'
import type { VirtualFiles }      from '../virtual-files/virtual-files'

const isImport = (line: string) => line.startsWith('import ')

export function withImports(lines: string[], imports: string[]): string[] {
  const missing = imports.filter(line => !lines.includes(line))
  if (missing.length === 0) return lines
  const last = lines.findLastIndex(isImport)
  return [...lines.slice(0, last + 1), ...missing, ...lines.slice(last + 1)]
}

/** Inserts lines just before or after a line of a file, with their imports; where that line is not, it changes nothing and says what to add. */
export async function insertLines({ path, anchor, position, lines, imports }: InsertLinesChange, files: VirtualFiles): Promise<ChangeOutcome> {
  const text = await files.read(path)
  const current = text?.split('\n') ?? []
  if (lines.every(line => current.includes(line)) && imports.every(line => current.includes(line))) {
    return { status: 'skipped', note: 'up to date', warnings: [] }
  }
  const found = current.indexOf(anchor)
  const at = position === 'before' ? found : found + 1
  if (found === -1) {
    const what = [...imports, ...lines.map(line => line.trim())].join('; ')
    return { status: 'skipped', note: 'not as newt wrote it', warnings: [`${path} is not as newt wrote it, so newt did not change it: add ${what}`] }
  }
  const inserted = [...current.slice(0, at), ...lines.filter(line => !current.includes(line)), ...current.slice(at)]
  await files.write(path, withImports(inserted, imports).join('\n'))
  return { status: 'updated', warnings: [] }
}
