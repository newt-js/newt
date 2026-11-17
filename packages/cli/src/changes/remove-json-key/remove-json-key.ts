import { default as ts }            from 'typescript'
// --------------------------------------------------------
import type { RemoveJsonKeyChange } from '../../commands/command'
import type { ChangeOutcome }       from '../change-outcome'
import { jsonValue }                from '../json-value/json-value'
import { propertyKey }              from '../property-key/property-key'
import type { VirtualFiles }        from '../virtual-files/virtual-files'

const UP_TO_DATE: ChangeOutcome = { status: 'skipped', note: 'up to date', warnings: [] }

/** Removes a key of a JSON file, or of its object `in`, while it holds `value`, once the file `whenMissing` is gone, by its text. */
export async function removeJsonKey({ path, in: parent, key, value, whenMissing }: RemoveJsonKeyChange, files: VirtualFiles): Promise<ChangeOutcome> {
  const text = await files.read(path)
  if (text === null || await files.read(whenMissing) !== null) return UP_TO_DATE
  const source = ts.parseJsonText(path, text)
  const top = source.statements[0]?.expression
  const root = parent === undefined || !top || !ts.isObjectLiteralExpression(top) ? top
    : top.properties.find((each): each is ts.PropertyAssignment => ts.isPropertyAssignment(each) && propertyKey(each) === parent)?.initializer
  if (!root || !ts.isObjectLiteralExpression(root)) return UP_TO_DATE
  const property = root.properties.find((each): each is ts.PropertyAssignment => ts.isPropertyAssignment(each) && propertyKey(each) === key)
  if (!property || JSON.stringify(jsonValue(text, property.initializer, source)) !== JSON.stringify(value)) return UP_TO_DATE
  const after = text.slice(property.getEnd())
  const comma = /^\s*,/.exec(after)
  let from = property.getStart(source)
  let to = property.getEnd() + (comma ? comma[0].length : 0)
  if (!comma) {
    const before = text.slice(0, from)
    const previous = before.lastIndexOf(',')
    if (previous !== -1 && before.slice(previous + 1).trim() === '') from = previous
  }
  const lineStart = text.lastIndexOf('\n', from - 1)
  if (comma && text.slice(lineStart + 1, from).trim() === '') from = lineStart
  if (!comma) to = property.getEnd()
  await files.write(path, `${text.slice(0, from)}${text.slice(to)}`)
  return { status: 'updated', warnings: [] }
}
