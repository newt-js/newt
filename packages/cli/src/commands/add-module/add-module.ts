import { join }            from 'node:path'
import { relative }        from 'node:path'
// --------------------------------------------------------
import { contextNames }    from '../../names/context-names/context-names'
import { moduleNames }     from '../../names/module-names/module-names'
import { CONTEXTS_FOLDER } from '../../project/backend-contexts/backend-contexts'
import { backendContexts } from '../../project/backend-contexts/backend-contexts'
import { contextDatabase } from '../../project/context-database/context-database'
import { findBackend }     from '../../project/find-backend/find-backend'
import { nextMigration }   from '../../project/next-migration/next-migration'
import { moduleTemplate }  from '../../templates/module/module-template/module-template'
import { defineCommand }   from '../command'
import { CommandError }    from '../command-error/command-error'

export const ADD_MODULE = defineCommand({
  name: 'add module',
  summary: 'Adds a module to a context: its entity, use cases, routes, table and test',
  args: '<context>/<module>',
  options: {
    backend: { type: 'string', value: 'folder', description: 'The backend, in a monorepo with several' },
  },
  run: async ({ args, cwd, options }) => {
    const [given, ...rest] = args
    const [context, module, ...more] = given?.split('/') ?? []
    if (context === undefined || module === undefined || more.length > 0 || rest.length > 0) {
      throw new CommandError('newt add module takes the context and the module, as in newt add module sales/order')
    }
    const contextName = contextNames(context)
    const names = moduleNames(module)
    const backend = await findBackend(cwd, options.backend)
    if (!(await backendContexts(backend)).some(each => each.name === context)) {
      throw new CommandError(`The backend has no context ${context}: add it with newt add context ${context}`)
    }
    const database = await contextDatabase(backend, context)
    if (database === null) {
      throw new CommandError(`${context}.context.ts opens no database of newt's, so newt cannot tell in which SQL to write the table of ${module}`)
    }
    const migration = await nextMigration(join(backend, CONTEXTS_FOLDER, context, 'migrations'), names.table)
    return {
      changes: moduleTemplate({ backend: relative(cwd, backend), context: contextName, names, database, migration }),
      nextSteps: [
        `bun test src/contexts/${context}/modules/${module}`,
        `its routes ask for a session: give ${context}'s router an authenticator, router.authenticateWith(...), before calling them`,
      ],
    }
  },
})
