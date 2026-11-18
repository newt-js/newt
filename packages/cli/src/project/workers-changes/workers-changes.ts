import { join }             from 'node:path'
// --------------------------------------------------------
import { codeTokens }       from '../../changes/code-tokens/code-tokens'
import { indexOfTokens }    from '../../changes/index-of-tokens/index-of-tokens'
import type { FileChange }  from '../../commands/command'
import type { ModuleNames } from '../../names/module-names/module-names'
import { workersCall }      from '../../templates/pieces/subscription-ts'
import { workersHead }      from '../../templates/pieces/subscription-ts'
import { workersTs }        from '../../templates/pieces/subscription-ts'

const holds = (text: string, code: string) => indexOfTokens(codeTokens(text), codeTokens(code)) !== -1

/**
 * The changes that give a module its <m>.workers.ts, registered in its initialize, and the
 * line that opens it, after which its reactions go. The workers take the module's deps
 * once a reaction needs them (an event of what it uses), and keep them after.
 */
export async function workersChanges(cwd: string, folder: string, module: ModuleNames, needDeps: boolean): Promise<{ head: string, changes: FileChange[] }> {
  const file = (suffix: string) => join(folder, `${module.folder}${suffix}`)
  const workers = await Bun.file(join(cwd, file('.workers.ts'))).text().catch(() => '')
  const code = await Bun.file(join(cwd, file('.module.ts'))).text().catch(() => '')
  const withDeps = needDeps || holds(workers, workersHead(module, true))
  const deps = [`import type { ${module.type}_Deps } from './${module.folder}.deps'`]
  const register = [`import { register${module.type}Workers } from './${module.folder}.workers'`]
  const changes: FileChange[] = [{ action: 'create', path: file('.workers.ts'), content: workersTs(module, withDeps) }]
  if (withDeps && holds(workers, workersHead(module, false))) {
    changes.push({ action: 'replace-line', path: file('.workers.ts'), line: workersHead(module, false), with: workersHead(module, true), imports: deps })
  }
  if (withDeps && holds(code, workersCall(module, false))) {
    changes.push({ action: 'replace-line', path: file('.module.ts'), line: workersCall(module, false), with: workersCall(module, true), imports: register })
  } else {
    changes.push({ action: 'insert-lines', path: file('.module.ts'), anchor: '    return module', position: 'before', lines: [workersCall(module, withDeps)], imports: register })
  }
  return { head: workersHead(module, withDeps), changes }
}
