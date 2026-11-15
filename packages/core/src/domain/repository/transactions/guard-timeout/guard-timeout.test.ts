import { describe }     from 'bun:test'
import { expect }       from 'bun:test'
import { test }         from 'bun:test'
// --------------------------------------------------------
import { GuardTimeout } from './guard-timeout'

describe('GuardTimeout', () => {
  test('says what it waited for, and how long', () => {
    const error = new GuardTimeout(['stock:p1'], 50)

    expect(error.message).toBe('Waited 50 ms for stock:p1, held by another transaction, and gave up')
    expect(error.keys).toEqual(['stock:p1'])
    expect(error.name).toBe('GuardTimeout')
  })
})
