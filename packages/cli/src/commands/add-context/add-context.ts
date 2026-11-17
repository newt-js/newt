import { relative }           from 'node:path'
// --------------------------------------------------------
import { contextNames }       from '../../names/context-names/context-names'
import { backendPackageName } from '../../project/backend-package-name/backend-package-name'
import { backendStores }      from '../../project/backend-stores/backend-stores'
import { findBackend }        from '../../project/find-backend/find-backend'
import { contextTemplate }    from '../../templates/context/context-template/context-template'
import { STORE_DATABASES }    from '../../templates/stores/store-databases'
import { databaseName }       from '../../templates/stores/store-databases'
import { bucketName }         from '../../templates/stores/store-files'
import { defineCommand }      from '../command'
import { CommandError }       from '../command-error/command-error'

/** The longest database or bucket name Postgres, MySQL and S3 all take whole. */
const MAX_NAME = 63

export const ADD_CONTEXT = defineCommand({
  name: 'add context',
  summary: "Adds a bounded context to the backend, on a database of its own and with its files, of the backend's kinds",
  args: '<name>',
  options: {
    backend: { type: 'string', value: 'folder', description: 'The backend, in a monorepo with several' },
  },
  run: async ({ args, cwd, options }) => {
    const [name, ...rest] = args
    if (name === undefined || rest.length > 0) {
      throw new CommandError('newt add context takes the name of the context, as in newt add context shop')
    }
    const names = contextNames(name)
    if (name === 'api') {
      throw new CommandError("'api' cannot name a context: its frontend would be served at /api, where the backend's routes are")
    }
    const backend = await findBackend(cwd, options.backend)
    const { database, files } = await backendStores(backend)
    if (!database || !files) {
      const missing = [...database ? [] : ['database'], ...files ? [] : ['storage']].join(' nor any ')
      throw new CommandError(`The backend's src/stores.ts opens no ${missing} of newt's, so newt cannot tell what each context opens: newt init writes it, with the database and the files every context opens`)
    }
    const stores = { database, files }
    const packageName = await backendPackageName(backend)
    const named = [
      ...STORE_DATABASES[database].needsEnv ? [{ what: 'database', name: databaseName(packageName, names.folder) }] : [],
      ...files === 's3' ? [{ what: 'bucket', name: bucketName(packageName, names.folder) }] : [],
    ]
    const tooLong = named.find(({ name }) => name.length > MAX_NAME)
    if (tooLong) {
      throw new CommandError(`The ${tooLong.what} of ${name} would be ${tooLong.name}, ${tooLong.name.length} characters, and servers take ${MAX_NAME} at most: give the context a shorter name`)
    }
    return {
      changes: contextTemplate({ backend: relative(cwd, backend), packageName, names, stores }),
      nextSteps: [
        ...STORE_DATABASES[stores.database].needsEnv ? [`create the database of ${name} in your ${stores.database} server, as ${names.env}_DATABASE_URL in .env says`] : [],
        ...stores.files === 's3' ? [`set ${names.env}_S3_BUCKET in .env to its bucket`] : [],
        'bun run dev',
      ],
    }
  },
})
