import { expect }         from 'bun:test'
import { test }           from 'bun:test'
// --------------------------------------------------------
import { workspaceTakes } from './workspace-takes'

test('a folder a pattern takes, and none a ! pattern leaves out', () => {
  expect(workspaceTakes(['apps/*', '!apps/legacy'], 'apps/api')).toBe('taken')
  expect(workspaceTakes(['apps/*', '!apps/legacy'], 'apps/legacy')).toBe('left out')
  expect(workspaceTakes(['./apps/*/'], 'apps/api')).toBe('taken')
  expect(workspaceTakes(['apps/*'], 'services/api')).toBe('not taken')
})

test('never a folder in node_modules', () => {
  expect(workspaceTakes(['apps/**'], 'apps/one/node_modules/zod')).toBe('not taken')
})
