import { expect }          from 'bun:test'
import { test }            from 'bun:test'
// --------------------------------------------------------
import { DEFAULT_BACKEND } from './backend-in-root'
import { backendInRoot }   from './backend-in-root'

test('apps/api when none is given', () => {
  expect(backendInRoot(undefined)).toBe(DEFAULT_BACKEND)
  expect(DEFAULT_BACKEND).toBe('apps/api')
})

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
