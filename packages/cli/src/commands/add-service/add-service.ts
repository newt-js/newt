import { join }               from 'node:path'
// --------------------------------------------------------
import { pieceNames }         from '../../names/piece-names/piece-names'
import { RESERVED_WORDS }     from '../../names/reserved-words/reserved-words'
import { TEMPLATE_VARIABLES } from '../../names/template-names/template-names'
import { findModule }         from '../../project/find-module/find-module'
import { serviceTs }          from '../../templates/pieces/service-ts'
import { defineCommand }      from '../command'
import { CommandError }       from '../command-error/command-error'

const USAGE = 'newt add service takes the module and the service, as in newt add service sales/order price-rounding'

export const ADD_SERVICE = defineCommand({
  name: 'add service',
  summary: 'Adds a service to a module: logic its use cases share',
  args: '<context>/<module> <service>',
  options: {
    backend: { type: 'string', value: 'folder', description: 'The backend, in a monorepo with several' },
  },
  run: async ({ args, cwd, options }) => {
    const [given, name, ...rest] = args
    if (name === undefined || rest.length > 0) throw new CommandError(USAGE)
    const { folder, module } = await findModule(given, cwd, options.backend, USAGE)
    const service = pieceNames(name, 'a service')
    if (RESERVED_WORDS.has(service.camel) || TEMPLATE_VARIABLES.has(service.camel)) {
      throw new CommandError(`'${name}' cannot name a service: its function would take a name JavaScript or newt's code keeps; name it by what it does`)
    }
    const schema = Bun.file(join(cwd, folder, `${module.folder}.schema.ts`))
    const hasSchema = await schema.exists() && (await schema.text()).includes(`export type ${module.type}DTO `)
    return {
      changes: [{ action: 'create', path: join(folder, 'services', `${service.folder}.ts`), content: serviceTs(module, service, hasSchema) }],
      nextSteps: [`call it from the use cases that share it: import { ${service.camel} } from './services/${service.folder}'`],
    }
  },
})
