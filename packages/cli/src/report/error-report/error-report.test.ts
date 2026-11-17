import { expect }      from 'bun:test'
import { test }        from 'bun:test'
// --------------------------------------------------------
import { errorReport } from './error-report'

test('errorReport is the message alone', () => {
  expect(errorReport('It broke', false)).toBe('It broke')
})

test('errorReport as JSON has the message as its error', () => {
  expect(JSON.parse(errorReport('It broke', true))).toEqual({ error: 'It broke' })
})
