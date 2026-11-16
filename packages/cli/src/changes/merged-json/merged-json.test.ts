import { describe }   from 'bun:test'
import { expect }     from 'bun:test'
import { test }       from 'bun:test'
// --------------------------------------------------------
import { mergedJson } from './merged-json'

describe('mergedJson', () => {
  test('adds the keys that are missing, at any depth', () => {
    expect(mergedJson({ name: 'shop', scripts: { dev: 'x' } }, { scripts: { test: 'y' }, type: 'module' })).toEqual({
      value: { name: 'shop', scripts: { dev: 'x', test: 'y' }, type: 'module' },
      changed: true,
      conflicts: [],
    })
  })

  test('adds the items an array lacks, after its own', () => {
    expect(mergedJson({ workspaces: ['packages/*'] }, { workspaces: ['apps/*', 'packages/*'] }).value).toEqual({ workspaces: ['packages/*', 'apps/*'] })
  })

  test('keeps a value that differs, as a conflict with its path', () => {
    expect(mergedJson({ scripts: { dev: 'bun index.ts' } }, { scripts: { dev: 'bun src/index.ts' } })).toEqual({
      value: { scripts: { dev: 'bun index.ts' } },
      changed: false,
      conflicts: ['scripts.dev is "bun index.ts", newt\'s is "bun src/index.ts"'],
    })
  })

  test('changes nothing when everything is there', () => {
    expect(mergedJson({ a: { b: [1, 2] }, c: 'd' }, { a: { b: [2] }, c: 'd' })).toEqual({ value: { a: { b: [1, 2] }, c: 'd' }, changed: false, conflicts: [] })
  })
})
