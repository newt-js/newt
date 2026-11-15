import { TSESLint }    from '@typescript-eslint/utils'
import { existsSync }  from 'node:fs'
import { dirname }     from 'node:path'
import { posix }       from 'node:path'
// --------------------------------------------------------
import { modulePlace } from '../../paths/paths'
import { rootOf }      from '../../paths/paths'

/** The folders a module may have, and what each one holds. */
const FOLDERS: Record<string, string> = {
  'events': 'its events, one file each: `<module>-<event>.ts`',
  'errors': 'its errors, one file each',
  'value-objects': 'its value objects, one file each',
  'services': 'the logic its use cases share, one file each',
}

/** The files every module may have, named after it. */
const KINDS = ['module', '', 'schema', 'repository', 'routes', 'workers', 'deps']

/**
 * Every module is made of the same files, so whoever opens one (a person or an agent)
 * knows where everything is: `<m>.module.ts`, `<m>.ts`, `<m>.schema.ts`,
 * `<m>.repository.ts`, `<m>.routes.ts`, `<m>.workers.ts`, `<m>.deps.ts`,
 * `<m>-options.ts`, its tests, and the folders in `FOLDERS`. Another entity of the module,
 * saved with its own, is `<m>-<entity>.ts` beside its `<m>-<entity>.repository.ts`.
 */
export const moduleFiles: TSESLint.RuleModule<'file' | 'folder' | 'event'> = {
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: { description: 'A module is made of the files every module has, named after it.' },
    messages: {
      file: "'{{file}}' is not a file a module has. Move its code to one of them: {{module}}.module.ts (use cases), {{module}}.ts (entity), {{module}}.schema.ts (DTOs), {{module}}.repository.ts, {{module}}.routes.ts, {{module}}.workers.ts, {{module}}.deps.ts, {{module}}-options.ts, or a *.test.ts. Another entity of the module is {{module}}-<entity>.ts beside its {{module}}-<entity>.repository.ts.",
      folder: "'{{folder}}' is not a folder a module has: its folders are {{folders}}.",
      event: "An event's file is named '{{module}}-<event>.ts', not '{{file}}': rename it.",
    },
    schema: [],
  },
  create(context) {
    const place = modulePlace(context.filename, rootOf(context))
    if (!place) return {}
    const { module, inside } = place
    const [first = '', ...rest] = inside.split('/')
    return {
      Program(node) {
        if (rest.length === 0) {
          const files = [...KINDS.map(kind => `${module}${kind ? `.${kind}` : ''}.ts`), `${module}-options.ts`]
          if (!files.includes(first) && !first.endsWith('.test.ts') && !isOtherEntity(first, module, context.filename)) {
            context.report({ node, messageId: 'file', data: { file: first, module } })
          }
          return
        }
        if (!Object.hasOwn(FOLDERS, first)) {
          context.report({ node, messageId: 'folder', data: { folder: first, folders: Object.keys(FOLDERS).join(', ') } })
          return
        }
        const file = posix.basename(inside)
        if (first === 'events' && !file.startsWith(`${module}-`) && !file.endsWith('.test.ts')) {
          context.report({ node, messageId: 'event', data: { module, file } })
        }
      },
    }
  },
}

/** Whether a file is another entity of the module, or its repository: each with the other beside it. */
function isOtherEntity(file: string, module: string, filename: string): boolean {
  const entity = new RegExp(`^${module}-([a-z0-9-]+?)(\\.repository)?\\.ts$`).exec(file)
  if (!entity || entity[1] === 'options') return false
  const other = entity[2] ? `${module}-${entity[1]}.ts` : `${module}-${entity[1]}.repository.ts`
  return existsSync(posix.join(dirname(filename), other))
}
