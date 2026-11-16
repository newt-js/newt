import { join }            from 'node:path'
// --------------------------------------------------------
import { moduleNames }     from '../../names/module-names/module-names'
import { backendContexts } from '../../project/backend-contexts/backend-contexts'
import { dependencyPath }  from '../../project/dependency-path/dependency-path'
import { findBackend }     from '../../project/find-backend/find-backend'
import { findModule }      from '../../project/find-module/find-module'
import { moduleDepsGraph } from '../../project/module-deps-graph/module-deps-graph'
import { moduleLines }     from '../../templates/module/module-lines/module-lines'
import { depsHead }        from '../../templates/pieces/deps-ts'
import { depsTs }          from '../../templates/pieces/deps-ts'
import type { FileChange } from '../command'
import { defineCommand }   from '../command'
import { CommandError }    from '../command-error/command-error'

const USAGE = 'newt add deps takes the module and the module of its context it uses, as in newt add deps sales/order invoice'

export const ADD_DEPS = defineCommand({
  name: 'add deps',
  summary: 'Lets a module use another module of its context, given to it by <ctx>-modules.ts',
  args: '<context>/<module> <module-it-uses>',
  options: {
    backend: { type: 'string', value: 'folder', description: 'The backend, in a monorepo with several' },
  },
  run: async ({ args, cwd, options }) => {
    const [given, other, ...rest] = args
    if (other === undefined || rest.length > 0) throw new CommandError(USAGE)
    if (other.includes('/')) {
      throw new CommandError("A module uses another context's modules once its context is opened with that context: newt does not write that yet")
    }
    const { folder, module, context } = await findModule(given, cwd, options.backend, USAGE)
    const used = moduleNames(other)
    if (used.folder === module.folder) throw new CommandError(`${module.folder} cannot use itself`)
    const found = (await backendContexts(await findBackend(cwd, options.backend))).find(each => each.name === context.folder)
    if (!found?.modules.includes(used.folder)) {
      throw new CommandError(`The context ${context.folder} has no module ${used.folder}: add it with newt add module ${context.folder}/${used.folder}`)
    }
    const graph = await moduleDepsGraph(join(cwd, folder, '../..'), found.modules)
    const cycle = dependencyPath(graph, used.module, module.module)
    if (cycle) {
      throw new CommandError(`${[module.module, ...cycle].join(' → ')} would be a cycle: modules never use each other, even through others`)
    }
    const file = (suffix: string) => join(folder, `${module.folder}${suffix}`)
    const modules = join(folder, '../..', `${context.folder}-modules.ts`)
    const before = moduleLines(module, false)
    const after = moduleLines(module, true)
    const initialize = `${module.type}_Module.initialize`
    const changes: FileChange[] = [
      { action: 'create', path: file('.deps.ts'), content: depsTs(module) },
      {
        action: 'insert-lines',
        path: file('.deps.ts'),
        anchor: depsHead(module),
        position: 'after',
        lines: [`  ${used.module}: ${used.type}_Module`],
        imports: [`import type { ${used.type}_Module } from '../${used.folder}/${used.folder}.module'`],
      },
      ...(['initialize', 'created', 'constructor', 'super'] as const).map((line): FileChange => ({
        action: 'replace-line',
        path: file('.module.ts'),
        line: before[line],
        with: after[line],
        imports: [`import type { ${module.type}_Deps } from './${module.folder}.deps'`],
      })),
      { action: 'add-object-property', path: modules, call: initialize, argument: 2, key: used.module, value: used.module, imports: [], createArgument: true },
      { action: 'order-modules', path: modules },
      {
        action: 'add-object-property',
        path: file('.module.test.ts'),
        call: initialize,
        argument: 2,
        key: used.module,
        value: `${used.type}_Module.initialize(context.base, router)`,
        imports: [`import { ${used.type}_Module } from '../${used.folder}/${used.folder}.module'`],
        createArgument: true,
      },
    ]
    return { changes, nextSteps: [`call it in a use case of ${module.folder}: this.deps.${used.module}`, `bun test ${folder}`] }
  },
})
