import type { ChangeOutcome } from '../change-outcome'
import { mergedJson }         from '../merged-json/merged-json'
import type { VirtualFiles }  from '../virtual-files/virtual-files'

const DEFAULT_INDENT = '  '

const jsonText = (value: unknown, indent: string) => `${JSON.stringify(value, null, indent)}\n`

/** Adds to a JSON file what it lacks of `values`, never changing what it has; creates it when it is not there. */
export async function completeJson(path: string, values: Record<string, unknown>, files: VirtualFiles): Promise<ChangeOutcome> {
  const text = await files.read(path)
  if (text === null) {
    await files.write(path, jsonText(values, DEFAULT_INDENT))
    return { status: 'created', warnings: [] }
  }
  let current: unknown
  try {
    current = JSON.parse(text)
  } catch {
    return { status: 'skipped', note: 'not valid JSON', warnings: [`${path} is not valid JSON: newt left it as it is`] }
  }
  const merged = mergedJson(current, values)
  const warnings = merged.conflicts.map(conflict => `${path}: ${conflict}; newt left it as it is`)
  if (!merged.changed) {
    return { status: 'skipped', note: 'up to date', warnings }
  }
  await files.write(path, jsonText(merged.value, /^([ \t]+)\S/m.exec(text)?.[1] ?? DEFAULT_INDENT))
  return { status: 'updated', warnings }
}
