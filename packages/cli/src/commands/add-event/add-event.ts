import { join }          from 'node:path'
// --------------------------------------------------------
import { pieceNames }    from '../../names/piece-names/piece-names'
import { findModule }    from '../../project/find-module/find-module'
import { eventTs }       from '../../templates/pieces/event-ts'
import { defineCommand } from '../command'
import { CommandError }  from '../command-error/command-error'

const USAGE = 'newt add event takes the module and the event, as in newt add event sales/order shipped'

export const ADD_EVENT = defineCommand({
  name: 'add event',
  summary: 'Adds an event to a module, in its events/ folder',
  args: '<context>/<module> <event>',
  options: {
    backend: { type: 'string', value: 'folder', description: 'The backend, in a monorepo with several' },
  },
  run: async ({ args, cwd, options }) => {
    const [given, name, ...rest] = args
    if (name === undefined || rest.length > 0) throw new CommandError(USAGE)
    const { folder, module } = await findModule(given, cwd, options.backend, USAGE)
    const event = pieceNames(name, 'an event')
    const schema = Bun.file(join(cwd, folder, `${module.folder}.schema.ts`))
    const hasSchema = await schema.exists() && (await schema.text()).includes(`export const ${module.type}Schema `)
    const type = `${module.type}_${event.type}`
    return {
      changes: [{ action: 'create', path: join(folder, 'events', `${module.folder}-${event.folder}.ts`), content: eventTs(module, event, hasSchema) }],
      nextSteps: [
        `emit it from a method of the entity: this.trackEvent(new ${type}({ id: this.id }))`,
        `let other modules subscribe to it: add ${event.camel}: ${type} to eventsOf in ${module.folder}.module.ts`,
      ],
    }
  },
})
