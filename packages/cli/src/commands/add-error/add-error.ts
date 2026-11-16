import { join }          from 'node:path'
// --------------------------------------------------------
import { pieceNames }    from '../../names/piece-names/piece-names'
import { ERROR_KINDS }   from '../../options/error-kind-of/error-kind-of'
import { errorKindOf }   from '../../options/error-kind-of/error-kind-of'
import { findModule }    from '../../project/find-module/find-module'
import { errorTs }       from '../../templates/pieces/error-ts'
import { defineCommand } from '../command'
import { CommandError }  from '../command-error/command-error'

const USAGE = 'newt add error takes the module and the error, as in newt add error sales/order order-already-paid --kind conflict'

export const ADD_ERROR = defineCommand({
  name: 'add error',
  summary: 'Adds an error to a module, of a kind HTTP answers with its status',
  args: '<context>/<module> <error>',
  options: {
    kind: { type: 'string', value: 'kind', description: `What HTTP answers it with: ${Object.keys(ERROR_KINDS).join(', ')}` },
    backend: { type: 'string', value: 'folder', description: 'The backend, in a monorepo with several' },
  },
  run: async ({ args, cwd, options }) => {
    const [given, name, ...rest] = args
    if (name === undefined || rest.length > 0) throw new CommandError(USAGE)
    const kind = errorKindOf(options.kind)
    const { folder, module } = await findModule(given, cwd, options.backend, USAGE)
    const error = pieceNames(name, 'an error')
    if (Object.values(ERROR_KINDS).includes(error.type as never) || error.type === 'KnownError') {
      throw new CommandError(`'${name}' cannot name an error: ${error.type} is the class newt's errors extend; name it by what went wrong, as in order-already-paid`)
    }
    return {
      changes: [{ action: 'create', path: join(folder, 'errors', `${error.folder}.ts`), content: errorTs(module, error, kind) }],
      nextSteps: [`throw it where it happens: throw new ${error.type}()`],
    }
  },
})
