import { expect }       from 'bun:test'
import { test }         from 'bun:test'
import { mkdtemp }      from 'node:fs/promises'
import { tmpdir }       from 'node:os'
import { join }         from 'node:path'
// --------------------------------------------------------
import { DEFAULT_PORT } from '../../options/port-of/port-of'
import { backendPort }  from './backend-port'

test('the PORT of its .env', async () => {
  const backend = await mkdtemp(join(tmpdir(), 'newt-cli-port-'))
  await Bun.write(join(backend, '.env'), 'NAME=shop\nPORT=3010\n')
  expect(await backendPort(backend)).toBe(3010)
})

test('the default port without one', async () => {
  expect(await backendPort(await mkdtemp(join(tmpdir(), 'newt-cli-port-')))).toBe(DEFAULT_PORT)
})
