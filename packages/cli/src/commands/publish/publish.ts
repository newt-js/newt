import { join }          from 'node:path'
// --------------------------------------------------------
import { findModule }    from '../../project/find-module/find-module'
import { defineCommand } from '../command'
import { CommandError }  from '../command-error/command-error'

const USAGE = 'newt publish takes the context and the module it publishes, as in newt publish panel/workspace'

/** The field of <ctx>.context.ts that holds a module: unpublished, and published. */
export const moduleField = (module: string, type: string, published: boolean) => `  ${published ? 'public' : 'private'} readonly ${module}: ${type}_Module`

export const PUBLISH = defineCommand({
  name: 'publish',
  summary: 'Publishes a module of a context: the other contexts that use it reach its use cases and its events',
  args: '<context>/<module>',
  options: {
    backend: { type: 'string', value: 'folder', description: 'The backend, in a monorepo with several' },
  },
  run: async ({ args, cwd, options }) => {
    const [given, ...rest] = args
    if (rest.length > 0) throw new CommandError(USAGE)
    const { module, context, contextFolder } = await findModule(given, cwd, options.backend, USAGE)
    return {
      changes: [{
        action: 'replace-line',
        path: join(contextFolder, `${context.folder}.context.ts`),
        line: moduleField(module.module, module.type, false),
        with: moduleField(module.module, module.type, true),
        imports: [],
      }],
      nextSteps: [`let a module of another context use it: newt add deps <context>/<module> ${context.folder}, and call this.deps.${context.camel}.${module.module}`],
    }
  },
})
