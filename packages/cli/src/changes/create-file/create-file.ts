import type { CreateChange }  from '../../commands/command'
import type { ChangeOutcome } from '../change-outcome'
import type { VirtualFiles }  from '../virtual-files/virtual-files'

/** Creates a file that is not there; one that is there is kept, with a warning when it lacks what newt needs of it. */
export async function createFile({ path, content, kept }: CreateChange, files: VirtualFiles): Promise<ChangeOutcome> {
  const text = await files.read(path)
  if (text !== null) {
    const lacking = kept && !kept.needs.every(needed => text.includes(needed))
    return { status: 'skipped', note: 'already exists', warnings: lacking ? [`${path} was there already, so newt kept it: ${kept.warning}`] : [] }
  }
  await files.write(path, content)
  return { status: 'created', warnings: [] }
}
