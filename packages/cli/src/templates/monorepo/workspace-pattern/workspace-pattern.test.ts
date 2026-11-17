import { expect }           from 'bun:test'
import { test }             from 'bun:test'
// --------------------------------------------------------
import { workspacePattern } from './workspace-pattern'

test('every folder beside it', () => {
  expect(workspacePattern('apps/api')).toBe('apps/*')
  expect(workspacePattern('services/billing/api')).toBe('services/billing/*')
})

test('itself, right under the root', () => {
  expect(workspacePattern('api')).toBe('api')
})
