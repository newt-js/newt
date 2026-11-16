import { join }            from 'node:path'
// --------------------------------------------------------
import { pieceNames }      from '../../names/piece-names/piece-names'
import { findModule }      from '../../project/find-module/find-module'
import { routeFileWith }   from '../../project/route-file-with/route-file-with'
import { routesHead }      from '../../templates/module/files/routes-ts'
import { routeLine }       from '../../templates/pieces/route-ts'
import { routeTest }       from '../../templates/pieces/route-ts'
import type { FileChange } from '../command'
import { defineCommand }   from '../command'
import { CommandError }    from '../command-error/command-error'

const USAGE = 'newt add route takes the module and the use case it calls, as in newt add route sales/order mark-paid'

const METHODS = ['get', 'post', 'put', 'patch', 'delete']

const PATH = /^\/[A-Za-z0-9/:_-]*$/

export const ADD_ROUTE = defineCommand({
  name: 'add route',
  summary: 'Adds a route to a module that calls one of its use cases',
  args: '<context>/<module> <use-case>',
  options: {
    method: { type: 'string', value: 'method', description: `${METHODS.join(', ')}; post by default` },
    path: { type: 'string', value: 'path', description: 'Its path under /api, starting with its context; /<context>/<module>s/:id/<use-case> by default' },
    backend: { type: 'string', value: 'folder', description: 'The backend, in a monorepo with several' },
  },
  run: async ({ args, cwd, options }) => {
    const [given, name, ...rest] = args
    if (name === undefined || rest.length > 0) throw new CommandError(USAGE)
    const method = (options.method ?? 'post').toLowerCase()
    if (!METHODS.includes(method)) throw new CommandError(`'${options.method}' is not a method: ${METHODS.join(', ')}`)
    const { backend, folder, module, context } = await findModule(given, cwd, options.backend, USAGE)
    const useCase = pieceNames(name, 'a use case')
    const path = options.path ?? `/${context.folder}/${module.path}/:id/${useCase.folder}`
    if (!PATH.test(path)) throw new CommandError(`'${path}' is not a path: it starts with / and has letters, digits and / : _ - alone`)
    if (!path.startsWith(`/${context.folder}/`)) throw new CommandError(`'${path}' is not under /${context.folder}/: a module's routes start with its context`)
    const file = (suffix: string) => join(folder, `${module.folder}${suffix}`)
    const code = await Bun.file(join(cwd, file('.module.ts'))).text().catch(() => '')
    const signature = new RegExp(`async ${useCase.camel}\\(([^)]*)\\): Promise<([^>]+)>`).exec(code)
    if (!signature) {
      throw new CommandError(`${module.type}_Module has no use case ${useCase.camel}: add it with newt add use-case ${given} ${name}`)
    }
    const parameters = signature[1]!.split(',').filter(each => each.trim() !== '').length
    if (parameters > 1) {
      throw new CommandError(`${useCase.camel} takes ${parameters} inputs, and a route gives one: write its route by hand in ${module.folder}.routes.ts`)
    }
    const shape = { method, path, takesInput: parameters === 1, returnsNothing: signature[2] === 'void' }
    if (shape.takesInput && !path.includes(':id') && ['get', 'delete'].includes(method)) {
      throw new CommandError(`${useCase.camel} takes an input, and a ${method.toUpperCase()} has no body to give it: put :id in --path, or use post, put or patch`)
    }
    const registered = await routeFileWith(join(cwd, backend, 'src'), method, path)
    const again = registered !== null && registered.handler.includes(`.${useCase.camel}(`)
    if (registered && !again) throw new CommandError(`${registered.file} has ${method.toUpperCase()} ${path} already: give the route another --path or --method`)
    const testable = !shape.takesInput || path.includes(':id')
    const changes: FileChange[] = [
      ...again ? [] : [{
        action: 'insert-lines',
        path: file('.routes.ts'),
        anchor: routesHead(module),
        position: 'after',
        lines: routeLine(module, useCase, shape).split('\n'),
        imports: [`import { ${module.type}Id } from './value-objects/${module.folder}-id'`],
      } satisfies FileChange],
      ...testable ? [{ action: 'append-block' as const, path: file('.module.test.ts'), block: routeTest(module, useCase, shape), imports: [] }] : [],
    ]
    const untested = testable ? [] : [`${method.toUpperCase()} ${path} takes a body, so newt wrote no test for it: write one in ${module.folder}.module.test.ts`]
    return { changes, warnings: untested, nextSteps: [`bun test ${folder}`] }
  },
})
