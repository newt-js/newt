import type { AppendBlockChange } from '../../commands/command'
import { addedImports }           from '../added-imports/added-imports'
import type { ChangeOutcome }     from '../change-outcome'
import type { VirtualFiles }      from '../virtual-files/virtual-files'

/** Appends a block to a file, after a blank line, with its imports, unless the file has its first line already. */
export async function appendBlock({ path, block, imports }: AppendBlockChange, files: VirtualFiles): Promise<ChangeOutcome> {
  const text = await files.read(path)
  if (text === null) {
    return { status: 'skipped', note: 'not there', failed: true, warnings: [`${path} is not there, so newt did not add to it:\n${block}`] }
  }
  const [first = ''] = block.split('\n')
  if (text.split('\n').includes(first)) {
    return { status: 'skipped', note: 'up to date', warnings: [] }
  }
  await files.write(path, addedImports(`${text.replace(/\n*$/, '')}\n\n${block.replace(/\n*$/, '')}\n`, imports))
  return { status: 'updated', warnings: [] }
}
