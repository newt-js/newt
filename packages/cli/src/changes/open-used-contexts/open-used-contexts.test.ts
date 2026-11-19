import { describe }         from 'bun:test'
import { expect }           from 'bun:test'
import { test }             from 'bun:test'
import { mkdtempSync }      from 'node:fs'
import { tmpdir }           from 'node:os'
import { join }             from 'node:path'
// --------------------------------------------------------
import { diskFiles }        from '../../testing/disk-files/disk-files'
import { openUsedContexts } from './open-used-contexts'

const TEST = `let context: TestContext
let features: Backoffice_Context

beforeEach(async () => {
  context = testContext({ name: 'backoffice' })
  router.authenticateWith(async () => null)
  features = Backoffice_Context.initialize(context.base, router)
  accounts = features.accounts.account
})

afterEach(() => context.close())
`

const AUTH = { type: 'Auth', camel: 'auth', folder: 'auth', uses: [] }
const PANEL = { type: 'Panel', camel: 'panel', folder: 'panel', uses: ['auth'] }
const IMPORTS = ["import { Auth_Context } from '../../../../auth/auth.context'", "import { Panel_Context } from '../../../../panel/panel.context'"]
const CHANGE = { action: 'open-used-contexts' as const, path: 't.ts', context: 'Backoffice', opened: [AUTH, PANEL], uses: ['auth', 'panel'], imports: IMPORTS }

async function edited(content: string, change = CHANGE): Promise<string> {
  const cwd = mkdtempSync(join(tmpdir(), 'newt-cli-used-'))
  await Bun.write(join(cwd, 't.ts'), content)
  await openUsedContexts(change, diskFiles(cwd))
  return Bun.file(join(cwd, 't.ts')).text()
}

const OPENED = `let context: TestContext
let used: ContextToRun[]
let features: Backoffice_Context

beforeEach(async () => {
  context = testContext({ name: 'backoffice' })
  router.authenticateWith(async () => null)
  const platform = new Platform()
  const auth = await Auth_Context.open(platform, 'memory')
  const panel = await Panel_Context.open(platform, 'memory', {
    auth: auth.context,
  })
  used = [auth, panel]
  features = Backoffice_Context.initialize(context.base, router, {
    auth: auth.context,
    panel: panel.context,
  })
  accounts = features.accounts.account
})

afterEach(async () => {
  await context.close()
  for (const each of used.toReversed()) {
    await each.context.close()
  }
})
`

describe('openUsedContexts', () => {
  test('opens the contexts in order, initializes its own with them and closes them after it', async () => {
    const text = await edited(TEST)
    expect(text).toContain(OPENED)
    expect(text).toContain("import { Platform } from '@newt-js/core/application'")
    expect(text).toContain("import { Panel_Context } from '../../../../panel/panel.context'")
  })

  test('written again, it opens what it says now, and closes them once', async () => {
    const once = await edited(TEST, { ...CHANGE, opened: [AUTH], uses: ['auth'], imports: [IMPORTS[0]!] })
    const twice = await edited(once)
    expect(twice).toContain(OPENED)
    expect(await edited(twice)).toBe(twice)
  })

  test('with code of its own between, changes nothing and says what to write', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'newt-cli-used-'))
    await Bun.write(join(cwd, 't.ts'), TEST.replace('  features =', '  seed()\n  features ='))
    const outcome = await openUsedContexts(CHANGE, diskFiles(cwd))
    expect(outcome.failed).toBe(true)
  })
})
