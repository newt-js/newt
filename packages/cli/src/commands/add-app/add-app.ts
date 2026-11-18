import { join }             from 'node:path'
import { relative }         from 'node:path'
import { resolve }          from 'node:path'
import { sep }              from 'node:path'
// --------------------------------------------------------
import { codeTokens }       from '../../changes/code-tokens/code-tokens'
import { indexOfTokens }    from '../../changes/index-of-tokens/index-of-tokens'
import { contextNames }     from '../../names/context-names/context-names'
import { CONTEXTS_FOLDER }  from '../../project/backend-contexts/backend-contexts'
import { backendContexts }  from '../../project/backend-contexts/backend-contexts'
import { findBackend }      from '../../project/find-backend/find-backend'
import { appTemplate }      from '../../templates/app/app-template/app-template'
import { builtAppTemplate } from '../../templates/app/app-template/app-template'
import { templateVersions } from '../../templates/template-versions/template-versions'
import type { FileChange }  from '../command'
import { defineCommand }    from '../command'
import { CommandError }     from '../command-error/command-error'

export const ADD_APP = defineCommand({
  name: 'add app',
  summary: 'Adds a React app to a context, served by the backend at /<context>',
  args: '<context>',
  options: {
    built: { type: 'string', value: 'folder', description: 'An app built elsewhere, served as it is: the folder of its index.html, built for /<context>/ (vite build --base=/<context>/)' },
    backend: { type: 'string', value: 'folder', description: 'The backend, in a monorepo with several' },
  },
  run: async ({ args, cwd, options }) => {
    const [context, ...rest] = args
    if (context === undefined || rest.length > 0) {
      throw new CommandError('newt add app takes the context, as in newt add app sales')
    }
    const names = contextNames(context)
    const backend = await findBackend(cwd, options.backend)
    if (!(await backendContexts(backend)).some(each => each.name === context)) {
      throw new CommandError(`The backend has no context ${context}: add it with newt add context ${context}`)
    }
    const contextFile = join(CONTEXTS_FOLDER, context, `${context}.context.ts`)
    const code = codeTokens(await Bun.file(join(backend, contextFile)).text().catch(() => ''))
    const holds = (text: string) => indexOfTokens(code, codeTokens(text)) !== -1
    const mounted = (changes: FileChange[]) => {
      const line = changes.find(change => change.action === 'replace-line')
      const again = line?.action === 'replace-line' && holds(line.with)
      if (!again && (holds(', app }') || holds(', app :'))) {
        throw new CommandError(`${contextFile} serves an app at /${context} already: take it out of it first to serve another`)
      }
      return changes
    }
    if (options.built !== undefined) {
      const built = resolve(cwd, options.built)
      if (backend === built || backend.startsWith(built.endsWith(sep) ? built : `${built}${sep}`)) {
        throw new CommandError(`${options.built} holds the backend, and everything in it would be served, .env too: give the folder the app is built into, as in web/dist`)
      }
      const fromSrc = relative(join(backend, 'src'), built).split(sep).join('/')
      const fromContext = relative(join(backend, CONTEXTS_FOLDER, context), built).split(sep).join('/')
      const unbuilt = await Bun.file(join(built, 'index.html')).exists() ? [] : [`${options.built} has no index.html yet: the backend answers 503 at /${context} until it is built`]
      return {
        changes: mounted(builtAppTemplate({ backend: relative(cwd, backend), context: names, fromContext, fromSrc })),
        warnings: unbuilt,
        nextSteps: [`build it into ${options.built} for /${context}/, as in vite build --base=/${context}/, or its assets answer 404; then bun run dev, and open /${context}/`],
      }
    }
    return {
      changes: mounted(appTemplate({ backend: relative(cwd, backend), context: names, versions: await templateVersions() })),
      nextSteps: ['bun install', `bun run dev, and open /${context}`],
    }
  },
})
