import { rm }                from 'node:fs/promises'
import { join }              from 'node:path'
// --------------------------------------------------------
import type { VirtualFiles } from '../../changes/virtual-files/virtual-files'
import { virtualFiles }      from '../../changes/virtual-files/virtual-files'

/** Virtual files that write to disk as soon as they are written, for testing one change at a time. */
export function diskFiles(cwd: string): VirtualFiles {
  const files = virtualFiles(cwd)
  return {
    ...files,
    async write(path, content) {
      await files.write(path, content)
      await Bun.write(join(cwd, path), content)
    },
    async remove(path) {
      await files.remove(path)
      await rm(join(cwd, path), { force: true })
    },
  }
}
