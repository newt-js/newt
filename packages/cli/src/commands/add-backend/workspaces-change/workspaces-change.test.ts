import { describe }         from 'bun:test'
import { expect }           from 'bun:test'
import { test }             from 'bun:test'
// --------------------------------------------------------
import { workspacesChange } from './workspaces-change'

const root = (patterns: string[], shape: 'list' | 'packages' = 'list') => ({ folder: '/repo', patterns, shape })

describe('workspacesChange', () => {
  test('nothing when a pattern already takes the folder', () => {
    expect(workspacesChange(root(['apps/*']), '/repo/apps/api', '/repo')).toBeNull()
    expect(workspacesChange(root(['apps/api']), '/repo/apps/api', '/repo')).toBeNull()
    expect(workspacesChange(root(['apps/*/']), '/repo/apps/api', '/repo')).toBeNull()
    expect(workspacesChange(root(['./apps/*']), '/repo/apps/api', '/repo')).toBeNull()
  })

  test('refuses a folder the workspaces leave out', () => {
    expect(() => workspacesChange(root(['apps/*', '!apps/legacy']), '/repo/apps/legacy', '/repo')).toThrow('leave apps/legacy out with "!apps/legacy"')
  })

  test("adds a pattern for the folder's parent", () => {
    expect(workspacesChange(root(['packages/*']), '/repo/apps/api', '/repo')).toEqual({ action: 'complete-json', path: 'package.json', values: { workspaces: ['apps/*'] } })
  })

  test('adds the folder itself when it is right under the root', () => {
    expect(workspacesChange(root(['packages/*']), '/repo/api', '/repo')?.values).toEqual({ workspaces: ['api'] })
  })

  test('keeps the shape of the workspaces', () => {
    expect(workspacesChange(root(['libs/*'], 'packages'), '/repo/apps/api', '/repo')?.values).toEqual({ workspaces: { packages: ['apps/*'] } })
  })

  test("names the root's package.json from where it runs", () => {
    expect(workspacesChange(root(['packages/*']), '/repo/apps/api', '/repo/packages/utils')?.path).toBe('../../package.json')
  })
})
