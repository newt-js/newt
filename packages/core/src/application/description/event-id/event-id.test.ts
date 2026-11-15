import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { eventId }  from './event-id'

describe('eventId', () => {
  test('names an event by its context and its name', () => {
    expect(eventId('shop', 'order.placed')).toBe('shop/order.placed')
  })
})
