import { BACKEND_OPTIONS }  from '../../options/backend-options'
import { clusterOf }        from '../../options/cluster-of/cluster-of'
import { portOf }           from '../../options/port-of/port-of'
import { backendTemplate }  from '../../templates/backend/backend-template/backend-template'
import { monorepoTemplate } from '../../templates/monorepo/monorepo-template/monorepo-template'
import { templateVersions } from '../../templates/template-versions/template-versions'
import { defineCommand }    from '../command'
import { CommandError }     from '../command-error/command-error'
import { DEFAULT_BACKEND }  from './backend-in-root/backend-in-root'
import { backendInRoot }    from './backend-in-root/backend-in-root'
import { projectFolder }    from './project-folder/project-folder'
import { askProjectKind }   from './project-kind/project-kind'

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
    const port = portOf(options.port)
    const cluster = clusterOf(options.cluster)
    const versions = await templateVersions()
    const changes = kind === 'monorepo'
      ? monorepoTemplate({ folder, name, backend: backendInRoot(options.backend), port, cluster, versions })
      : backendTemplate({ folder, name, port, cluster, versions })
    return { changes, nextSteps: [...folder === '.' ? [] : [`cd ${folder}`], 'bun install', 'bun run dev'] }
  },
})
