import { join }            from 'node:path'
// --------------------------------------------------------
import { moduleNames }     from '../../names/module-names/module-names'
import { dependencyPath }  from '../../project/dependency-path/dependency-path'
import { findModule }      from '../../project/find-module/find-module'
import { moduleDepsGraph } from '../../project/module-deps-graph/module-deps-graph'
import { routesHead }      from '../../templates/module/files/routes-ts'
import { moduleLines }     from '../../templates/module/module-lines/module-lines'
import { depsHead }        from '../../templates/pieces/deps-ts'
import { depsTs }          from '../../templates/pieces/deps-ts'
import type { FileChange } from '../command'
import { defineCommand }   from '../command'
import { CommandError }    from '../command-error/command-error'

const USAGE = 'newt add deps takes the module and the module of its feature it uses, as in newt add deps sales/orders/order invoice'

export const ADD_DEPS = defineCommand({
  name: 'add deps',
  summary: 'Lets a module use another module of its feature, given to it by <feature>.feature.ts',
  args: '<context>/<feature>/<module> <module-it-uses>',
  options: {
    backend: { type: 'string', value: 'folder', description: 'The backend, in a monorepo with several' },
  },
  run: async ({ args, cwd, options }) => {
    const [given, other, ...rest] = args
    if (other === undefined || rest.length > 0) throw new CommandError(USAGE)
    if (other.includes('/')) {
      throw new CommandError("A module uses another context's modules once its context is opened with that context: newt does not write that yet")
    }
    const { folder, featureFolder, module, context, feature, modules: siblings } = await findModule(given, cwd, options.backend, USAGE)
    const used = moduleNames(feature, other)
    if (used.folder === module.folder) throw new CommandError(`${module.folder} cannot use itself`)
    if (!siblings.includes(used.folder)) {
      throw new CommandError(`The feature ${context.folder}/${feature.folder} has no module ${used.folder}: add it with newt add module ${context.folder}/${feature.folder}/${used.folder}`)
    }
    const graph = await moduleDepsGraph(join(cwd, featureFolder), feature, siblings)
    const cycle = dependencyPath(graph, used.module, module.module)
    if (cycle) {
      throw new CommandError(`${[module.module, ...cycle].join(' → ')} would be a cycle: modules never use each other, even through others`)
    }
    const file = (suffix: string) => join(folder, `${module.folder}${suffix}`)
    const modules = join(featureFolder, `${feature.folder}.feature.ts`)
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
      ...(['initialize', 'created', 'constructor', 'super', 'routes'] as const).map((line): FileChange => ({
        action: 'replace-line',
        path: file('.module.ts'),
        line: before[line],
        with: after[line],
        imports: [`import type { ${module.type}_Deps } from './${module.folder}.deps'`],
      })),
      {
        action: 'replace-line',
        path: file('.routes.ts'),
        line: routesHead(module, false),
        with: routesHead(module, true),
        imports: [`import type { ${module.type}_Deps } from './${module.folder}.deps'`],
      },
      { action: 'add-object-property', path: modules, call: initialize, argument: 2, key: used.module, value: used.module, imports: [], createArgument: true },
      { action: 'order-modules', path: modules },
    ]
    return { changes, nextSteps: [`call it in a use case of ${module.folder}: this.deps.${used.module}`, `bun test ${folder}`] }
  },
})
