import { join }                  from 'node:path'
// --------------------------------------------------------
import { contextNames }          from '../../names/context-names/context-names'
import { moduleNames }           from '../../names/module-names/module-names'
import { backendContexts }       from '../../project/backend-contexts/backend-contexts'
import { contextDepsGraph }      from '../../project/context-deps-graph/context-deps-graph'
import { openedBefore }          from '../../project/context-deps-graph/context-deps-graph'
import { dependencyPath }        from '../../project/dependency-path/dependency-path'
import type { FoundModule }      from '../../project/find-module/find-module'
import { findModule }            from '../../project/find-module/find-module'
import { moduleDepsGraph }       from '../../project/module-deps-graph/module-deps-graph'
import { contextClassHead }      from '../../templates/context/files/context-ts'
import { contextInitializeCall } from '../../templates/context/files/context-ts'
import { contextInitializeHead } from '../../templates/context/files/context-ts'
import { contextOpenHead }       from '../../templates/context/files/context-ts'
import { contextUsesHead }       from '../../templates/context/files/context-ts'
import { routesHead }            from '../../templates/module/files/routes-ts'
import { moduleLines }           from '../../templates/module/module-lines/module-lines'
import { depsTs }                from '../../templates/pieces/deps-ts'
import type { FileChange }       from '../command'
import type { UsedContext }      from '../command'
import { defineCommand }         from '../command'
import { CommandError }          from '../command-error/command-error'

const USAGE = 'newt add deps takes the module and what it uses: another module of its context, by its name, or another context whole, by its name, as in newt add deps sales/order invoice, or sales/order auth'

/** What the module is given, `key: Type`, and the file that type comes from. */
type Used = { key: string, type: string, from: string }

/** The changes that give a module what it uses, through its <m>.deps.ts, and that let its code and its routes reach it. */
function moduleChanges({ folder, module }: FoundModule, used: Used): FileChange[] {
  const file = (suffix: string) => join(folder, `${module.folder}${suffix}`)
  const before = moduleLines(module, false)
  const after = moduleLines(module, true)
  const deps = [`import type { ${module.type}_Deps } from './${module.folder}.deps'`]
  return [
    { action: 'create', path: file('.deps.ts'), content: depsTs(module) },
    { action: 'add-type-property', path: file('.deps.ts'), type: `${module.type}_Deps`, key: used.key, value: used.type, imports: [`import type { ${used.type} } from '${used.from}'`] },
    ...(['initialize', 'created', 'constructor', 'super', 'routes'] as const).map((line): FileChange => ({ action: 'replace-line', path: file('.module.ts'), line: before[line], with: after[line], imports: deps })),
    { action: 'replace-line', path: file('.routes.ts'), line: routesHead(module, false), with: routesHead(module, true), imports: deps },
  ]
}

/** Another module of its context: <ctx>.context.ts gives it, initialized first. */
async function moduleOfItsContext(found: FoundModule, other: string, cwd: string) {
  const { module, context, modules, contextFolder } = found
  const used = moduleNames(other)
  const cycle = dependencyPath(await moduleDepsGraph(join(cwd, contextFolder, 'modules'), modules), used.module, module.module)
  if (cycle) {
    throw new CommandError(`${[module.module, ...cycle].join(' → ')} would be a cycle: modules never use each other, even through others`)
  }
  const contextFile = join(contextFolder, `${context.folder}.context.ts`)
  const changes: FileChange[] = [
    ...moduleChanges(found, { key: used.module, type: `${used.type}_Module`, from: `../${used.folder}` }),
    { action: 'add-object-property', path: contextFile, call: `${module.type}_Module.initialize`, argument: 2, key: used.module, value: used.module, imports: [], createArgument: true },
    { action: 'order-modules', path: contextFile },
  ]
  return { changes, nextSteps: [`call it in a use case of ${module.folder}: this.deps.${used.module}`, `bun test ${found.folder}`] }
}

/** That a key of a module's deps names one thing: a module of its context or another context, never both. */
async function refuseClash(found: FoundModule, key: string, cwd: string): Promise<void> {
  const text = await Bun.file(join(cwd, found.folder, `${found.module.folder}.deps.ts`)).text().catch(() => '')
  if (new RegExp(`^\\s*${key}: \\w+_Context\\b`, 'm').test(text)) {
    throw new CommandError(`${found.module.folder} uses the context ${key} already, by that name: a module of its context cannot take it too`)
  }
}

/** The changes to a module's test that open the contexts its context is opened with, in memory, once that context is opened with more. */
async function testChanges(backend: string, graph: Map<string, string[]>, context: string, cwd: string): Promise<FileChange[]> {
  const contexts = await backendContexts(join(cwd, backend))
  const opened = openedBefore(graph, context)
  const used: UsedContext[] = opened.map(each => ({ ...contextNames(each), uses: (graph.get(each) ?? []).map(name => contextNames(name).camel) }))
  const modules = contexts.find(each => each.name === context)?.modules ?? []
  const changes: FileChange[] = []
  for (const module of modules) {
    const path = join(backend, 'src/contexts', context, 'modules', module, `${module}.module.test.ts`)
    if (!await Bun.file(join(cwd, path)).exists()) continue
    changes.push({
      action: 'open-used-contexts',
      path,
      context: contextNames(context).type,
      opened: used,
      uses: (graph.get(context) ?? []).map(name => contextNames(name).camel),
      imports: used.map(each => `import { ${each.type}_Context } from '../../../${each.folder}/${each.folder}.context'`),
    })
  }
  return changes
}

/**
 * Another context whole: the module is given it under its name, `auth: Auth_Context`, and
 * reaches only the modules it publishes. Its context is opened with that other context:
 * contexts.ts opens that one first and hands it over. The tests of every context opened
 * with this one open it too.
 */
async function anotherContext(found: FoundModule, given: string, cwd: string) {
  const { module, context, contextFolder, backend } = found
  const other = contextNames(given)
  const names = (await backendContexts(join(cwd, backend))).map(each => each.name)
  const graph = await contextDepsGraph(join(cwd, backend), names)
  const cycle = dependencyPath(graph, other.folder, context.folder)
  if (cycle) {
    throw new CommandError(`${[context.folder, ...cycle].join(' → ')} would be a cycle: contexts never use each other, even through others`)
  }
  graph.set(context.folder, [...new Set([...graph.get(context.folder) ?? [], other.folder])])
  const contextFile = join(contextFolder, `${context.folder}.context.ts`)
  const contextsFile = join(backend, 'src/contexts', 'contexts.ts')
  const contextText = await Bun.file(join(cwd, contextFile)).text().catch(() => '')
  const otherClass = `${other.type}_Context`
  const changes: FileChange[] = [
    ...moduleChanges(found, { key: other.camel, type: otherClass, from: `../../../${other.folder}/${other.folder}.context` }),
    // Its context is opened with the other context, and hands it to the module.
    ...contextText.includes(contextUsesHead(context)) ? [] : [{ action: 'insert-lines' as const, path: contextFile, anchor: contextClassHead(context), position: 'before' as const, lines: [contextUsesHead(context), '}', ''], imports: [] }],
    { action: 'add-type-property', path: contextFile, type: `${context.type}_Uses`, key: other.camel, value: otherClass, imports: [`import type { ${otherClass} } from '../${other.folder}/${other.folder}.context'`] },
    { action: 'replace-line', path: contextFile, line: contextInitializeHead(context, false), with: contextInitializeHead(context, true), imports: [] },
    { action: 'replace-line', path: contextFile, line: contextOpenHead(context, false), with: contextOpenHead(context, true), imports: [] },
    { action: 'replace-line', path: contextFile, line: contextInitializeCall(context, false), with: contextInitializeCall(context, true), imports: [] },
    { action: 'add-object-property', path: contextFile, call: `${module.type}_Module.initialize`, argument: 2, key: other.camel, value: `uses.${other.camel}`, imports: [], createArgument: true },
    // contexts.ts opens the other first, and hands it over.
    { action: 'add-object-property', path: contextsFile, call: `${context.type}_Context.open`, argument: 2, key: other.camel, value: `${other.camel}.context`, imports: [], createArgument: true },
    { action: 'order-modules', path: contextsFile },
  ]
  // The tests of this context, and of every context opened with it, open what it is opened with now.
  for (const each of names.filter(name => name === context.folder || openedBefore(graph, name).includes(context.folder))) {
    changes.push(...await testChanges(backend, graph, each, cwd))
  }
  const nextSteps = [
    `call a module ${other.folder} publishes in a use case of ${module.folder}: this.deps.${other.camel}.<module>.<use case>`,
    `${other.folder} publishes a module with newt publish ${other.folder}/<module>`,
    `bun test ${found.folder}`,
  ]
  return { changes, nextSteps }
}

export const ADD_DEPS = defineCommand({
  name: 'add deps',
  summary: 'Lets a module use another module of its context, or another context whole, which it reaches through the modules that context publishes',
  args: '<context>/<module> <module | context>',
  options: {
    backend: { type: 'string', value: 'folder', description: 'The backend, in a monorepo with several' },
  },
  run: async ({ args, cwd, options }) => {
    const [given, other, ...rest] = args
    if (other === undefined || rest.length > 0) throw new CommandError(USAGE)
    const found = await findModule(given, cwd, options.backend, USAGE)
    const { module, context, modules } = found
    if (other.includes('/')) {
      throw new CommandError(`A module uses another context whole, by its name alone, and reaches the modules it publishes through it: newt add deps ${given} ${other.split('/')[0]}`)
    }
    if (other === module.folder) throw new CommandError(`${module.folder} cannot use itself`)
    if (other === context.folder) {
      throw new CommandError(`${module.folder} is of ${context.folder}: it uses the other modules of its context by their name, as in newt add deps ${given} <module>`)
    }
    if (modules.includes(other)) {
      await refuseClash(found, moduleNames(other).module, cwd)
      return moduleOfItsContext(found, other, cwd)
    }
    const contexts = (await backendContexts(join(cwd, found.backend))).map(each => each.name)
    if (!contexts.includes(other)) {
      throw new CommandError(`Neither ${context.folder} has a module ${other} nor the backend a context ${other}: add the module with newt add module ${context.folder}/${other}, or the context with newt add context ${other}`)
    }
    return anotherContext(found, other, cwd)
  },
})
