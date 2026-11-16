import { describe }       from 'bun:test'
import { expect }         from 'bun:test'
import { test }           from 'bun:test'
import { join }           from 'node:path'
// --------------------------------------------------------
import { runCommand }     from '../../run/run-command/run-command'
import { checkGenerated } from '../../testing/check-generated/check-generated'
import { ORDER_MODULE }   from '../../testing/module-project/module-project'
import { moduleProject }  from '../../testing/module-project/module-project'
import { ADD_USE_CASE }   from './add-use-case'

const addUseCase = (args: string[], cwd: string) => runCommand(ADD_USE_CASE, args, { cwd, ask: null })

const read = (backend: string, file: string) => Bun.file(join(backend, ORDER_MODULE, file)).text()

describe('newt add use-case', () => {
  test('a use case, its schema and its test, in a module whose lint, types and tests pass', async () => {
    const backend = await moduleProject()
    expect((await addUseCase(['sales/order', 'mark-paid'], backend)).code).toBe(0)
    expect(await read(backend, 'order.module.ts')).toContain('  @UseCase()\n  async markPaid(input: OrderMarkPaidDTO): Promise<OrderDTO> {')
    expect(await read(backend, 'order.schema.ts')).toContain('export const OrderMarkPaidSchema = OrderSchema.pick({ id: true })')
    expect(await read(backend, 'order.module.test.ts')).toContain("test('markPaid reads the order by its id and tells it'")
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('two use cases, one after the other', async () => {
    const backend = await moduleProject()
    await addUseCase(['sales/order', 'mark-paid'], backend)
    await addUseCase(['sales/order', 'cancel'], backend)
    expect(await read(backend, 'order.module.ts')).toMatch(/async markPaid[\s\S]*async cancel/)
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('run again, it changes nothing', async () => {
    const backend = await moduleProject()
    await addUseCase(['sales/order', 'cancel'], backend)
    const again = JSON.parse((await addUseCase(['sales/order', 'cancel', '--json'], backend)).text) as { files: { status: string }[] }
    expect(again.files.filter(file => file.status !== 'skipped')).toEqual([])
  })

  test('refuses the names of the reads the lint shapes', async () => {
    expect((await addUseCase(['sales/order', 'find'], await moduleProject())).text).toStartWith('find is one of the reads')
  })
})
