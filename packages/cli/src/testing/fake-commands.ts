import { defineCommand } from '../commands/command'
import { CommandError }  from '../commands/command-error/command-error'

export const ADD_BACKEND = defineCommand({
  name: 'add backend',
  summary: 'Adds a backend',
  args: '<folder>',
  options: { db: { type: 'string', value: 'adapter', description: 'The database' }, install: { type: 'boolean', description: 'Install dependencies' } },
  run: async ({ args: [folder = 'backend'], options }) => ({
    changes: [{ action: 'create', path: `${folder}/options.json`, content: JSON.stringify({ db: options.db, install: options.install }) }],
    warnings: options.install ? ['Nothing to install yet'] : [],
    nextSteps: [`cd ${folder}`],
  }),
})

export const ADD = defineCommand({
  name: 'add',
  summary: 'Adds something',
  run: async () => ({ changes: [] }),
})

export const INIT = defineCommand({
  name: 'init',
  summary: 'Sets up a project',
  run: async () => ({ changes: [] }),
})

export const BROKEN = defineCommand({
  name: 'broken',
  summary: 'Always fails',
  run: async () => {
    throw new CommandError('It broke: fix it like this')
  },
})
