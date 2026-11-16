import { BACKEND_OPTIONS }  from '../../options/backend-options'
import { clusterOf }        from '../../options/cluster-of/cluster-of'
import { portOf }           from '../../options/port-of/port-of'
import { backendTemplate }  from '../../templates/backend/backend-template/backend-template'
import { templateVersions } from '../../templates/template-versions/template-versions'
import { defineCommand }    from '../command'
import { backendFolder }    from './backend-folder/backend-folder'

export const INIT = defineCommand({
  name: 'init',
  summary: 'Creates a backend in a new folder, or in this one with .',
  args: '[name]',
  options: BACKEND_OPTIONS,
  run: async ({ args, cwd, options, ask }) => {
    const { folder, name } = await backendFolder(args, cwd, ask)
    const port = portOf(options.port)
    const cluster = clusterOf(options.cluster)
    return {
      changes: backendTemplate({ folder, name, port, cluster, versions: await templateVersions() }),
      nextSteps: [...folder === '.' ? [] : [`cd ${folder}`], 'bun install', 'bun run dev'],
    }
  },
})
