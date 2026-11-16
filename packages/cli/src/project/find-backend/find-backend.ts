import { dirname }           from 'node:path'
import { join }              from 'node:path'
import { relative }          from 'node:path'
import { resolve }           from 'node:path'
// --------------------------------------------------------
import { CommandError }      from '../../commands/command-error/command-error'
import { findWorkspaceRoot } from '../find-workspace-root/find-workspace-root'
import { isBackend }         from '../is-backend/is-backend'
import { workspaceFolders }  from '../workspace-folders/workspace-folders'

/** The backend a command works on: `--backend`'s; the one `cwd` is in; or, at a monorepo's root, its only one. */
export async function findBackend(cwd: string, given?: string): Promise<string> {
  if (given !== undefined) {
    const folder = resolve(cwd, given)
    if (!await isBackend(folder)) {
      throw new CommandError(`${given} is not a newt backend: its package.json does not depend on @newt-js/core`)
    }
    return folder
  }
  for (let folder = cwd; ; folder = dirname(folder)) {
    if (await isBackend(folder)) return folder
    if (await Bun.file(join(folder, 'package.json')).exists() || dirname(folder) === folder) break
  }
  const root = await findWorkspaceRoot(cwd)
  if (!root) {
    throw new CommandError('This is not a newt backend: no package.json depending on @newt-js/core here or above. Make one with newt init <name>')
  }
  const backends = []
  for (const folder of await workspaceFolders(root)) {
    if (await isBackend(folder)) backends.push(folder)
  }
  if (backends.length === 1) return backends[0]!
  if (backends.length === 0) {
    throw new CommandError('This monorepo has no newt backend: add one with newt add backend <folder>')
  }
  const options = backends.map(folder => relative(cwd, folder))
  throw new CommandError(`Which backend? This monorepo has ${options.join(', ')}: add --backend ${options[0]}`)
}
