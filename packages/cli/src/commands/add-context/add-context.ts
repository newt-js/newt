import { relative }         from 'node:path'
// --------------------------------------------------------
import { contextNames }     from '../../names/context-names/context-names'
import { DEFAULT_DATABASE } from '../../options/database-of/database-of'
import { databaseOf }       from '../../options/database-of/database-of'
import { findBackend }      from '../../project/find-backend/find-backend'
import { contextTemplate }  from '../../templates/context/context-template/context-template'
import { DATABASES }        from '../../templates/context/databases'
import { defineCommand }    from '../command'
import { CommandError }     from '../command-error/command-error'

export const ADD_CONTEXT = defineCommand({
  name: 'add context',
  summary: 'Adds a bounded context to the backend, on a database of its own',
  args: '<name>',
  options: {
    db: { type: 'string', value: 'database', description: `Its database: ${Object.keys(DATABASES).join(', ')}, ${DEFAULT_DATABASE} by default` },
    backend: { type: 'string', value: 'folder', description: 'The backend, in a monorepo with several' },
  },
  run: async ({ args, cwd, options }) => {
    const [name, ...rest] = args
    if (name === undefined || rest.length > 0) {
      throw new CommandError('newt add context takes the name of the context, as in newt add context shop')
    }
    const names = contextNames(name)
    const database = databaseOf(options.db)
    const backend = await findBackend(cwd, options.backend)
    return {
      changes: contextTemplate({ backend: relative(cwd, backend), names, database }),
      nextSteps: [
        ...DATABASES[database].needsServer ? [`create the database of ${name} in your ${database} server, as ${names.env}_DATABASE_URL in .env says`] : [],
        'bun run dev',
      ],
    }
  },
})
