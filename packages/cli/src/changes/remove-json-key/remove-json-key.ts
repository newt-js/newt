import type { RemoveJsonKeyChange } from '../../commands/command'
import type { ChangeOutcome }       from '../change-outcome'
import type { VirtualFiles }        from '../virtual-files/virtual-files'

const UP_TO_DATE: ChangeOutcome = { status: 'skipped', note: 'up to date', warnings: [] }

/** Removes a key of a JSON file while it holds `value`, once the file `whenMissing` is gone. */
export async function removeJsonKey({ path, key, value, whenMissing }: RemoveJsonKeyChange, files: VirtualFiles): Promise<ChangeOutcome> {
  const text = await files.read(path)
  if (text === null || await files.read(whenMissing) !== null) return UP_TO_DATE
  let json: Record<string, unknown>
  try {
    json = JSON.parse(text) as Record<string, unknown>
  } catch {
    return UP_TO_DATE
  }
  if (JSON.stringify(json[key]) !== JSON.stringify(value)) return UP_TO_DATE
  const { [key]: _removed, ...rest } = json
  const indent = /^([ \t]+)\S/m.exec(text)?.[1] ?? '  '
  await files.write(path, `${JSON.stringify(rest, null, indent)}\n`)
  return { status: 'updated', warnings: [] }
}
