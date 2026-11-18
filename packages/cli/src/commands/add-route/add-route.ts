import { join }            from 'node:path'
// --------------------------------------------------------
import { useCaseNames }    from '../../names/use-case-names/use-case-names'
import { findModule }      from '../../project/find-module/find-module'
import { routeFileWith }   from '../../project/route-file-with/route-file-with'
import { useCaseOf }       from '../../project/use-case-of/use-case-of'
import { routesStart }     from '../../templates/module/files/routes-ts'
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
    path: { type: 'string', value: 'path', description: "Its path under /<context>/api; /<module's plural>/:id/<use-case> by default" },
    backend: { type: 'string', value: 'folder', description: 'The backend, in a monorepo with several' },
  },
  run: async ({ args, cwd, options }) => {
    const [given, name, ...rest] = args
    if (name === undefined || rest.length > 0) throw new CommandError(USAGE)
    const method = (options.method ?? 'post').toLowerCase()
    if (!METHODS.includes(method)) throw new CommandError(`'${options.method}' is not a method: ${METHODS.join(', ')}`)
    const { backend, folder, module, context } = await findModule(given, cwd, options.backend, USAGE)
    const useCase = useCaseNames(name)
    const path = options.path ?? `/${module.path}/:id/${useCase.folder}`
    if (!PATH.test(path)) throw new CommandError(`'${path}' is not a path: it starts with / and has letters, digits and / : _ - alone`)
    if (path.startsWith('/api/')) throw new CommandError(`'${path}' starts with /api, which every route is under already: give --path ${path.slice('/api'.length)}`)
    if (path === `/${context.folder}` || path.startsWith(`/${context.folder}/`)) throw new CommandError(`'${path}' starts with /${context.folder}, which every route of the context is under already: give --path ${path.slice(context.folder.length + 1) || '/'}`)
    if (path === '/files' || path.startsWith('/files/')) throw new CommandError(`'${path}' is where the files of ${context.folder} are served: give the route another --path`)
    const segments = path.split('/').slice(1)
    if (segments.some(segment => segment === '' || segment === ':')) throw new CommandError(`'${path}' has an empty segment: no // and no / at the end`)
    const params = segments.filter(segment => segment.startsWith(':'))
    const twice = params.find((param, at) => params.indexOf(param) !== at)
    if (twice) throw new CommandError(`'${path}' has ${twice} twice: name each param once`)
    const file = (suffix: string) => join(folder, `${module.folder}${suffix}`)
    const code = await Bun.file(join(cwd, file('.module.ts'))).text().catch(() => '')
    const found = useCaseOf(code, `${module.type}_Module`, useCase.camel)
    if (!found) {
      throw new CommandError(`${module.type}_Module has no use case ${useCase.camel}: add it with newt add use-case ${given} ${name}`)
    }
    const parameters = found.inputs
    if (parameters > 1) {
      throw new CommandError(`${useCase.camel} takes ${parameters} inputs, and a route gives one: write its route by hand in ${module.folder}.routes.ts`)
    }
    const hasId = params.includes(':id')
    const shape = { method, path, takesInput: parameters === 1, returnsNothing: found.returnsNothing }
    if (shape.takesInput && !hasId && ['get', 'delete'].includes(method)) {
      throw new CommandError(`${useCase.camel} takes an input, and a ${method.toUpperCase()} has no body to give it: put :id in --path, or use post, put or patch`)
    }
    const registered = await routeFileWith(join(cwd, backend, 'src'), method, path)
    const again = registered !== null && registered.handler.includes(`.${useCase.camel}(`)
    if (registered && !again) throw new CommandError(`${registered.file} has ${method.toUpperCase()} ${path} already: give the route another --path or --method`)
    const testable = !shape.takesInput || hasId
    const changes: FileChange[] = [
      ...again ? [] : [{
        action: 'insert-lines',
        path: file('.routes.ts'),
        anchor: routesStart(module),
        position: 'after',
        lines: routeLine(module, useCase, shape).split('\n'),
        imports: [`import { ${module.type}Id } from './value-objects/${module.folder}-id'`],
      } satisfies FileChange],
      ...testable ? [{ action: 'append-block' as const, path: file('.module.test.ts'), block: routeTest(module, useCase, shape), imports: ["import { spyOn } from 'bun:test'"] }] : [],
    ]
    const untested = testable ? [] : [`${method.toUpperCase()} ${path} takes a body, so newt wrote no test for it: write one in ${module.folder}.module.test.ts`]
    const unused = params.filter(param => param !== ':id' || !shape.takesInput).map(param => `${param} of ${path} is not given to ${useCase.camel}: read it in ${module.folder}.routes.ts, request.params.${param.slice(1)}`)
    return { changes, warnings: [...untested, ...unused], nextSteps: [`bun test ${folder}`] }
  },
})
