import { defineCommand } from '../commands/command'

export const ADD_BACKEND = defineCommand({
  name: 'add backend',
  summary: 'Adds a backend',
  args: '<folder>',
  options: { db: { type: 'string', value: 'adapter', description: 'The database' }, force: { type: 'boolean', description: 'Overwrite' } },
  run: async ({ args, options, cwd }) => ({ code: 0, text: JSON.stringify({ args, options: { db: options.db, force: options.force }, cwd }) }),
})

export const ADD = defineCommand({
  name: 'add',
  summary: 'Adds something',
  run: async () => ({ code: 0, text: 'add' }),
})

export const INIT = defineCommand({
  name: 'init',
  summary: 'Sets up a project',
  run: async () => ({ code: 0, text: 'init' }),
})
