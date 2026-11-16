import { toErrorResponse } from '@newt-js/core/http'
import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
import { join }            from 'node:path'
// --------------------------------------------------------
import { runCommand }      from '../../run/run-command/run-command'
import { checkGenerated }  from '../../testing/check-generated/check-generated'
import { ORDER_MODULE }    from '../../testing/module-project/module-project'
import { moduleProject }   from '../../testing/module-project/module-project'
import { ADD_ERROR }       from './add-error'

const addError = (args: string[], cwd: string) => runCommand(ADD_ERROR, args, { cwd, ask: null })

const STATUSES = { 'validation': 400, 'unauthorized': 401, 'forbidden': 403, 'not-found': 404, 'conflict': 409 }

describe('newt add error', () => {
  test('one of each kind, whose lint, types and tests pass, and which HTTP answers with its status', async () => {
    const backend = await moduleProject()
    for (const kind of Object.keys(STATUSES)) {
      expect((await addError(['sales/order', `order-${kind}`, '--kind', kind], backend)).code).toBe(0)
    }
    expect(await checkGenerated(backend)).toEqual([])
    for (const [kind, status] of Object.entries(STATUSES)) {
      const type = `Order${kind.split('-').map(word => word[0]!.toUpperCase() + word.slice(1)).join('')}`
      const errors = await import(join(backend, ORDER_MODULE, `errors/order-${kind}.ts`)) as Record<string, new () => Error>
      expect(toErrorResponse(new errors[type]!()).status).toBe(status)
    }
  }, 30_000)

  test('its code is the module\'s, without the module\'s name twice', async () => {
    const backend = await moduleProject()
    await addError(['sales/order', 'order-already-paid', '--kind', 'conflict'], backend)
    await addError(['sales/order', 'too-late', '--kind', 'validation'], backend)
    const paid = await Bun.file(join(backend, ORDER_MODULE, 'errors/order-already-paid.ts')).text()
    expect(paid).toContain("export class OrderAlreadyPaid extends ConflictError {\n  readonly code = 'order.already_paid'")
    expect(paid).toContain("super('Order already paid')")
    expect(await Bun.file(join(backend, ORDER_MODULE, 'errors/too-late.ts')).text()).toContain("readonly code = 'order.too_late'")
  })

  test('needs its kind', async () => {
    const backend = await moduleProject()
    expect((await addError(['sales/order', 'too-late'], backend)).text).toStartWith('newt add error needs --kind')
    expect((await addError(['sales/order', 'too-late', '--kind', 'gone'], backend)).text).toStartWith("'gone' is not a kind of error")
  })

  test('refuses the name of the class it would extend', async () => {
    expect((await addError(['sales/order', 'validation-error', '--kind', 'validation'], await moduleProject())).text).toStartWith("'validation-error' cannot name an error")
  })

  test('refuses a code another error of the module has', async () => {
    expect((await addError(['sales/order', 'not-found', '--kind', 'not-found'], await moduleProject())).text).toBe('errors/order-not-found.ts has the code order.not_found already: name the error by what else went wrong')
  })
})
