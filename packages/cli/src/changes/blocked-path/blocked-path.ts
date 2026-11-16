import { stat }    from 'node:fs/promises'
import { dirname } from 'node:path'
import { join }    from 'node:path'

const kindOf = async (path: string) => stat(path).then(found => found.isDirectory() ? 'folder' : 'file', () => null)

/** Why a file cannot be written at `path` under `cwd`, when a file stands where a folder goes or a folder where the file goes. */
export async function blockedPath(cwd: string, path: string): Promise<string | null> {
  if (await kindOf(join(cwd, path)) === 'folder') return `${path} is a folder`
  for (let parent = dirname(path); parent !== '.' && parent !== '/'; parent = dirname(parent)) {
    if (await kindOf(join(cwd, parent)) === 'file') return `${parent} is a file, so ${path} cannot be in it`
  }
  return null
}
