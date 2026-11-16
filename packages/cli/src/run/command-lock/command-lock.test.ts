import { expect }      from 'bun:test'
import { test }        from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir }      from 'node:os'
import { join }        from 'node:path'
// --------------------------------------------------------
import { LOCK_FILE }   from './command-lock'
import { commandLock } from './command-lock'

test('a second command waits until the first releases the lock', async () => {
  const cwd = mkdtempSync(join(tmpdir(), 'newt-cli-lock-'))
  await Bun.write(join(cwd, 'package.json'), '{}')
  const order: string[] = []
  const release = await commandLock(cwd)
  const second = commandLock(cwd).then(next => {
    order.push('second')
    return next()
  })
  await Bun.sleep(120)
  order.push('first')
  await release()
  await second
  expect(order).toEqual(['first', 'second'])
  expect(await Bun.file(join(cwd, LOCK_FILE)).exists()).toBe(false)
})

test('gives up after a while', async () => {
  const cwd = mkdtempSync(join(tmpdir(), 'newt-cli-lock-'))
  const release = await commandLock(cwd)
  await expect(commandLock(cwd, 100)).rejects.toThrow('another newt command has run here for a while')
  await release()
})
