import { describe }            from 'bun:test'
import { expect }              from 'bun:test'
import { test }                from 'bun:test'
// --------------------------------------------------------
import { ConcurrencyConflict } from '../concurrency-conflict/concurrency-conflict'
import { StaleVersion }        from './stale-version'

describe('StaleVersion', () => {
  test('is a concurrency conflict: a save that lost the race to another one', () => {
    const error = new StaleVersion()

    expect(error).toBeInstanceOf(ConcurrencyConflict)
    expect(error.code).toBe('stale_version')
    expect(error.message).toBe('Someone changed it in the meantime. Try again.')
  })
})
