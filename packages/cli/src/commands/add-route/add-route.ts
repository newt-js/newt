import { join }            from 'node:path'
// --------------------------------------------------------
import { pieceNames }      from '../../names/piece-names/piece-names'
import { findModule }      from '../../project/find-module/find-module'
import { routesHead }      from '../../templates/module/files/routes-ts'
import { routeLine }       from '../../templates/pieces/route-ts'
import { routeTest }       from '../../templates/pieces/route-ts'
import type { FileChange } from '../command'
import { defineCommand }   from '../command'
import { CommandError }    from '../command-error/command-error'

const USAGE = 'newt add route takes the module and the use case it calls, as in newt add route sales/order mark-paid'

const METHODS = ['get', 'post', 'put', 'patch', 'delete']

export const ADD_ROUTE = defineCommand({
  name: 'add route',
  summary: 'Adds a route to a module that calls one of its use cases',
  args: '<context>/<module> <use-case>',
  options: {
    method: { type: 'string', value: 'method', description: `${METHODS.join(', ')}; post by default` },
    path: { type: 'string', value: 'path', description: 'Its path under /api; /<module>s/:id/<use-case> by default' },
    backend: { type: 'string', value: 'folder', description: 'The backend, in a monorepo with several' },
  },
  run: async ({ args, cwd, options }) => {
    const [given, name, ...rest] = args
    if (name === undefined || rest.length > 0) throw new CommandError(USAGE)
    const method = (options.method ?? 'post').toLowerCase()
    if (!METHODS.includes(method)) throw new CommandError(`'${options.method}' is not a method: ${METHODS.join(', ')}`)
    const { folder, module } = await findModule(given, cwd, options.backend, USAGE)
    const useCase = pieceNames(name, 'a use case')
    const path = options.path ?? `/${module.path}/:id/${useCase.folder}`
    if (!path.startsWith('/')) throw new CommandError(`'${path}' is not a path: it starts with /`)
    const file = (suffix: string) => join(folder, `${module.folder}${suffix}`)
    const code = await Bun.file(join(cwd, file('.module.ts'))).text().catch(() => '')
    const signature = new RegExp(`async ${useCase.camel}\\(([^)]*)\\): Promise<([^>]+)>`).exec(code)
    if (!signature) {
      throw new CommandError(`${module.type}_Module has no use case ${useCase.camel}: add it with newt add use-case ${given} ${name}`)
    }
    const shape = { method, path, takesInput: signature[1]!.trim() !== '', returnsNothing: signature[2] === 'void' }
    const testable = !shape.takesInput || path.includes(':id')
    const changes: FileChange[] = [
      {
        action: 'insert-lines',
        path: file('.routes.ts'),
        anchor: routesHead(module),
        position: 'after',
        lines: routeLine(module, useCase, shape).split('\n'),
        imports: [`import { ${module.type}Id } from './value-objects/${module.folder}-id'`],
      },
      ...testable ? [{ action: 'append-block' as const, path: file('.module.test.ts'), block: routeTest(module, useCase, shape), imports: [] }] : [],
    ]
    return { changes, nextSteps: [`bun test ${folder}`] }
  },
})
