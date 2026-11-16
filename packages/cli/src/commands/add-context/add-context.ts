import { relative }         from 'node:path'
// --------------------------------------------------------
import { contextNames }     from '../../names/context-names/context-names'
import { DEFAULT_DATABASE } from '../../options/database-of/database-of'
import { databaseOf }       from '../../options/database-of/database-of'
import { storageOf }        from '../../options/storage-of/storage-of'
import { backendPort }      from '../../project/backend-port/backend-port'
import { findBackend }      from '../../project/find-backend/find-backend'
import { contextTemplate }  from '../../templates/context/context-template/context-template'
import { DATABASES }        from '../../templates/context/databases'
import { storageTemplate }  from '../../templates/context/storage-template/storage-template'
import { STORAGES }         from '../../templates/context/storages'
import { defineCommand }    from '../command'
import { CommandError }     from '../command-error/command-error'

export const ADD_CONTEXT = defineCommand({
  name: 'add context',
  summary: 'Adds a bounded context to the backend, on a database of its own',
  args: '<name>',
  options: {
    db: { type: 'string', value: 'database', description: `Its database: ${Object.keys(DATABASES).join(', ')}, ${DEFAULT_DATABASE} by default` },
    files: { type: 'string', value: 'storage', description: `Where it keeps files, if it does: ${Object.keys(STORAGES).join(', ')}` },
    backend: { type: 'string', value: 'folder', description: 'The backend, in a monorepo with several' },
  },
  run: async ({ args, cwd, options }) => {
    const [name, ...rest] = args
    if (name === undefined || rest.length > 0) {
      throw new CommandError('newt add context takes the name of the context, as in newt add context shop')
    }
    const names = contextNames(name)
    const database = databaseOf(options.db)
    const storage = options.files === undefined ? null : storageOf(options.files)
    const backend = await findBackend(cwd, options.backend)
    const at = relative(cwd, backend)
    const files = storage === null ? [] : storageTemplate({ backend: at, names, storage, port: await backendPort(backend) })
    return {
      changes: [...contextTemplate({ backend: at, names, database }), ...files],
      nextSteps: [
        ...DATABASES[database].needsServer ? [`create the database of ${name} in your ${database} server, as ${names.env}_DATABASE_URL in .env says`] : [],
        ...storage !== null && STORAGES[storage].needsService ? [`set the ${names.env}_S3_ variables of .env to your bucket`] : [],
        'bun run dev',
      ],
    }
  },
})
