import { expect }     from 'bun:test'
import { test }       from 'bun:test'
// --------------------------------------------------------
import { jsonReport } from './json-report'

test('jsonReport is the whole report, as JSON', () => {
  const report = { dryRun: true, files: [{ path: 'a.ts', status: 'created' as const }], warnings: ['careful'], nextSteps: ['bun dev'] }
  expect(JSON.parse(jsonReport(report))).toEqual(report)
})
