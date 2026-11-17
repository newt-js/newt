import { lstat }             from 'node:fs/promises'
import { realpath }          from 'node:fs/promises'
import { basename }          from 'node:path'
import { dirname }           from 'node:path'
import { join }              from 'node:path'
import { relative }          from 'node:path'
import { sep }               from 'node:path'
// --------------------------------------------------------
import { findWorkspaceRoot } from '../../project/find-workspace-root/find-workspace-root'

/** Where `path` really is, through the links on its way; null when a link on its way leads to nothing. */
async function realOf(path: string): Promise<string | null> {
  const rest: string[] = []
  for (let at = path; ; at = dirname(at)) {
    if (await lstat(at).then(() => true, () => false)) {
      const real = await realpath(at).catch(() => null)
      return real === null ? null : join(real, ...rest.toReversed())
    }
    if (dirname(at) === at) return path
    rest.push(basename(at))
  }
}

/** The project `path` is in: its monorepo, or else the nearest folder with a package.json; `cwd` without one. */
async function projectOf(path: string, cwd: string): Promise<string> {
  const workspace = await findWorkspaceRoot(dirname(path))
  if (workspace) return workspace.folder
  for (let folder = dirname(path); ; folder = dirname(folder)) {
    if (await Bun.file(join(folder, 'package.json')).exists()) return folder
    if (dirname(folder) === folder) return cwd
  }
}

/** Why `path` (from `cwd`) cannot be written: a link on its way leads out of its project, or to nothing. */
export async function outsideProject(cwd: string, path: string): Promise<string | null> {
  const at = join(cwd, path)
  const real = await realOf(at)
  if (real === null) return `${path} is a link to nothing, and newt writes no file through it`
  const project = await realOf(await projectOf(at, cwd)) ?? cwd
  if (real === project || real.startsWith(`${project}${sep}`)) return null
  return `${path} is a link out of the project, to ${relative(project, real)}, and newt writes nothing outside it`
}
