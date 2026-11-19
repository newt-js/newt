import { join }                         from 'node:path'
import { relative }                     from 'node:path'
// --------------------------------------------------------
import { contextNames }                 from '../../names/context-names/context-names'
import { featureNames }                 from '../../names/feature-names/feature-names'
import { moduleNames }                  from '../../names/module-names/module-names'
import { CONTEXTS_FOLDER }              from '../../project/backend-contexts/backend-contexts'
import { backendContexts }              from '../../project/backend-contexts/backend-contexts'
import { contextDatabase }              from '../../project/backend-stores/backend-stores'
import { findBackend }                  from '../../project/find-backend/find-backend'
import { refuseFeatureNamedLikeModule } from '../../project/new-feature/new-feature'
import { nextMigration }                from '../../project/next-migration/next-migration'
import { featureTemplate }              from '../../templates/feature/feature-template/feature-template'
import { moduleTemplate }               from '../../templates/module/module-template/module-template'
import { defineCommand }                from '../command'
import { CommandError }                 from '../command-error/command-error'

const USAGE = 'newt add module takes the context, the feature and the module, as in newt add module sales/orders/order'

export const ADD_MODULE = defineCommand({
  name: 'add module',
  summary: 'Adds a module to a feature of a context, and the feature if it has none: its entity, use cases, routes, table and test',
  args: '<context>/<feature>/<module>',
  options: {
    backend: { type: 'string', value: 'folder', description: 'The backend, in a monorepo with several' },
    plural: { type: 'string', value: 'name', description: "Its plural, for its routes and its code, when English's rules miss it: --plural people" },
  },
  run: async ({ args, cwd, options }) => {
    const [given, ...rest] = args
    const [context, feature, module, ...more] = given?.split('/') ?? []
    if (context === undefined || feature === undefined || module === undefined || more.length > 0 || rest.length > 0) {
      throw new CommandError(USAGE)
    }
    const contextName = contextNames(context)
    const featureName = featureNames(feature)
    const names = moduleNames(featureName, module, options.plural)
    const backend = await findBackend(cwd, options.backend)
    const found = (await backendContexts(backend)).find(each => each.name === context)
    if (!found) {
      throw new CommandError(`The backend has no context ${context}: add it with newt add context ${context}`)
    }
    if (found.features.some(each => each.name === module)) {
      throw new CommandError(`'${module}' cannot name a module of ${context}: it is the name of one of its features; name the module by the one thing it holds`)
    }
    const database = await contextDatabase(backend, context)
    if (database === undefined) {
      throw new CommandError(`${context}.context.ts opens no database of newt's, so newt cannot tell in which SQL to write the table of ${module}`)
    }
    const migration = await nextMigration(join(backend, CONTEXTS_FOLDER, context, 'migrations'), names.migration)
    const newFeature = !found.features.some(each => each.name === feature)
    if (newFeature) refuseFeatureNamedLikeModule(found, feature)
    return {
      changes: [
        ...newFeature ? featureTemplate({ backend: relative(cwd, backend), context: contextName, names: featureName }) : [],
        ...moduleTemplate({ backend: relative(cwd, backend), context: contextName, names, database, migration }),
      ],
      nextSteps: [
        `bun test ${join(relative(cwd, backend), CONTEXTS_FOLDER, context, 'features', feature, module)}`,
        `let other features use it: list its use cases and events in exposes, in ${module}.module.ts`,
        `its routes ask for a session: write authenticate in ${join(relative(cwd, backend), 'src/auth.ts')} to call them from outside the tests`,
      ],
    }
  },
})
