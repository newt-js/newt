import { describe }          from 'bun:test'
import { expect }            from 'bun:test'
import { test }              from 'bun:test'
import { mkdtempSync }       from 'node:fs'
import { tmpdir }            from 'node:os'
import { join }              from 'node:path'
// --------------------------------------------------------
import { virtualFiles }      from '../virtual-files/virtual-files'
import { addObjectProperty } from './add-object-property'

const CHANGE = { action: 'add-object-property' as const, path: 'm.ts', call: 'eventsOf', argument: 1, key: 'shipped', value: 'Order_Shipped', imports: ["import { Order_Shipped } from './events/order-shipped'"] }

async function edited(content: string, change = CHANGE): Promise<string> {
  const cwd = mkdtempSync(join(tmpdir(), 'newt-cli-property-'))
  await Bun.write(join(cwd, 'm.ts'), content)
  await addObjectProperty(change, virtualFiles(cwd, false))
  return Bun.file(join(cwd, 'm.ts')).text()
}

describe('addObjectProperty', () => {
  test('on one line', async () => {
    expect(await edited('this.events = eventsOf(base.bus, { created: Order_Created })\n')).toBe("import { Order_Shipped } from './events/order-shipped'\nthis.events = eventsOf(base.bus, { created: Order_Created, shipped: Order_Shipped })\n")
  })

  test('on lines of their own, with or without a last comma', async () => {
    expect(await edited('x = eventsOf(bus, {\n  created: Created,\n})\n', { ...CHANGE, imports: [] })).toBe('x = eventsOf(bus, {\n  created: Created,\n  shipped: Order_Shipped,\n})\n')
    expect(await edited('x = eventsOf(bus, {\n  created: Created\n})\n', { ...CHANGE, imports: [] })).toBe('x = eventsOf(bus, {\n  created: Created,\n  shipped: Order_Shipped,\n})\n')
  })

  test('in an empty object', async () => {
    expect(await edited('x = eventsOf(bus, {})\n', { ...CHANGE, imports: [] })).toBe('x = eventsOf(bus, { shipped: Order_Shipped })\n')
  })

  test('a key it has already is left alone', async () => {
    const text = 'x = eventsOf(bus, { shipped: Mine })\n'
    expect(await edited(text, { ...CHANGE, imports: [] })).toBe(text)
  })

  test('without the call, changes nothing and says what to add', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'newt-cli-property-'))
    await Bun.write(join(cwd, 'm.ts'), 'export const x = 1\n')
    expect((await addObjectProperty(CHANGE, virtualFiles(cwd, false))).warnings).toEqual(['m.ts calls no eventsOf with an object, so newt did not change it: add shipped: Order_Shipped to it'])
  })
})
