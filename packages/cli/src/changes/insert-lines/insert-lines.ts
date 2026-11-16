import type { InsertLinesChange } from '../../commands/command'
import { addedImports }           from '../added-imports/added-imports'
import type { ChangeOutcome }     from '../change-outcome'
import { codeTokens }             from '../code-tokens/code-tokens'
import { indexOfTokens }          from '../index-of-tokens/index-of-tokens'
import type { VirtualFiles }      from '../virtual-files/virtual-files'

/** Inserts a block of lines just before or after the line of a piece of code, with their imports; code is compared whatever its format. Where that piece is not, it changes nothing and says what to add. */
export async function insertLines({ path, anchor, position, lines, imports }: InsertLinesChange, files: VirtualFiles): Promise<ChangeOutcome> {
  const text = await files.read(path) ?? ''
  const tokens = codeTokens(text)
  const held = indexOfTokens(tokens, codeTokens(lines.join('\n'))) !== -1
  if (held && addedImports(text, imports) === text) {
    return { status: 'skipped', note: 'up to date', warnings: [] }
  }
  const anchored = codeTokens(anchor)
  const found = indexOfTokens(tokens, anchored)
  if (found === -1) {
    const what = [...imports, ...lines.map(line => line.trim())].join('; ')
    return { status: 'skipped', note: 'not as newt wrote it', failed: true, warnings: [`${path} is not as newt wrote it, so newt did not change it: add ${what}`] }
  }
  const block = lines.join('\n')
  let inserted = text
  if (!held && position === 'before') {
    const at = text.lastIndexOf('\n', tokens[found]!.start - 1) + 1
    inserted = `${text.slice(0, at)}${block}\n${text.slice(at)}`
  } else if (!held) {
    const end = text.indexOf('\n', tokens[found + anchored.length - 1]!.end)
    const at = end === -1 ? text.length : end
    inserted = `${text.slice(0, at)}\n${block}${text.slice(at)}`
  }
  await files.write(path, addedImports(inserted, imports))
  return { status: 'updated', warnings: [] }
}
