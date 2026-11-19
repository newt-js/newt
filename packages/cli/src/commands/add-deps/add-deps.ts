import { join }              from 'node:path'
// --------------------------------------------------------
import type { FeatureNames } from '../../names/feature-names/feature-names'
import { featureNames }      from '../../names/feature-names/feature-names'
import { moduleNames }       from '../../names/module-names/module-names'
import { dependencyPath }    from '../../project/dependency-path/dependency-path'
import { featureDepsGraph }  from '../../project/feature-deps-graph/feature-deps-graph'
import type { FoundModule }  from '../../project/find-module/find-module'
import { findModule }        from '../../project/find-module/find-module'
import { moduleDepsGraph }   from '../../project/module-deps-graph/module-deps-graph'
import { classHead }         from '../../templates/feature/files/feature-ts'
import { featureClass }      from '../../templates/feature/files/feature-ts'
import { initializeHead }    from '../../templates/feature/files/feature-ts'
import { usesHead }          from '../../templates/feature/files/feature-ts'
import { usesTs }            from '../../templates/feature/files/feature-ts'
import { routesHead }        from '../../templates/module/files/routes-ts'
import { moduleLines }       from '../../templates/module/module-lines/module-lines'
import { depsHead }          from '../../templates/pieces/deps-ts'
import { depsTs }            from '../../templates/pieces/deps-ts'
import type { FileChange }   from '../command'
import { defineCommand }     from '../command'
import { CommandError }      from '../command-error/command-error'

const USAGE = 'newt add deps takes the module and what it uses: a module of its feature, or another feature of its context, as in newt add deps sales/orders/order invoice'

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
    { action: 'insert-lines', path: file('.deps.ts'), anchor: depsHead(module), position: 'after', lines: [`  ${used.key}: ${used.type}`], imports: [`import type { ${used.type} } from '${used.from}'`] },
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

export const ADD_DEPS = defineCommand({
  name: 'add deps',
  summary: 'Lets a module use another module of its feature, or another feature of its context',
  args: '<context>/<feature>/<module> <module-or-feature>',
  options: {
    backend: { type: 'string', value: 'folder', description: 'The backend, in a monorepo with several' },
  },
  run: async ({ args, cwd, options }) => {
    const [given, other, ...rest] = args
    if (other === undefined || rest.length > 0) throw new CommandError(USAGE)
    const found = await findModule(given, cwd, options.backend, USAGE)
    const { module, feature, features } = found
    if (other.includes('/')) {
      const [first] = other.split('/')
      if (features.some(each => each.name === first)) {
        throw new CommandError(`A module uses another feature whole, by the feature's name alone: newt add deps ${given} ${first}`)
      }
      throw new CommandError("A module uses another context's modules once its context is opened with that context: newt does not write that yet")
    }
    if (other === module.folder) throw new CommandError(`${module.folder} cannot use itself`)
    if (other === feature.folder) {
      throw new CommandError(`${module.folder} is of ${feature.folder}: it uses the other modules of its feature by their name, as in newt add deps ${given} <module>`)
    }
    if (features.some(each => each.name === other)) return anotherFeature(found, featureNames(other), cwd)
    return moduleOfItsFeature(found, other, cwd)
  },
})
