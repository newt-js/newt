import { join }                  from 'node:path'
import { relative }              from 'node:path'
import { resolve }               from 'node:path'
import { sep }                   from 'node:path'
// --------------------------------------------------------
import { contextNames }          from '../../names/context-names/context-names'
import { backendContexts }       from '../../project/backend-contexts/backend-contexts'
import { findBackend }           from '../../project/find-backend/find-backend'
import { builtFrontendTemplate } from '../../templates/frontend/frontend-template/frontend-template'
import { frontendTemplate }      from '../../templates/frontend/frontend-template/frontend-template'
import { templateVersions }      from '../../templates/template-versions/template-versions'
import type { FileChange }       from '../command'
import { defineCommand }         from '../command'
import { CommandError }          from '../command-error/command-error'

export const ADD_FRONTEND = defineCommand({
  name: 'add frontend',
  summary: 'Adds a React frontend to a context, served by the backend at /<context>',
  args: '<context>',
  options: {
    built: { type: 'string', value: 'folder', description: 'A frontend built elsewhere, served as it is: the folder of its index.html' },
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
    const frontends = await Bun.file(join(backend, 'src/frontends.ts')).text().catch(() => '')
    const mounted = (changes: FileChange[]) => {
      const line = changes.find(change => change.action === 'insert-lines' && change.path.endsWith('frontends.ts'))
      const again = line?.action === 'insert-lines' && line.lines.every(each => frontends.includes(each))
      if (!again && frontends.includes(`path: '/${context}'`)) {
        throw new CommandError(`src/frontends.ts serves a frontend at /${context} already: take it out of it first to serve another`)
      }
      return changes
    }
    if (options.built !== undefined) {
      const built = resolve(cwd, options.built)
      const fromSrc = relative(join(backend, 'src'), built).split(sep).join('/')
      const unbuilt = await Bun.file(join(built, 'index.html')).exists() ? [] : [`${options.built} has no index.html yet: the backend answers 503 at /${context} until it is built`]
      return {
        changes: mounted(builtFrontendTemplate({ backend: relative(cwd, backend), context: names, fromSrc })),
        warnings: unbuilt,
        nextSteps: [`build it into ${options.built}, then bun run dev, and open /${context}`],
      }
    }
    return {
      changes: mounted(frontendTemplate({ backend: relative(cwd, backend), context: names, versions: await templateVersions() })),
      nextSteps: ['bun install', `bun run dev, and open /${context}`],
    }
  },
})
