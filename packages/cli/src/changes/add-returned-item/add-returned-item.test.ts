import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
import { mkdtempSync }     from 'node:fs'
import { tmpdir }          from 'node:os'
import { join }            from 'node:path'
// --------------------------------------------------------
import { diskFiles }       from '../../testing/disk-files/disk-files'
import { addReturnedItem } from './add-returned-item'

const CHANGE = { action: 'add-returned-item' as const, path: 'c.ts', function: 'openContexts', item: 'sales' }

async function edited(content: string, change = CHANGE): Promise<string> {
  const cwd = mkdtempSync(join(tmpdir(), 'newt-cli-returned-'))
  await Bun.write(join(cwd, 'c.ts'), content)
  await addReturnedItem(change, diskFiles(cwd))
  return Bun.file(join(cwd, 'c.ts')).text()
}

describe('addReturnedItem', () => {
  test('at the end of the list, on its line', async () => {
    expect(await edited('async function openContexts() {\n  return []\n}\n')).toBe('async function openContexts() {\n  return [sales]\n}\n')
    expect(await edited('async function openContexts() {\n  return [auth]\n}\n')).toBe('async function openContexts() {\n  return [auth, sales]\n}\n')
  })

  test('on lines of their own once it passes 80 characters', async () => {
    const long = 'async function openContexts() {\n  return [authentication, administration, notifications, subscriptions, settings]\n}\n'
    expect(await edited(long)).toBe('async function openContexts() {\n  return [\n    authentication,\n    administration,\n    notifications,\n    subscriptions,\n    settings,\n    sales,\n  ]\n}\n')
  })

  test('in a list on lines of their own, on a line of its own', async () => {
    expect(await edited('async function openContexts() {\n  return [\n    auth,\n  ]\n}\n')).toBe('async function openContexts() {\n  return [\n    auth,\n    sales,\n  ]\n}\n')
  })

  test('an item it has already is left alone', async () => {
    const text = 'async function openContexts() {\n  return [sales]\n}\n'
    expect(await edited(text)).toBe(text)
  })

  test('without the function, changes nothing and says what to add', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'newt-cli-returned-'))
    await Bun.write(join(cwd, 'c.ts'), 'export const x = 1\n')
    expect((await addReturnedItem(CHANGE, diskFiles(cwd))).warnings).toEqual(['c.ts has no function openContexts that returns a list, so newt did not change it: add sales to the list it returns'])
  })
})
