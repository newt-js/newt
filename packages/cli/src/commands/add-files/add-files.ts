import { relative }        from 'node:path'
// --------------------------------------------------------
import { contextNames }    from '../../names/context-names/context-names'
import { storageOf }       from '../../options/storage-of/storage-of'
import { backendContexts } from '../../project/backend-contexts/backend-contexts'
import { backendPort }     from '../../project/backend-port/backend-port'
import { findBackend }     from '../../project/find-backend/find-backend'
import { storageTemplate } from '../../templates/context/storage-template/storage-template'
import { STORAGES }        from '../../templates/context/storages'
import { defineCommand }   from '../command'
import { CommandError }    from '../command-error/command-error'

export const ADD_FILES = defineCommand({
  name: 'add files',
  summary: `Lets a context keep files: ${Object.keys(STORAGES).join(', ')}, local by default`,
  args: '<context> [storage]',
  options: {
    backend: { type: 'string', value: 'folder', description: 'The backend, in a monorepo with several' },
  },
  run: async ({ args, cwd, options }) => {
    const [context, given, ...rest] = args
    if (context === undefined || rest.length > 0) {
      throw new CommandError('newt add files takes the context and, if not local, its storage, as in newt add files shop s3')
    }
    const names = contextNames(context)
    const storage = storageOf(given)
    const backend = await findBackend(cwd, options.backend)
    const contexts = await backendContexts(backend)
    if (!contexts.some(each => each.name === context)) {
      throw new CommandError(`The backend has no context ${context}: add it with newt add context ${context}`)
    }
    return {
      changes: storageTemplate({ backend: relative(cwd, backend), names, storage, port: await backendPort(backend) }),
      nextSteps: STORAGES[storage].needsService ? [`set the ${names.env}_S3_ variables of .env to your bucket`] : [],
    }
  },
})
