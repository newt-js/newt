import { dirname }            from 'node:path'
import { join }               from 'node:path'
import { relative }           from 'node:path'
import { resolve }            from 'node:path'
// --------------------------------------------------------
import { BACKEND_OPTIONS }    from '../../options/backend-options'
import { portOf }             from '../../options/port-of/port-of'
import { storesOf }           from '../../options/stores-of/stores-of'
import { eslintWarning }      from '../../project/eslint-warning/eslint-warning'
import { findWorkspaceRoot }  from '../../project/find-workspace-root/find-workspace-root'
import { isBackend }          from '../../project/is-backend/is-backend'
import { otherEslintConfigs } from '../../project/other-eslint-configs/other-eslint-configs'
import { backendTemplate }    from '../../templates/backend/backend-template/backend-template'
import { monorepoTemplate }   from '../../templates/monorepo/monorepo-template/monorepo-template'
import { templateVersions }   from '../../templates/template-versions/template-versions'
import { defineCommand }      from '../command'
import { CommandError }       from '../command-error/command-error'
import { DEFAULT_BACKEND }    from './backend-in-root/backend-in-root'
import { backendInRoot }      from './backend-in-root/backend-in-root'
import { keptChoices }        from './kept-choices/kept-choices'
import { projectFolder }      from './project-folder/project-folder'
import { askProjectKind }     from './project-kind/project-kind'

export const INIT = defineCommand({
  name: 'init',
  summary: 'Creates a backend, or a monorepo with a first backend, in a new folder or in this one with .',
  args: '[name]',
  options: {
    ...BACKEND_OPTIONS,
    monorepo: { type: 'boolean', description: `A monorepo, its first backend in ${DEFAULT_BACKEND}` },
    backend: { type: 'string', value: 'folder', description: `The monorepo's first backend, ${DEFAULT_BACKEND} by default` },
  },
  run: async ({ args, cwd, options, ask }) => {
    const interactive = args.length === 0 && ask !== null
    const { folder, name } = await projectFolder(args, cwd, ask)
    const kind = options.monorepo ? 'monorepo' : interactive && ask ? await askProjectKind(ask) : 'backend'
    if (kind === 'backend' && options.backend !== undefined) {
      throw new CommandError('--backend says where a monorepo has its first backend: add --monorepo')
    }
    const target = resolve(cwd, folder)
    const root = await findWorkspaceRoot(target)
    if (root && root.folder === target && kind === 'backend') {
      throw new CommandError(`${folder} is a monorepo already: add a backend to it with newt add backend apps/<name>`)
    }
    if (root && !(kind === 'monorepo' && root.folder === target)) {
      throw new CommandError(`${folder} is inside the monorepo at ${relative(cwd, root.folder) || '.'}: add the backend to it with newt add backend ${relative(cwd, target) || '.'}`)
    }
    for (let above = dirname(target); above !== dirname(above); above = dirname(above)) {
      if (await isBackend(above)) throw new CommandError(`${folder} is inside the backend at ${relative(cwd, above) || '.'}: make the project in a folder of its own`)
    }
    if (kind === 'monorepo' && await isBackend(target)) {
      throw new CommandError(`${folder} is a backend: a monorepo goes in a folder of its own, with this backend moved into it by hand`)
    }
    const port = portOf(options.port)
    const versions = await templateVersions()
    const backendFolder = kind === 'monorepo' ? join(folder, backendInRoot(options.backend)) : folder
    const kept = await keptChoices(join(cwd, backendFolder), backendFolder, options, storesOf(options))
    const stores = kept.stores
    const changes = kind === 'monorepo'
      ? monorepoTemplate({ folder, name, backend: backendInRoot(options.backend), port, stores, versions })
      : backendTemplate({ folder, name, port, stores, versions })
    const warnings = [
      ...kept.warnings,
      ...(await otherEslintConfigs(join(cwd, backendFolder))).map(other => eslintWarning(join(backendFolder, other))),
    ]
    return { changes, warnings, nextSteps: [...folder === '.' ? [] : [`cd ${folder}`], 'bun install', 'bun run dev'] }
  },
})
