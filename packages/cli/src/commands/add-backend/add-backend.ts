import { basename }          from 'node:path'
import { relative }          from 'node:path'
import { resolve }           from 'node:path'
// --------------------------------------------------------
import { isBackendName }     from '../../names/backend-name/backend-name'
import { packageNameOf }     from '../../names/package-name-of/package-name-of'
import { BACKEND_OPTIONS }   from '../../options/backend-options'
import { clusterOf }         from '../../options/cluster-of/cluster-of'
import { portOf }            from '../../options/port-of/port-of'
import { backendTemplate }   from '../../templates/backend/backend-template/backend-template'
import { templateVersions }  from '../../templates/template-versions/template-versions'
import { defineCommand }     from '../command'
import { CommandError }      from '../command-error/command-error'
import { findWorkspaceRoot } from './find-workspace-root/find-workspace-root'
import { workspacesChange }  from './workspaces-change/workspaces-change'

export const ADD_BACKEND = defineCommand({
  name: 'add backend',
  summary: 'Adds a backend to this monorepo, in its own folder',
  args: '<folder>',
  options: BACKEND_OPTIONS,
  run: async ({ args, cwd, options }) => {
    const [given, ...rest] = args
    if (given === undefined || rest.length > 0) {
      throw new CommandError('newt add backend takes the folder of the backend, as in newt add backend apps/api')
    }
    const root = await findWorkspaceRoot(cwd)
    if (!root) {
      throw new CommandError('This is not a monorepo: no package.json with workspaces here or above. For a backend alone, newt init <name>')
    }
    const folder = resolve(cwd, given)
    if (relative(root.folder, folder).startsWith('..') || folder === root.folder) {
      throw new CommandError(`${given} is not inside the monorepo at ${root.folder}`)
    }
    const name = basename(folder)
    if (!isBackendName(name)) {
      throw new CommandError(`'${name}' cannot name a backend: use lowercase letters, digits and - . _ ~, as in '${packageNameOf(name)}'`)
    }
    const workspaces = workspacesChange(root, folder, cwd)
    const backend = backendTemplate({ folder: relative(cwd, folder), name, port: portOf(options.port), cluster: clusterOf(options.cluster), versions: await templateVersions() })
    return {
      changes: workspaces ? [workspaces, ...backend] : backend,
      nextSteps: [...root.folder === cwd ? [] : [`cd ${relative(cwd, root.folder)}`], 'bun install', `cd ${relative(root.folder, folder)}`, 'bun run dev'],
    }
  },
})
