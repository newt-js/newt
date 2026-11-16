import { join }            from 'node:path'
// --------------------------------------------------------
import { moduleNames }     from '../../names/module-names/module-names'
import { backendContexts } from '../../project/backend-contexts/backend-contexts'
import { findBackend }     from '../../project/find-backend/find-backend'
import { findModule }      from '../../project/find-module/find-module'
import { moduleLines }     from '../../templates/module/module-lines/module-lines'
import { initializedLine } from '../../templates/module/module-template/module-template'
import { depsHead }        from '../../templates/pieces/deps-ts'
import { depsTs }          from '../../templates/pieces/deps-ts'
import type { FileChange } from '../command'
import { defineCommand }   from '../command'
import { CommandError }    from '../command-error/command-error'

const USAGE = 'newt add deps takes the module and the module of its context it uses, as in newt add deps sales/order invoice'

export const ADD_DEPS = defineCommand({
  name: 'add deps',
  summary: 'Lets a module use another module of its context, given to it by <ctx>-modules.ts',
  args: '<context>/<module> <module-it-uses>',
  options: {
    backend: { type: 'string', value: 'folder', description: 'The backend, in a monorepo with several' },
  },
  run: async ({ args, cwd, options }) => {
    const [given, other, ...rest] = args
    if (other === undefined || rest.length > 0) throw new CommandError(USAGE)
    if (other.includes('/')) {
      throw new CommandError("A module uses another context's modules once its context is opened with that context: newt does not write that yet")
    }
    const { folder, module, context } = await findModule(given, cwd, options.backend, USAGE)
    const used = moduleNames(other)
    if (used.folder === module.folder) throw new CommandError(`${module.folder} cannot use itself`)
    const found = (await backendContexts(await findBackend(cwd, options.backend))).find(each => each.name === context.folder)
    if (!found?.modules.includes(used.folder)) {
      throw new CommandError(`The context ${context.folder} has no module ${used.folder}: add it with newt add module ${context.folder}/${used.folder}`)
    }
    const usedDeps = Bun.file(join(cwd, folder, '..', used.folder, `${used.folder}.deps.ts`))
    if (await usedDeps.exists() && (await usedDeps.text()).includes(`  ${module.module}: `)) {
      throw new CommandError(`${used.folder} uses ${module.folder} already: two modules never use each other`)
    }
    const file = (suffix: string) => join(folder, `${module.folder}${suffix}`)
    const modules = join(folder, '../..', `${context.folder}-modules.ts`)
    const before = moduleLines(module, false)
    const after = moduleLines(module, true)
    const initialize = `${module.type}_Module.initialize`
    const testLine = `  ${module.plural} = ${initialize}(context.base, router)`
    const changes: FileChange[] = [
      { action: 'create', path: file('.deps.ts'), content: depsTs(module) },
      {
        action: 'insert-lines',
        path: file('.deps.ts'),
        anchor: depsHead(module),
        position: 'after',
        lines: [`  ${used.module}: ${used.type}_Module`],
        imports: [`import type { ${used.type}_Module } from '../${used.folder}/${used.folder}.module'`],
      },
      ...(['initialize', 'created', 'constructor', 'super'] as const).map((line): FileChange => ({
        action: 'replace-line',
        path: file('.module.ts'),
        line: before[line],
        with: after[line],
        imports: [`import type { ${module.type}_Deps } from './${module.folder}.deps'`],
      })),
      { action: 'replace-line', path: modules, line: initializedLine(module), with: initializedLine(module, ', {}'), imports: [] },
      { action: 'add-object-property', path: modules, call: initialize, argument: 2, key: used.module, value: used.module, imports: [] },
      { action: 'keep-line-below', path: modules, line: `  const ${module.module} =`, below: `  const ${used.module} =` },
      { action: 'replace-line', path: file('.module.test.ts'), line: testLine, with: testLine.replace('router)', 'router, {})'), imports: [] },
      {
        action: 'add-object-property',
        path: file('.module.test.ts'),
        call: initialize,
        argument: 2,
        key: used.module,
        value: `${used.type}_Module.initialize(context.base, router)`,
        imports: [`import { ${used.type}_Module } from '../${used.folder}/${used.folder}.module'`],
      },
    ]
    return { changes, nextSteps: [`call it in a use case of ${module.folder}: this.deps.${used.module}`, `bun test ${folder}`] }
  },
})
