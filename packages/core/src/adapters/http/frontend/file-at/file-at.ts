import { join }      from 'node:path'
import { normalize } from 'node:path'

/** The file a request's path names in a built frontend's folder; none for a path that leaves it, or a dotfile or a file in a dot-folder, `.env` or `.git`. */
export async function fileAt(folder: string, pathname: string): Promise<Bun.BunFile | null> {
  try {
    const path = normalize(decodeURIComponent(pathname))
    if (path === '/' || path.includes('\0') || path.split('/').some(segment => segment.startsWith('.'))) {
      return null
    }
    const file = Bun.file(join(folder, path))
    return (await file.exists()) ? file : null
  } catch {
    return null
  }
}
