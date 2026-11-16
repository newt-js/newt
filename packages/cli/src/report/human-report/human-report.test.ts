import { expect }      from 'bun:test'
import { test }        from 'bun:test'
// --------------------------------------------------------
import { humanReport } from './human-report'

const FILES = [{ path: 'src/index.ts', status: 'created' as const }, { path: 'package.json', status: 'skipped' as const, note: 'already exists' }, { path: '.gitignore', status: 'updated' as const }]

test('lists what was created, skipped and updated, then the warnings and the next steps', () => {
  expect(humanReport({ dryRun: false, files: FILES, warnings: ['Port 3000 is taken'], nextSteps: ['bun run dev'] })).toBe([
    '  created  src/index.ts',
    '  skipped  package.json (already exists)',
    '  updated  .gitignore',
    '',
    'Warnings:',
    '  Port 3000 is taken',
    '',
    'Next steps:',
    '  bun run dev',
  ].join('\n'))
})

test('a dry run says nothing was written and what it would do', () => {
  expect(humanReport({ dryRun: true, files: FILES, warnings: [], nextSteps: [] })).toBe([
    'Dry run: nothing was written.',
    '',
    '  will create  src/index.ts',
    '  will skip    package.json (already exists)',
    '  will update  .gitignore',
  ].join('\n'))
})

test('says when there is nothing to do', () => {
  expect(humanReport({ dryRun: false, files: [], warnings: [], nextSteps: [] })).toBe('Nothing to do.')
  expect(humanReport({ dryRun: true, files: [], warnings: [], nextSteps: ['bun run dev'] })).toBe('Dry run: nothing was written.\n\nNothing to do.\n\nNext steps:\n  bun run dev')
})
