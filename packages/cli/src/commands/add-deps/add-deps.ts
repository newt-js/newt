import { join }                  from 'node:path'
// --------------------------------------------------------
import { contextNames }          from '../../names/context-names/context-names'
import type { FeatureNames }     from '../../names/feature-names/feature-names'
import { featureNames }          from '../../names/feature-names/feature-names'
import { moduleNames }           from '../../names/module-names/module-names'
import { CONTEXTS_FOLDER }       from '../../project/backend-contexts/backend-contexts'
import { backendContexts }       from '../../project/backend-contexts/backend-contexts'
import { contextDepsGraph }      from '../../project/context-deps-graph/context-deps-graph'
import { openedBefore }          from '../../project/context-deps-graph/context-deps-graph'
import { dependencyPath }        from '../../project/dependency-path/dependency-path'
import { featureDepsGraph }      from '../../project/feature-deps-graph/feature-deps-graph'
import type { FoundModule }      from '../../project/find-module/find-module'
import { findFeature }           from '../../project/find-module/find-module'
import { findModule }            from '../../project/find-module/find-module'
import { moduleDepsGraph }       from '../../project/module-deps-graph/module-deps-graph'
import { contextClassHead }      from '../../templates/context/files/context-ts'
import { contextInitializeCall } from '../../templates/context/files/context-ts'
import { contextInitializeHead } from '../../templates/context/files/context-ts'
import { contextOpenHead }       from '../../templates/context/files/context-ts'
import { contextUsesHead }       from '../../templates/context/files/context-ts'
import { classHead }             from '../../templates/feature/files/feature-ts'
import { featureClass }          from '../../templates/feature/files/feature-ts'
import { initializeHead }        from '../../templates/feature/files/feature-ts'
import { usesHead }              from '../../templates/feature/files/feature-ts'
import { usesTs }                from '../../templates/feature/files/feature-ts'
import { routesHead }            from '../../templates/module/files/routes-ts'
import { moduleLines }           from '../../templates/module/module-lines/module-lines'
import { depsHead }              from '../../templates/pieces/deps-ts'
import { depsTs }                from '../../templates/pieces/deps-ts'
import type { FileChange }       from '../command'
import type { UsedContext }      from '../command'
import { defineCommand }         from '../command'
import { CommandError }          from '../command-error/command-error'

const USAGE = 'newt add deps takes the module and what it uses: a module of its feature, another feature of its context, or a feature of another context, as in newt add deps sales/orders/order invoice, or sales/orders/order auth/users'

/** What the module is given, `key: Type`, the file that type comes from, and, for another context's, that context: `auth: { key: Type }`. */
type Used = { key: string, type: string, from: string, in?: string }

/** The changes that give a module what it uses, through its <m>.deps.ts, and that let its code and its routes reach it. */
function moduleChanges({ folder, module }: FoundModule, used: Used): FileChange[] {
  const file = (suffix: string) => join(folder, `${module.folder}${suffix}`)
  const before = moduleLines(module, false)
  const after = moduleLines(module, true)
  const deps = [`import type { ${module.type}_Deps } from './${module.folder}.deps'`]
  return [
    { action: 'create', path: file('.deps.ts'), content: depsTs(module) },
    { action: 'add-type-property', path: file('.deps.ts'), type: `${module.type}_Deps`, key: used.key, value: used.type, imports: [`import type { ${used.type} } from '${used.from}'`], ...used.in === undefined ? {} : { in: used.in } },
    ...(['initialize', 'created', 'constructor', 'super', 'routes'] as const).map((line): FileChange => ({ action: 'replace-line', path: file('.module.ts'), line: before[line], with: after[line], imports: deps })),
    { action: 'replace-line', path: file('.routes.ts'), line: routesHead(module, false), with: routesHead(module, true), imports: deps },
  ]
}

/** A module of its own feature: <feature>.feature.ts gives it, initialized first. */
async function moduleOfItsFeature(found: FoundModule, other: string, cwd: string) {
  const { module, context, feature, modules: siblings, featureFolder } = found
  const used = moduleNames(feature, other)
  const elsewhere = found.features.find(each => each.modules.includes(used.folder))
  if (!siblings.includes(used.folder) && elsewhere) {
    throw new CommandError(`${used.folder} is a module of ${elsewhere.name}: a module uses another feature whole, as in newt add deps ${context.folder}/${feature.folder}/${module.folder} ${elsewhere.name}`)
  }
  if (!siblings.includes(used.folder)) {
    throw new CommandError(`Neither ${context.folder}/${feature.folder} has a module ${used.folder} nor ${context.folder} a feature ${used.folder}: add the module with newt add module ${context.folder}/${feature.folder}/${used.folder}, or the feature with newt add feature ${context.folder}/${used.folder}`)
  }
  const cycle = dependencyPath(await moduleDepsGraph(join(cwd, featureFolder), feature, siblings), used.module, module.module)
  if (cycle) {
    throw new CommandError(`${[module.module, ...cycle].join(' → ')} would be a cycle: modules never use each other, even through others`)
  }
  const entry = join(featureFolder, `${feature.folder}.feature.ts`)
  const changes: FileChange[] = [
    ...moduleChanges(found, { key: used.module, type: `${used.type}_Module`, from: `../${used.folder}/${used.folder}.module` }),
    { action: 'add-object-property', path: entry, call: `${module.type}_Module.initialize`, argument: 2, key: used.module, value: used.module, imports: [], createArgument: true },
    { action: 'order-modules', path: entry },
  ]
  return { changes, nextSteps: [`call it in a use case of ${module.folder}: this.deps.${used.module}`, `bun test ${found.folder}`] }
}

/** Another feature of its context, through its index.ts: <ctx>.context.ts initializes it first and hands it to the module's feature. */
async function anotherFeature(found: FoundModule, used: FeatureNames, cwd: string) {
  const { module, context, feature, features, featureFolder } = found
  const contextFolder = join(featureFolder, '..', '..')
  const cycle = dependencyPath(await featureDepsGraph(join(cwd, contextFolder), features.map(each => each.name)), used.camel, feature.camel)
  if (cycle) {
    throw new CommandError(`${[feature.camel, ...cycle].join(' → ')} would be a cycle: features never use each other, even through others`)
  }
  const entry = join(featureFolder, `${feature.folder}.feature.ts`)
  const contextFile = join(contextFolder, `${context.folder}.context.ts`)
  const text = await Bun.file(join(cwd, entry)).text().catch(() => '')
  const usedClass = featureClass(used)
  const changes: FileChange[] = [
    ...moduleChanges(found, { key: used.camel, type: usedClass, from: `../../${used.folder}` }),
    { action: 'replace-line', path: entry, line: initializeHead(feature, false), with: initializeHead(feature, true), imports: [] },
    ...text.includes(usesHead(feature)) ? [] : [{ action: 'insert-lines' as const, path: entry, anchor: classHead(feature), position: 'before' as const, lines: usesTs(feature), imports: [] }],
    { action: 'insert-lines', path: entry, anchor: usesHead(feature), position: 'after', lines: [`  ${used.camel}: ${usedClass}`], imports: [`import type { ${usedClass} } from '../${used.folder}'`] },
    { action: 'add-object-property', path: entry, call: `${module.type}_Module.initialize`, argument: 2, key: used.camel, value: `uses.${used.camel}`, imports: [], createArgument: true },
    { action: 'add-object-property', path: contextFile, call: `${featureClass(feature)}.initialize`, argument: 2, key: used.camel, value: used.camel, imports: [], createArgument: true },
    { action: 'order-modules', path: contextFile },
  ]
  const nextSteps = [
    `call it in a use case of ${module.folder}: this.deps.${used.camel}.<module>.<use case>`,
    `bun test ${found.folder}`,
  ]
  return { changes, nextSteps }
}

/** That a key of a module's deps names one thing: a module of its feature, a feature of its context or another context, never two of them. */
async function refuseClash(found: FoundModule, key: string, cwd: string): Promise<void> {
  const text = await Bun.file(join(cwd, found.folder, `${found.module.folder}.deps.ts`)).text().catch(() => '')
  if (new RegExp(`^\\s*${key}: \\{`, 'm').test(text)) {
    throw new CommandError(`${found.module.folder} uses the context ${key} already, by that name: a module of its feature or a feature of its context cannot take it too`)
  }
}

/** The changes to a module's test that open the contexts its context is opened with, in memory, once that context is opened with more. */
async function testChanges(backend: string, graph: Map<string, string[]>, context: string, cwd: string): Promise<FileChange[]> {
  const contexts = await backendContexts(join(cwd, backend))
  const opened = openedBefore(graph, context)
  const used: UsedContext[] = opened.map(each => ({ ...contextNames(each), uses: (graph.get(each) ?? []).map(name => contextNames(name).camel) }))
  const own = contexts.find(each => each.name === context)?.features ?? []
  const changes: FileChange[] = []
  for (const feature of own) {
    for (const module of feature.modules) {
      const path = join(backend, CONTEXTS_FOLDER, context, 'features', feature.name, module, `${module}.module.test.ts`)
      if (!await Bun.file(join(cwd, path)).exists()) continue
      changes.push({
        action: 'open-used-contexts',
        path,
        context: contextNames(context).type,
        opened: used,
        uses: (graph.get(context) ?? []).map(name => contextNames(name).camel),
        imports: used.map(each => `import { ${each.type}_Context } from '../../../../${each.folder}/${each.folder}.context'`),
      })
    }
  }
  return changes
}

/**
 * A feature of another context, through its index.ts: the module's feature is given it under that
 * context's name, `auth: { users }`, by its context, which is opened with that other context: contexts.ts
 * opens that one first and hands it over. The tests of every context opened with this one open it too.
 */
async function anotherContext(found: FoundModule, given: string, cwd: string, backendGiven: string | undefined) {
  const { module, context, feature, features, featureFolder, backend } = found
  const other = contextNames(given.split('/')[0]!)
  const used = (await findFeature(given, cwd, backendGiven, USAGE)).feature
  if (features.some(each => each.name === other.folder) || found.modules.includes(other.folder)) {
    throw new CommandError(`${other.folder} names a feature of ${context.folder} or a module of ${feature.folder} too: ${module.folder} would be given two things by that name`)
  }
  const names = (await backendContexts(join(cwd, backend))).map(each => each.name)
  const graph = await contextDepsGraph(join(cwd, backend), names)
  const cycle = dependencyPath(graph, other.folder, context.folder)
  if (cycle) {
    throw new CommandError(`${[context.folder, ...cycle].join(' → ')} would be a cycle: contexts never use each other, even through others`)
  }
  graph.set(context.folder, [...new Set([...graph.get(context.folder) ?? [], other.folder])])
  const entry = join(featureFolder, `${feature.folder}.feature.ts`)
  const contextFolder = join(featureFolder, '..', '..')
  const contextFile = join(contextFolder, `${context.folder}.context.ts`)
  const contextsFile = join(backend, CONTEXTS_FOLDER, 'contexts.ts')
  const featureText = await Bun.file(join(cwd, entry)).text().catch(() => '')
  const contextText = await Bun.file(join(cwd, contextFile)).text().catch(() => '')
  const usedClass = featureClass(used)
  const otherClass = `${other.type}_Context`
  const changes: FileChange[] = [
    ...moduleChanges(found, { key: used.camel, type: usedClass, from: `../../../../${other.folder}/features/${used.folder}`, in: other.camel }),
    // Its feature takes it, and hands it to the module.
    { action: 'replace-line', path: entry, line: initializeHead(feature, false), with: initializeHead(feature, true), imports: [] },
    ...featureText.includes(usesHead(feature)) ? [] : [{ action: 'insert-lines' as const, path: entry, anchor: classHead(feature), position: 'before' as const, lines: usesTs(feature), imports: [] }],
    { action: 'add-type-property', path: entry, type: `${feature.type}_Uses`, in: other.camel, key: used.camel, value: usedClass, imports: [`import type { ${usedClass} } from '../../../${other.folder}/features/${used.folder}'`] },
    { action: 'add-object-property', path: entry, call: `${module.type}_Module.initialize`, argument: 2, in: other.camel, key: used.camel, value: `uses.${other.camel}.${used.camel}`, imports: [], createArgument: true },
    // Its context is opened with the other context, and hands the feature to it.
    ...contextText.includes(contextUsesHead(context)) ? [] : [{ action: 'insert-lines' as const, path: contextFile, anchor: contextClassHead(context), position: 'before' as const, lines: [contextUsesHead(context), '}', ''], imports: [] }],
    { action: 'add-type-property', path: contextFile, type: `${context.type}_Uses`, key: other.camel, value: otherClass, imports: [`import type { ${otherClass} } from '../${other.folder}/${other.folder}.context'`] },
    { action: 'replace-line', path: contextFile, line: contextInitializeHead(context, false), with: contextInitializeHead(context, true), imports: [] },
    { action: 'replace-line', path: contextFile, line: contextOpenHead(context, false), with: contextOpenHead(context, true), imports: [] },
    { action: 'replace-line', path: contextFile, line: contextInitializeCall(context, false), with: contextInitializeCall(context, true), imports: [] },
    { action: 'add-object-property', path: contextFile, call: `${featureClass(feature)}.initialize`, argument: 2, in: other.camel, key: used.camel, value: `uses.${other.camel}.${used.camel}`, imports: [], createArgument: true },
    // contexts.ts opens the other first, and hands it over.
    { action: 'add-object-property', path: contextsFile, call: `${context.type}_Context.open`, argument: 2, key: other.camel, value: `${other.camel}.context`, imports: [], createArgument: true },
    { action: 'order-modules', path: contextsFile },
  ]
  // The tests of this context, and of every context opened with it, open what it is opened with now.
  for (const each of names.filter(name => name === context.folder || openedBefore(graph, name).includes(context.folder))) {
    changes.push(...await testChanges(backend, graph, each, cwd))
  }
  const nextSteps = [
    `call it in a use case of ${module.folder}: this.deps.${other.camel}.${used.camel}.<module>.<use case>`,
    `bun test ${found.folder}`,
  ]
  return { changes, nextSteps }
}

export const ADD_DEPS = defineCommand({
  name: 'add deps',
  summary: 'Lets a module use another module of its feature, another feature of its context, or a feature of another context',
  args: '<context>/<feature>/<module> <module | feature | context/feature>',
  options: {
    backend: { type: 'string', value: 'folder', description: 'The backend, in a monorepo with several' },
  },
  run: async ({ args, cwd, options }) => {
    const [given, other, ...rest] = args
    if (other === undefined || rest.length > 0) throw new CommandError(USAGE)
    const found = await findModule(given, cwd, options.backend, USAGE)
    const { module, feature, features } = found
    if (other.includes('/')) {
      const [first, second, ...more] = other.split('/')
      if (features.some(each => each.name === first)) {
        throw new CommandError(`A module uses another feature whole, by the feature's name alone: newt add deps ${given} ${first}`)
      }
      if (first === found.context.folder) {
        throw new CommandError(`${second} is a feature of ${first}, the context of ${module.folder}: it uses it by its name alone, as in newt add deps ${given} ${second}`)
      }
      if (second === undefined || more.length > 0) {
        throw new CommandError(`A module uses another context's feature whole, as <context>/<feature>: newt add deps ${given} ${first}/<feature>`)
      }
      return anotherContext(found, other, cwd, options.backend)
    }
    await refuseClash(found, other.replace(/-(\w)/g, (_, letter: string) => letter.toUpperCase()), cwd)
    if (other === module.folder) throw new CommandError(`${module.folder} cannot use itself`)
    if (other === feature.folder) {
      throw new CommandError(`${module.folder} is of ${feature.folder}: it uses the other modules of its feature by their name, as in newt add deps ${given} <module>`)
    }
    if (features.some(each => each.name === other)) return anotherFeature(found, featureNames(other), cwd)
    return moduleOfItsFeature(found, other, cwd)
  },
})
