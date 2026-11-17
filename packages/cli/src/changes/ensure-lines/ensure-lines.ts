import type { ChangeOutcome } from '../change-outcome'
import type { VirtualFiles }  from '../virtual-files/virtual-files'

/** Adds at the end of a file the lines it lacks; creates it when it is not there. */
export async function ensureLines(path: string, lines: string[], files: VirtualFiles): Promise<ChangeOutcome> {
  const text = await files.read(path)
  if (text === null) {
    await files.write(path, `${lines.join('\n')}\n`)
    return { status: 'created', warnings: [] }
  }
  const present = new Set(text.split('\n').map(line => line.trim()))
  const missing = lines.filter(line => !present.has(line.trim()))
  if (missing.length === 0) {
    return { status: 'skipped', note: 'up to date', warnings: [] }
  }
  const separator = text === '' || text.endsWith('\n') ? '' : '\n'
  await files.write(path, `${text}${separator}${missing.join('\n')}\n`)
  return { status: 'updated', warnings: [] }
}
