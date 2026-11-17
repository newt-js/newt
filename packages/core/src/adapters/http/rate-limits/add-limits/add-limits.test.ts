import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { test }          from 'bun:test'
// --------------------------------------------------------
import { MemoryCluster } from '../../../../application/cluster/memory-cluster/memory-cluster'
import { RateLimits }    from '../../../../application/runtime/rate-limits/rate-limits/rate-limits'
import { systemClock }   from '../../../../domain/clock/system-clock/system-clock'
import { addLimits }     from './add-limits'

const limits = new RateLimits(new MemoryCluster(), 'shop', systemClock)
const api = { limit: limits.define('api.calls', { limit: 10, windowMs: 60_000 }) }
const cards = { limit: limits.define('cards.create', { limit: 1, windowMs: 60_000 }) }

describe('addLimits', () => {
  test('the outer ones first, then its own, each limit once', () => {
    expect(addLimits(api, [cards, api])).toEqual([api, cards])
  })

  test('false leaves out those above', () => {
    expect(addLimits(api, false)).toBe(false)
  })

  test('none anywhere is none', () => {
    expect(addLimits(undefined, undefined)).toEqual([])
  })
})
