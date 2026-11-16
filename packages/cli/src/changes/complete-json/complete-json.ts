import { default as ts }      from 'typescript'
// --------------------------------------------------------
import { appliedEdits }       from '../applied-edits/applied-edits'
import type { ChangeOutcome } from '../change-outcome'
import { jsonEdits }          from '../json-edits/json-edits'
import type { VirtualFiles }  from '../virtual-files/virtual-files'

const DEFAULT_INDENT = '  '

/** Adds to a JSON or JSONC file what it lacks of `values`, by its text: what it has, its comments and its layout stay; creates it when it is not there. */
export async function completeJson(path: string, values: Record<string, unknown>, files: VirtualFiles): Promise<ChangeOutcome> {
  const text = await files.read(path)
  if (text === null) {
    await files.write(path, `${JSON.stringify(values, null, DEFAULT_INDENT)}\n`)
    return { status: 'created', warnings: [] }
  }
  const source = ts.parseJsonText(path, text)
  const root = source.statements[0]?.expression
  if (ts.parseConfigFileTextToJson(path, text).error || !root || !ts.isObjectLiteralExpression(root)) {
    return { status: 'skipped', note: 'not valid JSON', warnings: [`${path} is not valid JSON, so newt left it as it is: add to it ${JSON.stringify(values)}`] }
  }
  const unit = /^([ \t]+)\S/m.exec(text)?.[1] ?? DEFAULT_INDENT
  const { edits, conflicts } = jsonEdits(text, source, root, values, unit)
  const warnings = conflicts.map(conflict => `${path}: ${conflict}; newt left it as it is`)
  if (edits.length === 0) {
    return { status: 'skipped', note: 'up to date', warnings }
  }
  await files.write(path, appliedEdits(text, edits))
  return { status: 'updated', warnings }
}
