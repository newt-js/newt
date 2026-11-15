import { join }      from 'node:path'
import { normalize } from 'node:path'

export async function fileAt(folder: string, pathname: string): Promise<Bun.BunFile | null> {
  try {
    const path = normalize(decodeURIComponent(pathname))
    if (path === '/' || path.includes('..') || path.includes('\0')) {
      return null
    }
    const file = Bun.file(join(folder, path))
    return (await file.exists()) ? file : null
  } catch {
    return null
  }
}
