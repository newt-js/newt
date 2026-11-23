import { join }           from 'node:path'
// --------------------------------------------------------
import { pieceNames }     from '../../names/piece-names/piece-names'
import { ERROR_KINDS }    from '../../options/error-kind-of/error-kind-of'
import { errorKindOf }    from '../../options/error-kind-of/error-kind-of'
import { findModule }     from '../../project/find-module/find-module'
import { indexErrorLine } from '../../templates/module/files/index-ts'
import { errorCode }      from '../../templates/pieces/error-ts'
import { errorTs }        from '../../templates/pieces/error-ts'
import { defineCommand }  from '../command'
import { CommandError }   from '../command-error/command-error'

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
    const existing = await Bun.file(join(cwd, folder, 'errors', `${error.folder}.ts`)).text().catch(() => null)
    const extended = existing === null ? undefined : / extends (\w+)/.exec(existing)?.[1]
    if (extended && extended !== ERROR_KINDS[kind]) {
      throw new CommandError(`errors/${error.folder}.ts is there already and extends ${extended}, not ${ERROR_KINDS[kind]}: change it by hand`)
    }
    const code = errorCode(module, error)
    const errors = join(cwd, folder, 'errors')
    for await (const file of new Bun.Glob('*.ts').scan(errors)) {
      if (file !== `${error.folder}.ts` && (await Bun.file(join(errors, file)).text()).includes(`'${code}'`)) {
        throw new CommandError(`errors/${file} has the code ${code} already: name the error by what else went wrong`)
      }
    }
    return {
      changes: [
        { action: 'create', path: join(folder, 'errors', `${error.folder}.ts`), content: errorTs(module, error, kind) },
        // Who calls the module tells it apart with instanceof: its index.ts offers it.
        { action: 'ensure-lines', path: join(folder, 'index.ts'), lines: [indexErrorLine(error.type, error.folder)] },
      ],
      nextSteps: [`throw it where it happens: throw new ${error.type}()`],
    }
  },
})
