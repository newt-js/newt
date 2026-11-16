import type { ChangeOutcome } from '../change-outcome'
import type { VirtualFiles }  from '../virtual-files/virtual-files'

/** Appends a block to a file, after a blank line, unless the file has its first line already. */
export async function appendBlock(path: string, block: string, files: VirtualFiles): Promise<ChangeOutcome> {
  const text = await files.read(path)
  if (text === null) {
    return { status: 'skipped', note: 'not there', warnings: [`${path} is not there, so newt did not add to it:\n${block}`] }
  }
  const [first = ''] = block.split('\n')
  if (text.split('\n').includes(first)) {
    return { status: 'skipped', note: 'up to date', warnings: [] }
  }
  await files.write(path, `${text.replace(/\n*$/, '')}\n\n${block.replace(/\n*$/, '')}\n`)
  return { status: 'updated', warnings: [] }
}
