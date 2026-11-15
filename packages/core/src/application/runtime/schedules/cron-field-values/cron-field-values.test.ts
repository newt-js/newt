import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
// --------------------------------------------------------
import { cronFieldValues } from './cron-field-values'

const minute = { name: 'minute', min: 0, max: 59 }
const values = (part: string) => [...cronFieldValues(part, minute, '* * * * *')]

describe('cronFieldValues', () => {
  test('takes a number, a list, a range, a star and steps of each', () => {
    expect(values('5')).toEqual([5])
    expect(values('0,30')).toEqual([0, 30])
    expect(values('10-12')).toEqual([10, 11, 12])
    expect(values('*/20')).toEqual([0, 20, 40])
    expect(values('0-30/10')).toEqual([0, 10, 20, 30])
    expect(values('50/5')).toEqual([50, 55])
  })

  test('refuses what is out of the field, not a number, a step below 1, or a range backwards', () => {
    for (const part of ['60', 'x', '*/0', '1/2/3', '10-5', '1-2-3', '']) {
      expect(() => values(part)).toThrow(`'${part}' is not a minute (0-59) in the cron expression '* * * * *'`)
    }
  })
})
