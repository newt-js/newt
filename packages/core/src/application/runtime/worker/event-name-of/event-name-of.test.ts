import { describe }    from 'bun:test'
import { expect }      from 'bun:test'
import { test }        from 'bun:test'
// --------------------------------------------------------
import { eventNameOf } from './event-name-of'

describe('eventNameOf', () => {
  test('gives the name of a serialized event', () => {
    expect(eventNameOf('{"name":"order.placed","payload":{}}')).toBe('order.placed')
  })

  test('says unknown for an event with no name or that is not JSON', () => {
    expect(eventNameOf('{}')).toBe('unknown')
    expect(eventNameOf('not json')).toBe('unknown')
  })
})
