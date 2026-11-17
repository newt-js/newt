import { readdirSync } from 'node:fs'
import { join }        from 'node:path'
import { relative }    from 'node:path'
// --------------------------------------------------------
import type { Mount }  from '../mount'

export function sourceFrontends(mounts: Mount[]): Record<string, Bun.HTMLBundle | Bun.BunFile> {
  const routes: Record<string, Bun.HTMLBundle | Bun.BunFile> = {}
  for (const { app, prefix, publicFolder } of mounts) {
    if (typeof app === 'string') {
      continue
    }
    const files = publicFolder
      ? readdirSync(publicFolder, { recursive: true, withFileTypes: true }).filter(entry => entry.isFile()).map(entry => join(entry.parentPath, entry.name))
      : []
    for (const file of files) {
      routes[`${prefix}/${relative(publicFolder!, file)}`] = Bun.file(file)
    }
    if (prefix !== '') {
      routes[prefix] = app
    }
    routes[`${prefix}/*`] = app
  }
  return routes
}
