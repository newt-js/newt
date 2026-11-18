import { relative }        from 'node:path'
// --------------------------------------------------------
import { contextNames }    from '../../names/context-names/context-names'
import { featureNames }    from '../../names/feature-names/feature-names'
import { backendContexts } from '../../project/backend-contexts/backend-contexts'
import { findBackend }     from '../../project/find-backend/find-backend'
import { featureTemplate } from '../../templates/feature/feature-template/feature-template'
import { defineCommand }   from '../command'
import { CommandError }    from '../command-error/command-error'

const USAGE = 'newt add feature takes the context and the feature, as in newt add feature sales/orders'

export const ADD_FEATURE = defineCommand({
  name: 'add feature',
  summary: 'Adds a feature to a context: its entry point, which builds its modules and returns what the other features see of them',
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
    const owner = found.features.find(each => each.modules.includes(feature))
    if (owner) {
      throw new CommandError(`'${feature}' cannot name a feature of ${context}: ${owner.name} has a module of that name; name the feature in plural, by what it groups`)
    }
    return {
      changes: featureTemplate({ backend: relative(cwd, backend), context: contextName, names }),
      nextSteps: [`add its modules with newt add module ${context}/${feature}/<module>`],
    }
  },
})
