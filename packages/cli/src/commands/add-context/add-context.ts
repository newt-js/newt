import { relative }           from 'node:path'
// --------------------------------------------------------
import { contextNames }       from '../../names/context-names/context-names'
import { backendPackageName } from '../../project/backend-package-name/backend-package-name'
import { backendStores }      from '../../project/backend-stores/backend-stores'
import { findBackend }        from '../../project/find-backend/find-backend'
import { contextTemplate }    from '../../templates/context/context-template/context-template'
import { STORE_DATABASES }    from '../../templates/stores/store-databases'
import { defineCommand }      from '../command'
import { CommandError }       from '../command-error/command-error'

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
    const backend = await findBackend(cwd, options.backend)
    const stores = await backendStores(backend)
    if (!stores) {
      throw new CommandError('The backend has no src/stores.ts that newt can read: newt init writes it, with the database and the files every context opens')
    }
    return {
      changes: contextTemplate({ backend: relative(cwd, backend), packageName: await backendPackageName(backend), names, stores }),
      nextSteps: [
        ...STORE_DATABASES[stores.database].needsEnv ? [`create the database of ${name} in your ${stores.database} server, as ${names.env}_DATABASE_URL in .env says`] : [],
        ...stores.files === 's3' ? [`set ${names.env}_S3_BUCKET in .env to its bucket`] : [],
        'bun run dev',
      ],
    }
  },
})
