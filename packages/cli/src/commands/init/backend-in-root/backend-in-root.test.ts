import { expect }        from 'bun:test'
import { test }          from 'bun:test'
// --------------------------------------------------------
import { backendInRoot } from './backend-in-root'

test('the folder given, tidied', () => {
  expect(backendInRoot('services/billing/')).toBe('services/billing')
  expect(backendInRoot('./api')).toBe('api')
})

test('refuses a folder outside the root, or the root itself', () => {
  for (const given of ['../api', '/api', '.']) {
    expect(() => backendInRoot(given)).toThrow(`--backend ${given} is not a folder inside the monorepo`)
  }
})

test('refuses a folder whose name cannot name a package', () => {
  expect(() => backendInRoot('apps/My Api')).toThrow("'My Api' cannot name a folder and a package")
})
