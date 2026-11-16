import { relative }         from 'node:path'
// --------------------------------------------------------
import { contextNames }     from '../../names/context-names/context-names'
import { backendContexts }  from '../../project/backend-contexts/backend-contexts'
import { findBackend }      from '../../project/find-backend/find-backend'
import { frontendTemplate } from '../../templates/frontend/frontend-template/frontend-template'
import { templateVersions } from '../../templates/template-versions/template-versions'
import { defineCommand }    from '../command'
import { CommandError }     from '../command-error/command-error'

export const ADD_FRONTEND = defineCommand({
  name: 'add frontend',
  summary: 'Adds a React frontend to a context, served by the backend at /<context>',
  args: '<context>',
  options: {
    backend: { type: 'string', value: 'folder', description: 'The backend, in a monorepo with several' },
  },
  run: async ({ args, cwd, options }) => {
    const [context, ...rest] = args
    if (context === undefined || rest.length > 0) {
      throw new CommandError('newt add frontend takes the context, as in newt add frontend sales')
    }
    const names = contextNames(context)
    const backend = await findBackend(cwd, options.backend)
    if (!(await backendContexts(backend)).some(each => each.name === context)) {
      throw new CommandError(`The backend has no context ${context}: add it with newt add context ${context}`)
    }
    return {
      changes: frontendTemplate({ backend: relative(cwd, backend), context: names, versions: await templateVersions() }),
      nextSteps: ['bun install', `bun run dev, and open /${context}`],
    }
  },
})
