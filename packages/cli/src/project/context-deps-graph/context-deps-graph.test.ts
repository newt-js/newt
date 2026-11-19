import { expect }           from 'bun:test'
import { test }             from 'bun:test'
import { mkdtempSync }      from 'node:fs'
import { tmpdir }           from 'node:os'
import { join }             from 'node:path'
// --------------------------------------------------------
import { contextDepsGraph } from './context-deps-graph'
import { openedBefore }     from './context-deps-graph'

test('each context, with the contexts its <ctx>.context.ts imports', async () => {
  const backend = mkdtempSync(join(tmpdir(), 'newt-cli-contexts-'))
  await Bun.write(join(backend, 'src/contexts/auth/auth.context.ts'), 'export class Auth_Context {}\n')
  await Bun.write(join(backend, 'src/contexts/panel/panel.context.ts'), "import type { Auth_Context } from '../auth/auth.context'\n")
  await Bun.write(join(backend, 'src/contexts/backoffice/backoffice.context.ts'), "import type { Auth_Context } from '../auth/auth.context'\nimport type { Panel_Context } from '../panel/panel.context'\n")
  const graph = await contextDepsGraph(backend, ['auth', 'backoffice', 'panel'])
  expect(graph).toEqual(new Map([['auth', []], ['backoffice', ['auth', 'panel']], ['panel', ['auth']]]))
})

test('the contexts one is opened with, and theirs, each after the ones it is opened with', () => {
  const graph = new Map([['auth', []], ['panel', ['auth']], ['backoffice', ['panel', 'auth']]])
  expect(openedBefore(graph, 'backoffice')).toEqual(['auth', 'panel'])
  expect(openedBefore(graph, 'auth')).toEqual([])
})
