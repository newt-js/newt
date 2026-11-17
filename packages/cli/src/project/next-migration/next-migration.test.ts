import { expect }        from 'bun:test'
import { test }          from 'bun:test'
import { mkdtemp }       from 'node:fs/promises'
import { tmpdir }        from 'node:os'
import { join }          from 'node:path'
// --------------------------------------------------------
import { nextMigration } from './next-migration'

async function folderWith(files: string[]): Promise<string> {
  const folder = await mkdtemp(join(tmpdir(), 'newt-cli-migrations-'))
  for (const file of files) await Bun.write(join(folder, file), '')
  return folder
}

test('00001 in a folder without migrations, or without the folder', async () => {
  expect(await nextMigration(await folderWith(['.gitkeep']), 'order')).toBe('00001')
  expect(await nextMigration(join(await folderWith([]), 'missing'), 'order')).toBe('00001')
})

test('one after the highest', async () => {
  expect(await nextMigration(await folderWith(['00001_order_up.sql', '00001_order_down.sql', '00007_invoice_up.sql']), 'customer')).toBe('00008')
})

test("the table's own when it has one already", async () => {
  expect(await nextMigration(await folderWith(['00001_order_up.sql', '00002_invoice_up.sql']), 'order')).toBe('00001')
})
