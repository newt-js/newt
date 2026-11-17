import { join } from 'node:path'

export type VirtualFiles = {
  read(path: string): Promise<string | null>
  write(path: string, content: string): Promise<void>
  remove(path: string): Promise<void>
  /** What the changes wrote, in order: a file's new content, or null when they removed it. */
  changed(): Map<string, string | null>
}

/** The files under `cwd` as the changes leave them, kept in memory until they are written all at once; changes see \n, and a file with \r\n keeps it. */
export function virtualFiles(cwd: string): VirtualFiles {
  const written = new Map<string, string | null>()
  const crlf = new Set<string>()
  return {
    async read(path) {
      const known = written.get(path)
      if (known !== undefined) return known
      const file = Bun.file(join(cwd, path))
      if (!await file.exists()) return null
      const text = await file.text()
      if (text.includes('\r\n')) crlf.add(path)
      return text.replaceAll('\r\n', '\n')
    },
    async write(path, content) {
      written.delete(path)
      written.set(path, content)
    },
    async remove(path) {
      written.delete(path)
      written.set(path, null)
    },
    changed: () => new Map([...written].map(([path, content]) => [path, content !== null && crlf.has(path) ? content.replaceAll('\n', '\r\n') : content])),
  }
}
