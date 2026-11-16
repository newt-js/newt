import type { ReplaceLineChange } from '../../commands/command'
import { addedImports }           from '../added-imports/added-imports'
import type { ChangeOutcome }     from '../change-outcome'
import { codeTokens }             from '../code-tokens/code-tokens'
import { indexOfTokens }          from '../index-of-tokens/index-of-tokens'
import type { VirtualFiles }      from '../virtual-files/virtual-files'

/** Replaces a piece of code of a file, compared whatever its format, adding its imports; where that piece is not, it changes nothing and says what to write. */
export async function replaceLine(change: ReplaceLineChange, files: VirtualFiles): Promise<ChangeOutcome> {
  const { path, line, imports } = change
  const text = await files.read(path) ?? ''
  const tokens = codeTokens(text)
  const replaced = codeTokens(line)
  const at = indexOfTokens(tokens, replaced)
  if (at === -1 && indexOfTokens(tokens, codeTokens(change.with)) !== -1) {
    if (addedImports(text, imports) === text) return { status: 'skipped', note: 'up to date', warnings: [] }
    await files.write(path, addedImports(text, imports))
    return { status: 'updated', warnings: [] }
  }
  if (at === -1) {
    const what = [...imports, change.with.trim()].join('; ')
    return { status: 'skipped', note: 'not as newt wrote it', failed: true, warnings: [`${path} is not as newt wrote it, so newt did not change it: write ${what}`] }
  }
  const [start, end] = [tokens[at]!.start, tokens[at + replaced.length - 1]!.end]
  await files.write(path, addedImports(`${text.slice(0, start)}${change.with.trim()}${text.slice(end)}`, imports))
  return { status: 'updated', warnings: [] }
}
