import type { ChangeOutcome } from '../change-outcome'
import type { VirtualFiles }  from '../virtual-files/virtual-files'

export async function createFile(path: string, content: string, files: VirtualFiles): Promise<ChangeOutcome> {
  if (await files.read(path) !== null) {
    return { status: 'skipped', note: 'already exists', warnings: [] }
  }
  await files.write(path, content)
  return { status: 'created', warnings: [] }
}
