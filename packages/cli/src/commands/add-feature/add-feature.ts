import { relative }                     from 'node:path'
// --------------------------------------------------------
import { contextNames }                 from '../../names/context-names/context-names'
import { featureNames }                 from '../../names/feature-names/feature-names'
import { backendContexts }              from '../../project/backend-contexts/backend-contexts'
import { findBackend }                  from '../../project/find-backend/find-backend'
import { refuseFeatureNamedLikeModule } from '../../project/new-feature/new-feature'
import { featureTemplate }              from '../../templates/feature/feature-template/feature-template'
import { defineCommand }                from '../command'
import { CommandError }                 from '../command-error/command-error'

const USAGE = 'newt add feature takes the context and the feature, as in newt add feature sales/orders'

export const ADD_FEATURE = defineCommand({
  name: 'add feature',
  summary: 'Adds a feature to a context: its class, which builds its modules and holds them, and its index.ts, the only file the other features import',
  args: '<context>/<feature>',
  options: {
    backend: { type: 'string', value: 'folder', description: 'The backend, in a monorepo with several' },
  },
  run: async ({ args, cwd, options }) => {
    const [given, ...rest] = args
    const [context, feature, ...more] = given?.split('/') ?? []
    if (context === undefined || feature === undefined || more.length > 0 || rest.length > 0) {
      throw new CommandError(USAGE)
    }
    const contextName = contextNames(context)
    const names = featureNames(feature)
    const backend = await findBackend(cwd, options.backend)
    const found = (await backendContexts(backend)).find(each => each.name === context)
    if (!found) {
      throw new CommandError(`The backend has no context ${context}: add it with newt add context ${context}`)
    }
    refuseFeatureNamedLikeModule(found, feature)
    return {
      changes: featureTemplate({ backend: relative(cwd, backend), context: contextName, names }),
      nextSteps: [`add its modules with newt add module ${context}/${feature}/<module>`],
    }
  },
})
