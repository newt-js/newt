import { constants } from 'node:fs'
import { access }    from 'node:fs/promises'
import { stat }      from 'node:fs/promises'
import { dirname }   from 'node:path'
import { join }      from 'node:path'

const kindOf = async (path: string) => stat(path).then(found => found.isDirectory() ? 'folder' : 'file', () => null)

const writable = (path: string) => access(path, constants.W_OK).then(() => true, () => false)

/** Why a file cannot be written at `path` under `cwd`: a file where a folder goes, a folder where the file goes, or no leave to write it. */
export async function blockedPath(cwd: string, path: string): Promise<string | null> {
  const kind = await kindOf(join(cwd, path))
  if (kind === 'folder') return `${path} is a folder`
  if (kind === 'file') return await writable(join(cwd, path)) ? null : `${path} cannot be written`
  for (let parent = dirname(path); ; parent = dirname(parent)) {
    const found = await kindOf(join(cwd, parent))
    if (found === 'file') return `${parent} is a file, so ${path} cannot be in it`
    if (found === 'folder') return await writable(join(cwd, parent)) ? null : `${parent === '.' ? 'this folder' : parent} cannot be written, so ${path} cannot be made in it`
    if (parent === '.' || parent === '/' || dirname(parent) === parent) return null
  }
}
