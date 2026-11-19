import { expect }         from 'bun:test'
import { test }           from 'bun:test'
import { join }           from 'node:path'
// --------------------------------------------------------
import { runCommand }     from '../run/run-command/run-command'
import { checkGenerated } from '../testing/check-generated/check-generated'
import { generate }       from '../testing/generate/generate'
import { ADD_CONTEXT }    from './add-context/add-context'
import { ADD_DEPS }       from './add-deps/add-deps'
import { ADD_MODULE }     from './add-module/add-module'
import { ADD_USE_CASE }   from './add-use-case/add-use-case'
import type { Command }   from './command'
import { INIT }           from './init/init'
import { PUBLISH }        from './publish/publish'

const ACCOUNT = 'src/contexts/backoffice/modules/account'

test('backoffice using panel and auth, and panel using auth, made with the CLI in any order, whose lint, types and tests pass', async () => {
  const backend = join(await generate(INIT, ['studio']), 'studio')
  const run = async (command: Command, ...args: string[]) => {
    const output = await runCommand(command, args, { cwd: backend, ask: null })
    expect(output.code, output.text).toBe(0)
  }

  for (const context of ['auth', 'panel', 'backoffice']) await run(ADD_CONTEXT, context)
  for (const module of ['auth/user', 'panel/workspace', 'backoffice/account', 'backoffice/plan']) {
    await run(ADD_MODULE, module)
  }
  // backoffice uses panel before panel uses auth: backoffice's tests open auth too once it does.
  await run(ADD_DEPS, 'backoffice/account', 'panel')
  await run(ADD_DEPS, 'panel/workspace', 'auth')
  await run(ADD_DEPS, 'backoffice/account', 'auth')
  await run(ADD_DEPS, 'backoffice/account', 'plan')
  await run(PUBLISH, 'auth/user')
  await run(PUBLISH, 'panel/workspace')
  await run(ADD_USE_CASE, 'backoffice/account', 'count-members')

  // count-members reads the modules auth and panel publish, through the contexts account is given.
  const module = join(backend, ACCOUNT, 'account.module.ts')
  const text = await Bun.file(module).text()
  const edited = text.replace('    await this.accounts.persist(account)\n    return account.toDTO()\n  }\n\n}', [
    '    await this.deps.auth.user.paginate({}, { size: 1 })',
    '    await this.deps.panel.workspace.paginate({}, { size: 1 })',
    '    await this.deps.plan.paginate({}, { size: 1 })',
    '    await this.accounts.persist(account)',
    '    return account.toDTO()',
    '  }',
    '',
    '}',
  ].join('\n'))
  expect(edited).not.toBe(text)
  await Bun.write(module, edited)

  const contexts = await Bun.file(join(backend, 'src/contexts/contexts.ts')).text()
  expect(contexts.indexOf('const auth =')).toBeLessThan(contexts.indexOf('const panel ='))
  expect(contexts.indexOf('const panel =')).toBeLessThan(contexts.indexOf('const backoffice ='))
  const test = await Bun.file(join(backend, 'src/contexts/backoffice/modules/plan/plan.module.test.ts')).text()
  expect(test).toContain("  const auth = await Auth_Context.open(platform, 'memory')\n  const panel = await Panel_Context.open(platform, 'memory', {\n    auth: auth.context,\n  })\n  used = [auth, panel]")
  expect(await checkGenerated(backend)).toEqual([])
}, 90_000)
