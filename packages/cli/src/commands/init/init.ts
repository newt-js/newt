import { backendTemplate }  from '../../templates/backend/backend-template/backend-template'
import { templateVersions } from '../../templates/template-versions/template-versions'
import { defineCommand }    from '../command'
import { backendFolder }    from './backend-folder/backend-folder'
import { DEFAULT_PORT }     from './port-of/port-of'
import { portOf }           from './port-of/port-of'

export const INIT = defineCommand({
  name: 'init',
  summary: 'Creates a backend in a new folder, or in this one with .',
  args: '[name]',
  options: {
    port: { type: 'string', value: 'port', description: `The port it serves on, ${DEFAULT_PORT} by default` },
  },
  run: async ({ args, cwd, options, ask }) => {
    const { folder, name } = await backendFolder(args, cwd, ask)
    const port = portOf(options.port)
    return {
      changes: backendTemplate({ folder, name, port, versions: await templateVersions() }),
      nextSteps: [...folder === '.' ? [] : [`cd ${folder}`], 'bun install', 'bun run dev'],
    }
  },
})
