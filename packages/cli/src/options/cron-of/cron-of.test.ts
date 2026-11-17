import { expect } from 'bun:test'
import { test }   from 'bun:test'
// --------------------------------------------------------
import { cronOf } from './cron-of'

test('crons a schedule takes', () => {
  for (const cron of ['0 3 * * *', '*/5 * * * *', '0,30 8-18 * * 1-5', '0 0 1 */2 0']) {
    expect(cronOf(cron)).toBe(cron)
  }
  expect(cronOf('  0  3 * * * ')).toBe('0 3 * * *')
})

test('refuses what is not one, saying why', () => {
  expect(() => cronOf('daily')).toThrow("'daily' is not a cron: it has five fields")
  expect(() => cronOf('61 3 * * *')).toThrow('its minute is not one from 0 to 59')
  expect(() => cronOf('a b c d e')).toThrow('its minute is not one from 0 to 59')
  expect(() => cronOf("0 3 * * *'+String(1)+'")).toThrow('is not a cron')
})
