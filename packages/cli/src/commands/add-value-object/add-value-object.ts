import { join }              from 'node:path'
// --------------------------------------------------------
import { pieceNames }        from '../../names/piece-names/piece-names'
import { findModule }        from '../../project/find-module/find-module'
import { invalidValueTs }    from '../../templates/pieces/value-object-ts'
import { valueObjectTestTs } from '../../templates/pieces/value-object-ts'
import { valueObjectTs }     from '../../templates/pieces/value-object-ts'
import { defineCommand }     from '../command'
import { CommandError }      from '../command-error/command-error'

const USAGE = 'newt add value-object takes the module and the value object, as in newt add value-object sales/order sku'

export const ADD_VALUE_OBJECT = defineCommand({
  name: 'add value-object',
  summary: 'Adds a value object to a module, with the error it throws and its test',
  args: '<context>/<module> <value-object>',
  options: {
    backend: { type: 'string', value: 'folder', description: 'The backend, in a monorepo with several' },
  },
  run: async ({ args, cwd, options }) => {
    const [given, name, ...rest] = args
    if (name === undefined || rest.length > 0) throw new CommandError(USAGE)
    const { folder, module } = await findModule(given, cwd, options.backend, USAGE)
    const value = pieceNames(name, 'a value object')
    if (value.folder === `${module.folder}-id`) {
      throw new CommandError(`${module.type}Id is there already: every module has its id`)
    }
    const changes = [
      { action: 'create' as const, path: join(folder, 'value-objects', `${value.folder}.ts`), content: valueObjectTs(value) },
      { action: 'create' as const, path: join(folder, 'value-objects', `${value.folder}.test.ts`), content: valueObjectTestTs(value) },
      { action: 'create' as const, path: join(folder, 'errors', `invalid-${value.folder}.ts`), content: invalidValueTs(module, value) },
    ]
    const there = await Promise.all(changes.map(change => Bun.file(join(cwd, change.path)).exists()))
    if (there.some(Boolean) && !there.every(Boolean)) {
      const found = changes.filter((_, at) => there[at]).map(change => change.path)
      throw new CommandError(`${found.join(' and ')} ${found.length === 1 ? 'is' : 'are'} there already, and a value object is its files together: name it otherwise, or take ${found.length === 1 ? 'it' : 'them'} out`)
    }
    return {
      changes,
      nextSteps: [
        `give its rules to the schema it has: z.string().trim().min(1).max(100) in ${value.folder}.ts`,
        `use it in the module's schema, ${value.type}.schema, and where a value comes in, ${value.type}.from(text)`,
      ],
    }
  },
})
