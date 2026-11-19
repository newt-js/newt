import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { test }          from 'bun:test'
// --------------------------------------------------------
import { MemoryCluster } from '../../../../application/cluster/memory-cluster/memory-cluster'
import { RateLimits }    from '../../../../application/runtime/rate-limits/rate-limits/rate-limits'
import { systemClock }   from '../../../../domain/clock/system-clock/system-clock'
import { listOf }        from './list-of'

const limits = new RateLimits(new MemoryCluster(), 'shop', systemClock)
const one = { limit: limits.define('api.calls', { limit: 5, windowMs: 60_000 }) }
const other = { limit: limits.define('thing.list', { limit: 2, windowMs: 60_000 }) }

describe('listOf', () => {
  test('one limit is a list of one, a list stays as it is', () => {
    expect(listOf(one)).toEqual([one])
    expect(listOf([one, other])).toEqual([one, other])
  })

  test('none, or turned off, is no limits', () => {
    expect(listOf(undefined)).toEqual([])
    expect(listOf(false)).toEqual([])
  })
})
