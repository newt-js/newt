import { join }             from 'node:path'
// --------------------------------------------------------
import { pieceNames }       from '../../names/piece-names/piece-names'
import { cronOf }           from '../../options/cron-of/cron-of'
import { findModule }       from '../../project/find-module/find-module'
import { scheduleTest }     from '../../templates/pieces/schedule-ts'
import { scheduledUseCase } from '../../templates/pieces/schedule-ts'
import { workersHead }      from '../../templates/pieces/subscription-ts'
import { workersTs }        from '../../templates/pieces/subscription-ts'
import { quoted }           from '../../templates/quoted/quoted'
import type { FileChange }  from '../command'
import { defineCommand }    from '../command'
import { CommandError }     from '../command-error/command-error'

const USAGE = 'newt add schedule takes the module, the use case it runs and --cron, as in newt add schedule sales/order purge-expired --cron "0 3 * * *"'

export const ADD_SCHEDULE = defineCommand({
  name: 'add schedule',
  summary: 'Runs a use case of a module on a cron: the schedule, the use case and its worker',
  args: '<context>/<module> <use-case>',
  options: {
    cron: { type: 'string', value: 'cron', description: 'When it runs, in five fields and in UTC: "0 3 * * *" is every day at 3:00 UTC' },
    backend: { type: 'string', value: 'folder', description: 'The backend, in a monorepo with several' },
  },
  run: async ({ args, cwd, options }) => {
    const [given, name, ...rest] = args
    if (name === undefined || options.cron === undefined || rest.length > 0) throw new CommandError(USAGE)
    const cron = cronOf(options.cron)
    const { folder, module, context } = await findModule(given, cwd, options.backend, USAGE)
    const useCase = pieceNames(name, 'a use case')
    const file = (suffix: string) => join(folder, `${module.folder}${suffix}`)
    const code = await Bun.file(join(cwd, file('.module.ts'))).text().catch(() => '')
    const existing = new RegExp(`async ${useCase.camel}\\(([^)]*)\\)`).exec(code)
    if (existing && existing[1]!.trim() !== '') {
      throw new CommandError(`${useCase.camel} takes an input, and a schedule gives none: name a use case of its own`)
    }
    const field = `${useCase.camel}Schedule`
    const changes: FileChange[] = [
      { action: 'add-class-member', path: file('.module.ts'), className: `${module.type}_Module`, name: field, member: `  readonly ${field}`, imports: [] },
      { action: 'add-constructor-statement', path: file('.module.ts'), className: `${module.type}_Module`, statement: `this.${field} = base.schedules.define('${module.module}.${useCase.camel}', ${quoted(cron)})` },
      { action: 'add-class-member', path: file('.module.ts'), className: `${module.type}_Module`, name: useCase.camel, member: scheduledUseCase(useCase), imports: [] },
      { action: 'create', path: file('.workers.ts'), content: workersTs(module) },
      { action: 'insert-lines', path: file('.workers.ts'), anchor: workersHead(module), position: 'after', lines: [`  ${module.plural}.on(${module.plural}.${field}, '${useCase.camel}')`], imports: [] },
      { action: 'insert-lines', path: file('.module.ts'), anchor: '    return module', position: 'before', lines: [`    register${module.type}Workers(module)`], imports: [`import { register${module.type}Workers } from './${module.folder}.workers'`] },
      { action: 'append-block', path: file('.module.test.ts'), block: scheduleTest(module, useCase, cron, context.folder), imports: ["import { describeApplication } from '@newt-js/core/application'"] },
    ]
    return { changes, nextSteps: [`write what ${useCase.camel} does, in ${module.folder}.module.ts`, `bun test ${folder}`] }
  },
})
