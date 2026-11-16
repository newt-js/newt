import { expect }        from 'bun:test'
import { test }          from 'bun:test'
// --------------------------------------------------------
import { mergedReports } from './merged-reports'

test('one report per file, with the most done to it', () => {
  expect(mergedReports([
    { path: 'package.json', status: 'created' },
    { path: 'a.ts', status: 'updated' },
    { path: 'a.ts', status: 'updated' },
    { path: 'package.json', status: 'skipped', note: 'up to date' },
    { path: 'b.ts', status: 'skipped', note: 'up to date' },
  ])).toEqual([
    { path: 'package.json', status: 'created' },
    { path: 'a.ts', status: 'updated' },
    { path: 'b.ts', status: 'skipped', note: 'up to date' },
  ])
})

test('leaves out a file skipped for not being there', () => {
  expect(mergedReports([{ path: 'index.ts', status: 'skipped', note: 'not there' }])).toEqual([])
})
